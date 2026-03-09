# Choreographer核心知识_概述与数据结构

## 1. Choreographer概述

### 1.1 定义与职责

Choreographer是Android系统中的"节奏指挥家"，负责协调UI线程的时序，确保动画、输入和绘制操作在正确的时机执行。它通过VSync信号来同步各种UI操作，是保证Android系统流畅性的关键组件。

### 1.2 核心职责

- **VSync信号接收**：接收来自SurfaceFlinger的垂直同步信号
- **回调调度**：将VSync信号转换为Callback，添加到CallbackQueue中
- **时序协调**：确保动画、输入和绘制操作在正确的时机执行
- **帧率管理**：管理帧率，保证流畅性

### 1.3 在Android系统中的位置

Choreographer位于Android Framework层，是连接底层显示系统和上层应用UI的关键桥梁：

```
应用层 (View/动画)
    ↓
Choreographer (时序协调)
    ↓
SurfaceFlinger (显示合成)
    ↓
硬件层 (显示设备)
```

## 2. 核心数据结构

### 2.1 Choreographer类结构

```java
public final class Choreographer {
    // 单例实例
    private static final ThreadLocal<Choreographer> sThreadInstance =
            new ThreadLocal<Choreographer>() {
        @Override
        protected Choreographer initialValue() {
            Looper looper = Looper.myLooper();
            if (looper == null) {
                throw new IllegalStateException("The current thread must have a looper!");
            }
            return new Choreographer(looper);
        }
    };
    
    // 帧回调队列
    private final CallbackQueue mCallbackQueues;
    
    // 帧延迟
    private long mFrameDelayNanos;
    
    // 帧间隔
    private final long mFrameIntervalNanos;
    
    // 显示事件接收器
    private final FrameDisplayEventReceiver mDisplayEventReceiver;
    
    // 帧调度器
    private final FrameHandler mFrameHandler;
}
```

### 2.2 CallbackQueue回调队列

```java
private static final class CallbackQueue {
    // 回调链表头
    private CallbackRecord mHead;
    
    // 添加回调
    public void addCallback(long dueTime, Object action, Object token) {
        CallbackRecord callback = obtainCallbackLocked(dueTime, action, token);
        CallbackRecord entry = mHead;
        if (entry == null) {
            mHead = callback;
        } else {
            while (entry.next != null && entry.dueTime <= dueTime) {
                entry = entry.next;
            }
            callback.next = entry.next;
            entry.next = callback;
        }
    }
    
    // 执行回调
    public void executeCallbacks(long frameTimeNanos) {
        CallbackRecord callbacks = mHead;
        mHead = null;
        while (callbacks != null) {
            CallbackRecord callback = callbacks;
            callbacks = callbacks.next;
            callback.run(frameTimeNanos);
        }
    }
}
```

### 2.3 CallbackRecord回调记录

```java
private static final class CallbackRecord {
    // 回调执行时间
    public long dueTime;
    
    // 回调动作
    public Object action; // Runnable or FrameCallback
    
    // 回调标识
    public Object token;
    
    // 下一个回调
    public CallbackRecord next;
    
    // 执行回调
    public void run(long frameTimeNanos) {
        if (action instanceof FrameCallback) {
            ((FrameCallback) action).doFrame(frameTimeNanos);
        } else {
            ((Runnable) action).run();
        }
    }
}
```

### 2.4 FrameDisplayEventReceiver显示事件接收器

```java
private final class FrameDisplayEventReceiver extends DisplayEventReceiver
        implements Runnable {
    // 是否有VSync事件
    private boolean mHavePendingVsync;
    
    // VSync时间戳
    private long mTimestampNanos;
    
    // 帧序号
    private int mFrame;
    
    @Override
    public void onVsync(long timestampNanos, int builtInDisplayId, int frame) {
        if (builtInDisplayId != SurfaceControl.BUILT_IN_DISPLAY_ID_MAIN) {
            return;
        }
        
        mTimestampNanos = timestampNanos;
        mFrame = frame;
        mHavePendingVsync = true;
        
        // 发送消息到UI线程
        Message msg = Message.obtain(mHandler, this);
        msg.setAsynchronous(true);
        mHandler.sendMessageAtTime(msg, timestampNanos / TimeUtils.NANOS_PER_MS);
    }
    
    @Override
    public void run() {
        mHavePendingVsync = false;
        doFrame(mTimestampNanos, mFrame);
    }
}
```

## 3. 回调类型

### 3.1 回调类型定义

Choreographer支持四种类型的回调，每种类型有不同的优先级：

```java
public static final int CALLBACK_INPUT = 0;     // 输入事件回调
public static final int CALLBACK_ANIMATION = 1; // 动画回调
public static final int CALLBACK_INSETS_ANIMATION = 2; // 插入动画回调
public static final int CALLBACK_TRAVERSAL = 3; // 遍历/绘制回调
public static final int CALLBACK_COMMIT = 4;   // 提交回调

private static final int CALLBACK_LAST = CALLBACK_COMMIT;
private static final int CALLBACK_COUNT = CALLBACK_LAST + 1;
```

### 3.2 回调执行顺序

回调按照以下顺序执行，确保正确的渲染流程：

1. **CALLBACK_INPUT**：处理输入事件
2. **CALLBACK_ANIMATION**：执行动画
3. **CALLBACK_INSETS_ANIMATION**：执行插入动画
4. **CALLBACK_TRAVERSAL**：执行测量、布局、绘制
5. **CALLBACK_COMMIT**：提交帧

### 3.3 回调注册方法

```java
// 注册输入回调
public void postCallback(int callbackType, Runnable action, Object token) {
    postCallbackDelayed(callbackType, action, token, 0);
}

// 延迟注册回调
public void postCallbackDelayed(int callbackType, Runnable action, Object token, long delayMillis) {
    if (action == null) {
        throw new IllegalArgumentException("action must not be null");
    }
    if (callbackType < 0 || callbackType > CALLBACK_LAST) {
        throw new IllegalArgumentException("callbackType is invalid");
    }
    
    postCallbackDelayedInternal(callbackType, action, token, delayMillis);
}

// 注册帧回调
public void postFrameCallback(FrameCallback callback) {
    postFrameCallbackDelayed(callback, 0);
}

// 延迟注册帧回调
public void postFrameCallbackDelayed(FrameCallback callback, long delayMillis) {
    if (callback == null) {
        throw new IllegalArgumentException("callback must not be null");
    }
    
    postCallbackDelayedInternal(CALLBACK_ANIMATION, callback, FRAME_CALLBACK_TOKEN, delayMillis);
}
```

## 4. 帧处理流程

### 4.1 帧处理主循环

```java
void doFrame(long frameTimeNanos, int frame) {
    final long startNanos;
    synchronized (mLock) {
        if (!mFrameScheduled) {
            return; // 没有计划的帧
        }
        
        startNanos = System.nanoTime();
        final long jitterNanos = startNanos - frameTimeNanos;
        if (jitterNanos >= mFrameIntervalNanos) {
            // 帧延迟，计算跳过的帧数
            final long skippedFrames = jitterNanos / mFrameIntervalNanos;
            if (skippedFrames >= SKIPPED_FRAME_WARNING_LIMIT) {
                Log.i(TAG, "Skipped " + skippedFrames + " frames!  "
                        + "The application may be doing too much work on its main thread.");
            }
            frameTimeNanos += skippedFrames * mFrameIntervalNanos;
        }
        
        // 重置帧计划标志
        mFrameScheduled = false;
        mLastFrameTimeNanos = frameTimeNanos;
    }
    
    try {
        // 执行所有回调
        Trace.traceBegin(Trace.TRACE_TAG_VIEW, "Choreographer#doFrame");
        mFrameInfo.markInputHandlingStart();
        doCallbacks(Choreographer.CALLBACK_INPUT, frameTimeNanos);
        
        mFrameInfo.markAnimationsStart();
        doCallbacks(Choreographer.CALLBACK_ANIMATION, frameTimeNanos);
        doCallbacks(Choreographer.CALLBACK_INSETS_ANIMATION, frameTimeNanos);
        
        mFrameInfo.markTraversalsStart();
        doCallbacks(Choreographer.CALLBACK_TRAVERSAL, frameTimeNanos);
        
        doCallbacks(Choreographer.CALLBACK_COMMIT, frameTimeNanos);
    } finally {
        Trace.traceEnd(Trace.TRACE_TAG_VIEW);
    }
    
    // 计划下一帧
    if (DEBUG) {
        Log.d(TAG, "Frame " + frame + ": Finished, took " + 
              (System.nanoTime() - startNanos) + " ns, interval " + 
              (frameTimeNanos - mLastFrameTimeNanos) + " ns");
    }
}
```

### 4.2 VSync信号处理

```java
// 请求VSync信号
private void scheduleVsyncLocked() {
    if (!mFrameScheduled) {
        mFrameScheduled = true;
        mDisplayEventReceiver.scheduleVsync();
    }
}

// VSync信号到达处理
@Override
public void onVsync(long timestampNanos, int builtInDisplayId, int frame) {
    // 忽略非主显示器的VSync信号
    if (builtInDisplayId != SurfaceControl.BUILT_IN_DISPLAY_ID_MAIN) {
        return;
    }
    
    // 记录VSync信息
    mTimestampNanos = timestampNanos;
    mFrame = frame;
    mHavePendingVsync = true;
    
    // 发送异步消息到UI线程
    Message msg = Message.obtain(mHandler, this);
    msg.setAsynchronous(true);
    mHandler.sendMessageAtTime(msg, timestampNanos / TimeUtils.NANOS_PER_MS);
}
```

## 5. 性能监控与调试

### 5.1 帧率监控

```java
// 获取帧率信息
public void getFrameInfo(FrameInfo frameInfo) {
    frameInfo.set(mFrameInfo);
}

// 帧信息数据结构
public static final class FrameInfo {
    // 帧时间戳
    public long frameTimeNanos;
    
    // 输入处理开始时间
    public long inputHandlingStartNanos;
    
    // 动画开始时间
    public long animationsStartNanos;
    
    // 遍历开始时间
    public long traversalsStartNanos;
    
    // 帧标志
    public int frameFlags;
    
    // 设置帧信息
    public void set(FrameInfo other) {
        frameTimeNanos = other.frameTimeNanos;
        inputHandlingStartNanos = other.inputHandlingStartNanos;
        animationsStartNanos = other.animationsStartNanos;
        traversalsStartNanos = other.traversalsStartNanos;
        frameFlags = other.frameFlags;
    }
}
```

### 5.2 调试工具

```java
// 转储Choreographer状态
public void dump(String prefix, PrintWriter writer) {
    writer.print(prefix); writer.println("Choreographer State:");
    
    writer.print(prefix); writer.print("mFrameScheduled="); 
    writer.println(mFrameScheduled);
    
    writer.print(prefix); writer.print("mLastFrameTimeNanos="); 
    writer.println(mLastFrameTimeNanos);
    
    writer.print(prefix); writer.print("mFrameIntervalNanos="); 
    writer.println(mFrameIntervalNanos);
    
    // 转储回调队列
    for (int i = 0; i < CALLBACK_COUNT; i++) {
        writer.print(prefix); writer.print("CallbackQueue "); 
        writer.print(i); writer.println(":");
        mCallbackQueues[i].dump(prefix + "  ", writer);
    }
}
```

## 6. 常见问题与解决方案

### 6.1 帧丢失问题

**问题表现**：
- 应用出现卡顿
- 日志显示"Skipped X frames!"警告

**原因分析**：
- 主线程执行时间过长
- 布局层次过深
- 过度绘制

**解决方案**：
- 优化主线程操作
- 减少布局层次
- 使用性能分析工具定位瓶颈

### 6.2 VSync信号丢失

**问题表现**：
- 动画不流畅
- 输入响应延迟

**原因分析**：
- 显示设备问题
- 系统负载过高
- SurfaceFlinger异常

**解决方案**：
- 检查显示设备连接
- 优化系统性能
- 重启显示系统服务

### 6.3 回调执行延迟

**问题表现**：
- 回调执行时间不准确
- 动画节奏异常

**原因分析**：
- 回调执行时间过长
- 回调队列积压
- 线程调度问题

**解决方案**：
- 优化回调执行逻辑
- 减少回调数量
- 使用异步处理

## 7. 最佳实践

### 7.1 回调使用建议

1. **合理使用回调类型**：
   - 输入处理使用CALLBACK_INPUT
   - 动画使用CALLBACK_ANIMATION
   - 布局绘制使用CALLBACK_TRAVERSAL

2. **避免在回调中执行耗时操作**：
   - 保持回调执行时间短
   - 将耗时操作放到后台线程

3. **及时取消不需要的回调**：
   - 使用removeCallbacks取消回调
   - 避免内存泄漏

### 7.2 性能优化建议

1. **减少回调数量**：
   - 合并相似的回调
   - 使用批量处理

2. **优化回调执行顺序**：
   - 合理安排回调优先级
   - 避免不必要的依赖

3. **监控性能指标**：
   - 定期检查帧率
   - 使用性能分析工具

## 8. 总结

Choreographer是Android系统中负责UI时序协调的关键组件，通过VSync信号同步各种UI操作，确保系统流畅性。理解其工作原理和数据结构对于开发高性能Android应用至关重要。通过合理使用回调机制和性能监控，可以有效提升应用的用户体验。