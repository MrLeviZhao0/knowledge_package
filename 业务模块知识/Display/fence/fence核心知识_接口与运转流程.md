# fence核心知识：接口与运转流程

## 1. 对外提供的接口

### 1.1 主要接口

#### 1.1.1 Fence基础接口
```cpp
// Fence核心接口定义
class IFence {
public:
    virtual ~IFence() = default;
    
    // 等待fence信号
    virtual status_t wait(int timeoutMs) = 0;
    
    // 无限等待fence信号
    virtual status_t waitForever(const char* logname) = 0;
    
    // 获取fence状态
    virtual status_t getStatus(int* outStatus) = 0;
    
    // 获取fence文件描述符
    virtual int getFd() const = 0;
    
    // 获取fence时间戳
    virtual nsecs_t getSignalTime() const = 0;
    
    // 检查fence是否已信号
    virtual bool isSignaled() = 0;
};
```

#### 1.1.2 Acquire Fence接口
```cpp
// Acquire Fence管理接口
class IAcquireFenceManager {
public:
    // 创建acquire fence
    virtual sp<Fence> createAcquireFence() = 0;
    
    // 设置acquire fence
    virtual status_t setAcquireFence(int slot, const sp<Fence>& fence) = 0;
    
    // 获取acquire fence
    virtual sp<Fence> getAcquireFence(int slot) const = 0;
    
    // 等待acquire fence信号
    virtual status_t waitForAcquireFence(int slot, int timeoutMs) = 0;
    
    // 合并多个acquire fence
    virtual sp<Fence> mergeAcquireFences(const std::vector<sp<Fence>>& fences) = 0;
};
```

#### 1.1.3 Release Fence接口
```cpp
// Release Fence管理接口
class IReleaseFenceManager {
public:
    // 创建release fence
    virtual sp<Fence> createReleaseFence() = 0;
    
    // 设置release fence
    virtual status_t setReleaseFence(int slot, const sp<Fence>& fence) = 0;
    
    // 获取release fence
    virtual sp<Fence> getReleaseFence(int slot) const = 0;
    
    // 等待release fence信号
    virtual status_t waitForReleaseFence(int slot, int timeoutMs) = 0;
    
    // 信号release fence完成
    virtual status_t signalReleaseFence(int slot) = 0;
};
```

#### 1.1.4 Retire Fence接口
```cpp
// Retire Fence管理接口
class IRetireFenceManager {
public:
    // 创建retire fence
    virtual sp<Fence> createRetireFence() = 0;
    
    // 设置retire fence
    virtual status_t setRetireFence(int slot, const sp<Fence>& fence) = 0;
    
    // 获取retire fence
    virtual sp<Fence> getRetireFence(int slot) const = 0;
    
    // 等待retire fence信号
    virtual status_t waitForRetireFence(int slot, int timeoutMs) = 0;
    
    // 检查缓冲区是否可重用
    virtual bool isBufferRetired(int slot) const = 0;
};
```

### 1.2 核心配置

#### 1.2.1 fence超时配置
```cpp
// fence超时配置参数
struct FenceTimeoutConfig {
    int acquireFenceTimeout;      // acquire fence超时时间(ms)
    int releaseFenceTimeout;     // release fence超时时间(ms)
    int retireFenceTimeout;      // retire fence超时时间(ms)
    int presentFenceTimeout;     // present fence超时时间(ms)
    bool enableStrictMode;       // 是否启用严格模式
    bool logFenceTimeouts;        // 是否记录fence超时
};
```

#### 1.2.2 fence调试配置
```cpp
// fence调试配置
struct FenceDebugConfig {
    bool enableFenceTracing;      // 启用fence跟踪
    bool logFenceOperations;     // 记录fence操作
    int maxFenceWaitTime;        // 最大fence等待时间
    bool dumpFenceStateOnTimeout; // 超时时dump fence状态
};
```

### 1.3 调试指令

#### 1.3.1 dumpsys fence命令
```bash
# 查看fence状态
dumpsys SurfaceFlinger --fence

# 查看特定fence信息
dumpsys SurfaceFlinger --fence --slot 0

# 查看fence统计信息
dumpsys SurfaceFlinger --fence --stats
```

#### 1.3.2 内核fence调试
```bash
# 查看sync框架状态
cat /sys/kernel/debug/sync/status

# 查看fence时间线
cat /sys/kernel/debug/sync/timeline

# 查看fence等待队列
cat /sys/kernel/debug/sync/waiters
```

## 2. 对内主要运转流程

### 2.1 模块启动流程

#### 2.1.1 fence系统初始化
```cpp
// fence系统初始化流程
status_t FenceSystem::initialize() {
    // 1. 初始化内核sync框架
    status_t result = initializeSyncFramework();
    if (result != NO_ERROR) {
        ALOGE("Failed to initialize sync framework: %d", result);
        return result;
    }
    
    // 2. 创建fence管理器
    mFenceManager = new FenceManager();
    result = mFenceManager->initialize();
    if (result != NO_ERROR) {
        ALOGE("Failed to initialize fence manager: %d", result);
        return result;
    }
    
    // 3. 启动fence监控线程
    result = startFenceMonitorThread();
    if (result != NO_ERROR) {
        ALOGE("Failed to start fence monitor thread: %d", result);
        return result;
    }
    
    // 4. 注册fence调试接口
    registerFenceDebugInterface();
    
    ALOGI("Fence system initialized successfully");
    return NO_ERROR;
}
```

#### 2.1.2 BufferQueue fence初始化
```cpp
// BufferQueue fence初始化
status_t BufferQueue::initializeFences() {
    // 初始化acquire fence管理器
    mAcquireFenceManager = new AcquireFenceManager();
    status_t result = mAcquireFenceManager->initialize(mMaxBufferCount);
    if (result != NO_ERROR) {
        return result;
    }
    
    // 初始化release fence管理器
    mReleaseFenceManager = new ReleaseFenceManager();
    result = mReleaseFenceManager->initialize(mMaxBufferCount);
    if (result != NO_ERROR) {
        return result;
    }
    
    // 初始化retire fence管理器
    mRetireFenceManager = new RetireFenceManager();
    result = mRetireFenceManager->initialize(mMaxBufferCount);
    if (result != NO_ERROR) {
        return result;
    }
    
    return NO_ERROR;
}
```

### 2.2 核心流程

#### 2.2.1 Acquire Fence创建和等待流程
```cpp
// Acquire Fence详细创建和等待流程
status_t BufferQueueProducer::dequeueBuffer(int* outSlot, sp<Fence>* outFence,
                                           uint32_t width, uint32_t height,
                                           PixelFormat format, uint64_t usage) {
    // 1. 查找可用的缓冲区槽位
    int slot = findFreeSlot();
    if (slot < 0) {
        return NO_MEMORY;
    }
    
    // 2. 检查缓冲区是否需要重新分配
    if (needReallocateBuffer(slot, width, height, format, usage)) {
        // 重新分配缓冲区
        status_t result = reallocateBuffer(slot, width, height, format, usage);
        if (result != NO_ERROR) {
            return result;
        }
    }
    
    // 3. 创建acquire fence
    sp<Fence> acquireFence = createAcquireFence();
    if (acquireFence == nullptr) {
        ALOGE("Failed to create acquire fence");
        return NO_MEMORY;
    }
    
    // 4. 设置acquire fence
    mAcquireFenceManager->setAcquireFence(slot, acquireFence);
    
    // 5. 更新缓冲区状态为DEQUEUED
    mSlots[slot].mBufferState = BufferState::DEQUEUED;
    
    // 6. 返回结果
    *outSlot = slot;
    *outFence = acquireFence;
    
    ALOGD("Dequeued buffer slot %d with acquire fence", slot);
    return NO_ERROR;
}

// acquire fence等待实现伪代码
status_t FenceImpl::wait(int timeoutMs) {
    struct pollfd pfd;
    pfd.fd = mFd;
    pfd.events = POLLIN;
    
    // 使用poll等待fence信号
    int result = poll(&pfd, 1, timeoutMs);
    
    if (result > 0) {
        if (pfd.revents & POLLIN) {
            // fence已信号
            mSignaled = true;
            mSignalTime = systemTime(SYSTEM_TIME_MONOTONIC);
            return NO_ERROR;
        }
    } else if (result == 0) {
        // 超时
        return TIMED_OUT;
    } else {
        // 错误
        return -errno;
    }
    
    return UNKNOWN_ERROR;
}
```

#### 2.2.2 Release Fence创建和信号流程
```cpp
// Release Fence详细创建和信号流程
status_t BufferQueueProducer::queueBuffer(int slot, const QueueBufferInput& input,
                                         QueueBufferOutput* output) {
    // 1. 验证缓冲区状态
    if (mSlots[slot].mBufferState != BufferState::DEQUEUED) {
        ALOGE("Buffer slot %d is not in DEQUEUED state", slot);
        return BAD_VALUE;
    }
    
    // 2. 创建release fence
    sp<Fence> releaseFence = createReleaseFence();
    if (releaseFence == nullptr) {
        ALOGE("Failed to create release fence");
        return NO_MEMORY;
    }
    
    // 3. 设置release fence
    mReleaseFenceManager->setReleaseFence(slot, releaseFence);
    
    // 4. 更新缓冲区状态为QUEUED
    mSlots[slot].mBufferState = BufferState::QUEUED;
    
    // 5. 将缓冲区加入队列
    mQueue.push_back(slot);
    
    // 6. 通知消费者有新的缓冲区可用
    mConsumer->onFrameAvailable(input);
    
    // 7. 设置输出参数
    output->width = mSlots[slot].mGraphicBuffer->getWidth();
    output->height = mSlots[slot].mGraphicBuffer->getHeight();
    output->transformHint = mTransformHint;
    output->numPendingBuffers = static_cast<uint32_t>(mQueue.size());
    output->nextFrameNumber = mFrameCounter + 1;
    
    ALOGD("Queued buffer slot %d with release fence", slot);
    return NO_ERROR;
}

// release fence信号实现伪代码
status_t ReleaseFenceManager::signalReleaseFence(int slot) {
    sp<Fence> releaseFence = getReleaseFence(slot);
    if (releaseFence == nullptr) {
        ALOGE("No release fence for slot %d", slot);
        return BAD_VALUE;
    }
    
    // 通过内核接口信号fence
    int fd = releaseFence->getFd();
    if (fd >= 0) {
        // 使用sync_file信号fence
        struct sync_file* syncFile = sync_file_fdget(fd);
        if (syncFile != nullptr) {
            // 信号所有关联的fence
            struct dma_fence* fence = syncFile->fence;
            dma_fence_signal(fence);
            sync_file_put(syncFile);
        }
    }
    
    // 更新缓冲区状态为RELEASED
    mBufferStates[slot] = BufferState::RELEASED;
    
    ALOGD("Signaled release fence for slot %d", slot);
    return NO_ERROR;
}
```

#### 2.2.3 Retire Fence创建和等待流程
```cpp
// Retire Fence详细创建和等待流程
status_t BufferQueueConsumer::acquireBuffer(BufferItem* item, nsecs_t presentWhen) {
    // 1. 从队列中获取缓冲区
    int slot = getNextBufferFromQueue();
    if (slot < 0) {
        return NO_BUFFER_AVAILABLE;
    }
    
    // 2. 检查retire fence状态
    sp<Fence> retireFence = mRetireFenceManager->getRetireFence(slot);
    if (retireFence != nullptr && !retireFence->isSignaled()) {
        // 等待retire fence信号
        status_t result = retireFence->wait(RETIRE_FENCE_TIMEOUT);
        if (result != NO_ERROR) {
            ALOGE("Retire fence wait failed for slot %d: %d", slot, result);
            return result;
        }
    }
    
    // 3. 创建新的retire fence
    sp<Fence> newRetireFence = createRetireFence();
    mRetireFenceManager->setRetireFence(slot, newRetireFence);
    
    // 4. 更新缓冲区状态为ACQUIRED
    mSlots[slot].mBufferState = BufferState::ACQUIRED;
    
    // 5. 填充BufferItem
    item->mSlot = slot;
    item->mGraphicBuffer = mSlots[slot].mGraphicBuffer;
    item->mFence = newRetireFence;
    item->mTimestamp = presentWhen;
    item->mIsAutoTimestamp = false;
    item->mFrameNumber = mFrameCounter++;
    
    ALOGD("Acquired buffer slot %d with retire fence", slot);
    return NO_ERROR;
}

// retire fence等待和重用检查伪代码
bool RetireFenceManager::isBufferRetired(int slot) const {
    sp<Fence> retireFence = getRetireFence(slot);
    if (retireFence == nullptr) {
        // 没有retire fence，缓冲区可重用
        return true;
    }
    
    // 检查retire fence是否已信号
    if (retireFence->isSignaled()) {
        // fence已信号，缓冲区可重用
        return true;
    }
    
    // 尝试等待一小段时间
    status_t result = retireFence->wait(RETIRE_CHECK_TIMEOUT);
    if (result == NO_ERROR) {
        // 等待成功，缓冲区可重用
        return true;
    }
    
    // fence未信号，缓冲区不可重用
    return false;
}
```

### 2.3 fence合并流程

#### 2.3.1 多个fence合并实现
```cpp
// fence合并详细实现
sp<Fence> Fence::merge(const String8& name, const sp<Fence>& f1, const sp<Fence>& f2) {
    if (f1 == nullptr) {
        return f2;
    }
    if (f2 == nullptr) {
        return f1;
    }
    
    // 获取fence文件描述符
    int fd1 = f1->getFd();
    int fd2 = f2->getFd();
    
    if (fd1 < 0 || fd2 < 0) {
        ALOGE("Invalid fence FDs: %d, %d", fd1, fd2);
        return nullptr;
    }
    
    // 使用sync_merge合并fence
    int mergedFd = sync_merge(name.string(), fd1, fd2);
    if (mergedFd < 0) {
        ALOGE("Failed to merge fences: %s", strerror(errno));
        return nullptr;
    }
    
    // 创建合并后的fence
    return new Fence(mergedFd);
}

// 内核sync_merge实现伪代码
int sync_merge(const char* name, int fd1, int fd2) {
    struct sync_file* sync_file1 = sync_file_fdget(fd1);
    struct sync_file* sync_file2 = sync_file_fdget(fd2);
    
    if (!sync_file1 || !sync_file2) {
        return -EINVAL;
    }
    
    // 创建新的sync_timeline
    struct sync_timeline* timeline = sync_timeline_create(name);
    if (!timeline) {
        return -ENOMEM;
    }
    
    // 创建合并的sync_pt
    struct sync_pt* pt = sync_pt_create(timeline);
    if (!pt) {
        sync_timeline_destroy(timeline);
        return -ENOMEM;
    }
    
    // 设置依赖关系
    sync_pt_add_dependency(pt, sync_file1->fence);
    sync_pt_add_dependency(pt, sync_file2->fence);
    
    // 创建新的sync_file
    struct sync_file* merged_file = sync_file_create(&pt->base);
    if (!merged_file) {
        sync_pt_free(pt);
        sync_timeline_destroy(timeline);
        return -ENOMEM;
    }
    
    // 获取文件描述符
    int merged_fd = get_unused_fd_flags(O_CLOEXEC);
    if (merged_fd < 0) {
        sync_file_free(merged_file);
        return merged_fd;
    }
    
    fd_install(merged_fd, merged_file->file);
    
    sync_file_put(sync_file1);
    sync_file_put(sync_file2);
    
    return merged_fd;
}
```

通过以上详细的接口定义和运转流程分析，我们可以深入理解acquire、release、retire这三个关键fence的创建、等待和信号机制，以及它们在Android图形系统中的完整生命周期管理。