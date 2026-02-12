# AMS核心知识_主要功能与优化

## 主要功能

### 1.1 应用生命周期管理

AMS负责管理Android应用中四大组件的完整生命周期，确保应用按照预期状态运行。

#### Activity生命周期管理
```java
// Activity生命周期状态管理
public class ActivityStack {
    
    // 启动Activity
    private void startActivityLocked(ActivityRecord r, boolean newTask, boolean doResume) {
        // 设置初始状态
        r.setState(ActivityState.INITIALIZING, "startActivityLocked");
        
        // 添加到任务栈
        if (newTask) {
            TaskRecord task = new TaskRecord(mService, r.info, r.intent, null);
            task.addActivityToTop(r);
            addTask(task, null, false);
        } else {
            mTaskHistory.get(mTaskHistory.size() - 1).addActivityToTop(r);
        }
        
        // 执行启动流程
        if (doResume) {
            resumeTopActivityUncheckedLocked(null, null);
        }
    }
    
    // 暂停Activity
    final boolean startPausingLocked(boolean userLeaving, boolean uiSleeping,
                                    ActivityRecord resuming, boolean pauseImmediately) {
        if (mPausingActivity != null) {
            // 已经有Activity在暂停中
            return false;
        }
        
        ActivityRecord prev = mResumedActivity;
        if (prev == null) {
            // 没有正在运行的Activity
            return false;
        }
        
        // 设置暂停状态
        mPausingActivity = prev;
        mLastPausedActivity = prev;
        mLastNoHistoryActivity = (prev.intent.getFlags() & Intent.FLAG_ACTIVITY_NO_HISTORY) != 0
                ? prev : null;
        
        // 调用Activity的onPause
        prev.app.thread.schedulePauseActivity(prev.appToken, prev.finishing,
                userLeaving, prev.configChangeFlags, pauseImmediately);
        
        // 更新状态
        prev.setState(ActivityState.PAUSING, "startPausingLocked");
        
        return true;
    }
    
    // 恢复Activity
    final boolean resumeTopActivityInnerLocked(ActivityRecord prev, ActivityOptions options) {
        // 获取顶部Activity
        ActivityRecord next = topRunningActivityLocked();
        
        if (next == null) {
            // 没有Activity，回到Home
            return resumeHomeActivity(prev, "noMoreActivities", options);
        }
        
        // 设置恢复状态
        next.setState(ActivityState.RESUMED, "resumeTopActivityInnerLocked");
        
        // 调用Activity的onResume
        next.app.thread.scheduleResumeActivity(next.appToken, next.app.repProcState,
                mService.isNextTransitionForward(), next.app.getReportedProcState());
        
        // 更新窗口状态
        mWindowManager.setAppVisibility(next.appToken, true);
        
        // 更新焦点栈
        mStackSupervisor.setFocusedStack(this);
        
        return true;
    }
}
```

#### Service生命周期管理
```java
// Service生命周期管理
public class ActiveServices {
    
    // 启动服务
    public int startServiceLocked(ServiceRecord r, boolean fg, boolean execInFg) {
        // 设置启动状态
        r.startRequested = true;
        r.delayedStop = false;
        r.fgRequired = fg;
        r.executingStart = true;
        
        // 调用服务的onCreate和onStartCommand
        if (r.app != null && r.app.thread != null) {
            try {
                // 创建服务
                r.app.thread.scheduleCreateService(r, r.serviceInfo,
                        mAm.compatibilityInfoForPackageLocked(r.serviceInfo.applicationInfo),
                        app.getReportedProcState());
                
                // 启动服务
                r.app.thread.scheduleServiceArgs(r, false, 0, 0, r.intent);
                
                // 更新服务状态
                updateServiceClientActivitiesLocked(r.app, null, true);
                
            } catch (Exception e) {
                // 异常处理
                Slog.w(TAG, "Exception when starting service " + r.shortName, e);
            }
        }
        
        return Service.START_REDELIVER_INTENT;
    }
    
    // 停止服务
    public boolean stopServiceLocked(ServiceRecord r) {
        // 设置停止状态
        r.startRequested = false;
        
        // 调用服务的onDestroy
        if (r.app != null && r.app.thread != null) {
            try {
                r.app.thread.scheduleStopService(r);
            } catch (Exception e) {
                Slog.w(TAG, "Exception when stopping service " + r.shortName, e);
            }
        }
        
        // 清理服务记录
        mServices.remove(r.name);
        
        return true;
    }
}
```

### 1.2 进程管理功能

AMS负责系统中所有应用进程的创建、销毁、优先级调整等管理功能。

#### 进程创建与销毁
```java
// 进程管理功能
public final class ActivityManagerService {
    
    // 创建新进程
    final ProcessRecord startProcessLocked(String processName, ApplicationInfo info,
                                          boolean knownToBeDead, int intentFlags,
                                          String hostingType, ComponentName hostingName,
                                          boolean allowWhileBooting, boolean isolated,
                                          boolean keepIfLarge) {
        
        // 检查进程是否已存在
        ProcessRecord app = getProcessRecordLocked(processName, info.uid, true);
        
        if (app == null) {
            // 创建新的进程记录
            app = newProcessRecordLocked(info, processName, isolated, 0);
            
            // 添加到进程列表
            mProcessNames.put(processName, info.uid, app);
            updateLruProcessLocked(app, false, null);
            
            // 更新OOM调整值
            updateOomAdjLocked();
        }
        
        // 启动进程
        if ((app.thread == null) || knownToBeDead) {
            app.killed = false;
            app.killedByAm = false;
            app.removed = false;
            
            // 调用Zygote创建进程
            startProcessLocked(app, hostingType, hostingName);
        }
        
        return app;
    }
    
    // 杀死进程
    final boolean killProcessLocked(ProcessRecord app, String reason, boolean noisy) {
        if (app == null) {
            return false;
        }
        
        // 设置杀死状态
        app.killed = true;
        app.killedByAm = true;
        
        // 清理进程相关资源
        cleanUpApplicationRecordLocked(app, false, -1, false);
        
        // 发送杀死信号
        if (app.pid > 0) {
            Process.killProcess(app.pid);
            
            if (noisy) {
                Slog.i(TAG, "Killing " + app.toShortString() + " (adj " + app.setAdj
                        + "): " + reason);
            }
        }
        
        // 更新进程列表
        removeProcessNameLocked(app);
        
        return true;
    }
}
```

#### 进程优先级管理
```java
// 进程优先级管理
public class ProcessList {
    
    // 更新进程的OOM调整值
    final void updateOomAdjLocked(ProcessRecord app) {
        // 基于Activity状态计算优先级
        if (app.foregroundActivities) {
            app.setRawAdj = FOREGROUND_APP_ADJ;
        } else if (app.foregroundServices) {
            app.setRawAdj = FOREGROUND_SERVICE_ADJ;
        } else if (app.hasVisibleActivities()) {
            app.setRawAdj = VISIBLE_APP_ADJ;
        } else if (app.hasRecentTasks()) {
            app.setRawAdj = PERCEPTIBLE_APP_ADJ;
        } else if (app.hasRunningServices()) {
            app.setRawAdj = SERVICE_ADJ;
        } else {
            app.setRawAdj = CACHED_APP_MIN_ADJ;
        }
        
        // 应用调整值
        applyOomAdjLocked(app);
    }
    
    // 应用OOM调整值
    private void applyOomAdjLocked(ProcessRecord app) {
        // 设置进程的OOM调整值
        if (app.setRawAdj != app.curAdj) {
            app.curAdj = app.setRawAdj;
            
            // 更新内核的OOM调整值
            if (app.pid > 0) {
                Process.setOomAdj(app.pid, app.curAdj);
            }
        }
        
        // 更新进程状态
        app.setProcState = computeProcessState(app);
        if (app.setProcState != app.curProcState) {
            app.curProcState = app.setProcState;
            
            // 通知其他系统组件
            mService.updateProcessState(app, app.curProcState);
        }
    }
}
```

### 1.3 任务栈管理功能

AMS通过ActivityStack管理Activity的任务栈，支持多任务、多窗口等复杂场景。

#### 任务栈操作
```java
// 任务栈管理
public class ActivityStack {
    
    // 添加Activity到任务栈
    void addActivityToTop(ActivityRecord r) {
        // 检查是否已存在
        final int index = indexOfActivity(r);
        if (index >= 0) {
            // 已存在，移动到顶部
            mActivities.remove(index);
            mActivities.add(r);
        } else {
            // 新Activity，添加到顶部
            mActivities.add(r);
        }
        
        // 更新任务信息
        updateTask(r);
    }
    
    // 移除Activity
    void removeActivity(ActivityRecord r) {
        // 从任务栈中移除
        mActivities.remove(r);
        
        // 清理相关资源
        r.task = null;
        
        // 更新任务信息
        updateTask(null);
    }
    
    // 查找Activity
    ActivityRecord findActivity(Intent intent, ActivityInfo info) {
        for (int i = mActivities.size() - 1; i >= 0; i--) {
            ActivityRecord r = mActivities.get(i);
            
            // 匹配Intent和ActivityInfo
            if (r.intent.filterEquals(intent) && r.info.equals(info)) {
                return r;
            }
        }
        
        return null;
    }
    
    // 移动到前台
    void moveToFront(String reason) {
        // 更新栈顺序
        mStackSupervisor.moveStackToFront(this);
        
        // 恢复顶部Activity
        resumeTopActivityUncheckedLocked(null, null);
        
        // 记录移动原因
        if (DEBUG_STACK) Slog.d(TAG_STACK, "moveToFront: " + reason);
    }
}
```

### 1.4 内存管理功能

AMS通过多种机制管理应用内存使用，确保系统稳定运行。

#### 内存监控与回收
```java
// 内存管理功能
public class ActivityManagerService {
    
    // 内存压力处理
    private void handleMemoryPressure(int level) {
        switch (level) {
            case MEMORY_PRESSURE_LOW:
                // 低内存压力，轻度回收
                trimApplications();
                break;
                
            case MEMORY_PRESSURE_MEDIUM:
                // 中等内存压力，中度回收
                trimApplications();
                killBackgroundProcesses();
                break;
                
            case MEMORY_PRESSURE_CRITICAL:
                // 严重内存压力，强制回收
                trimApplications();
                killAllBackgroundProcesses();
                break;
        }
    }
    
    // 应用内存回收
    private void trimApplications() {
        // 获取当前内存状态
        MemoryInfo memInfo = new MemoryInfo();
        getMemoryInfo(memInfo);
        
        // 根据内存压力级别决定回收策略
        if (memInfo.lowMemory) {
            // 低内存，强制回收缓存进程
            for (ProcessRecord app : mLruProcesses) {
                if (app.curAdj >= ProcessList.CACHED_APP_MIN_ADJ) {
                    killProcessLocked(app, "low memory", true);
                }
            }
        } else {
            // 正常内存，轻度回收
            for (ProcessRecord app : mLruProcesses) {
                if (app.curAdj >= ProcessList.CACHED_APP_MAX_ADJ) {
                    // 回收最不重要的进程
                    killProcessLocked(app, "trim memory", false);
                }
            }
        }
    }
}
```

## 性能优化

### 2.1 启动性能优化

优化应用启动速度是AMS的重要优化方向。

#### 启动流程优化
```java
// 启动性能优化
public class ActivityStarter {
    
    // 优化后的启动流程
    private int startActivityOptimized(...) {
        // 阶段1：并行处理权限验证和Intent解析
        CompletableFuture<Boolean> permissionCheck = CompletableFuture.supplyAsync(() -> {
            return checkPermission(callingUid, permission);
        });
        
        CompletableFuture<ActivityInfo> intentResolve = CompletableFuture.supplyAsync(() -> {
            return resolveActivity(intent, resolvedType, userId);
        });
        
        // 等待并行任务完成
        if (!permissionCheck.get()) {
            return START_PERMISSION_DENIED;
        }
        
        ActivityInfo aInfo = intentResolve.get();
        if (aInfo == null) {
            return START_CLASS_NOT_FOUND;
        }
        
        // 阶段2：预加载目标进程资源
        preloadProcessResources(aInfo);
        
        // 阶段3：优化进程启动
        ProcessRecord targetApp = getOrStartProcessOptimized(aInfo);
        
        // 阶段4：快速Activity创建
        ActivityRecord r = createActivityRecordOptimized(aInfo, intent);
        
        // 阶段5：异步状态更新
        updateActivityStateAsync(r);
        
        return START_SUCCESS;
    }
    
    // 优化进程启动
    private ProcessRecord getOrStartProcessOptimized(ActivityInfo aInfo) {
        ProcessRecord app = getProcessRecordLocked(aInfo.processName, aInfo.applicationInfo.uid);
        
        if (app == null || app.thread == null) {
            // 使用优化后的进程启动
            app = mService.startProcessOptimized(aInfo.processName,
                aInfo.applicationInfo, "activity", aInfo.name);
        }
        
        return app;
    }
}
```

#### 进程预加载优化
```java
// 进程预加载优化
public class ProcessPreloader {
    
    // 预加载常用应用进程
    public void preloadFrequentProcesses() {
        // 获取用户常用应用列表
        List<String> frequentApps = getFrequentApps();
        
        for (String app : frequentApps) {
            // 预加载应用进程
            preloadProcess(app);
        }
    }
    
    // 预加载单个进程
    private void preloadProcess(String packageName) {
        // 获取应用信息
        ApplicationInfo appInfo = getApplicationInfo(packageName);
        
        if (appInfo != null) {
            // 创建空进程
            ProcessRecord app = mService.startProcessLocked(appInfo.processName,
                appInfo, false, 0, "preload", null, false, false, false);
            
            if (app != null) {
                // 设置预加载标志
                app.isPreloaded = true;
                
                // 预加载常用资源
                preloadCommonResources(app);
            }
        }
    }
}
```

### 2.2 内存使用优化

优化AMS自身和应用的内存使用，减少内存碎片和泄漏。

#### 内存泄漏检测与修复
```java
// 内存泄漏检测
public class MemoryLeakDetector {
    
    // 定期检测内存泄漏
    public void detectMemoryLeaks() {
        // 检测Activity泄漏
        detectActivityLeaks();
        
        // 检测Service泄漏
        detectServiceLeaks();
        
        // 检测进程泄漏
        detectProcessLeaks();
    }
    
    // 检测Activity泄漏
    private void detectActivityLeaks() {
        for (ActivityStack stack : mStackSupervisor.mStacks) {
            for (TaskRecord task : stack.mTaskHistory) {
                for (ActivityRecord r : task.mActivities) {
                    // 检查Activity是否应该被回收
                    if (shouldActivityBeRecycled(r)) {
                        // 强制回收泄漏的Activity
                        forceRecycleActivity(r);
                    }
                }
            }
        }
    }
    
    // 优化内存分配
    public void optimizeMemoryAllocation() {
        // 使用对象池减少内存分配
        mActivityRecordPool.optimize();
        mProcessRecordPool.optimize();
        mTaskRecordPool.optimize();
        
        // 压缩数据结构
        compressDataStructures();
    }
}
```

#### 内存缓存优化
```java
// 内存缓存优化
public class MemoryCacheOptimizer {
    
    // 优化Activity缓存
    public void optimizeActivityCache() {
        // 清理长时间未使用的Activity
        cleanStaleActivities();
        
        // 优化缓存大小
        adjustCacheSize();
        
        // 预缓存常用Activity
        preloadFrequentActivities();
    }
    
    // 清理过期Activity
    private void cleanStaleActivities() {
        long currentTime = System.currentTimeMillis();
        
        for (ActivityRecord r : mCachedActivities) {
            // 检查Activity是否过期
            if (currentTime - r.lastUsedTime > MAX_CACHE_TIME) {
                // 回收过期Activity
                recycleActivity(r);
            }
        }
    }
}
```

### 2.3 多任务优化

优化多任务场景下的性能和用户体验。

#### 任务切换优化
```java
// 任务切换优化
public class TaskSwitcher {
    
    // 优化任务切换流程
    public void switchTaskOptimized(int taskId) {
        // 预加载目标任务资源
        preloadTaskResources(taskId);
        
        // 异步暂停当前任务
        pauseCurrentTaskAsync();
        
        // 快速切换到目标任务
        switchToTask(taskId);
        
        // 后台清理不常用任务
        cleanupUnusedTasks();
    }
    
    // 预加载任务资源
    private void preloadTaskResources(int taskId) {
        TaskRecord task = getTask(taskId);
        if (task != null) {
            // 预加载Activity资源
            for (ActivityRecord r : task.mActivities) {
                preloadActivityResources(r);
            }
            
            // 预加载进程资源
            preloadProcessResources(task.app);
        }
    }
}
```

### 2.4 功耗优化

优化AMS的功耗表现，延长设备续航时间。

#### 智能进程管理
```java
// 功耗优化
public class PowerOptimizer {
    
    // 智能进程管理
    public void optimizeProcessManagement() {
        // 根据使用场景调整进程策略
        adjustProcessStrategyBasedOnScenario();
        
        // 优化后台进程管理
        optimizeBackgroundProcesses();
        
        // 减少不必要的唤醒
        reduceUnnecessaryWakeups();
    }
    
    // 根据场景调整策略
    private void adjustProcessStrategyBasedOnScenario() {
        String scenario = detectCurrentScenario();
        
        switch (scenario) {
            case "gaming":
                // 游戏模式，保持游戏进程高优先级
                setGamingMode();
                break;
                
            case "video":
                // 视频模式，优化媒体进程
                setVideoMode();
                break;
                
            case "battery_saving":
                // 省电模式，严格限制后台进程
                setBatterySavingMode();
                break;
                
            default:
                // 默认模式
                setNormalMode();
                break;
        }
    }
}
```

通过深入理解AMS的主要功能和优化策略，开发者可以更好地进行系统定制、性能优化和故障排查。