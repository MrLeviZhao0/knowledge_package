# DeliQueue核心知识

## 1. 概述

在Android 17中，针对SDK 37或更高版本的应用将启用全新的MessageQueue实现，其底层采用了**无锁（lock-free）**机制。这一新实现被称为DeliQueue，它提升了性能并减少了掉帧现象，但可能会导致那些通过反射访问MessageQueue私有字段和方法的客户端代码失效。

DeliQueue将消息的**插入（Insertion）与消息的处理（Processing）**解耦，通过一种混合数据结构实现了无锁并发：
- **消息列表（Treiber栈）**：一个无锁栈。任何线程都可以向此处推送（Push）新消息，且不会产生争用。
- **优先级队列（最小堆）**：一个存放待处理消息的堆结构，由Looper线程独占（因此访问时无需任何同步或锁机制）。

## 2. 设计思路

### 2.1 无锁并发（Lock-free Concurrency）

DeliQueue通过实现一种无锁数据结构解决了MessageQueue的争用问题。该结构使用原子内存操作而非排他锁来同步对共享状态的访问。如果一个数据结构或算法能够保证：无论其他线程的调度行为如何，至少有一个线程始终能取得进展，那么它就是"无锁"的。

### 2.2 原子原语（Atomic Primitives）

无锁软件通常依赖于硬件提供的原子"读-改-写"（Read-Modify-Write）原语。

在旧一代的ARM64 CPU上，原子操作使用Load-Link/Store-Conditional (LL/SC)循环：
```arm
retry:
    ldxr    x0, [x1]        // Load exclusive from address x1 to x0
    add     x0, x0, #1      // Increment value by 1
    stxr    w2, x0, [x1]    // Store exclusive.
                            // w2 gets 0 on success, 1 on failure
    cbnz    w2, retry       // If w2 is non-zero (failed), branch to retry
```

较新的ARM架构（ARMv8.1）支持大系统扩展（Large System Extensions, LSE），其中包含比较并交换（Compare-And-Swap, CAS）或加载并相加（Load-And-Add）形式的指令：
```arm
// ARMv8.1 LSE atomic example
ldadd   x0, x1, [x2]    // Atomic load-add.
                        // Faster, no loop required.
```

在Android 17中，我们在Android Runtime (ART)编译器中增加了支持，能够检测硬件是否支持LSE并生成优化后的指令。在我们的基准测试中，使用CAS指令的高竞争代码相比LL/SC变体实现了约3倍的性能提升。

## 3. 数据结构

### 3.1 入队（Enqueue）：推送到Treiber栈

消息列表维护在一个Treiber栈中，这是一种利用CAS循环来更新头指针（Head Pointer）的无锁栈。

```java
public class TreiberStack <E> {
    AtomicReference<Node<E>> top = new AtomicReference<Node<E>>();
    
    public void push(E item) {
        Node<E> newHead = new Node<E>(item);
        Node<E> oldHead;
        do {
            oldHead = top.get();
            newHead.next = oldHead;
        } while (!top.compareAndSet(oldHead, newHead));
    }

    public E pop() {
        Node<E> oldHead;
        Node<E> newHead;
        do {
            oldHead = top.get();
            if (oldHead == null) return null;
            newHead = oldHead.next;
        } while (!top.compareAndSet(oldHead, newHead));
        return oldHead.item;
    }
}
```

任何生产者（线程）都可以在任何时间将新消息推送到栈中。这就像在熟食店（Deli）柜台取号一样——你的号码取决于你到达的时间，但你拿到食物的顺序并不一定非要按这个号来。由于它是一个链式栈，每个消息本身就是一个"子栈"——通过追踪头指针（Head）并向前遍历，你可以看到消息队列在任何时间点的状态；即便在你遍历的过程中有新消息压入栈顶，你也无法看到它们。

### 3.2 出队（Dequeue）：批量转移至最小堆

为了找到下一个要处理的消息，Looper会从Treiber栈的顶部开始向下遍历，直到找到它上一次处理过的最后一个消息，从而处理所有新消息。当Looper向下遍历栈时，它会将消息插入到一个按**截止时间（Deadline）排序的最小堆（Min-heap）**中。

由于这个堆由Looper线程独占，因此它在对消息进行排序和处理时，完全不需要锁或原子操作。

在向下遍历栈的过程中，Looper还会建立从栈内消息指向其前驱节点的链接，从而形成一个双向链表。创建该链表是安全的，因为指向栈底的链接是通过Treiber栈算法配合CAS添加的，而指向栈顶的反向链接则仅由Looper线程读取和修改。这些反向链接随后被用于在O(1)时间内从栈中的任意位置移除消息。

这种设计为生产者（发送任务到队列的线程）提供了O(1)的插入复杂度，并为消费者（Looper）提供了均摊（Amortized）O(log N)的处理复杂度。

使用**最小堆（Min-heap）对消息进行排序，还解决了传统MessageQueue的一个根本缺陷：在旧实现中，消息被存储在一个单向链表中（以头部为根节点）。虽然在旧实现中从头部移除消息是O(1)，但插入消息在最坏情况下的复杂度为O(N)——这在队列负载过高时扩展性极差！相比之下，最小堆的插入和移除操作均呈对数级（Logarithmic）增长，不仅提供了极具竞争力的平均性能，在尾部延迟（Tail Latencies）方面的表现更是出类拔萃。

| 传统 (locked) MessageQueue | DeliQueue |
|---------------------------|-----------|
| Insert                    | O(N)      | O(1) for calling thread, O(logN) for Looper thread |
| Remove from head          | O(1)      | O(logN) |

在旧版的队列实现中，生产者和消费者使用同一个锁来协调对底层单向链表的排他性访问。而在DeliQueue中，由Treiber栈处理并发访问，由唯一的消费者（Looper）处理其工作队列的排序。

### 3.3 移除操作：通过"墓碑（Tombstones）"实现一致性

DeliQueue是一种混合数据结构，它将无锁的Treiber栈与单线程的最小堆结合在一起。在没有全局锁的情况下保持这两个结构的同步面临着一个独特的挑战：一条消息可能在物理上仍存在于栈中，但在逻辑上已被从队列中移除。

为了解决这个问题，DeliQueue使用了一种名为"墓碑机制（Tombstoning）"的技术：

每个Message都会追踪其在栈中的位置（通过前向和后向指针）、在堆数组中的索引，以及一个表示其是否已被移除的布尔标记。

当一条消息准备执行时，Looper线程会通过CAS操作修改其"移除标记"，然后将其从堆和栈中彻底剥离。

当另一个线程需要（提前）移除一条消息时，它不会立即将其从数据结构中取出，而是执行以下步骤：

1. **逻辑移除**：该线程使用CAS原子地将消息的"移除标记"从false设为true。此时，该消息作为其待处理移除状态的证据留在数据结构中，即所谓的"墓碑"。一旦消息被标记为移除，DeliQueue只要发现它，就会视其为已不存在。
2. **延迟清理**：从数据结构中真正移除的职责交给了Looper线程，并推迟执行。移除线程并不会修改栈或堆，而是将该消息添加至另一个无锁的**空闲列表栈（freelist stack）**中。
3. **结构化移除**：只有Looper可以操作堆或从栈中移除元素。当Looper唤醒时，它会清空空闲列表并处理其中包含的消息，将每条消息从栈中断开链接并从堆中移除。

这种方法确保了堆的所有管理操作都是单线程的。它最大限度地减少了并发操作和**内存屏障（Memory Barriers）**的数量，使关键路径运行得更快、更简洁。

## 4. 遍历：Java内存模型下的良性数据竞争

大多数并发API（如Java的Future，或Kotlin的Job和Deferred）都包含在工作完成前取消任务的机制。这些类的一个实例与一个底层工作单元一一对应，调用cancel即可取消与其关联的特定操作。

如今的Android设备拥有多核CPU和并发的分代垃圾回收（GC）。但在Android开发之初，为每个工作单元都分配一个对象（指专门的取消控制器对象）成本太高。因此，Android的Handler通过removeMessages的多个重载版本来支持取消操作——它不是移除某个特定的Message对象，而是移除所有符合特定条件的消息。在实践中，这需要遍历所有在调用removeMessages之前插入的消息，并移除匹配项。

当进行前向遍历时，线程只需要一次顺序原子操作来读取当前的栈顶（Head）。之后，使用普通的字段读取即可查找下一条消息。如果Looper线程在移除消息时修改了next字段，那么Looper的写操作与另一个线程的读操作就是不同步的——这在术语上叫作数据竞争（Data Race）。通常，数据竞争是会导致内存泄漏、死循环、崩溃或卡顿的严重Bug。然而，在某些特定的狭窄条件下，数据竞争在Java内存模型（JMM）中是可以被视为"良性（Benign）"的。

假设我们最初的栈结构如下：
```
A -> B -> C -> D
```

我们对栈顶（Head）进行一次原子读取，看到消息A。A的next指针指向B。就在我们处理B的同时，Looper可能会通过更新A的指向，将其依次指向C然后指向D，从而移除B和C。

即便B和C在逻辑上已被移除，B依然保留着指向C的next指针，而C也依然指向D。正在执行读取操作的线程可以继续遍历这些已脱离主链的移除节点，并最终在D点重新回到活跃栈（Live stack）中。

通过这种将DeliQueue设计为能够兼容"遍历"与"移除"之间竞争的方案，我们实现了安全且无锁的迭代操作。

## 5. 退出机制：原生引用计数（Native refcount）

Looper的底层由一个**原生内存分配（Native allocation）**支持，当Looper退出后，必须手动释放该内存。如果当Looper正在退出时，仍有其他线程在尝试添加消息，则可能会发生"释放后使用（Use-After-Free）"的情况，这是一种严重的内存安全违规。我们通过使用标记引用计数（Tagged refcount）来防止这一点，其中原子变量的一个位（Bit）被用来标记Looper是否正在退出。

在访问原生内存之前，线程会先读取这个原子引用计数：

1. 如果**退出位（Quitting bit）**已被设置，则返回Looper正在退出，且不得使用该原生内存。
2. 如果未设置，则尝试通过CAS操作增加正在使用原生内存的活跃线程数。
3. 在完成操作后，线程会减少计数值。如果它在增加计数后、减少计数前，退出位被设置了，且当前计数值减到了0，那么该线程会负责唤醒Looper线程。

当Looper线程准备退出时，它会使用CAS操作在原子变量中设置退出位：

1. 如果引用计数为0，它可以直接释放原生内存。
2. 否则，它会**挂起（Park）**自己，因为它知道当最后一个使用原生内存的线程减少引用计数时，自己会被唤醒。

这种方法确实意味着Looper线程在退出时需要等待其他线程的进度，但这种情况只会发生一次，且不属于性能敏感路径，同时它确保了其他调用原生内存的代码能够保持完全的无锁化。

## 6. 性能优化

### 6.1 无分支编程（Branchless Programming）

DeliQueue实现中广泛使用了无分支编程技术，以减少CPU分支预测失败带来的性能损失。例如，在处理消息优先级时，我们使用位操作而不是条件分支：

```java
// 传统分支实现
if (message.when <= now) {
    return message;
} else {
    return null;
}

// 无分支实现
int mask = (int)(((long)(message.when - now)) >> 63);
return (Message)(((long)mask) & ((long)message));
```

### 6.2 内存访问优化

DeliQueue通过精心设计数据结构布局，最大化CPU缓存利用率：
1. **热点数据集中**：将频繁访问的字段（如next指针、时间戳）放在对象的前几个字节
2. **内存对齐**：确保关键字段按缓存行边界对齐，减少伪共享
3. **预取优化**：在遍历链表时预取下一个节点的数据

### 6.3 性能对比

与传统MessageQueue相比，DeliQueue在各种负载下都表现出显著的性能提升：

| 场景 | 传统MessageQueue | DeliQueue | 性能提升 |
|------|----------------|-----------|----------|
| 高并发插入 | 严重性能下降 | 稳定性能 | 300%+ |
| 混合负载 | 频繁掉帧 | 流畅运行 | 150% |
| 单线程 | 基准性能 | 略微提升 | 10% |

## 7. 兼容性与迁移

### 7.1 行为变更

从Android 17开始，针对Android 17或更高版本开发的应用将采用全新的无锁化android.os.MessageQueue实现。新实现提升了性能并减少了掉帧现象，但可能会导致那些利用反射访问MessageQueue内部的应用代码失效。

在旧版实现中，开发者有时会访问MessageQueue.mMessages等私有字段来检查待处理的消息。而在新的无锁实现中，内部数据结构已完全改变。为了保持二进制兼容性，Android 17保留了mMessages字段，但在新实现中，无论队列中是否有消息，该字段始终为null。

### 7.2 减轻影响

如果您的应用或其依赖项依赖运行时反射来窥探MessageQueue内部，则可能会受到此项更改的影响。请避免使用运行时反射来检查MessageQueue。

如果您使用了一些流行的测试库，则需要更新库版本以兼容新的MessageQueue实现。

### 7.3 测试变更后的行为

即使不更新targetSDK版本，您也可以通过执行以下命令，在Android 17上测试您的应用在这一行为变更下的表现：

```bash
adb am compat enable USE_NEW_MESSAGEQUEUE <your-package-name>
```

如果应用是可调试版本（debuggable build），该命令将在应用中启用无锁MessageQueue。

如果应用的目标版本（targetSDK）为Android 17，新行为将默认启用。如果您在将目标API级别调至17后发现异常行为或崩溃，可以暂时禁用新实现，以验证MessageQueue是否为诱因。

您可以通过以下两种方式之一切换该变更：

1. 开发者选项中的**应用兼容性变更（App Compatibility Changes）**菜单。
2. 运行以下ADB命令：
   ```bash
   adb am compat disable USE_NEW_MESSAGEQUEUE <your-package-name>
   ```

此操作会将您的应用回退到旧版的、基于锁的实现方式，从而帮助您确认问题是否是由消息队列行为变更所导致的。

## 8. 调试与分析

### 8.1 使用Perfetto分析锁争用问题

你可以使用Perfetto来诊断这些问题。在标准的Trace（跟踪）记录中，被监视器锁（monitor lock）阻塞的线程会进入"睡眠（Sleeping）"状态，此时Perfetto会显示一个切片（slice），指明该锁的持有者。

当你查询Trace数据时，请寻找名为"monitor contention with ..."的切片，其后会紧跟持有锁的线程名称以及获取该锁的代码位置。

### 8.2 PerfettoSQL查询示例

#### 查找与掉帧同时发生的MessageQueue锁争用事件
```sql
INCLUDE PERFETTO MODULE android.monitor_contention;
INCLUDE PERFETTO MODULE android.frames.jank_type;

SELECT
  process_name,
  -- Convert duration from nanoseconds to milliseconds
  SUM(dur) / 1000000 AS sum_dur_ms,
  COUNT(*) AS count_contention
FROM android_monitor_contention
WHERE is_blocked_thread_main
AND short_blocked_method LIKE "%MessageQueue%" 

-- Only look at app processes that had jank
AND upid IN (
  SELECT DISTINCT(upid)
  FROM actual_frame_timeline_slice
  WHERE android_is_app_jank_type(jank_type) = TRUE
)
GROUP BY process_name
ORDER BY SUM(dur) DESC;
```

#### 查找应用启动过程中的MessageQueue锁争用
```sql
INCLUDE PERFETTO MODULE android.monitor_contention; 
INCLUDE PERFETTO MODULE android.startup.startups; 

-- Join package and process information for startups
DROP VIEW IF EXISTS startups; 
CREATE VIEW startups AS 
SELECT startup_id, ts, dur, upid 
FROM android_startups 
JOIN android_startup_processes USING(startup_id); 

-- Intersect monitor contention with startups in the same process.
DROP TABLE IF EXISTS monitor_contention_during_startup; 
CREATE VIRTUAL TABLE monitor_contention_during_startup 
USING SPAN_JOIN(android_monitor_contention PARTITIONED upid, startups PARTITIONED upid); 

SELECT 
  process_name, 
  SUM(dur) / 1000000 AS sum_dur_ms, 
  COUNT(*) AS count_contention 
FROM monitor_contention_during_startup 
WHERE is_blocked_thread_main 
AND short_blocked_method LIKE "%MessageQueue%" 
GROUP BY process_name 
ORDER BY SUM(dur) DESC;
```

## 9. 总结

DeliQueue是Android 17中引入的革命性消息队列实现，通过无锁并发机制显著提升了系统性能和响应性。它的核心创新包括：

1. **Treiber栈与最小堆的混合结构**：将消息插入和处理解耦，实现了高效的无锁并发
2. **墓碑机制**：安全地处理消息的异步移除，确保数据结构一致性
3. **良性数据竞争**：在Java内存模型下安全地利用数据竞争实现高效遍历
4. **标记引用计数**：确保Looper退出时的内存安全

这些创新使得DeliQueue在高并发场景下性能提升显著，同时保持了与现有代码的兼容性，为Android系统的流畅运行奠定了坚实基础。