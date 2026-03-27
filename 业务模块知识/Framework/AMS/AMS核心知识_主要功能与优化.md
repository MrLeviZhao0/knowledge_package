# AMS核心知识_主要功能与优化

## 主要功能

### 1.1 应用生命周期管理

从Android 10开始，AMS的职责进行了重新划分：Activity生命周期由ATMS管理，Service、BroadcastReceiver、ContentProvider由AMS管理。

#### Activity生命周期管理（ATMS管理）
```java
// Activity生命周期状态管理（Android 11+）
public class Task {
    private ActivityTaskManagerService mService;
    private RootWindowContainer mRootWindowContainer;
    
    // 启动Activity
    private void startActivityLocked(ActivityRecord r, Task targetTask, boolean doResume) {
        // 设置初始状态
        r.setState(ActivityState.INITIALIZING, "startActivityLocked");
        
        // 添加到任务
        targetTask.addChild(r);
        
        // 检查TaskFragment
        TaskFragment tf = r.getTaskFragment();
        if (tf != null && tf.isEmbedded()) {
            // 嵌入式任务片段处理
            tf.onActivityAdded(r);
        }
        
        // 执行启动流程
        if (doResume) {
            mRootWindowContainer.resumeFocusedTasksTopActivities();
        }
    }
    
    // 暂停Activity
    final boolean startPausingLocked(boolean userLeaving, boolean uiSleeping,
                                    ActivityRecord resuming, String reason) {
        ActivityRecord prev = getResumedActivity();
        if (prev == null) {
            return false;
        }
        
        // 设置暂停状态
        mPausingActivity = prev;
        
        // 调用Activity的onPause
        try {
            prev.getProcess().getThread().schedulePauseActivity(
                prev.getActivityToken(),
                prev.isFinishing(),
                userLeaving,
                prev.getConfigChangeFlags(),
                false); // 不立即暂停
        } catch (RemoteException e) {
            Slog.w(TAG, "Exception onPause", e);
        }
        
        // 更新状态
        prev.setState(ActivityState.PAUSING, "startPausingLocked");
        
        // 设置超时
        schedulePauseTimeout(prev);
        
        return true;
    }
    
    // 恢复Activity
    final boolean resumeTopActivityInnerLocked(ActivityRecord next, 
                                               ActivityRecord prev,
                                               ActivityOptions options) {
        // 获取顶部Activity
        if (next == null) {
            return resumeHomeActivity(prev, "noMoreActivities");
        }
        
        // 设置恢复状态
        next.setState(ActivityState.RESUMED, "resumeTopActivityInnerLocked");
        
        // 调用Activity的onResume
        try {
            next.getProcess().getThread().scheduleResumeActivity(
                next.getActivityToken(),
                next.getProcessState(),
                mService.isNextTransitionForward(),
                next.getProcess().getReportedProcState());
        } catch (RemoteException e) {
            Slog.w(TAG, "Exception onResume", e);
        }
        
        // 更新窗口可见性
        mService.mWindowManager.setAppVisibility(next, true);
        
        // 更新焦点任务
        mRootWindowContainer.setFocusedTask(this);
        
        return true;
    }
}
```

#### Service生命周期管理（AMS管理）
```java
// Service生命周期管理
public class ActiveServices {
    
    // 启动服务
    public ComponentName startServiceLocked(IApplicationThread caller, Intent service,
                                           String resolvedType, boolean requireForeground,
                                           String callingPackage, String callingFeatureId,
                                           int userId) {
        // 解析服务
        ServiceLookupResult res = retrieveServiceLocked(service, resolvedType, callingPackage,
                callingPid, callingUid, userId, true, callerFg, false);
        
        if (res == null) {
            return null;
        }
        
        ServiceRecord r = res.record;
        
        // 检查前台服务限制
        if (requireForeground && !r.appInfo.targetSdkVersion.enforceForegroundServiceCheck()) {
            r.fgRequired = true;
        }
        
        // 设置启动状态
        r.startRequested = true;
        r.delayedStop = false;
        
        // 检查是否需要启动进程
        if (r.app == null) {
            ProcessRecord host = mAm.startProcessLocked(
                r.processName, r.appInfo,
                false, 0, "service", r.name);
            if (host == null) {
                return null;
            }
            r.app = host;
        }
        
        // 发送启动命令
        sendServiceArgsLocked(r, false, 0);
        
        return r.name;
    }
    
    // 停止服务
    public int stopServiceLocked(IApplicationThread caller, Intent service,
                                String resolvedType, int userId) {
        ServiceLookupResult res = retrieveServiceLocked(service, resolvedType,
                callingPackage, callingPid, callingUid, userId, false, callerFg, false);
        
        if (res == null) {
            return 0;
        }
        
        ServiceRecord r = res.record;
        
        // 停止服务
        if (r != null) {
            stopServiceLocked(r);
            return 1;
        }
        
        return 0;
    }
    
    // 绑定服务
    public int bindServiceLocked(IApplicationThread caller, IBinder token,
                                Intent service, String resolvedType,
                                IServiceConnection connection, int flags,
                                String callingPackage, int userId) {
        // 解析服务
        ServiceLookupResult res = retrieveServiceLocked(service, resolvedType,
                callingPackage, callingPid, callingUid, userId, true, callerFg,
                (flags & Context.BIND_AUTO_CREATE) != 0);
        
        if (res == null) {
            return 0;
        }
        
        ServiceRecord r = res.record;
        
        // 创建绑定记录
        ConnectionRecord c = new ConnectionRecord(
            caller, activity, connection, flags, callerUid, callingPid);
        
        r.addConnection(c);
        
        // 发送绑定命令
        if (r.app != null && r.app.thread != null) {
            r.app.thread.scheduleBindService(r, c.intent, c.intent, c.intent.getFlags(),
                    r.app.getReportedProcState());
        }
        
        return 1;
    }
}
```
```

### 1.2 进程管理功能（AMS管理）

AMS负责系统中所有应用进程的创建、销毁、优先级调整等管理功能，与ATMS协同工作。

#### 进程创建与销毁
```java
// 进程管理功能
public final class ActivityManagerService {
    private final ProcessList mProcessList;
    private final ActivityTaskManagerInternal mAtmInternal;
    
    // 创建新进程
    ProcessRecord startProcessLocked(String processName, ApplicationInfo info,
                                     boolean knownToBeDead, int intentFlags,
                                     String hostingType, ComponentName hostingName,
                                     boolean allowWhileBooting, boolean isolated,
                                     boolean keepIfLarge, String abiOverride) {
        
        // 检查进程是否已存在
        ProcessRecord app = mProcessList.getProcessRecordLocked(processName, info.uid);
        
        if (app == null) {
            // 创建新的进程记录
            app = newProcessRecordLocked(info, processName, isolated, 0);
            
            // 添加到进程列表
            mProcessList.addProcessNameLocked(app);
            mProcessList.updateLruProcessLocked(app, false, null);
            
            // 更新OOM调整值
            updateOomAdjLocked(app, OOM_ADJ_REASON_PROCESS_BEGIN);
        }
        
        // 启动进程
        if ((app.getThread() == null) || knownToBeDead) {
            app.setKilled(false);
            app.setKilledByAm(false);
            app.setRemoved(false);
            
            // 调用Zygote创建进程
            mProcessList.startProcessLocked(app, hostingType, hostingName, abiOverride);
        }
        
        return app;
    }
    
    // 杀死进程
    final boolean killProcessLocked(ProcessRecord app, String reason, boolean noisy) {
        if (app == null) {
            return false;
        }
        
        // 设置杀死状态
        app.setKilled(true);
        app.setKilledByAm(true);
        
        // 清理进程相关资源
        cleanUpApplicationRecordLocked(app, false, -1, false);
        
        // 通知ATMS
        mAtmInternal.onProcessDied(app.getUid(), app.getPid());
        
        // 发送杀死信号
        if (app.getPid() > 0) {
            Process.killProcessQuiet(app.getPid());
            
            if (noisy) {
                Slog.i(TAG, "Killing " + app.toShortString() + " (adj " + app.getCurAdj()
                        + "): " + reason);
            }
        }
        
        // 更新进程列表
        mProcessList.removeProcessNameLocked(app);
        
        return true;
    }
}
```

#### 进程优先级管理
```java
// 进程优先级管理
public class ProcessList {
    private final ActivityManagerService mService;
    private final ActivityTaskManagerInternal mAtmInternal;
    
    // 更新进程的OOM调整值
    final void updateOomAdjLocked(ProcessRecord app, String reason) {
        // 获取窗口进程控制器
        WindowProcessController wpc = app.getWindowProcessController();
        
        // 从ATMS获取Activity状态
        int adj = computeOOMAdjLocked(app, wpc);
        
        // 应用调整值
        applyOomAdjLocked(app, adj);
    }
    
    // 计算OOM调整值
    private int computeOOMAdjLocked(ProcessRecord app, WindowProcessController wpc) {
        // 持久进程
        if (app.isPersistent()) {
            return PERSISTENT_PROC_ADJ;
        }
        
        // 从ATMS查询Activity状态
        if (wpc != null) {
            ActivityRecord topActivity = wpc.getTopResumedActivity();
            if (topActivity != null && topActivity.isFocused()) {
                return FOREGROUND_APP_ADJ;
            }
            
            // 可见Activity
            if (wpc.hasVisibleActivities()) {
                return VISIBLE_APP_ADJ;
            }
        }
        
        // 前台服务
        if (app.hasForegroundServices()) {
            return FOREGROUND_SERVICE_ADJ;
        }
        
        // 可感知进程
        if (app.hasPerceptibleFeatures()) {
            return PERCEPTIBLE_APP_ADJ;
        }
        
        // 服务进程
        if (app.hasRunningServices()) {
            return SERVICE_ADJ;
        }
        
        // Home进程
        if (app.isHomeProcess()) {
            return HOME_APP_ADJ;
        }
        
        // 缓存进程
        return CACHED_APP_MIN_ADJ;
    }
    
    // 应用OOM调整值
    private void applyOomAdjLocked(ProcessRecord app, int adj) {
        if (adj == app.getCurAdj()) {
            return;
        }
        
        app.setCurAdj(adj);
        
        // 更新内核的OOM调整值
        if (app.getPid() > 0) {
            Process.setOomScoreAdj(app.getPid(), adj);
        }
        
        // 更新进程状态
        int procState = computeProcessState(app, app.getWindowProcessController());
        if (procState != app.getCurProcState()) {
            app.setCurProcState(procState);
            app.getWindowProcessController().setProcState(procState);
        }
    }
}
```

### 1.3 任务栈管理功能（ATMS管理）

ATMS通过RootWindowContainer、TaskDisplayArea和Task管理Activity的任务栈，支持多窗口、分屏等复杂场景。

#### 任务栈操作
```java
// 任务栈管理（Android 11+）
public class Task {
    
    // 添加Activity到任务
    void addChild(ActivityRecord r) {
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
        
        // 设置Activity所属任务
        r.setTask(this);
        
        // 更新任务信息
        updateTaskInfo();
    }
    
    // 移除Activity
    void removeChild(ActivityRecord r) {
        // 从任务中移除
        mActivities.remove(r);
        
        // 清理相关资源
        r.setTask(null);
        
        // 更新任务信息
        updateTaskInfo();
    }
    
    // 查找Activity
    ActivityRecord findActivity(Intent intent, ActivityInfo info) {
        for (int i = mActivities.size() - 1; i >= 0; i--) {
            ActivityRecord r = mActivities.get(i);
            
            // 匹配Intent和ActivityInfo
            if (r.getIntent().filterEquals(intent) && r.getActivityInfo().equals(info)) {
                return r;
            }
        }
        
        return null;
    }
    
    // 移动到前台
    void moveToTop(String reason) {
        // 更新任务顺序
        TaskDisplayArea tda = getDisplayArea();
        tda.positionChildAt(this, POSITION_TOP);
        
        // 恢复顶部Activity
        resumeTopActivityUncheckedLocked(null, null);
        
        // 记录移动原因
        if (DEBUG_STACK) Slog.d(TAG_STACK, "moveToTop: " + reason);
    }
}

// 多窗口任务管理
public class RootWindowContainer {
    
    // 分屏模式管理
    void setSplitScreenMode(boolean enabled) {
        TaskDisplayArea tda = getDefaultTaskDisplayArea();
        
        if (enabled) {
            // 进入分屏模式
            Task focusedTask = tda.getFocusedRootTask();
            if (focusedTask != null) {
                enterSplitScreen(focusedTask, true);
            }
        } else {
            // 退出分屏模式
            exitSplitScreen();
        }
    }
    
    // 进入分屏
    private void enterSplitScreen(Task task, boolean onTop) {
        // 设置窗口模式
        task.setWindowingMode(WINDOWING_MODE_SPLIT_SCREEN_PRIMARY);
        
        // 创建分屏对
        Task pairTask = createSplitScreenPair(task);
        pairTask.setWindowingMode(WINDOWING_MODE_SPLIT_SCREEN_SECONDARY);
        
        // 更新布局
        updateSplitScreenBounds();
    }
    
    // 画中画模式
    void enterPictureInPicture(Task task, PictureInPictureParams params) {
        ActivityRecord pipActivity = task.getTopActivity();
        if (pipActivity == null || !pipActivity.supportsPip()) {
            return;
        }
        
        // 进入PIP模式
        pipActivity.enterPictureInPictureMode(params);
        
        // 更新任务状态
        task.setWindowingMode(WINDOWING_MODE_PINNED);
    }
}
```

### 1.4 内存管理功能（AMS管理）

AMS通过多种机制管理应用内存使用，确保系统稳定运行，与ATMS协同工作。

#### 内存监控与回收
```java
// 内存管理功能
public class ActivityManagerService {
    private final LowMemoryDetector mLowMemDetector;
    private final ProcessList mProcessList;
    
    // 内存压力处理
    private void handleMemoryPressure(int level) {
        switch (level) {
            case MEMORY_PRESSURE_LOW:
                // 低内存压力，轻度回收
                trimApplications(TRIM_MEMORY_UI_HIDDEN);
                break;
                
            case MEMORY_PRESSURE_MEDIUM:
                // 中等内存压力，中度回收
                trimApplications(TRIM_MEMORY_MODERATE);
                killBackgroundProcesses("memory_pressure_medium");
                break;
                
            case MEMORY_PRESSURE_CRITICAL:
                // 严重内存压力，强制回收
                trimApplications(TRIM_MEMORY_RUNNING_CRITICAL);
                killAllBackgroundProcesses("memory_pressure_critical");
                break;
        }
    }
    
    // 应用内存回收
    private void trimApplications(int level) {
        // 获取当前内存状态
        ActivityManager.MemoryInfo memInfo = new ActivityManager.MemoryInfo();
        getMemoryInfo(memInfo);
        
        // 根据内存压力级别决定回收策略
        if (memInfo.lowMemory) {
            // 低内存，强制回收缓存进程
            synchronized (this) {
                ArrayList<ProcessRecord> procs = mProcessList.getProcesses();
                for (int i = procs.size() - 1; i >= 0; i--) {
                    ProcessRecord app = procs.get(i);
                    if (app.getCurAdj() >= ProcessList.CACHED_APP_MIN_ADJ) {
                        killProcessLocked(app, "low memory", true);
                    }
                }
            }
        } else {
            // 正常内存，发送TrimMemory
            ArrayList<ProcessRecord> procs = mProcessList.getProcesses();
            for (int i = procs.size() - 1; i >= 0; i--) {
                ProcessRecord app = procs.get(i);
                if (app.getCurAdj() >= ProcessList.CACHED_APP_MAX_ADJ) {
                    // 回收最不重要的进程
                    killProcessLocked(app, "trim memory", false);
                } else if (app.getCurProcState() >= PROCESS_STATE_IMPORTANT_BACKGROUND) {
                    // 通知应用释放内存
                    app.getThread().scheduleTrimMemory(level);
                }
            }
        }
    }
    
    // PSI内存监控（Android 11+）
    public void monitorMemoryPressure() {
        mLowMemDetector.startMonitoring();
    }
}
```

#### 低内存检测
```java
// 低内存检测器
public class LowMemoryDetector {
    private final ActivityManagerService mService;
    
    // PSI监控
    public void startMonitoring() {
        // 使用PSI监控内存压力
        PsiParser psiParser = new PsiParser();
        psiParser.registerPsiListener(new PsiParser.Listener() {
            @Override
            public void onPressureStateChanged(int pressureLevel) {
                mService.handleMemoryPressure(pressureLevel);
            }
        });
    }
}
```

## 性能优化

### 2.1 启动性能优化

优化应用启动速度是ATMS的重要优化方向。

#### 启动流程优化
```java
// 启动性能优化（Android 11+）
public class ActivityStarter {
    private final ActivityTaskManagerService mService;
    
    // 优化后的启动流程
    private int executeRequest(Request request) {
        // 阶段1：并行处理权限验证和Intent解析
        CompletableFuture<Boolean> permissionCheck = CompletableFuture.supplyAsync(() -> {
            return checkPermission(request.callingUid, request.intent, request.callingPackage);
        });
        
        CompletableFuture<ResolveInfo> intentResolve = CompletableFuture.supplyAsync(() -> {
            return mService.getPackageManagerInternalLocked()
                .resolveIntent(request.intent, request.resolvedType,
                    ActivityManagerService.STOCK_PM_FLAGS, request.userId);
        });
        
        // 等待并行任务完成
        try {
            if (!permissionCheck.get()) {
                return START_PERMISSION_DENIED;
            }
            
            ResolveInfo rInfo = intentResolve.get();
            if (rInfo == null || rInfo.activityInfo == null) {
                return START_INTENT_NOT_RESOLVED;
            }
        } catch (Exception e) {
            return START_ABORTED;
        }
        
        // 阶段2：预加载目标进程资源
        preloadProcessResources(rInfo.activityInfo);
        
        // 阶段3：优化进程启动
        ProcessRecord targetApp = getOrStartProcessOptimized(rInfo.activityInfo);
        
        // 阶段4：快速Activity创建
        ActivityRecord r = createActivityRecordOptimized(rInfo.activityInfo, request.intent);
        
        // 阶段5：异步状态更新
        updateActivityStateAsync(r);
        
        return START_SUCCESS;
    }
    
    // 优化进程启动
    private ProcessRecord getOrStartProcessOptimized(ActivityInfo aInfo) {
        ProcessRecord app = mService.getProcessRecordLocked(aInfo.processName, 
            aInfo.applicationInfo.uid);
        
        if (app == null || !app.hasThread()) {
            // 使用优化后的进程启动
            app = mService.startProcessForActivityLaunch(aInfo);
        }
        
        return app;
    }
}
```

#### 预测性启动优化（Android 13+）
```java
// 预测性启动优化
public class PredictiveBackController {
    private final ActivityTaskManagerService mService;
    
    // 预测可能启动的应用
    public void predictAndPreload(Intent intent) {
        // 基于用户习惯预测
        List<AppPrediction> predictions = mPredictor.predict(intent);
        
        for (AppPrediction pred : predictions) {
            if (pred.confidence > PRELOAD_THRESHOLD) {
                // 预加载应用进程
                preloadAppProcess(pred.packageName, pred.userId);
                
                // 预加载资源
                preloadResources(pred);
            }
        }
    }
    
    // 预加载应用进程
    private void preloadAppProcess(String packageName, int userId) {
        ApplicationInfo appInfo = mService.getPackageManager()
            .getApplicationInfo(packageName, 0, userId);
        
        if (appInfo != null) {
            // 通知AMS创建进程
            mService.mAmInternal.startProcessLocked(
                appInfo.processName, appInfo, "preload", null);
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
    private final ActivityManagerService mService;
    private final ActivityTaskManagerInternal mAtmInternal;
    
    // 定期检测内存泄漏
    public void detectMemoryLeaks() {
        // 检测Activity泄漏（通过ATMS）
        detectActivityLeaks();
        
        // 检测Service泄漏
        detectServiceLeaks();
        
        // 检测进程泄漏
        detectProcessLeaks();
    }
    
    // 检测Activity泄漏
    private void detectActivityLeaks() {
        // 获取所有Activity（通过ATMS）
        List<ActivityRecord> activities = mAtmInternal.getAllActivities();
        
        for (ActivityRecord r : activities) {
            // 检查Activity是否应该被回收
            if (shouldActivityBeRecycled(r)) {
                // 强制回收泄漏的Activity
                mAtmInternal.forceRecycleActivity(r);
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

### 2.3 多任务优化

优化多任务场景下的性能和用户体验。

#### 任务切换优化（ATMS）
```java
// 任务切换优化
public class TaskSwitcher {
    private final ActivityTaskManagerService mService;
    
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
        Task task = mService.getRootWindowContainer().getTask(taskId);
        if (task != null) {
            // 预加载Activity资源
            for (ActivityRecord r : task.mActivities) {
                preloadActivityResources(r);
            }
            
            // 预加载进程资源
            preloadProcessResources(task.getProcess());
        }
    }
}
```

### 2.4 功耗优化

优化AMS和ATMS的功耗表现，延长设备续航时间。

#### 智能进程管理
```java
// 功耗优化
public class PowerOptimizer {
    private final ActivityManagerService mService;
    private final ActivityTaskManagerInternal mAtmInternal;
    
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
    
    // 游戏模式
    private void setGamingMode() {
        // 获取前台游戏进程
        ActivityRecord topActivity = mAtmInternal.getTopFocusedActivity();
        if (topActivity != null && isGameApp(topActivity.packageName)) {
            ProcessRecord gameProcess = mService.getProcessRecordLocked(
                topActivity.processName, topActivity.uid);
            
            if (gameProcess != null) {
                // 提升游戏进程优先级
                gameProcess.setImportant(true);
                mService.updateOomAdjLocked(gameProcess, "game_mode");
            }
        }
    }
    
    // 省电模式
    private void setBatterySavingMode() {
        // 严格限制后台进程
        ArrayList<ProcessRecord> procs = mService.getProcessList().getProcesses();
        for (ProcessRecord app : procs) {
            if (app.getCurAdj() >= ProcessList.SERVICE_ADJ) {
                // 杀死非必要后台进程
                mService.killProcessLocked(app, "battery_saving", false);
            }
        }
    }
}
```

通过深入理解AMS和ATMS的主要功能和优化策略，开发者可以更好地进行系统定制、性能优化和故障排查。