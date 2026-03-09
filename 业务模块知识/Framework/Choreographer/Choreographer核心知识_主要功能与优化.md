# Choreographer核心知识_主要功能与优化

## 1. 主要功能

### 1.1 VSync信号同步

Choreographer的核心功能是通过VSync信号同步UI操作，确保所有UI更新与显示刷新保持一致。

#### 1.1.1 VSync信号接收

```java
// FrameDisplayEventReceiver接收VSync信号
private final class FrameDisplayEventReceiver extends DisplayEventReceiver {
    @Override
    public void onVsync(long timestampNanos, int builtInDisplayId, int frame) {
        // 只处理主显示器的VSync信号
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
}
```

#### 1.1.2 VSync信号请求

```java
// 请求VSync信号
private void scheduleVsyncLocked() {
    if (mFrameScheduled) {
        return;
    }
    
    mFrameScheduled = true;
    if (USE_VSYNC) {
        // 请求硬件VSync信号
        mDisplayEventReceiver.scheduleVsync();
    } else {
        // 模拟VSync信号
        final long now = System.nanoTime();
        final long nextFrameTime = Math.max(
                mLastFrameTimeNanos / TimeUtils.NANOS_PER_MS + mFrameIntervalNanos,
                now);
        
        Message msg = mHandler.obtainMessage(MSG_DO_FRAME);
        msg.setAsynchronous(true);
        mHandler.sendMessageAtTime(msg, nextFrameTime / TimeUtils.NANOS_PER_MS);
    }
}
```

### 1.2 回调调度

Choreographer提供了分层回调机制，按优先级执行不同类型的UI操作。

#### 1.2.1 回调类型与优先级

```java
// 回调类型定义
public static final int CALLBACK_INPUT = 0;             // 输入事件回调
public static final int CALLBACK_ANIMATION = 1;          // 动画回调
public static final int CALLBACK_INSETS_ANIMATION = 2;    // 插入动画回调
public static final int CALLBACK_TRAVERSAL = 3;          // 遍历/绘制回调
public static final int CALLBACK_COMMIT = 4;             // 提交回调

// 回调执行顺序
void doFrame(long frameTimeNanos, int frame) {
    // 1. 处理输入事件
    mFrameInfo.markInputHandlingStart();
    doCallbacks(Choreographer.CALLBACK_INPUT, frameTimeNanos);
    
    // 2. 执行动画
    mFrameInfo.markAnimationsStart();
    doCallbacks(Choreographer.CALLBACK_ANIMATION, frameTimeNanos);
    doCallbacks(Choreographer.CALLBACK_INSETS_ANIMATION, frameTimeNanos);
    
    // 3. 执行测量、布局、绘制
    mFrameInfo.markTraversalsStart();
    doCallbacks(Choreographer.CALLBACK_TRAVERSAL, frameTimeNanos);
    
    // 4. 提交帧
    doCallbacks(Choreographer.CALLBACK_COMMIT, frameTimeNanos);
}
```

#### 1.2.2 回调队列管理

```java
// 回调队列管理
private static final class CallbackQueue {
    private CallbackRecord mHead;
    
    // 添加回调
    public void addCallbackLocked(long dueTime, Object action, Object token) {
        CallbackRecord callback = obtainCallbackLocked(dueTime, action, token);
        CallbackRecord entry = mHead;
        
        // 按时间顺序插入
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
    
    // 提取到期回调
    public CallbackRecord extractDueCallbacksLocked(long now) {
        CallbackRecord callbacks = null;
        CallbackRecord last = null;
        CallbackRecord next = mHead;
        
        while (next != null && next.dueTime <= now) {
            CallbackRecord curr = next;
            next = curr.next;
            curr.next = null;
            
            if (callbacks == null) {
                callbacks = curr;
            } else {
                last.next = curr;
            }
            last = curr;
        }
        
        mHead = next;
        return callbacks;
    }
}
```

### 1.3 帧率控制

Choreographer提供帧率控制功能，确保UI更新的稳定性。

#### 1.3.1 帧间隔计算

```java
// 计算帧间隔
private Choreographer(Looper looper, int vsyncSource) {
    // 计算帧间隔（60fps对应16.67ms）
    mFrameIntervalNanos = (long)(1000000000 / getRefreshRate());
    
    // 设置帧延迟
    setFrameDelay(VSYNC_FRAME_DELAY);
}

// 获取刷新率
private float getRefreshRate() {
    DisplayInfo displayInfo = new DisplayInfo();
    mDisplay.getDisplayInfo(displayInfo);
    return displayInfo.refreshRate;
}
```

#### 1.3.2 帧跳过处理

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

### 1.4 性能监控

Choreographer提供性能监控功能，帮助开发者分析UI性能问题。

#### 1.4.1 帧信息收集

```java
// 帧信息数据结构
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

#### 1.4.2 性能追踪

```java
// 性能追踪
void doFrame(long frameTimeNanos, int frame) {
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
}
```

## 2. 性能优化

### 2.1 回调执行优化

#### 2.1.1 批量执行

Choreographer采用批量执行策略，减少线程切换开销：

```java
// 批量执行同一类型的回调
void doCallbacks(int callbackType, long frameTimeNanos) {
    CallbackRecord callbacks;
    synchronized (mLock) {
        // 获取所有待执行的回调
        callbacks = mCallbackQueues[callbackType].extractDueCallbacksLocked(
                frameTimeNanos / TimeUtils.NANOS_PER_MS);
    }
    
    // 批量执行回调
    if (callbacks != null) {
        for (CallbackRecord c = callbacks; c != null; c = c.next) {
            c.run(frameTimeNanos);
        }
    }
}
```

#### 2.1.2 异步消息处理

Choreographer使用异步消息处理，提高响应速度：

```java
// 发送异步消息
Message msg = Message.obtain(mHandler, this);
msg.setAsynchronous(true); // 设置为异步消息，优先处理
mHandler.sendMessageAtTime(msg, timestampNanos / TimeUtils.NANOS_PER_MS);
```

### 2.2 内存管理优化

#### 2.2.1 对象池

Choreographer使用对象池减少内存分配：

```java
// 回调记录对象池
private static final Pools.SynchronizedPool<CallbackRecord> sCallbackRecordPool =
        new Pools.SynchronizedPool<>(MAX_POOL_SIZE);

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

#### 2.2.2 延迟初始化

Choreographer采用延迟初始化策略，减少启动时间：

```java
// 延迟初始化回调队列
private CallbackQueue[] getCallbackQueues() {
    if (mCallbackQueues == null) {
        mCallbackQueues = new CallbackQueue[CALLBACK_COUNT];
        for (int i = 0; i < CALLBACK_COUNT; i++) {
            mCallbackQueues[i] = new CallbackQueue();
        }
    }
    return mCallbackQueues;
}
```

### 2.3 功耗优化

#### 2.3.1 智能VSync请求

Choreographer只在需要时请求VSync信号：

```java
// 智能VSync请求
private void scheduleFrameLocked(long now) {
    if (!mFrameScheduled) {
        mFrameScheduled = true;
        if (USE_VSYNC) {
            mDisplayEventReceiver.scheduleVsync();
        } else {
            final long nextFrameTime = Math.max(
                    mLastFrameTimeNanos / TimeUtils.NANOS_PER_MS + mFrameIntervalNanos,
                    now);
            
            Message msg = mHandler.obtainMessage(MSG_DO_FRAME);
            msg.setAsynchronous(true);
            mHandler.sendMessageAtTime(msg, nextFrameTime / TimeUtils.NANOS_PER_MS);
        }
    }
}
```

#### 2.3.2 自适应刷新率

Choreographer支持自适应刷新率，根据内容类型调整刷新率：

```java
// 自适应刷新率
public void setRefreshRate(float refreshRate) {
    if (refreshRate <= 0) {
        throw new IllegalArgumentException("refreshRate must be positive");
    }
    
    mFrameIntervalNanos = (long)(1000000000 / refreshRate);
    
    // 重新计算帧延迟
    setFrameDelay(VSYNC_FRAME_DELAY);
}
```

### 2.4 线程优化

#### 2.4.1 单线程模型

Choreographer采用单线程模型，避免线程同步开销：

```java
// Choreographer实例与线程绑定
private static final ThreadLocal<Choreographer> sThreadInstance = new ThreadLocal<Choreographer>() {
    @Override
    protected Choreographer initialValue() {
        Looper looper = Looper.myLooper();
        if (looper == null) {
            throw new IllegalStateException("The current thread must have a looper!");
        }
        return new Choreographer(looper);
    }
};
```

#### 2.4.2 异步消息处理

Choreographer使用异步消息处理，提高响应速度：

```java
// FrameHandler处理异步消息
private final class FrameHandler extends Handler {
    public FrameHandler(Looper looper) {
        super(looper);
    }

    @Override
    public void handleMessage(Message msg) {
        switch (msg.what) {
            case MSG_DO_FRAME:
                doFrame(System.nanoTime(), 0);
                break;
            case MSG_DO_SCHEDULE_VSYNC:
                doScheduleVsync();
                break;
            case MSG_DO_SCHEDULE_CALLBACK:
                doScheduleCallback(msg.arg1);
                break;
        }
    }
}
```

## 3. 高级优化技术

### 3.1 预测性渲染

#### 3.1.1 帧时间预测

```java
// 帧时间预测
private long predictNextFrameTime() {
    if (mFrameTimeHistorySize < 3) {
        return mLastFrameTimeNanos + mFrameIntervalNanos;
    }
    
    // 使用历史数据预测下一帧时间
    long sum = 0;
    for (int i = 0; i < mFrameTimeHistorySize; i++) {
        sum += mFrameTimeHistory[i];
    }
    
    long averageFrameTime = sum / mFrameTimeHistorySize;
    return mLastFrameTimeNanos + averageFrameTime;
}
```

#### 3.1.2 自适应帧率

```java
// 自适应帧率调整
private void adjustFrameRate() {
    if (mFrameTimeHistorySize < 10) {
        return;
    }
    
    // 计算帧时间方差
    long sum = 0;
    for (int i = 0; i < mFrameTimeHistorySize; i++) {
        sum += mFrameTimeHistory[i];
    }
    long average = sum / mFrameTimeHistorySize;
    
    long variance = 0;
    for (int i = 0; i < mFrameTimeHistorySize; i++) {
        long diff = mFrameTimeHistory[i] - average;
        variance += diff * diff;
    }
    variance /= mFrameTimeHistorySize;
    
    // 根据方差调整帧率
    if (variance > HIGH_VARIANCE_THRESHOLD) {
        // 高方差，降低帧率
        setRefreshRate(45.0f);
    } else if (variance < LOW_VARIANCE_THRESHOLD) {
        // 低方差，提高帧率
        setRefreshRate(60.0f);
    }
}
```

### 3.2 智能回调调度

#### 3.2.1 回调优先级动态调整

```java
// 动态调整回调优先级
private void adjustCallbackPriorities() {
    // 根据系统负载调整回调优先级
    float systemLoad = getSystemLoad();
    
    if (systemLoad > HIGH_LOAD_THRESHOLD) {
        // 高负载，降低动画优先级
        mCallbackPriorities[CALLBACK_ANIMATION] = LOW_PRIORITY;
        mCallbackPriorities[CALLBACK_INPUT] = HIGH_PRIORITY;
    } else {
        // 低负载，恢复默认优先级
        mCallbackPriorities[CALLBACK_ANIMATION] = DEFAULT_PRIORITY;
        mCallbackPriorities[CALLBACK_INPUT] = DEFAULT_PRIORITY;
    }
}
```

#### 3.2.2 回调合并

```java
// 回调合并
private void mergeCallbacks() {
    // 合并相似的动画回调
    List<CallbackRecord> animationCallbacks = new ArrayList<>();
    CallbackRecord callback = mCallbackQueues[CALLBACK_ANIMATION].mHead;
    
    while (callback != null) {
        if (callback.action instanceof MergeableCallback) {
            animationCallbacks.add(callback);
        }
        callback = callback.next;
    }
    
    // 合并可合并的回调
    for (int i = 0; i < animationCallbacks.size() - 1; i++) {
        CallbackRecord current = animationCallbacks.get(i);
        CallbackRecord next = animationCallbacks.get(i + 1);
        
        if (canMerge(current, next)) {
            mergeCallbacks(current, next);
            removeCallback(next);
        }
    }
}
```

### 3.3 内存优化

#### 3.3.1 内存压力感知

```java
// 内存压力感知
private void handleMemoryPressure() {
    ActivityManager am = (ActivityManager) mContext.getSystemService(Context.ACTIVITY_SERVICE);
    boolean isLowMemory = am.isLowRamDevice();
    ActivityManager.MemoryInfo memInfo = new ActivityManager.MemoryInfo();
    am.getMemoryInfo(memInfo);
    
    if (isLowMemory || memInfo.availMem < LOW_MEMORY_THRESHOLD) {
        // 低内存，减少对象池大小
        sCallbackRecordPool.resize(MAX_POOL_SIZE / 2);
        
        // 清理不必要的回调
        cleanupCallbacks();
    } else {
        // 内存充足，恢复对象池大小
        sCallbackRecordPool.resize(MAX_POOL_SIZE);
    }
}
```

#### 3.3.2 智能垃圾回收

```java
// 智能垃圾回收
private void scheduleGC() {
    // 在帧间隙进行垃圾回收
    mHandler.postDelayed(new Runnable() {
        @Override
        public void run() {
            System.gc();
        }
    }, mFrameIntervalNanos / TimeUtils.NANOS_PER_MS);
}
```

## 4. 调试与性能分析

### 4.1 性能分析工具

#### 4.1.1 帧率监控

```java
// 帧率监控
public class FrameRateMonitor {
    private long mFrameCount;
    private long mStartTime;
    private float mCurrentFps;
    
    public void onFrame() {
        mFrameCount++;
        long currentTime = System.currentTimeMillis();
        
        if (currentTime - mStartTime >= 1000) {
            mCurrentFps = mFrameCount * 1000.0f / (currentTime - mStartTime);
            mFrameCount = 0;
            mStartTime = currentTime;
            
            Log.d(TAG, "Current FPS: " + mCurrentFps);
        }
    }
    
    public float getCurrentFps() {
        return mCurrentFps;
    }
}
```

#### 4.1.2 性能瓶颈分析

```java
// 性能瓶颈分析
public class PerformanceProfiler {
    private Map<String, Long> mStartTimes = new HashMap<>();
    private Map<String, Long> mTotalTimes = new HashMap<>();
    private Map<String, Integer> mCallCounts = new HashMap<>();
    
    public void startProfile(String tag) {
        mStartTimes.put(tag, System.nanoTime());
    }
    
    public void endProfile(String tag) {
        Long startTime = mStartTimes.get(tag);
        if (startTime != null) {
            long duration = System.nanoTime() - startTime;
            
            Long totalTime = mTotalTimes.get(tag);
            Integer callCount = mCallCounts.get(tag);
            
            mTotalTimes.put(tag, (totalTime == null ? 0 : totalTime) + duration);
            mCallCounts.put(tag, (callCount == null ? 0 : callCount) + 1);
            
            mStartTimes.remove(tag);
        }
    }
    
    public void dumpProfile() {
        for (Map.Entry<String, Long> entry : mTotalTimes.entrySet()) {
            String tag = entry.getKey();
            long totalTime = entry.getValue();
            int callCount = mCallCounts.get(tag);
            long averageTime = totalTime / callCount;
            
            Log.d(TAG, tag + ": total=" + totalTime + "ns, count=" + callCount + 
                  ", avg=" + averageTime + "ns");
        }
    }
}
```

### 4.2 调试技巧

#### 4.2.1 可视化调试

```java
// 可视化调试
public class VisualDebugger {
    private Paint mPaint;
    private List<Float> mFrameTimes = new ArrayList<>();
    private int mMaxFrameCount = 60;
    
    public VisualDebugger() {
        mPaint = new Paint();
        mPaint.setColor(Color.RED);
        mPaint.setStrokeWidth(2.0f);
    }
    
    public void addFrameTime(float frameTime) {
        mFrameTimes.add(frameTime);
        if (mFrameTimes.size() > mMaxFrameCount) {
            mFrameTimes.remove(0);
        }
    }
    
    public void draw(Canvas canvas, int width, int height) {
        if (mFrameTimes.size() < 2) {
            return;
        }
        
        float xStep = (float) width / mMaxFrameCount;
        float yScale = height / 33.0f; // 33ms对应满高度
        
        for (int i = 1; i < mFrameTimes.size(); i++) {
            float x1 = (i - 1) * xStep;
            float y1 = height - mFrameTimes.get(i - 1) * yScale;
            float x2 = i * xStep;
            float y2 = height - mFrameTimes.get(i) * yScale;
            
            canvas.drawLine(x1, y1, x2, y2, mPaint);
        }
    }
}
```

#### 4.2.2 自动化测试

```java
// 自动化测试
public class ChoreographerTester {
    private Choreographer mChoreographer;
    private List<Long> mFrameTimes = new ArrayList<>();
    private boolean mIsRunning;
    
    public ChoreographerTester(Choreographer choreographer) {
        mChoreographer = choreographer;
    }
    
    public void startTest(int durationSeconds) {
        mIsRunning = true;
        mFrameTimes.clear();
        
        mChoreographer.postFrameCallback(new Choreographer.FrameCallback() {
            @Override
            public void doFrame(long frameTimeNanos) {
                if (!mIsRunning) {
                    return;
                }
                
                if (!mFrameTimes.isEmpty()) {
                    long lastFrameTime = mFrameTimes.get(mFrameTimes.size() - 1);
                    long frameInterval = frameTimeNanos - lastFrameTime;
                    mFrameTimes.add(frameInterval);
                } else {
                    mFrameTimes.add(frameTimeNanos);
                }
                
                mChoreographer.postFrameCallback(this);
            }
        });
        
        // 停止测试
        new Handler().postDelayed(new Runnable() {
            @Override
            public void run() {
                mIsRunning = false;
                analyzeResults();
            }
        }, durationSeconds * 1000);
    }
    
    private void analyzeResults() {
        if (mFrameTimes.size() < 2) {
            return;
        }
        
        long sum = 0;
        long max = 0;
        long min = Long.MAX_VALUE;
        
        for (int i = 1; i < mFrameTimes.size(); i++) {
            long frameInterval = mFrameTimes.get(i);
            sum += frameInterval;
            max = Math.max(max, frameInterval);
            min = Math.min(min, frameInterval);
        }
        
        long average = sum / (mFrameTimes.size() - 1);
        float averageFps = 1000000000.0f / average;
        
        Log.d(TAG, "Average FPS: " + averageFps);
        Log.d(TAG, "Max frame interval: " + max / 1000000.0f + "ms");
        Log.d(TAG, "Min frame interval: " + min / 1000000.0f + "ms");
    }
}
```

## 5. 总结

Choreographer作为Android系统的核心组件，通过VSync信号同步、分层回调机制和性能监控等功能，确保了UI的流畅性和稳定性。通过理解其主要功能和优化技术，开发者可以更好地利用Choreographer提升应用性能，解决UI相关问题。在实际开发中，应该根据应用特点选择合适的优化策略，平衡性能、功耗和用户体验。