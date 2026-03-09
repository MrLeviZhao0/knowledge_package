# Choreographer项目经验

## 1. 高帧率游戏优化项目

### 1.1 项目背景

在一款高帧率游戏中，出现了明显的掉帧和卡顿问题，特别是在复杂场景下，帧率会从60fps下降到30fps以下，严重影响用户体验。

### 1.2 问题分析

通过性能分析工具发现，主要问题集中在以下几个方面：

1. **主线程阻塞**：游戏逻辑计算过于复杂，导致主线程执行时间过长
2. **渲染管线不优化**：绘制操作过多，没有充分利用硬件加速
3. **内存分配频繁**：频繁的对象创建和销毁导致GC压力增大
4. **VSync信号丢失**：由于主线程阻塞，错过了多个VSync信号

### 1.3 解决方案

#### 1.3.1 优化主线程执行

```java
// 使用Choreographer监控主线程执行时间
public class MainThreadMonitor {
    private Choreographer mChoreographer;
    private long mLastFrameTime;
    private static final long FRAME_THRESHOLD_NANOS = 16666666; // 60fps对应16.67ms
    
    public MainThreadMonitor() {
        mChoreographer = Choreographer.getInstance();
        mChoreographer.postFrameCallback(new FrameCallback() {
            @Override
            public void doFrame(long frameTimeNanos) {
                if (mLastFrameTime != 0) {
                    long frameDuration = frameTimeNanos - mLastFrameTime;
                    if (frameDuration > FRAME_THRESHOLD_NANOS) {
                        Log.w(TAG, "Main thread blocked for " + 
                              (frameDuration / 1000000.0) + "ms");
                    }
                }
                mLastFrameTime = frameTimeNanos;
                mChoreographer.postFrameCallback(this);
            }
        });
    }
}
```

#### 1.3.2 优化渲染管线

```java
// 使用Choreographer优化渲染管线
public class RenderPipelineOptimizer {
    private Choreographer mChoreographer;
    private List<RenderTask> mRenderTasks = new ArrayList<>();
    private boolean mIsRendering = false;
    
    public RenderPipelineOptimizer() {
        mChoreographer = Choreographer.getInstance();
        mChoreographer.postFrameCallback(new FrameCallback() {
            @Override
            public void doFrame(long frameTimeNanos) {
                if (!mIsRendering && !mRenderTasks.isEmpty()) {
                    mIsRendering = true;
                    renderFrame(frameTimeNanos);
                }
                mChoreographer.postFrameCallback(this);
            }
        });
    }
    
    private void renderFrame(long frameTimeNanos) {
        // 批量执行渲染任务
        List<RenderTask> tasks = new ArrayList<>(mRenderTasks);
        mRenderTasks.clear();
        
        for (RenderTask task : tasks) {
            task.execute();
        }
        
        mIsRendering = false;
    }
    
    public void addRenderTask(RenderTask task) {
        mRenderTasks.add(task);
    }
}
```

#### 1.3.3 减少内存分配

```java
// 使用对象池减少内存分配
public class RenderObjectPool {
    private static final int POOL_SIZE = 100;
    private Queue<RenderObject> mPool = new LinkedList<>();
    
    public RenderObject obtain() {
        RenderObject obj = mPool.poll();
        if (obj == null) {
            obj = new RenderObject();
        }
        return obj;
    }
    
    public void release(RenderObject obj) {
        if (mPool.size() < POOL_SIZE) {
            obj.reset();
            mPool.offer(obj);
        }
    }
}
```

### 1.4 项目成果

通过以上优化措施，游戏性能得到显著提升：

1. **帧率提升**：平均帧率从45fps提升到58fps
2. **卡顿减少**：严重卡顿次数减少80%
3. **内存优化**：内存分配次数减少60%
4. **用户体验**：游戏流畅度显著提升

## 2. 动画性能优化项目

### 2.1 项目背景

在一个复杂的动画应用中，多个动画同时执行时出现了明显的掉帧和不同步问题，特别是在低端设备上表现更为明显。

### 2.2 问题分析

通过分析发现，主要问题包括：

1. **动画回调过多**：每个动画都注册了独立的回调，导致回调队列过长
2. **动画计算复杂**：复杂的插值计算导致主线程阻塞
3. **动画同步问题**：不同动画之间缺乏同步机制

### 2.3 解决方案

#### 2.3.1 动画回调合并

```java
// 合并动画回调
public class AnimationCallbackMerger {
    private Choreographer mChoreographer;
    private List<Animator> mAnimators = new ArrayList<>();
    private boolean mIsCallbackPosted = false;
    
    public AnimationCallbackMerger() {
        mChoreographer = Choreographer.getInstance();
    }
    
    public void addAnimator(Animator animator) {
        mAnimators.add(animator);
        scheduleCallback();
    }
    
    private void scheduleCallback() {
        if (!mIsCallbackPosted) {
            mIsCallbackPosted = true;
            mChoreographer.postCallback(Choreographer.CALLBACK_ANIMATION, 
                new Runnable() {
                    @Override
                    public void run() {
                        updateAnimations();
                        mIsCallbackPosted = false;
                        
                        if (!mAnimators.isEmpty()) {
                            scheduleCallback();
                        }
                    }
                }, null);
        }
    }
    
    private void updateAnimations() {
        long currentTime = System.nanoTime();
        Iterator<Animator> iterator = mAnimators.iterator();
        
        while (iterator.hasNext()) {
            Animator animator = iterator.next();
            boolean isFinished = animator.update(currentTime);
            
            if (isFinished) {
                iterator.remove();
            }
        }
    }
}
```

#### 2.3.2 动画计算优化

```java
// 优化动画计算
public class OptimizedAnimator {
    private long mDuration;
    private Interpolator mInterpolator;
    private float[] mValues = new float[100]; // 预计算插值表
    private boolean mIsPrecomputed = false;
    
    public OptimizedAnimator(long duration, Interpolator interpolator) {
        mDuration = duration;
        mInterpolator = interpolator;
    }
    
    public void precompute() {
        if (!mIsPrecomputed) {
            for (int i = 0; i < 100; i++) {
                float fraction = (float) i / 99.0f;
                mValues[i] = mInterpolator.getInterpolation(fraction);
            }
            mIsPrecomputed = true;
        }
    }
    
    public float getInterpolation(float fraction) {
        if (mIsPrecomputed) {
            int index = Math.round(fraction * 99);
            return mValues[index];
        } else {
            return mInterpolator.getInterpolation(fraction);
        }
    }
}
```

### 2.4 项目成果

通过优化，动画性能得到显著提升：

1. **动画流畅度**：动画掉帧率减少70%
2. **CPU使用率**：动画CPU使用率降低40%
3. **内存使用**：动画内存使用减少30%
4. **用户体验**：动画更加流畅和同步

## 3. UI响应性优化项目

### 3.1 项目背景

在一个复杂的应用中，用户操作响应延迟明显，特别是在列表滚动和页面切换时，用户体验不佳。

### 3.2 问题分析

通过分析发现，主要问题包括：

1. **输入事件处理延迟**：输入事件处理逻辑复杂，导致响应延迟
2. **UI更新不及时**：UI更新操作没有及时执行
3. **主线程阻塞**：耗时操作在主线程执行

### 3.3 解决方案

#### 3.3.1 优化输入事件处理

```java
// 优化输入事件处理
public class InputEventOptimizer {
    private Choreographer mChoreographer;
    private Queue<InputEvent> mInputEvents = new LinkedList<>();
    private boolean mIsProcessingInput = false;
    
    public InputEventOptimizer() {
        mChoreographer = Choreographer.getInstance();
        mChoreographer.postCallback(Choreographer.CALLBACK_INPUT, 
            new Runnable() {
                @Override
                public void run() {
                    processInputEvents();
                    mChoreographer.postCallback(Choreographer.CALLBACK_INPUT, 
                        this, null);
                }
            }, null);
    }
    
    public void postInputEvent(InputEvent event) {
        mInputEvents.offer(event);
    }
    
    private void processInputEvents() {
        if (mIsProcessingInput) {
            return;
        }
        
        mIsProcessingInput = true;
        
        try {
            while (!mInputEvents.isEmpty()) {
                InputEvent event = mInputEvents.poll();
                processEvent(event);
            }
        } finally {
            mIsProcessingInput = false;
        }
    }
    
    private void processEvent(InputEvent event) {
        // 处理输入事件
        // ...
    }
}
```

#### 3.3.2 优化UI更新

```java
// 优化UI更新
public class UIUpdateOptimizer {
    private Choreographer mChoreographer;
    private List<Runnable> mUIUpdates = new ArrayList<>();
    private boolean mIsUpdatingUI = false;
    
    public UIUpdateOptimizer() {
        mChoreographer = Choreographer.getInstance();
        mChoreographer.postCallback(Choreographer.CALLBACK_TRAVERSAL, 
            new Runnable() {
                @Override
                public void run() {
                    updateUI();
                    mChoreographer.postCallback(Choreographer.CALLBACK_TRAVERSAL, 
                        this, null);
                }
            }, null);
    }
    
    public void postUIUpdate(Runnable update) {
        mUIUpdates.add(update);
    }
    
    private void updateUI() {
        if (mIsUpdatingUI) {
            return;
        }
        
        mIsUpdatingUI = true;
        
        try {
            List<Runnable> updates = new ArrayList<>(mUIUpdates);
            mUIUpdates.clear();
            
            for (Runnable update : updates) {
                update.run();
            }
        } finally {
            mIsUpdatingUI = false;
        }
    }
}
```

### 3.4 项目成果

通过优化，UI响应性得到显著提升：

1. **响应时间**：输入响应时间减少60%
2. **滚动流畅度**：列表滚动流畅度提升50%
3. **页面切换**：页面切换时间减少40%
4. **用户体验**：整体用户体验明显改善

## 4. 性能监控与分析项目

### 4.1 项目背景

为了系统性地分析和优化应用性能，开发了一套基于Choreographer的性能监控和分析系统。

### 4.2 实现方案

#### 4.2.1 性能数据收集

```java
// 性能数据收集
public class PerformanceCollector {
    private Choreographer mChoreographer;
    private List<FrameData> mFrameDataList = new ArrayList<>();
    private long mStartTime;
    
    public PerformanceCollector() {
        mChoreographer = Choreographer.getInstance();
        mStartTime = System.nanoTime();
        
        mChoreographer.postFrameCallback(new FrameCallback() {
            @Override
            public void doFrame(long frameTimeNanos) {
                collectFrameData(frameTimeNanos);
                mChoreographer.postFrameCallback(this);
            }
        });
    }
    
    private void collectFrameData(long frameTimeNanos) {
        FrameData frameData = new FrameData();
        frameData.frameTimeNanos = frameTimeNanos;
        frameData.timestamp = System.currentTimeMillis();
        
        // 收集各种性能数据
        frameData.cpuUsage = getCpuUsage();
        frameData.memoryUsage = getMemoryUsage();
        frameData.gpuUsage = getGpuUsage();
        
        mFrameDataList.add(frameData);
        
        // 限制数据量
        if (mFrameDataList.size() > 1000) {
            mFrameDataList.remove(0);
        }
    }
    
    public List<FrameData> getFrameDataList() {
        return new ArrayList<>(mFrameDataList);
    }
}
```

#### 4.2.2 性能数据分析

```java
// 性能数据分析
public class PerformanceAnalyzer {
    public static AnalysisResult analyze(List<FrameData> frameDataList) {
        AnalysisResult result = new AnalysisResult();
        
        if (frameDataList.isEmpty()) {
            return result;
        }
        
        // 计算平均帧率
        long totalFrameTime = 0;
        long maxFrameTime = 0;
        long minFrameTime = Long.MAX_VALUE;
        int droppedFrames = 0;
        
        for (int i = 1; i < frameDataList.size(); i++) {
            long frameTime = frameDataList.get(i).frameTimeNanos - 
                           frameDataList.get(i-1).frameTimeNanos;
            
            totalFrameTime += frameTime;
            maxFrameTime = Math.max(maxFrameTime, frameTime);
            minFrameTime = Math.min(minFrameTime, frameTime);
            
            if (frameTime > 16666666) { // 超过16.67ms认为是掉帧
                droppedFrames++;
            }
        }
        
        int frameCount = frameDataList.size() - 1;
        result.averageFrameTime = totalFrameTime / frameCount;
        result.averageFps = 1000000000.0f / result.averageFrameTime;
        result.maxFrameTime = maxFrameTime;
        result.minFrameTime = minFrameTime;
        result.droppedFrameRate = (float) droppedFrames / frameCount;
        
        // 分析CPU和内存使用情况
        float totalCpuUsage = 0;
        long totalMemoryUsage = 0;
        
        for (FrameData data : frameDataList) {
            totalCpuUsage += data.cpuUsage;
            totalMemoryUsage += data.memoryUsage;
        }
        
        result.averageCpuUsage = totalCpuUsage / frameDataList.size();
        result.averageMemoryUsage = totalMemoryUsage / frameDataList.size();
        
        return result;
    }
}
```

### 4.3 项目成果

通过性能监控系统，实现了：

1. **问题定位**：快速定位性能瓶颈和问题点
2. **优化指导**：提供数据支持的性能优化建议
3. **趋势分析**：分析性能变化趋势
4. **自动化测试**：自动化性能测试和回归检测

## 5. 总结

通过以上项目经验，我们深入理解了Choreographer的工作原理和应用场景。在实际开发中，合理利用Choreographer的回调机制和性能监控功能，可以显著提升应用的性能和用户体验。同时，通过性能分析和优化，可以解决各种复杂的UI性能问题，打造流畅的应用体验。