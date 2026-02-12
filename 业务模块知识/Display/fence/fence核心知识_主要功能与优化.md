# fence核心知识：主要功能与优化

## 1. 涉及的主要功能

### 1.1 缓冲区生命周期管理

#### 1.1.1 完整的缓冲区状态转换
```cpp
// 缓冲区状态转换与fence关系
class BufferStateMachine {
private:
    enum BufferState {
        FREE = 0,              // 空闲状态，无fence
        DEQUEUED = 1,          // 已出队，有acquire fence
        QUEUED = 2,            // 已入队，有release fence
        ACQUIRED = 3,          // 已获取，有retire fence
        RELEASED = 4           // 已释放，等待重用
    };
    
    struct BufferSlot {
        BufferState state;             // 缓冲区状态
        sp<Fence> acquireFence;        // acquire fence
        sp<Fence> releaseFence;        // release fence
        sp<Fence> retireFence;         // retire fence
        nsecs_t lastStateChangeTime;   // 最后状态变更时间
    };
    
    std::vector<BufferSlot> mSlots;    // 缓冲区槽位
    
public:
    // 缓冲区状态转换实现
    status_t transitionToDequeued(int slot, const sp<Fence>& acquireFence) {
        if (mSlots[slot].state != FREE && mSlots[slot].state != RELEASED) {
            ALOGE("Invalid state transition to DEQUEUED from %d", mSlots[slot].state);
            return INVALID_OPERATION;
        }
        
        mSlots[slot].state = DEQUEUED;
        mSlots[slot].acquireFence = acquireFence;
        mSlots[slot].lastStateChangeTime = systemTime(SYSTEM_TIME_MONOTONIC);
        
        ALOGD("Buffer slot %d transitioned to DEQUEUED", slot);
        return NO_ERROR;
    }
    
    status_t transitionToQueued(int slot, const sp<Fence>& releaseFence) {
        if (mSlots[slot].state != DEQUEUED) {
            ALOGE("Invalid state transition to QUEUED from %d", mSlots[slot].state);
            return INVALID_OPERATION;
        }
        
        mSlots[slot].state = QUEUED;
        mSlots[slot].releaseFence = releaseFence;
        mSlots[slot].lastStateChangeTime = systemTime(SYSTEM_TIME_MONOTONIC);
        
        ALOGD("Buffer slot %d transitioned to QUEUED", slot);
        return NO_ERROR;
    }
    
    // 其他状态转换方法...
};
```

#### 1.1.2 fence驱动的缓冲区同步
```cpp
// fence驱动的缓冲区同步机制
class FenceDrivenBufferSync {
public:
    // 等待缓冲区可用的完整流程
    status_t waitForBufferAvailable(int slot, int timeoutMs) {
        // 1. 检查当前状态
        BufferState currentState = getBufferState(slot);
        
        switch (currentState) {
            case FREE:
            case RELEASED:
                // 缓冲区立即可用
                return NO_ERROR;
                
            case DEQUEUED:
                // 需要等待acquire fence
                return waitForAcquireFence(slot, timeoutMs);
                
            case QUEUED:
                // 需要等待release fence
                return waitForReleaseFence(slot, timeoutMs);
                
            case ACQUIRED:
                // 需要等待retire fence
                return waitForRetireFence(slot, timeoutMs);
                
            default:
                return UNKNOWN_ERROR;
        }
    }
    
private:
    // acquire fence等待实现
    status_t waitForAcquireFence(int slot, int timeoutMs) {
        sp<Fence> acquireFence = getAcquireFence(slot);
        if (acquireFence == nullptr) {
            ALOGE("No acquire fence for slot %d", slot);
            return BAD_VALUE;
        }
        
        // 使用poll机制等待fence信号
        return acquireFence->wait(timeoutMs);
    }
    
    // 类似的release fence和retire fence等待实现...
};
```

### 1.2 GPU-CPU操作同步

#### 1.2.1 GPU命令提交与fence
```cpp
// GPU命令提交与fence同步
class GpuCommandSynchronizer {
private:
    struct GpuCommand {
        std::vector<uint32_t> commands;   // GPU命令
        sp<Fence> completionFence;         // 完成fence
        nsecs_t submitTime;                // 提交时间
    };
    
    std::queue<GpuCommand> mCommandQueue;  // 命令队列
    mutable Mutex mMutex;                   // 队列锁
    
public:
    // 提交GPU命令并创建fence
    status_t submitGpuCommands(const std::vector<uint32_t>& commands, sp<Fence>* outFence) {
        // 创建完成fence
        sp<Fence> completionFence = createCompletionFence();
        if (completionFence == nullptr) {
            return NO_MEMORY;
        }
        
        // 构建命令项
        GpuCommand command;
        command.commands = commands;
        command.completionFence = completionFence;
        command.submitTime = systemTime(SYSTEM_TIME_MONOTONIC);
        
        // 加入队列
        Mutex::Autolock lock(mMutex);
        mCommandQueue.push(command);
        
        // 触发命令处理
        mCondition.signal();
        
        *outFence = completionFence;
        return NO_ERROR;
    }
    
    // GPU命令处理线程
    void* gpuCommandThread(void* arg) {
        while (mRunning) {
            GpuCommand command;
            {
                Mutex::Autolock lock(mMutex);
                while (mCommandQueue.empty()) {
                    mCondition.wait(mMutex);
                }
                command = mCommandQueue.front();
                mCommandQueue.pop();
            }
            
            // 执行GPU命令
            executeGpuCommands(command.commands);
            
            // 信号完成fence
            signalFence(command.completionFence);
        }
        return nullptr;
    }
};
```

#### 1.2.2 渲染管线fence同步
```cpp
// 完整的渲染管线fence同步
class RenderPipelineFenceSync {
private:
    struct RenderStage {
        sp<Fence> inputFence;           // 输入fence
        sp<Fence> outputFence;         // 输出fence
        std::function<void()> renderFunc; // 渲染函数
    };
    
    std::vector<RenderStage> mStages;  // 渲染阶段
    
public:
    // 执行完整的渲染管线
    status_t executeRenderPipeline() {
        sp<Fence> previousStageFence = nullptr;
        
        for (auto& stage : mStages) {
            // 等待前一阶段完成
            if (previousStageFence != nullptr) {
                status_t result = previousStageFence->wait(RENDER_FENCE_TIMEOUT);
                if (result != NO_ERROR) {
                    ALOGE("Render stage fence wait failed: %d", result);
                    return result;
                }
            }
            
            // 执行当前阶段渲染
            stage.renderFunc();
            
            // 创建输出fence
            stage.outputFence = createRenderFence();
            previousStageFence = stage.outputFence;
        }
        
        return NO_ERROR;
    }
    
    // 添加渲染阶段
    void addRenderStage(std::function<void()> renderFunc) {
        RenderStage stage;
        stage.renderFunc = renderFunc;
        mStages.push_back(stage);
    }
};
```

### 1.3 显示合成fence管理

#### 1.3.1 SurfaceFlinger合成fence
```cpp
// SurfaceFlinger显示合成fence管理
class SurfaceFlingerCompositionFence {
private:
    struct CompositionLayer {
        sp<Layer> layer;                // 图层
        sp<Fence> acquireFence;         // 获取fence
        sp<Fence> releaseFence;         // 释放fence
        bool readyForComposition;       // 是否准备好合成
    };
    
    std::vector<CompositionLayer> mLayers; // 合成图层
    sp<Fence> mPresentFence;            // 显示fence
    
public:
    // 执行图层合成
    status_t composeLayers() {
        // 1. 等待所有图层就绪
        for (auto& layer : mLayers) {
            if (layer.acquireFence != nullptr) {
                status_t result = layer.acquireFence->wait(ACQUIRE_FENCE_TIMEOUT);
                if (result != NO_ERROR) {
                    ALOGE("Layer acquire fence wait failed");
                    return result;
                }
            }
            layer.readyForComposition = true;
        }
        
        // 2. 执行合成操作
        performComposition();
        
        // 3. 创建显示fence
        mPresentFence = createPresentFence();
        
        // 4. 设置释放fence
        for (auto& layer : mLayers) {
            layer.releaseFence = createReleaseFence();
        }
        
        return NO_ERROR;
    }
    
    // 等待显示完成
    status_t waitForPresent(int timeoutMs) {
        if (mPresentFence == nullptr) {
            return NO_ERROR; // 没有显示fence，立即完成
        }
        
        return mPresentFence->wait(timeoutMs);
    }
};
```

## 2. 性能优化

### 2.1 fence创建优化

#### 2.1.1 fence池化机制
```cpp
// fence对象池化优化
class FencePool {
private:
    static constexpr int MAX_POOL_SIZE = 64;
    std::queue<sp<Fence>> mAvailableFences;  // 可用fence队列
    mutable Mutex mMutex;                    // 池锁
    
public:
    // 从池中获取fence
    sp<Fence> acquireFence() {
        Mutex::Autolock lock(mMutex);
        
        if (!mAvailableFences.empty()) {
            sp<Fence> fence = mAvailableFences.front();
            mAvailableFences.pop();
            
            // 重置fence状态
            resetFence(fence);
            return fence;
        }
        
        // 池为空，创建新fence
        return createNewFence();
    }
    
    // 释放fence回池
    void releaseFence(const sp<Fence>& fence) {
        if (fence == nullptr) {
            return;
        }
        
        Mutex::Autolock lock(mMutex);
        
        if (mAvailableFences.size() < MAX_POOL_SIZE) {
            mAvailableFences.push(fence);
        } else {
            // 池已满，销毁fence
            destroyFence(fence);
        }
    }
    
private:
    // 重置fence状态
    void resetFence(const sp<Fence>& fence) {
        // 实现fence重置逻辑
        // 注意：这需要内核支持fence重置
    }
};
```

#### 2.1.2 批量fence创建
```cpp
// 批量fence创建优化
class BatchFenceCreator {
public:
    // 批量创建fence
    status_t createBatchFences(int count, std::vector<sp<Fence>>* outFences) {
        if (count <= 0) {
            return BAD_VALUE;
        }
        
        // 使用单个系统调用创建多个fence
        std::vector<int> fds(count);
        status_t result = createMultipleFences(fds.data(), count);
        if (result != NO_ERROR) {
            return result;
        }
        
        // 创建fence对象
        outFences->reserve(count);
        for (int i = 0; i < count; i++) {
            outFences->push_back(new Fence(fds[i]));
        }
        
        return NO_ERROR;
    }
    
private:
    // 内核批量fence创建接口
    status_t createMultipleFences(int* fds, int count) {
        // 实现批量fence创建
        // 这需要内核支持批量fence创建接口
        for (int i = 0; i < count; i++) {
            fds[i] = createFenceFD();
            if (fds[i] < 0) {
                // 创建失败，清理已创建的fence
                for (int j = 0; j < i; j++) {
                    close(fds[j]);
                }
                return -errno;
            }
        }
        return NO_ERROR;
    }
};
```

### 2.2 fence等待优化

#### 2.2.1 异步fence等待
```cpp
// 异步fence等待优化
class AsyncFenceWaiter {
private:
    struct AsyncWaitItem {
        sp<Fence> fence;                 // 等待的fence
        std::function<void(status_t)> callback; // 回调函数
        nsecs_t timeout;                 // 超时时间
    };
    
    std::list<AsyncWaitItem> mWaitQueue;  // 等待队列
    mutable Mutex mMutex;                 // 队列锁
    Condition mCondition;                 // 条件变量
    bool mRunning;                       // 运行标志
    
public:
    // 异步等待fence
    status_t waitAsync(const sp<Fence>& fence, std::function<void(status_t)> callback, nsecs_t timeout) {
        AsyncWaitItem item;
        item.fence = fence;
        item.callback = callback;
        item.timeout = timeout;
        
        Mutex::Autolock lock(mMutex);
        mWaitQueue.push_back(item);
        mCondition.signal();
        
        return NO_ERROR;
    }
    
    // 等待线程
    void* waitThread(void* arg) {
        while (mRunning) {
            AsyncWaitItem item;
            {
                Mutex::Autolock lock(mMutex);
                while (mWaitQueue.empty()) {
                    mCondition.wait(mMutex);
                }
                item = mWaitQueue.front();
                mWaitQueue.pop_front();
            }
            
            // 执行等待
            status_t result = item.fence->wait(item.timeout);
            
            // 调用回调
            if (item.callback) {
                item.callback(result);
            }
        }
        return nullptr;
    }
};
```

#### 2.2.2 fence合并等待
```cpp
// fence合并等待优化
class FenceMergeWaiter {
public:
    // 合并等待多个fence
    status_t waitForMultipleFences(const std::vector<sp<Fence>>& fences, int timeoutMs) {
        if (fences.empty()) {
            return NO_ERROR;
        }
        
        // 如果只有一个fence，直接等待
        if (fences.size() == 1) {
            return fences[0]->wait(timeoutMs);
        }
        
        // 合并多个fence
        sp<Fence> mergedFence = mergeFences(fences);
        if (mergedFence == nullptr) {
            ALOGE("Failed to merge fences");
            return NO_MEMORY;
        }
        
        // 等待合并后的fence
        return mergedFence->wait(timeoutMs);
    }
    
private:
    // 合并fence实现
    sp<Fence> mergeFences(const std::vector<sp<Fence>>& fences) {
        if (fences.empty()) {
            return nullptr;
        }
        
        sp<Fence> result = fences[0];
        for (size_t i = 1; i < fences.size(); i++) {
            result = Fence::merge(String8::format("merged_%zu", i), result, fences[i]);
            if (result == nullptr) {
                return nullptr;
            }
        }
        
        return result;
    }
};
```

### 2.3 内存使用优化

#### 2.3.1 fence文件描述符管理
```cpp
// fence文件描述符优化管理
class FenceFDManager {
private:
    static constexpr int MAX_FDS_PER_PROCESS = 1024; // 最大文件描述符数
    std::set<int> mActiveFDs;              // 活跃的文件描述符
    mutable Mutex mMutex;                  // 锁
    
public:
    // 跟踪fence文件描述符
    status_t trackFenceFD(int fd) {
        Mutex::Autolock lock(mMutex);
        
        if (mActiveFDs.size() >= MAX_FDS_PER_PROCESS) {
            ALOGW("Too many fence FDs, closing oldest");
            // 关闭最老的fence FD
            closeOldestFD();
        }
        
        mActiveFDs.insert(fd);
        return NO_ERROR;
    }
    
    // 关闭fence文件描述符
    status_t closeFenceFD(int fd) {
        Mutex::Autolock lock(mMutex);
        
        auto it = mActiveFDs.find(fd);
        if (it != mActiveFDs.end()) {
            mActiveFDs.erase(it);
            ::close(fd);
        }
        
        return NO_ERROR;
    }
    
private:
    // 关闭最老的文件描述符
    void closeOldestFD() {
        if (!mActiveFDs.empty()) {
            int oldestFD = *mActiveFDs.begin();
            mActiveFDs.erase(mActiveFDs.begin());
            ::close(oldestFD);
        }
    }
};
```

通过以上详细的功能实现和优化策略，fence机制能够在Android图形系统中高效地管理GPU-CPU同步，确保图形操作的正确性和性能。