# fence核心知识：设计思路与线程进程模型

## 1. 设计思路

### 1.1 分层设计

#### 1.1.1 fence系统分层架构
```
应用层 (App Layer)
    ↓
框架层 (Framework Layer) - Fence类、ANativeFence
    ↓
系统服务层 (System Service Layer) - SurfaceFlinger fence管理
    ↓
硬件抽象层 (HAL Layer) - Gralloc fence支持
    ↓
内核驱动层 (Kernel Driver Layer) - Sync Framework、dma-fence
```

#### 1.1.2 各层职责划分
- **应用层**：使用fence API进行图形操作同步
- **框架层**：提供fence的Java和Native接口封装
- **系统服务层**：管理fence的生命周期和状态同步
- **硬件抽象层**：适配不同硬件的fence实现
- **内核驱动层**：提供底层的fence同步机制

### 1.2 通信机制

#### 1.2.1 fence文件描述符通信
```cpp
// fence通过文件描述符进行进程间通信
class FenceFD {
private:
    int mFd;                    // fence文件描述符
    bool mOwned;                // 是否拥有fd
    
public:
    // 创建fence文件描述符
    static int createFenceFD();
    
    // 通过fd创建fence
    static sp<Fence> createFromFD(int fd);
    
    // fence信号通知机制
    status_t signalFence();
    status_t waitFence(int timeout);
};
```

#### 1.2.2 Binder fence传输
```cpp
// fence通过Binder在进程间传输
class FenceBinderWrapper : public Binder {
private:
    sp<Fence> mFence;           // 包装的fence对象
    
public:
    FenceBinderWrapper(const sp<Fence>& fence);
    
    // Binder接口实现
    virtual status_t onTransact(uint32_t code, const Parcel& data, 
                               Parcel* reply, uint32_t flags);
    
    // fence序列化
    status_t writeToParcel(Parcel* parcel) const;
    
    // fence反序列化
    static sp<Fence> readFromParcel(const Parcel& parcel);
};
```

### 1.3 核心机制

#### 1.3.1 基于时间线的同步机制
```cpp
// 时间线同步机制实现
class TimelineSyncMechanism {
private:
    struct sync_timeline* mTimeline;   // 内核时间线
    int mCurrentPoint;                 // 当前时间点
    
public:
    // 创建同步点
    struct sync_pt* createSyncPoint(int point);
    
    // 递增时间线
    void incrementTimeline(int increment);
    
    // 等待时间线到达指定点
    status_t waitForPoint(int point, int timeout);
    
    // 合并多个时间线
    static sp<Fence> mergeTimelines(const std::vector<sp<Fence>>& fences);
};
```

#### 1.3.2 异步等待机制
```cpp
// 异步fence等待机制
class AsyncFenceWaiter {
private:
    struct pollfd mPollFd;              // poll文件描述符
    std::function<void()> mCallback;   // 回调函数
    
public:
    // 异步等待fence信号
    status_t waitAsync(const sp<Fence>& fence, std::function<void()> callback);
    
    // 取消异步等待
    status_t cancelAsyncWait();
    
    // 轮询机制实现
    static void* pollThread(void* arg);
};
```

### 1.4 权限控制

#### 1.4.1 fence文件描述符权限
```cpp
// fence文件描述符权限管理
class FencePermissionManager {
public:
    // 检查fence访问权限
    static bool checkFenceAccessPermission(int fd, pid_t pid);
    
    // 设置fence权限
    static status_t setFencePermissions(int fd, mode_t mode);
    
    // fence所有权转移
    static status_t transferFenceOwnership(int fd, pid_t fromPid, pid_t toPid);
};
```

## 2. 线程进程模型

### 2.1 主要线程

#### 2.1.1 SurfaceFlinger主线程
```cpp
// SurfaceFlinger主线程fence处理
class SurfaceFlingerMainThread {
private:
    sp<MessageQueue> mEventQueue;       // 消息队列
    FenceManager mFenceManager;         // fence管理器
    
public:
    // 线程主循环
    void threadLoop() {
        while (true) {
            // 处理VSync事件
            handleVSync();
            
            // 处理fence信号
            processFenceSignals();
            
            // 执行图层合成
            composeSurfaces();
            
            // 等待下一帧
            waitForNextFrame();
        }
    }
    
    // fence信号处理
    void processFenceSignals() {
        // 检查所有活跃fence的状态
        for (auto& fence : mActiveFences) {
            if (fence->getStatus() == FENCE_STATUS_SIGNALED) {
                // fence已信号，执行相应操作
                onFenceSignaled(fence);
            }
        }
    }
};
```

#### 2.1.2 RenderThread渲染线程
```cpp
// 渲染线程fence同步
class RenderThreadFenceSync {
private:
    EGLDisplay mEglDisplay;              // EGL显示
    EGLSurface mEglSurface;              // EGL表面
    std::vector<sp<Fence>> mRenderFences; // 渲染fence
    
public:
    // 渲染线程主循环
    void renderLoop() {
        while (mRunning) {
            // 等待渲染资源就绪
            waitForRenderResources();
            
            // 执行OpenGL渲染
            performOpenGLRendering();
            
            // 创建渲染完成fence
            sp<Fence> renderFence = createRenderFence();
            mRenderFences.push_back(renderFence);
            
            // 提交渲染结果
            submitRenderResult(renderFence);
        }
    }
    
    // 创建渲染fence
    sp<Fence> createRenderFence() {
        // 使用EGL创建fence
        EGLSyncKHR sync = eglCreateSyncKHR(mEglDisplay, EGL_SYNC_FENCE_KHR, NULL);
        int fenceFd = eglDupNativeFenceFDANDROID(mEglDisplay, sync);
        return new Fence(fenceFd);
    }
};
```

#### 2.1.3 GPU驱动工作线程
```cpp
// GPU驱动fence工作线程
class GpuDriverFenceThread {
private:
    struct drm_device* mDrmDevice;       // DRM设备
    struct workqueue_struct* mWorkQueue;  // 工作队列
    
public:
    // GPU工作项处理
    void processGpuWorkItem(struct drm_gpu_work_item* workItem) {
        // 执行GPU命令
        executeGpuCommands(workItem->commands);
        
        // GPU操作完成，信号fence
        signalFence(workItem->completion_fence);
        
        // 清理资源
        cleanupGpuWorkItem(workItem);
    }
    
    // fence信号处理
    void signalFence(struct dma_fence* fence) {
        // 调用内核fence信号函数
        dma_fence_signal(fence);
    }
};
```

### 2.2 线程间通信

#### 2.2.1 消息队列通信
```cpp
// fence相关的消息类型
enum FenceMessageType {
    FENCE_SIGNALED = 1,         // fence已信号
    FENCE_TIMEOUT = 2,           // fence等待超时
    FENCE_ERROR = 3,             // fence错误
};

// fence消息结构
struct FenceMessage {
    FenceMessageType type;       // 消息类型
    sp<Fence> fence;             // 相关的fence
    nsecs_t timestamp;           // 时间戳
    status_t result;             // 结果代码
};

// 线程间fence消息传递
class FenceMessageQueue {
private:
    MessageQueue mQueue;         // 消息队列
    
public:
    // 发送fence消息
    status_t sendFenceMessage(FenceMessageType type, const sp<Fence>& fence);
    
    // 接收fence消息
    status_t receiveFenceMessage(FenceMessage* msg, int timeout);
};
```

#### 2.2.2 条件变量同步
```cpp
// 基于条件变量的fence同步
class FenceConditionVariable {
private:
    mutable Mutex mMutex;                // 互斥锁
    Condition mCondition;                // 条件变量
    std::map<sp<Fence>, bool> mFenceStates; // fence状态映射
    
public:
    // 等待fence信号
    status_t waitForFence(const sp<Fence>& fence, int timeout) {
        Mutex::Autolock lock(mMutex);
        
        // 检查fence是否已信号
        if (mFenceStates[fence]) {
            return NO_ERROR;
        }
        
        // 等待条件变量信号
        status_t result = mCondition.waitRelative(mMutex, nanoseconds(timeout));
        
        return result;
    }
    
    // 信号fence完成
    void signalFence(const sp<Fence>& fence) {
        Mutex::Autolock lock(mMutex);
        mFenceStates[fence] = true;
        mCondition.broadcast();
    }
};
```

### 2.3 进程模型

#### 2.3.1 跨进程fence共享
```cpp
// 跨进程fence共享机制
class CrossProcessFenceSharing {
public:
    // 创建可共享的fence
    static sp<Fence> createSharedFence(const String8& name);
    
    // 导出fence到其他进程
    static status_t exportFenceToProcess(const sp<Fence>& fence, pid_t targetPid);
    
    // 从其他进程导入fence
    static sp<Fence> importFenceFromProcess(pid_t sourcePid, int fenceFd);
    
    // fence文件描述符传递
    static status_t sendFenceFD(int socketFd, int fenceFd);
    static int receiveFenceFD(int socketFd);
};
```

#### 2.3.2 Binder进程间fence传输
```cpp
// Binder fence传输实现
class BinderFenceTransport {
public:
    // 将fence写入Parcel
    static status_t writeFenceToParcel(const sp<Fence>& fence, Parcel* parcel) {
        if (fence == nullptr) {
            return parcel->writeInt32(-1);
        }
        
        // 获取fence文件描述符
        int fd = fence->getFd();
        if (fd < 0) {
            return BAD_VALUE;
        }
        
        // 写入文件描述符
        return parcel->writeDupFileDescriptor(fd);
    }
    
    // 从Parcel读取fence
    static sp<Fence> readFenceFromParcel(const Parcel& parcel) {
        int fd = parcel.readFileDescriptor();
        if (fd < 0) {
            return nullptr;
        }
        
        return new Fence(fd);
    }
};
```

### 2.4 线程同步机制

#### 2.4.1 fence等待队列
```cpp
// fence等待队列实现
class FenceWaitQueue {
private:
    struct WaitItem {
        sp<Fence> fence;                 // 等待的fence
        std::function<void()> callback;  // 回调函数
        nsecs_t timeout;                 // 超时时间
    };
    
    std::list<WaitItem> mWaitQueue;      // 等待队列
    mutable Mutex mMutex;                // 队列锁
    Condition mCondition;                // 条件变量
    
public:
    // 添加等待项
    void addWaitItem(const sp<Fence>& fence, std::function<void()> callback, nsecs_t timeout);
    
    // 处理完成的fence
    void processSignaledFences();
    
    // 等待队列处理线程
    static void* waitQueueThread(void* arg);
};
```

#### 2.4.2 死锁检测与避免
```cpp
// fence死锁检测机制
class FenceDeadlockDetector {
private:
    struct FenceDependency {
        sp<Fence> waitingFence;          // 等待的fence
        sp<Fence> blockingFence;         // 阻塞的fence
        pid_t processId;                 // 进程ID
        nsecs_t timestamp;               // 时间戳
    };
    
    std::vector<FenceDependency> mDependencies; // 依赖关系
    mutable Mutex mMutex;                // 互斥锁
    
public:
    // 记录fence依赖关系
    void recordDependency(const sp<Fence>& waiting, const sp<Fence>& blocking);
    
    // 检测死锁
    bool detectDeadlock() const;
    
    // 解决死锁
    status_t resolveDeadlock();
};
```

通过以上详细的设计思路和线程进程模型分析，我们可以深入理解fence机制在Android图形系统中的复杂同步关系和实现原理。