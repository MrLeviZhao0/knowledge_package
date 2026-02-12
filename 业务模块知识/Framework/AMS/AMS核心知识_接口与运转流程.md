# AMS核心知识_接口与运转流程

## 对外提供的接口

### 1.1 Binder接口定义

AMS通过Binder机制提供系统服务接口，允许其他进程调用AMS的功能。

#### 核心Binder接口
```java
// IActivityManager.aidl 接口定义
interface IActivityManager {
    // Activity管理接口
    int startActivity(IApplicationThread caller, String callingPackage,
                     Intent intent, String resolvedType, IBinder resultTo,
                     String resultWho, int requestCode, int flags,
                     ProfilerInfo profilerInfo, Bundle options);
    
    int startActivityAsUser(IApplicationThread caller, String callingPackage,
                          Intent intent, String resolvedType, IBinder resultTo,
                          String resultWho, int requestCode, int flags,
                          ProfilerInfo profilerInfo, Bundle options, int userId);
    
    boolean finishActivity(IBinder token, int resultCode, Intent resultData, int finishTask);
    
    // 服务管理接口
    ComponentName startService(IApplicationThread caller, Intent service,
                              String resolvedType, boolean requireForeground,
                              String callingPackage, int userId);
    
    int stopService(IApplicationThread caller, Intent service,
                   String resolvedType, int userId);
    
    // 广播管理接口
    void broadcastIntent(IApplicationThread caller, Intent intent,
                        String resolvedType, IIntentReceiver resultTo,
                        int resultCode, String resultData, Bundle resultExtras,
                        String[] requiredPermissions, int appOp, Bundle options,
                        boolean serialized, boolean sticky, int userId);
    
    // 进程管理接口
    void killBackgroundProcesses(String packageName, int userId);
    void killAllBackgroundProcesses();
    void forceStopPackage(String packageName, int userId);
    
    // 内存管理接口
    void getMemoryInfo(ActivityManager.MemoryInfo outInfo);
    void getProcessMemoryInfo(int[] pids, MemoryInfo[] outInfo);
    
    // 任务管理接口
    List<ActivityManager.RunningTaskInfo> getTasks(int maxNum, int flags);
    void moveTaskToFront(int taskId, int flags, Bundle options);
    
    // 权限管理接口
    int checkPermission(String permission, int pid, int uid);
    void grantRuntimePermission(String packageName, String permission, int userId);
    void revokeRuntimePermission(String packageName, String permission, int userId);
    
    // 用户管理接口
    int getCurrentUser();
    boolean switchUser(int userid);
    
    // 调试接口
    void setDebugApp(String packageName, boolean waitForDebugger, boolean persistent);
    void setAlwaysFinish(boolean enabled);
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

AMS还提供内部接口供系统其他组件使用。

#### ActivityManagerInternal接口
```java
// 系统内部使用的AMS接口
public abstract class ActivityManagerInternal {
    // Activity栈管理
    public abstract int startActivityInPackage(int uid, ...);
    public abstract void setFocusedActivity(IBinder token);
    
    // 进程管理
    public abstract void onProcessStarted(ProcessRecord app);
    public abstract void killProcess(String processName, int uid, String reason);
    
    // 内存管理
    public abstract void trimApplications();
    public abstract void updateOomAdj(ProcessRecord app);
    
    // 电源管理
    public abstract void goingToSleep();
    public abstract void wakingUp();
    
    // 用户管理
    public abstract void onUserStarting(int userId);
    public abstract void onUserStopping(int userId);
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

### 2.1 Activity启动流程

Activity启动是AMS最核心的流程之一，涉及多个系统组件的协作。

#### 启动流程详细步骤
```java
// Activity启动流程（简化版）
public class ActivityStarter {
    
    // 启动Activity的完整流程
    private int startActivityUnchecked(...) {
        // 阶段1：权限和意图验证
        if (!checkPermission(callingUid, permission)) {
            return START_PERMISSION_DENIED;
        }
        
        if (!resolveIntent(intent, resolvedType)) {
            return START_INTENT_NOT_RESOLVED;
        }
        
        // 阶段2：目标Activity解析
        ActivityInfo aInfo = resolveActivity(intent, resolvedType, userId);
        if (aInfo == null) {
            return START_CLASS_NOT_FOUND;
        }
        
        // 阶段3：进程管理
        ProcessRecord callerApp = getRecordForAppLocked(caller);
        ProcessRecord targetApp = getProcessRecordLocked(aInfo.processName, aInfo.applicationInfo.uid);
        
        // 阶段4：任务栈管理
        TaskRecord task = getOrCreateTask(intent, aInfo, callerApp, options);
        ActivityRecord sourceRecord = getSourceRecord(callerApp, resultTo, resultWho, requestCode);
        
        // 阶段5：ActivityRecord创建
        ActivityRecord r = new ActivityRecord(mService, callerApp, callingPid, callingUid,
            callingPackage, intent, resolvedType, aInfo, mService.getGlobalConfiguration(),
            resultRecord, resultWho, requestCode, componentSpecified, voiceSession != null,
            mService.mController, options, sourceRecord);
        
        // 阶段6：启动模式处理
        if (launchMode == LAUNCH_SINGLE_INSTANCE || launchMode == LAUNCH_SINGLE_TASK) {
            // 单实例或单任务模式处理
            ActivityRecord existing = findActivityInHistoryLocked(r);
            if (existing != null) {
                // 重用现有Activity
                return bringTaskToFrontLocked(existing.task.taskId, flags, options);
            }
        }
        
        // 阶段7：目标进程启动
        if (targetApp == null || targetApp.thread == null) {
            // 需要启动新进程
            if ((flags & START_FLAG_DEBUG) != 0) {
                mService.setDebugApp(aInfo.processName, true, false);
            }
            
            targetApp = mService.startProcessLocked(aInfo.processName,
                aInfo.applicationInfo, true, 0, "activity", r.intent.getComponent(),
                false, false, true);
            
            if (targetApp == null) {
                return START_ABORTED;
            }
        }
        
        // 阶段8：Activity启动执行
        return startActivityLocked(r, sourceRecord, voiceSession, voiceInteractor, startFlags,
            true, options, inTask, restrictedBgActivity, intentGrants);
    }
    
    // 实际启动Activity
    private int startActivityLocked(...) {
        // 设置启动状态
        r.setState(ActivityState.INITIALIZING, "startActivityLocked");
        
        // 添加到任务栈
        task.addActivityToTop(r);
        task.setFrontOfTask();
        
        // 暂停当前Activity
        if (mResumedActivity != null) {
            pausing |= startPausingLocked(userLeaving, false, next, false);
        }
        
        // 启动目标Activity
        if (!pausing) {
            mStackSupervisor.resumeFocusedStackTopActivityLocked(mTargetStack, mStartActivity, mOptions);
        }
        
        return START_SUCCESS;
    }
}
```

#### 启动流程时序图
```
应用进程 → AMS → ActivityStackSupervisor → ActivityStack → 目标进程
    ↓         ↓           ↓                 ↓           ↓
startActivity() → 权限验证 → 任务栈选择 → Activity创建 → 进程启动
    ↓         ↓           ↓                 ↓           ↓
等待结果 ← 返回结果 ← 启动执行 ← 暂停当前Activity ← 进程准备
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

### 2.3 进程管理流程

AMS负责系统中所有应用进程的生命周期管理。

#### 进程创建流程
```java
// 进程创建流程
public final class ActivityManagerService {
    
    // 创建新进程
    final ProcessRecord startProcessLocked(String processName,
                                          ApplicationInfo info, boolean knownToBeDead,
                                          int intentFlags, String hostingType,
                                          ComponentName hostingName, boolean allowWhileBooting,
                                          boolean isolated, boolean keepIfLarge) {
        
        // 阶段1：进程记录创建
        ProcessRecord app = getProcessRecordLocked(processName, info.uid, true);
        if (app == null) {
            app = newProcessRecordLocked(info, processName, isolated, isolatedUid);
            
            // 添加到进程列表
            mProcessNames.put(processName, info.uid, app);
            updateLruProcessLocked(app, false, null);
            
            // 更新进程统计
            updateOomAdjLocked();
        }
        
        // 阶段2：启动进程
        if ((app.thread == null) || knownToBeDead) {
            app.killed = false;
            app.killedByAm = false;
            app.removed = false;
            
            // 调用Zygote创建进程
            startProcessLocked(app, hostingType, hostingName);
        }
        
        return app;
    }
    
    // 实际启动进程
    private final void startProcessLocked(ProcessRecord app,
                                         String hostingType,
                                         String hostingNameStr) {
        
        // 准备启动参数
        String[] args = computeProcessArgs(app, hostingType, hostingNameStr);
        
        // 调用Zygote
        Process.ProcessStartResult startResult = Process.start(entryPoint,
            app.processName, uid, uid, gids, debugFlags, mountExternal,
            app.info.targetSdkVersion, app.info.seinfo, requiredAbi, instructionSet,
            app.info.dataDir, entryPointArgs);
        
        // 更新进程信息
        app.setPid(startResult.pid);
        app.usingWrapper = startResult.usingWrapper;
        
        // 添加到进程监控
        mProcessList.addProcessNameLocked(app);
        
        // 启动进程监控
        startProcessMonitorLocked(app);
    }
}
```

### 2.4 内存管理流程

AMS通过OOM调整和Low Memory Killer机制管理内存。

#### OOM调整流程
```java
// OOM调整流程
public class OomAdjuster {
    
    // 更新所有进程的OOM调整值
    final void updateOomAdjLocked() {
        // 阶段1：收集进程信息
        ArrayList<ProcessRecord> procs = collectProcessesToUpdate();
        
        // 阶段2：计算调整值
        for (ProcessRecord app : procs) {
            // 基于Activity状态计算
            if (app.foregroundActivities) {
                app.setRawAdj = ProcessList.FOREGROUND_APP_ADJ;
            } else if (app.foregroundServices) {
                app.setRawAdj = ProcessList.FOREGROUND_SERVICE_ADJ;
            } else {
                // 基于其他因素计算
                app.setRawAdj = computeOomAdjLocked(app);
            }
            
            // 应用调整值
            applyOomAdjLocked(app);
        }
        
        // 阶段3：触发Low Memory Killer
        if (mLowMemDetector.shouldKillProcesses()) {
            killProcessesForMemoryLocked();
        }
    }
    
    // 计算OOM调整值
    private int computeOomAdjLocked(ProcessRecord app) {
        int adj;
        
        // 基于可见性计算
        if (app.hasVisibleActivities()) {
            adj = ProcessList.VISIBLE_APP_ADJ;
        } else if (app.hasRecentTasks()) {
            adj = ProcessList.PERCEPTIBLE_APP_ADJ;
        } else if (app.hasRunningServices()) {
            adj = ProcessList.SERVICE_ADJ;
        } else {
            adj = ProcessList.CACHED_APP_MIN_ADJ;
        }
        
        // 基于其他因素调整
        if (app.isHeavyWeight()) {
            adj = Math.min(adj, ProcessList.HEAVY_WEIGHT_APP_ADJ);
        }
        
        if (app.isHomeProcess()) {
            adj = Math.min(adj, ProcessList.HOME_APP_ADJ);
        }
        
        return adj;
    }
}
```

### 2.5 任务栈管理流程

AMS通过ActivityStack管理Activity的任务栈。

#### 任务栈切换流程
```java
// 任务栈管理流程
public class ActivityStack {
    
    // 恢复焦点栈的顶部Activity
    boolean resumeTopActivityUncheckedLocked(ActivityRecord prev, ActivityOptions options) {
        // 阶段1：检查栈状态
        if (mStackSupervisor.inResumeTopActivity) {
            return false;
        }
        
        // 阶段2：获取顶部Activity
        final ActivityRecord next = topRunningActivityLocked();
        
        if (next == null) {
            // 没有Activity，回到Home
            return resumeHomeActivity(prev, "noMoreActivities", options);
        }
        
        // 阶段3：检查是否需要暂停当前Activity
        if (mResumedActivity != null) {
            if (DEBUG_STATES) Slog.d(TAG_STATES, "resumeTopActivityLocked: Pausing " + mResumedActivity);
            pausing |= startPausingLocked(userLeaving, false, next, false);
        }
        
        // 阶段4：恢复目标Activity
        if (next.app != null && next.app.thread != null) {
            // Activity已经在运行
            return resumeTopActivityInnerLocked(prev, options);
        } else {
            // 需要启动Activity
            mStackSupervisor.startSpecificActivityLocked(next, true, true);
        }
        
        return true;
    }
    
    // 实际恢复Activity
    private boolean resumeTopActivityInnerLocked(ActivityRecord prev, ActivityOptions options) {
        // 暂停完成，开始恢复
        mStackSupervisor.scheduleResumeTopActivities();
        
        // 更新窗口状态
        mWindowManager.setAppVisibility(next.appToken, true);
        
        // 调用Activity的onResume
        next.app.thread.scheduleResumeActivity(next.appToken, next.app.repProcState,
            mService.isNextTransitionForward(), next.app.getReportedProcState());
        
        // 更新状态
        mResumedActivity = next;
        next.setState(ActivityState.RESUMED, "resumeTopActivityInnerLocked");
        
        return true;
    }
}
```

通过深入理解AMS的接口定义和核心运转流程，开发者可以更好地进行系统定制、性能优化和故障排查。