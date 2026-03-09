# Handler项目经验

## 项目一：高性能图片加载框架

### 项目背景
开发一个高性能的图片加载框架，支持网络图片的异步加载、缓存管理和内存优化，需要处理大量并发请求和内存敏感的场景。

### 技术实现

#### 1. 多级Handler架构设计
```java
public class ImageLoader {
    private static final String TAG = "ImageLoader";
    
    // 主线程Handler - UI更新
    private final Handler mMainHandler = new Handler(Looper.getMainLooper());
    
    // 网络线程Handler - 网络请求
    private final Handler mNetworkHandler;
    private final HandlerThread mNetworkThread;
    
    // 磁盘缓存线程Handler - 文件操作
    private final Handler mDiskCacheHandler;
    private final HandlerThread mDiskCacheThread;
    
    // 内存缓存线程Handler - 内存管理
    private final Handler mMemoryCacheHandler;
    private final HandlerThread mMemoryCacheThread;
    
    public ImageLoader() {
        // 初始化网络线程
        mNetworkThread = new HandlerThread("ImageLoader-Network");
        mNetworkThread.start();
        mNetworkHandler = new Handler(mNetworkThread.getLooper());
        
        // 初始化磁盘缓存线程
        mDiskCacheThread = new HandlerThread("ImageLoader-DiskCache");
        mDiskCacheThread.start();
        mDiskCacheHandler = new Handler(mDiskCacheThread.getLooper());
        
        // 初始化内存缓存线程
        mMemoryCacheThread = new HandlerThread("ImageLoader-MemoryCache");
        mMemoryCacheThread.start();
        mMemoryCacheHandler = new Handler(mMemoryCacheThread.getLooper());
    }
    
    public void loadImage(String url, ImageView imageView) {
        // 生成缓存key
        String cacheKey = generateCacheKey(url);
        
        // 1. 检查内存缓存
        mMemoryCacheHandler.post(() -> {
            Bitmap bitmap = mMemoryCache.get(cacheKey);
            if (bitmap != null && !bitmap.isRecycled()) {
                // 内存缓存命中，直接更新UI
                mMainHandler.post(() -> updateImageView(imageView, bitmap));
                return;
            }
            
            // 2. 检查磁盘缓存
            mDiskCacheHandler.post(() -> {
                Bitmap diskBitmap = loadFromDiskCache(cacheKey);
                if (diskBitmap != null) {
                    // 磁盘缓存命中，更新内存缓存和UI
                    mMemoryCacheHandler.post(() -> {
                        mMemoryCache.put(cacheKey, diskBitmap);
                        mMainHandler.post(() -> updateImageView(imageView, diskBitmap));
                    });
                    return;
                }
                
                // 3. 从网络加载
                mNetworkHandler.post(() -> {
                    Bitmap networkBitmap = loadFromNetwork(url);
                    if (networkBitmap != null) {
                        // 网络加载成功，更新缓存和UI
                        mDiskCacheHandler.post(() -> {
                            saveToDiskCache(cacheKey, networkBitmap);
                            mMemoryCacheHandler.post(() -> {
                                mMemoryCache.put(cacheKey, networkBitmap);
                                mMainHandler.post(() -> updateImageView(imageView, networkBitmap));
                            });
                        });
                    } else {
                        // 加载失败
                        mMainHandler.post(() -> showError(imageView));
                    }
                });
            });
        });
    }
    
    private void updateImageView(ImageView imageView, Bitmap bitmap) {
        if (imageView != null && bitmap != null) {
            imageView.setImageBitmap(bitmap);
        }
    }
}
```

#### 2. 内存优化策略
```java
public class MemoryCache {
    private final LruCache<String, Bitmap> mLruCache;
    private final WeakHashMap<String, WeakReference<Bitmap>> mWeakCache;
    
    public MemoryCache(int maxSize) {
        mLruCache = new LruCache<String, Bitmap>(maxSize) {
            @Override
            protected int sizeOf(String key, Bitmap value) {
                return value.getByteCount() / 1024; // KB
            }
            
            @Override
            protected void entryRemoved(boolean evicted, String key, 
                                      Bitmap oldValue, Bitmap newValue) {
                if (evicted) {
                    // 被LRU淘汰，移动到弱引用缓存
                    mWeakCache.put(key, new WeakReference<>(oldValue));
                }
            }
        };
        
        mWeakCache = new WeakHashMap<>();
    }
    
    public Bitmap get(String key) {
        // 首先从LRU缓存获取
        Bitmap bitmap = mLruCache.get(key);
        if (bitmap != null && !bitmap.isRecycled()) {
            return bitmap;
        }
        
        // 然后从弱引用缓存获取
        WeakReference<Bitmap> weakRef = mWeakCache.get(key);
        if (weakRef != null) {
            bitmap = weakRef.get();
            if (bitmap != null && !bitmap.isRecycled()) {
                // 重新放入LRU缓存
                mLruCache.put(key, bitmap);
                return bitmap;
            } else {
                // 弱引用已失效，移除
                mWeakCache.remove(key);
            }
        }
        
        return null;
    }
}
```

### 技术难点与解决方案

#### 难点1：线程间通信复杂度
**问题**：多级Handler架构导致回调嵌套复杂，代码可读性差
**解决方案**：
- 使用RxJava或协程简化异步编程
- 实现统一的回调接口
- 使用状态机管理加载流程

#### 难点2：内存泄漏风险
**问题**：Handler持有ImageView引用，可能导致内存泄漏
**解决方案**：
- 使用弱引用包装ImageView
- 实现生命周期感知的加载器
- 在页面销毁时取消所有加载任务

## 项目二：实时数据同步系统

### 项目背景
开发一个实时数据同步系统，需要处理来自多个数据源的实时更新，并保证UI的流畅性和数据的一致性。

### 技术实现

#### 1. 数据同步管理器
```java
public class DataSyncManager {
    private static final String TAG = "DataSyncManager";
    
    // 主线程Handler - UI更新
    private final Handler mUiHandler = new Handler(Looper.getMainLooper());
    
    // 数据同步线程Handler
    private final Handler mSyncHandler;
    private final HandlerThread mSyncThread;
    
    // 数据缓存
    private final ConcurrentHashMap<String, DataItem> mDataCache;
    
    // 观察者列表
    private final CopyOnWriteArrayList<DataObserver> mObservers;
    
    // 同步状态
    private volatile boolean mIsSyncing = false;
    
    public DataSyncManager() {
        mSyncThread = new HandlerThread("DataSync");
        mSyncThread.start();
        mSyncHandler = new Handler(mSyncThread.getLooper());
        
        mDataCache = new ConcurrentHashMap<>();
        mObservers = new CopyOnWriteArrayList<>();
        
        // 启动定时同步
        startPeriodicSync();
    }
    
    private void startPeriodicSync() {
        // 每30秒同步一次
        mSyncHandler.postDelayed(new Runnable() {
            @Override
            public void run() {
                performSync();
                // 继续下一次同步
                mSyncHandler.postDelayed(this, 30000);
            }
        }, 30000);
    }
    
    private void performSync() {
        if (mIsSyncing) {
            Log.d(TAG, "Sync already in progress, skipping");
            return;
        }
        
        mIsSyncing = true;
        
        // 从多个数据源同步数据
        List<DataSource> dataSources = getDataSources();
        for (DataSource source : dataSources) {
            mSyncHandler.post(() -> {
                try {
                    List<DataItem> newData = source.fetchData();
                    processNewData(newData);
                } catch (Exception e) {
                    Log.e(TAG, "Sync failed for source: " + source.getName(), e);
                }
            });
        }
        
        // 同步完成
        mSyncHandler.post(() -> {
            mIsSyncing = false;
            notifySyncComplete();
        });
    }
    
    private void processNewData(List<DataItem> newData) {
        for (DataItem item : newData) {
            DataItem oldItem = mDataCache.get(item.getId());
            
            if (oldItem == null || !oldItem.equals(item)) {
                // 数据有更新，通知观察者
                mDataCache.put(item.getId(), item);
                notifyDataChanged(item);
            }
        }
    }
    
    private void notifyDataChanged(final DataItem item) {
        mUiHandler.post(() -> {
            for (DataObserver observer : mObservers) {
                try {
                    observer.onDataChanged(item);
                } catch (Exception e) {
                    Log.e(TAG, "Observer notification failed", e);
                }
            }
        });
    }
    
    public void registerObserver(DataObserver observer) {
        mObservers.add(observer);
    }
    
    public void unregisterObserver(DataObserver observer) {
        mObservers.remove(observer);
    }
}
```

#### 2. 批量更新优化
```java
public class BatchUpdateHandler {
    private static final int BATCH_DELAY_MS = 100; // 100ms批处理延迟
    private static final int MAX_BATCH_SIZE = 50;  // 最大批处理大小
    
    private final Handler mHandler;
    private final List<UpdateTask> mPendingTasks;
    private final Runnable mBatchRunnable;
    
    public BatchUpdateHandler(Handler handler) {
        mHandler = handler;
        mPendingTasks = new ArrayList<>();
        mBatchRunnable = this::processBatch;
    }
    
    public void scheduleUpdate(UpdateTask task) {
        synchronized (mPendingTasks) {
            mPendingTasks.add(task);
            
            if (mPendingTasks.size() >= MAX_BATCH_SIZE) {
                // 达到最大批处理大小，立即处理
                mHandler.removeCallbacks(mBatchRunnable);
                processBatch();
            } else {
                // 延迟处理，合并多个更新
                mHandler.removeCallbacks(mBatchRunnable);
                mHandler.postDelayed(mBatchRunnable, BATCH_DELAY_MS);
            }
        }
    }
    
    private void processBatch() {
        List<UpdateTask> tasksToProcess;
        synchronized (mPendingTasks) {
            tasksToProcess = new ArrayList<>(mPendingTasks);
            mPendingTasks.clear();
        }
        
        if (!tasksToProcess.isEmpty()) {
            // 执行批量更新
            performBatchUpdate(tasksToProcess);
        }
    }
    
    private void performBatchUpdate(List<UpdateTask> tasks) {
        // 合并相似的更新任务
        Map<String, UpdateTask> mergedTasks = new HashMap<>();
        for (UpdateTask task : tasks) {
            String key = task.getMergeKey();
            if (mergedTasks.containsKey(key)) {
                // 合并任务
                mergedTasks.put(key, mergedTasks.get(key).merge(task));
            } else {
                mergedTasks.put(key, task);
            }
        }
        
        // 执行合并后的任务
        for (UpdateTask task : mergedTasks.values()) {
            task.execute();
        }
    }
}
```

### 技术难点与解决方案

#### 难点1：数据一致性保证
**问题**：多数据源同步时可能出现数据冲突和不一致
**解决方案**：
- 实现版本控制机制
- 使用时间戳解决冲突
- 实现数据回滚机制

#### 难点2：性能与实时性平衡
**问题**：频繁的数据同步影响性能，延迟同步影响实时性
**解决方案**：
- 实现智能同步策略（按需同步+定时同步）
- 使用批处理减少同步次数
- 实现增量更新机制

## 项目三：自定义动画框架

### 项目背景
开发一个高性能的自定义动画框架，支持复杂的动画效果和流畅的交互体验。

### 技术实现

#### 1. 动画引擎核心
```java
public class AnimationEngine {
    private static final String TAG = "AnimationEngine";
    
    // 动画线程Handler
    private final Handler mAnimationHandler;
    private final HandlerThread mAnimationThread;
    
    // 活跃动画列表
    private final CopyOnWriteArrayList<BaseAnimation> mActiveAnimations;
    
    // VSync信号模拟（实际项目中应使用Choreographer）
    private final Runnable mVSyncRunnable;
    private static final long FRAME_INTERVAL_NS = 16666666; // 60fps
    
    public AnimationEngine() {
        mAnimationThread = new HandlerThread("AnimationEngine");
        mAnimationThread.start();
        mAnimationHandler = new Handler(mAnimationThread.getLooper());
        
        mActiveAnimations = new CopyOnWriteArrayList<>();
        
        mVSyncRunnable = new Runnable() {
            @Override
            public void run() {
                onVSync();
                // 安排下一帧
                mAnimationHandler.postDelayed(this, FRAME_INTERVAL_NS / 1000000);
            }
        };
        
        // 启动VSync循环
        mAnimationHandler.post(mVSyncRunnable);
    }
    
    private void onVSync() {
        long frameTime = System.nanoTime();
        
        // 更新所有活跃动画
        for (BaseAnimation animation : mActiveAnimations) {
            if (animation.isRunning()) {
                animation.onFrame(frameTime);
            } else {
                // 动画结束，移除
                mActiveAnimations.remove(animation);
            }
        }
        
        // 如果没有活跃动画，暂停VSync
        if (mActiveAnimations.isEmpty()) {
            mAnimationHandler.removeCallbacks(mVSyncRunnable);
        }
    }
    
    public void startAnimation(BaseAnimation animation) {
        mAnimationHandler.post(() -> {
            if (mActiveAnimations.isEmpty()) {
                // 第一个动画，启动VSync
                mAnimationHandler.post(mVSyncRunnable);
            }
            
            animation.start();
            mActiveAnimations.add(animation);
        });
    }
    
    public void stopAnimation(BaseAnimation animation) {
        mAnimationHandler.post(() -> {
            animation.stop();
            mActiveAnimations.remove(animation);
        });
    }
}
```

#### 2. 动画插值器实现
```java
public abstract class BaseAnimation {
    protected long mStartTime;
    protected long mDuration;
    protected volatile boolean mIsRunning = false;
    protected Interpolator mInterpolator;
    
    public void start() {
        mStartTime = System.nanoTime();
        mIsRunning = true;
        onAnimationStart();
    }
    
    public void stop() {
        mIsRunning = false;
        onAnimationEnd();
    }
    
    public boolean isRunning() {
        return mIsRunning;
    }
    
    public void onFrame(long frameTime) {
        if (!mIsRunning) return;
        
        long elapsed = frameTime - mStartTime;
        if (elapsed >= mDuration) {
            // 动画结束
            stop();
            onAnimationUpdate(1.0f); // 最终值
        } else {
            // 计算进度（0.0 - 1.0）
            float progress = (float) elapsed / mDuration;
            
            // 应用插值器
            if (mInterpolator != null) {
                progress = mInterpolator.getInterpolation(progress);
            }
            
            onAnimationUpdate(progress);
        }
    }
    
    protected abstract void onAnimationStart();
    protected abstract void onAnimationUpdate(float progress);
    protected abstract void onAnimationEnd();
}

// 自定义插值器示例
public class BounceInterpolator implements Interpolator {
    @Override
    public float getInterpolation(float input) {
        // 弹性动画效果
        return (float) (1.0 - Math.exp(-3.0 * input) * Math.cos(10.0 * input));
    }
}
```

### 技术难点与解决方案

#### 难点1：动画流畅性保证
**问题**：动画卡顿，帧率不稳定
**解决方案**：
- 使用固定的帧间隔（16.67ms for 60fps）
- 实现帧率自适应机制
- 优化动画计算，避免耗时操作

#### 难点2：内存和性能优化
**问题**：复杂动画占用大量内存，影响性能
**解决方案**：
- 实现动画对象池
- 使用硬件加速
- 优化插值器计算

## 经验总结

### 成功经验
1. **分层架构**：将Handler机制应用于不同的业务层次，提高代码可维护性
2. **性能监控**：建立完善的性能监控体系，及时发现和解决性能问题
3. **内存管理**：严格的内存管理策略，避免内存泄漏和OOM

### 教训总结
1. **线程安全**：多线程环境下的数据同步需要特别注意
2. **生命周期管理**：Handler的生命周期管理比想象中复杂
3. **异常处理**：异步操作中的异常处理需要更加谨慎

### 最佳实践
1. **合理的线程规划**：根据业务需求合理规划线程数量和作用
2. **统一的错误处理**：建立统一的错误处理机制
3. **性能优化前置**：在设计阶段就考虑性能优化
4. **代码可测试性**：保证Handler相关代码的可测试性