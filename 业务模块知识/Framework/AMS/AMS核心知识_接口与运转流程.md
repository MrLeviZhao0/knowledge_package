# AMS核心知识_接口与运转流程

## 对外提供的接口

### 1.1 Binder接口定义

AMS和ATMS分别通过Binder机制提供系统服务接口，允许其他进程调用相应的功能。

#### AMS核心Binder接口
```java
// IActivityManager.aidl 接口定义
interface IActivityManager {
    // 服务管理接口
    ComponentName startService(IApplicationThread caller, Intent service,
                              String resolvedType, boolean requireForeground,
                              String callingPackage, String callingFeatureId,
                              int userId);
    
    int stopService(IApplicationThread caller, Intent service,
                   String resolvedType, int userId);
    
    Intent stopServiceToken(ComponentName className, IBinder token,
                           int startId, int userId);
    
    boolean stopServiceForResult(Intent intent, IBinder resultTo,
                                String resultWho, int requestCode,
                                int userId);
    
    // 广播管理接口
    int broadcastIntent(IApplicationThread caller, Intent intent,
                       String resolvedType, IIntentReceiver resultTo,
                       int resultCode, String resultData, Bundle resultExtras,
                       String[] requiredPermissions, String[] excludedPermissions,
                       String[] excludedPackages, int appOp, Bundle options,
                       boolean serialized, boolean sticky, int userId);
    
    Intent registerReceiver(IApplicationThread caller, String callerPackage,
                           IIntentReceiver receiver, IntentFilter filter,
                           String requiredPermission, int userId, int flags);
    
    void unregisterReceiver(IIntentReceiver receiver);
    
    // ContentProvider管理接口
    ContentProviderHolder getContentProvider(IApplicationThread caller,
                                            String name, int userId,
                                            boolean stable);
    
    void removeContentProvider(IBinder connection, boolean stable);
    
    // 进程管理接口
    void killBackgroundProcesses(String packageName, int userId);
    void killAllBackgroundProcesses();
    void forceStopPackage(String packageName, int userId);
    
    // 内存管理接口
    void getMemoryInfo(ActivityManager.MemoryInfo outInfo);
    MemoryInfo[] getProcessMemoryInfo(int[] pids);
    void setProcessMemoryTrimLevel(int pid, int uid, int level);
    
    // 权限管理接口
    int checkPermission(String permission, int pid, int uid);
    int checkUriPermission(Uri uri, int pid, int uid, int mode, int userId);
    void grantRuntimePermission(String packageName, String permission, int userId);
    void revokeRuntimePermission(String packageName, String permission, int userId);
    
    // 用户管理接口
    int getCurrentUser();
    boolean switchUser(int userid);
    UserInfo[] getUsers();
    
    // 调试接口
    void setDebugApp(String packageName, boolean waitForDebugger, boolean persistent);
    void setAlwaysFinish(boolean enabled);
    
    // 进程状态接口
    List<RunningAppProcessInfo> getRunningAppProcesses();
    List<ApplicationInfo> getRunningAppProcessesInfo(int flags, int userId);
}
```

#### ATMS核心Binder接口（Android 10+）
```java
// IActivityTaskManager.aidl 接口定义
interface IActivityTaskManager {
    // Activity管理接口
    int startActivity(IApplicationThread caller, String callingPackage,
                     String callingFeatureId, Intent intent, String resolvedType,
                     IBinder resultTo, String resultWho, int requestCode,
                     int flags, ProfilerInfo profilerInfo, Bundle options);
    
    int startActivityAsUser(IApplicationThread caller, String callingPackage,
                          String callingFeatureId, Intent intent, String resolvedType,
                          IBinder resultTo, String resultWho, int requestCode,
                          int flags, ProfilerInfo profilerInfo, Bundle options,
                          int userId);
    
    boolean finishActivity(IBinder token, int resultCode, Intent resultData,
                          int finishTask);
    
    // 任务管理接口
    List<ActivityManager.RunningTaskInfo> getTasks(int maxNum);
    List<ActivityManager.RunningTaskInfo> getFilteredTasks(int maxNum,
                            int ignoreActivityType, int ignoreWindowingMode);
    
    void moveTaskToFront(int taskId, int flags, Bundle options);
    boolean removeTask(int taskId);
    
    // 窗口层级接口
    List<RootTaskInfo> getAllRootTaskInfos();
    RootTaskInfo getRootTaskInfo(int taskId);
    
    // 多窗口接口
    void setTaskWindowingMode(int taskId, int windowingMode, boolean animate);
    void setTaskWindowingModeSplitScreenPrimary(int taskId, int createMode,
                                                boolean toTop, boolean animate,
                                                int splitScreenCreateMode,
                                                RemoteAnimationAdapter adapter);
    
    // 分屏相关
    void setSplitScreenResizing(boolean resizing);
    boolean supportsSplitScreenMultiWindow();
    
    // 画中画相关
    void setPictureInPictureParams(IBinder token, PictureInPictureParams params);
    boolean enterPictureInPictureMode(IBinder token, PictureInPictureParams params);
    
    // 任务快照接口
    ActivityManager.TaskSnapshot getTaskSnapshot(int taskId, boolean isLowResolution);
    
    // Activity生命周期回调
    void registerTaskStackListener(ITaskStackListener listener);
    void unregisterTaskStackListener(ITaskStackListener listener);
}
```

#### 接口调用示例
```java
// Activity启动接口调用示例
public class ActivityStarter {
    private final IActivityManager mAm;
    
    public ActivityStarter() {
        // 获取AMS Binder接口
        mAm = ActivityManager.getService();
    }
    
    public void startActivity(Context context, Intent intent) {
        try {
            // 准备启动参数
            String callingPackage = context.getPackageName();
            String resolvedType = intent.resolveTypeIfNeeded(context.getContentResolver());
            
            // 调用AMS接口
            int result = mAm.startActivity(
                null, // ApplicationThread
                callingPackage,
                intent,
                resolvedType,
                null, // resultTo
                null, // resultWho
                0,    // requestCode
                0,    // flags
                null, // profilerInfo
                null  // options
            );
            
            // 处理启动结果
            if (result != ActivityManager.START_SUCCESS) {
                handleStartActivityError(result);
            }
        } catch (RemoteException e) {
            Log.e(TAG, "Failed to start activity", e);
        }
    }
}
```

### 1.2 内部接口定义

AMS和ATMS提供内部接口供系统其他组件使用。

#### ActivityManagerInternal接口
```java
// 系统内部使用的AMS接口
public abstract class ActivityManagerInternal {
    // 进程管理
    public abstract void onProcessStarted(ProcessRecord app);
    public abstract void killProcess(String processName, int uid, String reason);
    public abstract ProcessRecord getProcessRecordLocked(String processName, int uid);
    
    // 内存管理
    public abstract void trimApplications();
    public abstract void updateOomAdj(ProcessRecord app);
    public abstract void updateCpuStatsNow();
    
    // 服务管理
    public abstract ServiceRecord getServiceRecord(ComponentName name, int userId);
    public abstract void setServiceForeground(ComponentName className,
                            IBinder token, int id, Notification notification,
                            boolean removeNotification, boolean keepForeground);
    
    // 权限管理
    public abstract int checkPermission(String permission, int pid, int uid);
    public abstract int checkComponentPermission(String permission, int uid,
                            int owningUid, boolean exported);
    
    // 用户管理
    public abstract void onUserStarting(int userId);
    public abstract void onUserStopping(int userId);
    
    // 电源管理
    public abstract void goingToSleep();
    public abstract void wakingUp();
}
```

#### ActivityTaskManagerInternal接口（Android 10+）
```java
// 系统内部使用的ATMS接口
public abstract class ActivityTaskManagerInternal {
    // Activity栈管理
    public abstract int startActivityInPackage(int uid, int realCallingUid,
                            String callingPackage, String callingFeatureId,
                            Intent intent, String resolvedType, IBinder resultTo,
                            String resultWho, int requestCode, int startFlags,
                            ProfilerInfo profilerInfo, Bundle bOptions,
                            int userId, boolean validateIncomingUser,
                            PendingIntentIntentSender intentSender);
    
    public abstract ActivityTaskManager.RootTaskInfo getRootTaskInfo(int taskId);
    public abstract void setFocusedTask(int taskId);
    
    // 窗口层级管理
    public abstract void setTaskWindowingMode(int taskId, int windowingMode,
                            boolean animate);
    public abstract void setTaskWindowingModeSplitScreenPrimary(int taskId,
                            int createMode, boolean toTop, boolean animate);
    
    // 分屏管理
    public abstract void setSplitScreenResizing(boolean resizing);
    public abstract boolean supportsSplitScreenMultiWindow();
    
    // 焦点管理
    public abstract ActivityRecord getFocusedActivity();
    public abstract Task getFocusedTask();
    
    // 画中画管理
    public abstract boolean enterPictureInPictureMode(ActivityRecord r,
                            PictureInPictureParams params);
    
    // 任务快照
    public abstract TaskSnapshot getTaskSnapshot(int taskId, boolean isLowResolution);
    
    // 预测性返回手势（Android 13+）
    public abstract void setPredictiveBackEnabled(boolean enabled);
}
```

### 1.3 回调接口定义

AMS定义回调接口用于接收应用和系统状态变化通知。

#### Activity生命周期回调
```java
// Activity生命周期回调接口
public interface ActivityLifecycleCallbacks {
    void onActivityCreated(Activity activity, Bundle savedInstanceState);
    void onActivityStarted(Activity activity);
    void onActivityResumed(Activity activity);
    void onActivityPaused(Activity activity);
    void onActivityStopped(Activity activity);
    void onActivitySaveInstanceState(Activity activity, Bundle outState);
    void onActivityDestroyed(Activity activity);
}

// 进程状态回调接口
public interface ProcessObserver {
    void onForegroundActivitiesChanged(int pid, int uid, boolean foregroundActivities);
    void onProcessStateChanged(int pid, int uid, int procState);
    void onProcessDied(int pid, int uid);
}
```

## 核心运转流程

### 2.1 Activity启动流程（ATMS管理）

Activity启动是ATMS的核心流程，涉及多个系统组件的协作。从Android 11开始，启动流程有了重大重构。

#### 启动流程详细步骤
```java
// Activity启动流程（Android 11+）
public class ActivityStarter {
    private final ActivityTaskManagerService mService;
    private final RootWindowContainer mRootWindowContainer;
    
    // 启动Activity的完整流程
    private int executeRequest(Request request) {
        // 阶段1：权限和意图验证
        int userId = mService.getUserId(request.intent, request.userId);
        int callingUid = Binder.getCallingUid();
        
        if (!checkPermission(callingUid, request.intent, request.callingPackage)) {
            return START_PERMISSION_DENIED;
        }
        
        // 阶段2：目标Activity解析
        ResolveInfo rInfo = mService.getPackageManagerInternalLocked()
            .resolveIntent(request.intent, request.resolvedType,
                ActivityManagerService.STOCK_PM_FLAGS, userId);
        
        ActivityInfo aInfo = rInfo != null ? rInfo.activityInfo : null;
        if (aInfo == null) {
            return START_INTENT_NOT_RESOLVED;
        }
        
        // 阶段3：进程信息获取
        WindowProcessController callerApp = mService.getProcessController(
            request.caller, request.callingUid);
        ProcessRecord targetApp = mService.getProcessRecordLocked(
            aInfo.processName, aInfo.applicationInfo.uid);
        
        // 阶段4：任务和栈选择
        Task targetTask = getReusedOrCreateTask(request, aInfo);
        ActivityRecord sourceRecord = getSourceRecord(callerApp, request);
        
        // 阶段5：ActivityRecord创建
        ActivityRecord r = new ActivityRecord.Builder(mService)
            .setCaller(callerApp)
            .setIntent(request.intent)
            .setActivityInfo(aInfo)
            .setConfiguration(mService.getGlobalConfiguration())
            .setSourceRecord(sourceRecord)
            .setResultTo(request.resultTo)
            .build();
        
        // 阶段6：启动模式处理
        int launchMode = aInfo.launchMode;
        if (launchMode == LAUNCH_SINGLE_INSTANCE || launchMode == LAUNCH_SINGLE_TASK) {
            ActivityRecord existing = findExistingActivity(r, targetTask);
            if (existing != null) {
                return deliverToExistingActivity(existing, request);
            }
        }
        
        // 阶段7：目标进程启动（委托给AMS）
        if (targetApp == null || !targetApp.hasThread()) {
            mService.startProcessForActivityLaunch(r);
            return START_DELIVERED_TO_TOP;
        }
        
        // 阶段8：Activity启动执行
        return startActivityInner(r, targetTask, request);
    }
    
    // 实际启动Activity
    private int startActivityInner(ActivityRecord r, Task targetTask, Request request) {
        // 设置启动状态
        r.setState(ActivityState.INITIALIZING, "startActivityInner");
        
        // 添加到任务
        targetTask.addChild(r);
        targetTask.moveToTop("startActivityInner");
        
        // 处理任务Fragment（Android 13+）
        TaskFragment tf = getOrCreateTaskFragment(r, targetTask);
        if (tf != null && tf.isEmbedded()) {
            r.setTaskFragment(tf);
        }
        
        // 暂停当前Activity
        Task focusedTask = mRootWindowContainer.getTopFocusedTask();
        if (focusedTask != null && focusedTask.getResumedActivity() != null) {
            mRootWindowContainer.pauseFocusedTasks();
        }
        
        // 启动目标Activity
        mRootWindowContainer.resumeFocusedTasksTopActivities();
        
        return START_SUCCESS;
    }
}
```

#### 启动流程时序图
```
应用进程 → ATMS → RootWindowContainer → Task → ActivityRecord → 目标进程
    ↓        ↓            ↓              ↓          ↓           ↓
startActivity() → 权限验证 → 任务选择 → Activity创建 → 进程启动
    ↓        ↓            ↓              ↓          ↓           ↓
等待结果 ← 返回结果 ← 启动执行 ← 暂停当前Activity ← 进程准备
```

#### 预测性启动优化（Android 13+）
```java
// 预测性启动优化
public class PredictiveLaunchController {
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

### 2.2 服务启动流程

Service启动流程相对简单，但涉及进程管理和生命周期管理。

#### 服务启动详细步骤
```java
// Service启动流程
public class ActiveServices {
    
    // 启动服务的完整流程
    public ComponentName startServiceLocked(...) {
        // 阶段1：服务解析
        ServiceInfo sInfo = resolveService(intent, resolvedType, userId, callingUid);
        if (sInfo == null) {
            return null;
        }
        
        // 阶段2：进程管理
        ProcessRecord callerApp = getRecordForAppLocked(caller);
        ProcessRecord app = getProcessRecordLocked(sInfo.processName, sInfo.applicationInfo.uid);
        
        // 阶段3：ServiceRecord创建或查找
        ServiceRecord r = findServiceLocked(intent, resolvedType, userId);
        if (r == null) {
            r = new ServiceRecord(mAm, sInfo, callingPackage, component, intent, callerFg, userId);
            mServicesByIntent.put(intent.getComponent(), r);
        }
        
        // 阶段4：启动目标进程
        if (app == null || app.thread == null) {
            app = mAm.startProcessLocked(sInfo.processName, sInfo.applicationInfo,
                true, 0, "service", r.name, false, false, false);
            
            if (app == null) {
                return null;
            }
        }
        
        // 阶段5：绑定到进程
        if (!r.isBoundToApp(app)) {
            r.bindToApp(app);
        }
        
        // 阶段6：执行服务启动
        return startServiceInnerLocked(r, service, flags, callerFg, addToStarting);
    }
    
    // 实际启动服务
    private ComponentName startServiceInnerLocked(...) {
        // 发送启动命令
        bumpServiceExecutingLocked(r, execInFg, "start");
        
        // 调用服务的onCreate和onStartCommand
        r.app.thread.scheduleCreateService(r, r.serviceInfo,
            mAm.compatibilityInfoForPackageLocked(r.serviceInfo.applicationInfo),
            app.getReportedProcState());
        
        r.app.thread.scheduleServiceArgs(r, taskRemoved, startId, flags, intent);
        
        // 更新服务状态
        updateServiceClientActivitiesLocked(r.app, null, true);
        
        return r.name;
    }
}
```

### 2.3 进程管理流程（AMS管理）

AMS负责系统中所有应用进程的生命周期管理，包括进程创建、销毁、优先级调整等。

#### 进程创建流程
```java
// 进程创建流程
public final class ActivityManagerService {
    private final ProcessList mProcessList;
    
    // 创建新进程
    ProcessRecord startProcessLocked(String processName, ApplicationInfo info,
                                     boolean knownToBeDead, int intentFlags,
                                     String hostingType, ComponentName hostingName,
                                     boolean allowWhileBooting, boolean isolated,
                                     boolean keepIfLarge, String abiOverride) {
        
        // 阶段1：进程记录创建
        ProcessRecord app = mProcessList.getProcessRecordLocked(processName, info.uid);
        if (app == null) {
            app = newProcessRecordLocked(info, processName, isolated, 0);
            
            // 添加到进程列表
            mProcessList.addProcessNameLocked(app);
            mProcessList.updateLruProcessLocked(app, false, null);
            
            // 更新进程统计
            updateOomAdjLocked(app, OOM_ADJ_REASON_PROCESS_BEGIN);
        }
        
        // 阶段2：检查是否需要启动进程
        if (app.isPendingStart()) {
            return app;
        }
        
        // 阶段3：启动进程
        if ((app.getThread() == null) || knownToBeDead) {
            app.setKilled(false);
            app.setKilledByAm(false);
            app.setRemoved(false);
            app.setPendingStart(true);
            
            // 调用Zygote创建进程
            mProcessList.startProcessLocked(app, hostingType, hostingName, abiOverride);
        }
        
        return app;
    }
    
    // 实际启动进程
    private void handleProcessStart(ProcessRecord app, String hostingType,
                                   String hostingNameStr, String abiOverride) {
        
        // 准备启动参数
        int uid = app.uid;
        int[] gids = computeGids(app);
        int mountExternal = computeMountMode(app);
        String seInfo = app.info.seInfo;
        String instructionSet = getInstructionSet(app.info);
        
        // 调用Zygote
        ProcessRecordStartResult startResult = Process.start(
            app.processName, uid, gids, mountExternal,
            app.info.targetSdkVersion, seInfo, instructionSet,
            app.info.dataDir, app.info.appComponentFactory);
        
        // 更新进程信息
        app.setPid(startResult.pid);
        app.setUsingWrapper(startResult.usingWrapper);
        
        // 同步到ATMS
        mAtmInternal.onProcessStarted(app);
        
        // 启动进程监控
        synchronized (mPidsSelfLocked) {
            mPidsSelfLocked.put(startResult.pid, app);
        }
    }
}
```

#### 进程状态更新流程（Android 11+）
```java
// 进程状态更新
public class OomAdjuster {
    
    // 更新进程OOM调整值
    void updateOomAdjLocked(ProcessRecord app, String reason) {
        // 获取窗口进程控制器
        WindowProcessController wpc = app.getWindowProcessController();
        
        // 从ATMS获取Activity状态
        int procState = computeProcessState(app, wpc);
        
        // 计算OOM调整值
        int adj = computeOOMAdjLocked(app, procState);
        
        // 应用调整值
        if (adj != app.getCurAdj()) {
            app.setCurAdj(adj);
            Process.setOomScoreAdj(app.getPid(), adj);
        }
        
        // 更新进程状态
        if (procState != app.getCurProcState()) {
            app.setCurProcState(procState);
            app.getWindowProcessController().setProcState(procState);
        }
    }
    
    // 计算进程状态
    private int computeProcessState(ProcessRecord app, WindowProcessController wpc) {
        // 从ATMS查询Activity状态
        if (wpc.hasActivities()) {
            ActivityRecord top = wpc.getTopActivity();
            if (top != null && top.isResumedOrResuming()) {
                return PROCESS_STATE_TOP;
            }
        }
        
        // 检查前台服务
        if (app.hasForegroundServices()) {
            return PROCESS_STATE_FOREGROUND_SERVICE;
        }
        
        // 检查绑定前台服务
        if (app.hasBoundForegroundService()) {
            return PROCESS_STATE_BOUND_FOREGROUND_SERVICE;
        }
        
        // 其他状态判断...
        return PROCESS_STATE_CACHED_EMPTY;
    }
}
```

### 2.4 内存管理流程（AMS管理）

AMS通过OOM调整和Low Memory Killer机制管理内存，与ATMS协同工作。

#### OOM调整流程
```java
// OOM调整流程
public class OomAdjuster {
    private final ActivityManagerService mService;
    private final ActivityTaskManagerInternal mAtmInternal;
    
    // 更新所有进程的OOM调整值
    void updateOomAdjLocked(String reason) {
        // 阶段1：获取所有进程
        ArrayList<ProcessRecord> procs = mService.getProcessList().getProcesses();
        
        // 阶段2：遍历计算调整值
        for (int i = procs.size() - 1; i >= 0; i--) {
            ProcessRecord app = procs.get(i);
            
            // 从ATMS获取进程的Activity状态
            WindowProcessController wpc = app.getWindowProcessController();
            int adj = computeOOMAdjLocked(app, wpc);
            
            // 应用调整值
            applyOomAdjLocked(app, adj);
        }
        
        // 阶段3：检查内存压力
        if (mService.mLowMemDetector.isLowMemory()) {
            // 触发内存回收
            mService.killProcessesForLowMemory(reason);
        }
    }
    
    // 计算OOM调整值
    private int computeOOMAdjLocked(ProcessRecord app, WindowProcessController wpc) {
        int adj;
        
        // 持久进程
        if (app.isPersistent()) {
            return ProcessList.PERSISTENT_PROC_ADJ;
        }
        
        // 前台Activity（从ATMS查询）
        if (wpc != null) {
            ActivityRecord topActivity = wpc.getTopResumedActivity();
            if (topActivity != null && topActivity.isFocused()) {
                return ProcessList.FOREGROUND_APP_ADJ;
            }
            
            // 可见Activity
            if (wpc.hasVisibleActivities()) {
                adj = ProcessList.VISIBLE_APP_ADJ;
            }
        }
        
        // 前台服务
        if (app.hasForegroundServices()) {
            return ProcessList.FOREGROUND_SERVICE_ADJ;
        }
        
        // 可感知进程
        if (app.hasPerceptibleFeatures()) {
            adj = ProcessList.PERCEPTIBLE_APP_ADJ;
        }
        
        // 服务进程
        if (app.hasRunningServices()) {
            adj = ProcessList.SERVICE_ADJ;
        }
        
        // Home进程
        if (app.isHomeProcess()) {
            adj = ProcessList.HOME_APP_ADJ;
        }
        
        // 缓存进程
        adj = ProcessList.CACHED_APP_MIN_ADJ;
        
        return adj;
    }
    
    // 应用OOM调整值
    private void applyOomAdjLocked(ProcessRecord app, int adj) {
        if (adj == app.getCurAdj()) {
            return;
        }
        
        app.setCurAdj(adj);
        
        // 写入内核
        if (app.getPid() > 0) {
            Process.setOomScoreAdj(app.getPid(), adj);
            
            // 更新内存状态文件
            String adjString = Integer.toString(adj);
            writeMemoryFile("/proc/" + app.getPid() + "/oom_score_adj", adjString);
        }
    }
}
```

#### 内存压力处理
```java
// 内存压力处理
public class LowMemoryDetector {
    
    // 处理内存压力事件
    void onPressureStateChanged(int pressureLevel) {
        switch (pressureLevel) {
            case PsiParser.PRESSURE_LOW:
                // 低压力：轻量级回收
                mService.maybeTrimMemory();
                break;
                
            case PsiParser.PRESSURE_MEDIUM:
                // 中压力：中度回收
                mService.maybeTrimMemory();
                mService.killBackgroundProcesses("memory_pressure_medium");
                break;
                
            case PsiParser.PRESSURE_CRITICAL:
                // 严重压力：强制回收
                mService.maybeTrimMemory();
                mService.killAllBackgroundProcesses("memory_pressure_critical");
                break;
        }
    }
    
    // 内存监控
    void monitorMemoryPressure() {
        // 使用PSI监控内存压力
        PsiParser psiParser = new PsiParser();
        psiParser.startMonitoring((pressureLevel) -> {
            onPressureStateChanged(pressureLevel);
        });
    }
}
```

### 2.5 任务栈管理流程（ATMS管理）

ATMS通过RootWindowContainer、TaskDisplayArea和Task管理Activity的任务栈，支持多窗口、分屏等复杂场景。

#### 任务切换流程
```java
// 任务切换流程（Android 11+）
public class Task {
    private ActivityTaskManagerService mService;
    private RootWindowContainer mRootWindowContainer;
    
    // 恢复焦点任务的顶部Activity
    boolean resumeTopActivityUncheckedLocked(ActivityRecord prev, ActivityOptions options) {
        // 阶段1：检查递归
        if (mRootWindowContainer.inResumeTopActivity()) {
            return false;
        }
        
        // 阶段2：获取顶部Activity
        ActivityRecord next = topRunningActivity();
        
        if (next == null) {
            // 没有Activity，回到Home
            return resumeHomeActivity(prev, "noMoreActivities");
        }
        
        // 阶段3：检查TaskFragment
        TaskFragment tf = next.getTaskFragment();
        if (tf != null && tf.isEmbedded()) {
            // 嵌入式任务片段特殊处理
            return tf.resumeTopActivity(next, options);
        }
        
        // 阶段4：暂停当前Activity
        ActivityRecord resuming = mRootWindowContainer.getResumedActivity();
        if (resuming != null && resuming != next) {
            mRootWindowContainer.pauseFocusedTasks();
        }
        
        // 阶段5：恢复目标Activity
        if (next.isAttachedToProcess()) {
            return resumeTopActivityInnerLocked(next, prev, options);
        } else {
            // 需要启动进程
            mService.startProcessForActivityLaunch(next);
            return true;
        }
    }
    
    // 实际恢复Activity
    private boolean resumeTopActivityInnerLocked(ActivityRecord next, 
                                                 ActivityRecord prev,
                                                 ActivityOptions options) {
        // 更新状态
        next.setState(ActivityState.RESUMED, "resumeTopActivityInnerLocked");
        
        // 更新窗口可见性
        mService.mWindowManager.setAppVisibility(next, true);
        
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
        
        // 更新焦点
        mRootWindowContainer.setFocusedTask(this);
        
        // 更新最近任务
        mService.getRecentTasks().add(next.getTask());
        
        return true;
    }
}
```

#### 多窗口任务管理
```java
// 多窗口任务管理
public class RootWindowContainer {
    
    // 分屏模式进入
    void enterSplitScreen(Task task, boolean onTop) {
        // 获取显示区域
        TaskDisplayArea tda = task.getDisplayArea();
        
        // 创建分屏容器
        Task topTask = tda.getFocusedRootTask();
        Task bottomTask = tda.createSplitScreenTask(task);
        
        // 设置窗口模式
        topTask.setWindowingMode(WINDOWING_MODE_SPLIT_SCREEN_PRIMARY);
        bottomTask.setWindowingMode(WINDOWING_MODE_SPLIT_SCREEN_SECONDARY);
        
        // 布局调整
        tda.setSplitScreenBounds(topTask, bottomTask);
        
        // 更新焦点
        if (onTop) {
            tda.setFocusedTask(topTask);
        }
    }
    
    // 画中画模式进入
    void enterPictureInPicture(Task task, PictureInPictureParams params) {
        ActivityRecord pipActivity = task.getTopActivity();
        if (pipActivity == null || !pipActivity.supportsPip()) {
            return;
        }
        
        // 设置PIP参数
        pipActivity.setPictureInPictureParams(params);
        
        // 进入PIP模式
        pipActivity.enterPictureInPictureMode();
        
        // 更新任务状态
        task.setWindowingMode(WINDOWING_MODE_PINNED);
        
        // 调整窗口大小
        mWindowManager.setPinnedStackBounds(task, params.getAspectRatio());
    }
    
    // 自由窗口模式
    void enterFreeform(Task task, Rect bounds) {
        // 设置窗口模式
        task.setWindowingMode(WINDOWING_MODE_FREEFORM);
        task.setBounds(bounds);
        
        // 应用自由窗口策略
        FreeformController controller = mService.getFreeformController();
        controller.applyFreeformPolicy(task);
    }
}
```

#### TaskFragment管理（Android 13+）
```java
// TaskFragment管理
public class TaskFragmentOrganizerController {
    
    // 创建TaskFragment
    void createTaskFragment(Task parentTask, IBinder fragmentToken) {
        // 创建新的TaskFragment
        TaskFragment tf = new TaskFragment(mService, fragmentToken);
        tf.setTask(parentTask);
        
        // 注册组织器
        mOrganizers.put(fragmentToken, tf);
        
        // 通知组织器
        notifyTaskFragmentCreated(tf);
    }
    
    // Activity移动到TaskFragment
    void startActivityInTaskFragment(ActivityRecord activity, TaskFragment tf) {
        // 检查是否可以嵌入
        if (!tf.canHostActivity(activity)) {
            return;
        }
        
        // 从当前容器移除
        activity.removeFromCurrentContainer();
        
        // 添加到TaskFragment
        tf.addChild(activity);
        
        // 更新状态
        activity.setTaskFragment(tf);
        
        // 通知窗口管理器
        mService.mWindowManager.onActivityEmbedded(activity);
    }
    
    // TaskFragment销毁
    void destroyTaskFragment(TaskFragment tf) {
        // 移动Activity到父任务
        for (ActivityRecord r : tf.getChildren()) {
            r.setTaskFragment(null);
            tf.getTask().addChild(r);
        }
        
        // 移除TaskFragment
        mOrganizers.remove(tf.getFragmentToken());
        tf.remove();
        
        // 通知组织器
        notifyTaskFragmentDestroyed(tf);
    }
}
```

通过深入理解AMS和ATMS的接口定义和核心运转流程，开发者可以更好地进行系统定制、性能优化和故障排查。