# Choreographer核心知识_接口与运转流程

## 1. 核心接口

### 1.1 主要接口定义

Choreographer提供了一系列接口供应用开发者使用，主要包括回调注册、帧率控制和性能监控等功能。

#### 1.1.1 回调注册接口

```java
public final class Choreographer {
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
}
```

#### 1.1.2 回调移除接口

```java
// 移除指定回调
public void removeCallbacks(int callbackType, Runnable action, Object token) {
    if (action == null) {
        throw new IllegalArgumentException("action must not be null");
    }
    if (callbackType < 0 || callbackType > CALLBACK_LAST) {
        throw new IllegalArgumentException("callbackType is invalid");
    }
    
    removeCallbacksInternal(callbackType, action, token);
}

// 移除帧回调
public void removeFrameCallback(FrameCallback callback) {
    if (callback == null) {
        throw new IllegalArgumentException("callback must not be null");
    }
    
    removeCallbacksInternal(CALLBACK_ANIMATION, callback, FRAME_CALLBACK_TOKEN);
}

// 移除所有回调
public void removeCallbacks() {
    removeCallbacksInternal(CALLBACK_INPUT, null, null);
    removeCallbacksInternal(CALLBACK_ANIMATION, null, null);
    removeCallbacksInternal(CALLBACK_INSETS_ANIMATION, null, null);
    removeCallbacksInternal(CALLBACK_TRAVERSAL, null, null);
    removeCallbacksInternal(CALLBACK_COMMIT, null, null);
}
```

#### 1.1.3 帧率控制接口

```java
// 设置帧延迟
public void setFrameDelay(long delayMillis) {
    if (delayMillis < 0) {
        throw new IllegalArgumentException("delayMillis must be non-negative");
    }
    
    mFrameDelayNanos = delayMillis * TimeUtils.NANOS_PER_MS;
}

// 获取帧延迟
public long getFrameDelay() {
    return mFrameDelayNanos / TimeUtils.NANOS_PER_MS;
}

// 获取帧间隔
public long getFrameIntervalNanos() {
    return mFrameIntervalNanos;
}
```

#### 1.1.4 性能监控接口

```java
// 获取帧信息
public void getFrameInfo(FrameInfo frameInfo) {
    if (frameInfo == null) {
        throw new IllegalArgumentException("frameInfo must not be null");
    }
    
    frameInfo.set(mFrameInfo);
}

// 帧信息数据结构
public static final class FrameInfo {
    public long frameTimeNanos;
    public long inputHandlingStartNanos;
    public long animationsStartNanos;
    public long traversalsStartNanos;
    public int frameFlags;
    
    public void set(FrameInfo other) {
        frameTimeNanos = other.frameTimeNanos;
        inputHandlingStartNanos = other.inputHandlingStartNanos;
        animationsStartNanos = other.animationsStartNanos;
        traversalsStartNanos = other.traversalsStartNanos;
        frameFlags = other.frameFlags;
    }
}
```

### 1.2 回调类型接口

#### 1.2.1 FrameCallback接口

```java
// 帧回调接口
public interface FrameCallback {
    /**
     * 帧回调方法
     * @param frameTimeNanos 帧时间戳（纳秒）
     */
    void doFrame(long frameTimeNanos);
}
```

#### 1.2.2 回调类型常量

```java
// 回调类型定义
public static final int CALLBACK_INPUT = 0;             // 输入事件回调
public static final int CALLBACK_ANIMATION = 1;          // 动画回调
public static final int CALLBACK_INSETS_ANIMATION = 2;    // 插入动画回调
public static final int CALLBACK_TRAVERSAL = 3;          // 遍历/绘制回调
public static final int CALLBACK_COMMIT = 4;             // 提交回调

// 回调类型范围
public static final int CALLBACK_LAST = CALLBACK_COMMIT;
public static final int CALLBACK_COUNT = CALLBACK_LAST + 1;
```

## 2. 运转流程

### 2.1 初始化流程

Choreographer的初始化流程如下：

```java
// Choreographer构造函数
private Choreographer(Looper looper, int vsyncSource) {
    mLooper = looper;
    mHandler = new FrameHandler(looper);
    mDisplayEventReceiver = USE_VSYNC ? new FrameDisplayEventReceiver(looper, vsyncSource) : null;
    mLastFrameTimeNanos = Long.MIN_VALUE;
    
    // 计算帧间隔（60fps对应16.67ms）
    mFrameIntervalNanos = (long)(1000000000 / getRefreshRate());
    
    // 初始化回调队列
    mCallbackQueues = new CallbackQueue[CALLBACK_COUNT];
    for (int i = 0; i < CALLBACK_COUNT; i++) {
        mCallbackQueues[i] = new CallbackQueue();
    }
    
    // 设置帧延迟
    setFrameDelay(VSYNC_FRAME_DELAY);
}
```

### 2.2 回调注册流程

#### 2.2.1 回调注册详细流程

```java
// 内部回调注册方法
private void postCallbackDelayedInternal(int callbackType, Object action, Object token, long delayMillis) {
    if (DEBUG_FRAMES) {
        Log.d(TAG, "PostCallback: type=" + callbackType + ", action=" + action + ", token=" + token
                + ", delayMillis=" + delayMillis);
    }
    
    synchronized (mLock) {
        final long now = SystemClock.uptimeMillis();
        final long dueTime = now + delayMillis;
        
        // 添加回调到对应类型的队列
        mCallbackQueues[callbackType].addCallbackLocked(dueTime, action, token);
        
        // 根据到期时间决定处理方式
        if (dueTime <= now) {
            // 立即执行，请求VSync信号
            scheduleFrameLocked(now);
        } else {
            // 延迟执行，发送延迟消息
            Message msg = mHandler.obtainMessage(MSG_DO_SCHEDULE_CALLBACK, callbackType, 0);
            mHandler.sendMessageAtTime(msg, dueTime);
        }
    }
}
```

#### 2.2.2 回调队列添加流程

```java
// CallbackQueue的addCallbackLocked方法
void addCallbackLocked(long dueTime, Object action, Object token) {
    CallbackRecord callback = obtainCallbackLocked(dueTime, action, token);
    CallbackRecord entry = mHead;
    
    // 按时间顺序插入回调
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
```

### 2.3 VSync信号处理流程

#### 2.3.1 VSync信号接收

```java
// FrameDisplayEventReceiver接收VSync信号
private final class FrameDisplayEventReceiver extends DisplayEventReceiver
        implements Runnable {
    private boolean mHavePendingVsync;
    private long mTimestampNanos;
    private int mFrame;
    
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
    
    @Override
    public void run() {
        mHavePendingVsync = false;
        doFrame(mTimestampNanos, mFrame);
    }
}
```

#### 2.3.2 VSync信号请求

```java
// 请求VSync信号
private void scheduleVsyncLocked() {
    if (mFrameScheduled) {
        return;
    }
    
    mFrameScheduled = true;
    if (USE_VSYNC) {
        if (DEBUG_FRAMES) {
            Log.d(TAG, "Scheduling vsync");
        }
        
        // 请求VSync信号
        mDisplayEventReceiver.scheduleVsync();
    } else {
        // 模拟VSync信号
        final long now = System.nanoTime();
        final long nextFrameTime = Math.max(
                mLastFrameTimeNanos / TimeUtils.NANOS_PER_MS + mFrameIntervalNanos,
                now);
        
        if (DEBUG_FRAMES) {
            Log.d(TAG, "Scheduling next frame in " + ((nextFrameTime - now) * 0.000001f) + " ms");
        }
        
        Message msg = mHandler.obtainMessage(MSG_DO_FRAME);
        msg.setAsynchronous(true);
        mHandler.sendMessageAtTime(msg, nextFrameTime / TimeUtils.NANOS_PER_MS);
    }
}
```

### 2.4 帧处理流程

#### 2.4.1 帧处理主流程

```java
// 帧处理主方法
void doFrame(long frameTimeNanos, int frame) {
    final long startNanos;
    synchronized (mLock) {
        if (!mFrameScheduled) {
            return; // 没有计划的帧
        }
        
        startNanos = System.nanoTime();
        
        // 计算帧延迟
        final long jitterNanos = startNanos - frameTimeNanos;
        if (jitterNanos >= mFrameIntervalNanos) {
            // 帧延迟，计算跳过的帧数
            final long skippedFrames = jitterNanos / mFrameIntervalNanos;
            if (skippedFrames >= SKIPPED_FRAME_WARNING_LIMIT) {
                Log.i(TAG, "Skipped " + skippedFrames + " frames!  " +
                        "The application may be doing too much work on its main thread.");
            }
            frameTimeNanos += skippedFrames * mFrameIntervalNanos;
        }
        
        // 重置帧计划标志
        mFrameScheduled = false;
        mLastFrameTimeNanos = frameTimeNanos;
    }
    
    try {
        // 开始性能追踪
        Trace.traceBegin(Trace.TRACE_TAG_VIEW, "Choreographer#doFrame");
        
        // 更新帧信息
        mFrameInfo.setVsync(frameTimeNanos, frame);
        
        // 执行各种类型的回调
        mFrameInfo.markInputHandlingStart();
        doCallbacks(Choreographer.CALLBACK_INPUT, frameTimeNanos);
        
        mFrameInfo.markAnimationsStart();
        doCallbacks(Choreographer.CALLBACK_ANIMATION, frameTimeNanos);
        doCallbacks(Choreographer.CALLBACK_INSETS_ANIMATION, frameTimeNanos);
        
        mFrameInfo.markTraversalsStart();
        doCallbacks(Choreographer.CALLBACK_TRAVERSAL, frameTimeNanos);
        
        doCallbacks(Choreographer.CALLBACK_COMMIT, frameTimeNanos);
    } finally {
        // 结束性能追踪
        Trace.traceEnd(Trace.TRACE_TAG_VIEW);
    }
    
    if (DEBUG_FRAMES) {
        final long endNanos = System.nanoTime();
        Log.d(TAG, "Frame " + frame + ": Finished, took " + 
              (endNanos - startNanos) * 0.000001f + " ms, interval " + 
              (frameTimeNanos - mLastFrameTimeNanos) * 0.000001f + " ms");
    }
}
```

#### 2.4.2 回调执行流程

```java
// 执行指定类型的回调
void doCallbacks(int callbackType, long frameTimeNanos) {
    CallbackRecord callbacks;
    synchronized (mLock) {
        // 提取到期的回调
        callbacks = mCallbackQueues[callbackType].extractDueCallbacksLocked(
                frameTimeNanos / TimeUtils.NANOS_PER_MS);
    }
    
    if (callbacks == null) {
        return;
    }
    
    // 执行回调
    for (CallbackRecord c = callbacks; c != null; c = c.next) {
        if (DEBUG_FRAMES) {
            Log.d(TAG, "Running callback: " + c + ", due=" + (c.dueTime * 0.001f) + "ms");
        }
        
        try {
            c.run(frameTimeNanos);
        } catch (Exception e) {
            Log.e(TAG, "Exception while executing callback: " + c, e);
        }
    }
}
```

### 2.5 回调移除流程

#### 2.5.1 回调移除详细流程

```java
// 内部回调移除方法
private void removeCallbacksInternal(int callbackType, Object action, Object token) {
    if (callbackType < 0 || callbackType > CALLBACK_LAST) {
        return;
    }
    
    synchronized (mLock) {
        mCallbackQueues[callbackType].removeCallbacksLocked(action, token);
    }
}
```

#### 2.5.2 回调队列移除流程

```java
// CallbackQueue的removeCallbacksLocked方法
void removeCallbacksLocked(Object action, Object token) {
    CallbackRecord predecessor = null;
    CallbackRecord callback = mHead;
    
    while (callback != null) {
        final CallbackRecord next = callback.next;
        
        // 检查是否匹配
        boolean isCallbackMatched = (action == null || callback.action == action) &&
                                  (token == null || callback.token == token);
        
        if (isCallbackMatched) {
            // 移除回调
            if (predecessor != null) {
                predecessor.next = next;
            } else {
                mHead = next;
            }
            
            // 回收回调记录
            recycleCallbackLocked(callback);
        } else {
            predecessor = callback;
        }
        
        callback = next;
    }
}
```

## 3. 性能优化流程

### 3.1 帧跳过处理

```java
// 帧跳过检测和处理
final long jitterNanos = startNanos - frameTimeNanos;
if (jitterNanos >= mFrameIntervalNanos) {
    final long skippedFrames = jitterNanos / mFrameIntervalNanos;
    if (skippedFrames >= SKIPPED_FRAME_WARNING_LIMIT) {
        Log.i(TAG, "Skipped " + skippedFrames + " frames!  " +
                "The application may be doing too much work on its main thread.");
    }
    
    // 调整帧时间戳，跳过一些帧
    frameTimeNanos += skippedFrames * mFrameIntervalNanos;
}
```

### 3.2 异步消息处理

```java
// 发送异步消息提高响应速度
Message msg = Message.obtain(mHandler, this);
msg.setAsynchronous(true); // 设置为异步消息，优先处理
mHandler.sendMessageAtTime(msg, timestampNanos / TimeUtils.NANOS_PER_MS);
```

### 3.3 对象池管理

```java
// 获取回调记录对象
private static CallbackRecord obtainCallbackLocked(long dueTime, Object action, Object token) {
    CallbackRecord callback = sCallbackRecordPool.acquire();
    if (callback == null) {
        callback = new CallbackRecord();
    }
    callback.dueTime = dueTime;
    callback.action = action;
    callback.token = token;
    return callback;
}

// 回收回调记录对象
private void recycleCallbackLocked(CallbackRecord callback) {
    callback.action = null;
    callback.token = null;
    callback.next = null;
    sCallbackRecordPool.release(callback);
}
```

## 4. 调试与监控流程

### 4.1 性能监控

```java
// 帧信息更新
public void getFrameInfo(FrameInfo frameInfo) {
    if (frameInfo == null) {
        throw new IllegalArgumentException("frameInfo must not be null");
    }
    
    frameInfo.set(mFrameInfo);
}

// 帧信息记录
public static final class FrameInfo {
    public long frameTimeNanos;
    public long inputHandlingStartNanos;
    public long animationsStartNanos;
    public long traversalsStartNanos;
    public int frameFlags;
    
    // 标记输入处理开始
    public void markInputHandlingStart() {
        inputHandlingStartNanos = System.nanoTime();
    }
    
    // 标记动画开始
    public void markAnimationsStart() {
        animationsStartNanos = System.nanoTime();
    }
    
    // 标记遍历开始
    public void markTraversalsStart() {
        traversalsStartNanos = System.nanoTime();
    }
}
```

### 4.2 状态转储

```java
// 转储Choreographer状态
public void dump(String prefix, PrintWriter writer) {
    writer.print(prefix); writer.println("Choreographer State:");
    
    // 转储基本信息
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

## 5. 常见问题与解决方案

### 5.1 回调不执行

**问题表现**：注册的回调没有执行

**可能原因**：
- 没有请求VSync信号
- 回调类型不正确
- 回调被意外移除

**解决方案**：
```java
// 确保正确请求VSync信号
scheduleFrameLocked(now);

// 检查回调类型
if (callbackType < 0 || callbackType > CALLBACK_LAST) {
    throw new IllegalArgumentException("callbackType is invalid");
}

// 检查回调是否被移除
if (mCallbackQueues[callbackType].hasDueCallbacksLocked(frameTimeNanos)) {
    // 执行回调
}
```

### 5.2 帧率不稳定

**问题表现**：动画不流畅，帧率波动

**可能原因**：
- 主线程执行时间过长
- 回调执行顺序不正确
- VSync信号丢失

**解决方案**：
```java
// 优化主线程操作
private void doFrame(long frameTimeNanos, int frame) {
    // 使用性能追踪监控执行时间
    Trace.traceBegin(Trace.TRACE_TAG_VIEW, "Choreographer#doFrame");
    try {
        // 执行回调
        doCallbacks(Choreographer.CALLBACK_INPUT, frameTimeNanos);
        doCallbacks(Choreographer.CALLBACK_ANIMATION, frameTimeNanos);
        doCallbacks(Choreographer.CALLBACK_TRAVERSAL, frameTimeNanos);
    } finally {
        Trace.traceEnd(Trace.TRACE_TAG_VIEW);
    }
}
```

### 5.3 内存泄漏

**问题表现**：应用内存持续增长

**可能原因**：
- 回调没有正确移除
- 对象池管理不当

**解决方案**：
```java
// 正确移除回调
public void removeCallbacks() {
    synchronized (mLock) {
        for (int i = 0; i < CALLBACK_COUNT; i++) {
            mCallbackQueues[i].removeCallbacksLocked(null, null);
        }
    }
}

// 正确管理对象池
private void recycleCallbackLocked(CallbackRecord callback) {
    callback.action = null;
    callback.token = null;
    callback.next = null;
    sCallbackRecordPool.release(callback);
}
```

## 6. 总结

Choreographer的接口与运转流程体现了Android系统在UI时序控制方面的精妙设计。通过提供简洁的回调接口、高效的VSync信号处理机制和完善的性能监控功能，Choreographer确保了Android系统的流畅性和稳定性。理解其接口和运转流程对于开发高性能Android应用和解决UI相关问题具有重要意义。