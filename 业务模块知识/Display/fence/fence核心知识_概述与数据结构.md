# fence核心知识：概述与数据结构

## 1. 模块概述

fence（栅栏）是Android图形系统中用于同步GPU和CPU操作的重要机制。它确保图形操作按照正确的顺序执行，防止数据竞争和渲染错误。fence机制在Android显示系统中扮演着关键的角色，特别是在BufferQueue、SurfaceFlinger和GPU驱动之间的同步。

### 1.1 核心职责
- **操作同步**：确保GPU和CPU操作的执行顺序
- **缓冲区管理**：控制图形缓冲区的生命周期和状态转换
- **性能优化**：通过异步操作减少等待时间
- **错误检测**：检测和报告同步相关的错误

### 1.2 系统架构位置
```
应用层 (App) → 框架层 (Framework) → SurfaceFlinger → HWC → GPU驱动 → fence机制
```

## 2. 主要数据结构

### 2.1 核心类结构

#### 2.1.1 Fence类层次结构
```cpp
// Fence基类
class Fence {
public:
    virtual ~Fence() = default;
    
    // 等待fence信号
    virtual status_t wait(int timeout) = 0;
    
    // 检查fence是否已信号
    virtual status_t waitForever(const char* logname) = 0;
    
    // 获取fence文件描述符
    virtual int getFd() const = 0;
    
    // 合并多个fence
    static sp<Fence> merge(const String8& name, const sp<Fence>& f1, const sp<Fence>& f2);
    
    // 创建fence
    static sp<Fence> create(const String8& name, int fd);
};

// 具体Fence实现
class FenceImpl : public Fence {
private:
    int mFd;                    // fence文件描述符
    String8 mName;              // fence名称
    mutable Mutex mMutex;       // 互斥锁
    
public:
    FenceImpl(const String8& name, int fd);
    ~FenceImpl();
    
    status_t wait(int timeout) override;
    status_t waitForever(const char* logname) override;
    int getFd() const override { return mFd; }
};
```

#### 2.1.2 Sync Timeline和Sync Point
```cpp
// 同步时间线
struct sync_timeline {
    struct kref kref;           // 引用计数
    const char* name;           // 时间线名称
    struct list_head child_list_head; // 子节点列表
    spinlock_t child_list_lock; // 子节点列表锁
    int context;                // 上下文
    int value;                  // 当前值
};

// 同步点
struct sync_pt {
    struct fence base;          // 基础fence结构
    struct sync_timeline *parent; // 父时间线
    struct list_head child_list; // 子节点列表
    int timestamp;              // 时间戳
};
```

#### 2.1.3 Android Native Fence (ANativeFence)
```cpp
// Android原生fence结构
struct ANativeFence {
    int fd;                     // fence文件描述符
    bool owned;                 // 是否拥有fence
    
    ANativeFence(int fenceFd, bool takeOwnership);
    ~ANativeFence();
    
    // 等待fence信号
    int wait(int timeout);
    
    // 获取状态
    int getStatus();
    
    // 合并fence
    static ANativeFence* merge(const ANativeFence* f1, const ANativeFence* f2);
};
```

### 2.2 核心接口

#### 2.2.1 Fence时间线管理接口
```cpp
// fence时间线管理接口
class FenceTimeline {
public:
    // 创建新的时间线
    static sp<FenceTimeline> createTimeline(const char* name);
    
    // 在时间线上创建fence
    sp<Fence> createFence(int point);
    
    // 递增时间线
    void incrementTimeline(int increment);
    
    // 获取当前时间线值
    int getCurrentPoint() const;
    
    // 等待时间线到达指定点
    status_t waitForPoint(int point, int timeout);
};
```

#### 2.2.2 BufferQueue fence接口
```cpp
// BufferQueue中的fence管理
class BufferQueueFenceManager {
private:
    std::map<int, sp<Fence>> mAcquireFences;    // 获取fence映射
    std::map<int, sp<Fence>> mReleaseFences;    // 释放fence映射
    mutable Mutex mMutex;                       // 互斥锁
    
public:
    // 设置获取fence
    status_t setAcquireFence(int slot, const sp<Fence>& fence);
    
    // 获取获取fence
    sp<Fence> getAcquireFence(int slot) const;
    
    // 设置释放fence
    status_t setReleaseFence(int slot, const sp<Fence>& fence);
    
    // 获取释放fence
    sp<Fence> getReleaseFence(int slot) const;
    
    // 等待所有fence信号
    status_t waitForAllFences(int timeout);
};
```

## 3. fence类型与状态

### 3.1 fence类型分类

#### 3.1.1 按功能分类
- **Acquire Fence**：缓冲区获取fence，确保缓冲区可读
- **Release Fence**：缓冲区释放fence，确保缓冲区可写
- **Retire Fence**：缓冲区退役fence，确保缓冲区可重用
- **Present Fence**：显示fence，确保显示操作完成

#### 3.1.2 按生命周期分类
- **临时fence**：短期使用的fence，生命周期短暂
- **持久fence**：长期存在的fence，需要手动管理
- **合并fence**：由多个fence合并而成

### 3.2 fence状态机

#### 3.2.1 fence状态转换
```
未信号 (UNSIGNALED) → 信号 (SIGNALED) → 错误 (ERROR)
         ↓                ↓              ↓
     等待超时         操作完成       操作失败
```

#### 3.2.2 fence状态定义
```cpp
enum FenceStatus {
    FENCE_STATUS_UNSIGNALED = 0,    // 未信号
    FENCE_STATUS_SIGNALED = 1,      // 已信号
    FENCE_STATUS_ERROR = -1,        // 错误
    FENCE_STATUS_UNKNOWN = -2        // 未知
};
```

## 4. 关键同步机制

### 4.1 缓冲区状态同步

#### 4.1.1 缓冲区状态与fence关系
```cpp
enum BufferState {
    FREE = 0,              // 空闲状态，无fence
    DEQUEUED = 1,          // 已出队，有acquire fence
    QUEUED = 2,            // 已入队，有release fence
    ACQUIRED = 3,          // 已获取，等待处理
    RELEASED = 4           // 已释放，可重用
};
```

#### 4.1.2 fence与缓冲区生命周期
```
缓冲区创建 → 出队(acquire fence) → 入队(release fence) → 获取 → 释放 → 重用
```

### 4.2 GPU-CPU同步机制

#### 4.2.1 GPU操作fence
```cpp
// GPU操作fence管理
class GpuFenceManager {
public:
    // 创建GPU操作fence
    sp<Fence> createGpuOperationFence(GpuOperationType type);
    
    // 等待GPU操作完成
    status_t waitForGpuOperation(const sp<Fence>& fence, int timeout);
    
    // 信号GPU操作完成
    status_t signalGpuOperationComplete(const sp<Fence>& fence);
};
```

#### 4.2.2 渲染管线同步
```cpp
// 渲染管线fence同步
class RenderPipelineFenceSync {
private:
    std::vector<sp<Fence>> mRenderFences;      // 渲染fence
    std::vector<sp<Fence>> mPresentFences;      // 显示fence
    
public:
    // 添加渲染fence
    void addRenderFence(const sp<Fence>& fence);
    
    // 添加显示fence
    void addPresentFence(const sp<Fence>& fence);
    
    // 等待所有渲染完成
    status_t waitForAllRenders(int timeout);
    
    // 等待所有显示完成
    status_t waitForAllPresents(int timeout);
};
```

## 5. fence性能指标

### 5.1 同步性能指标
- **fence等待时间**：等待fence信号的平均时间
- **fence创建开销**：创建fence的时间消耗
- **fence合并效率**：合并操作的性能影响
- **同步延迟**：整体同步机制的延迟

### 5.2 资源使用指标
- **活跃fence数量**：当前活跃的fence数量
- **fence内存占用**：fence相关数据结构的内存使用
- **文件描述符使用**：fence占用的文件描述符数量

通过以上详细的数据结构和机制分析，我们可以深入理解fence在Android图形系统中的核心作用和工作原理。