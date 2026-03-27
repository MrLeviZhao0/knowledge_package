# AMS核心知识_设计思路与线程进程模型

## 设计思路

### 1.1 分层架构设计

从Android 10开始，AMS进行了重大重构，将Activity和Task管理职责剥离到独立的ATMS中，采用更清晰的分层架构设计。

#### 架构层次划分（Android 11+）
```java
// AMS与ATMS分层架构（伪代码）
// ========== ATMS层（ActivityTaskManagerService）==========
public class ActivityTaskManagerService {
    // 1. 接口层（对外接口）
    public class ActivityTaskManagerInternal {
        // 系统内部使用的Activity/Task接口
    }
    
    public class ActivityTaskManagerServiceStub {
        // Binder接口实现
    }
    
    // 2. 窗口层级管理层
    public class RootWindowContainer {
        // 根窗口容器，替代ActivityStackSupervisor
    }
    
    public class DisplayContent {
        // 显示内容管理
    }
    
    public class TaskDisplayArea {
        // 任务显示区域管理
    }
    
    // 3. 任务管理层
    public class Task {
        // 任务管理（替代TaskRecord）
    }
    
    public class TaskFragment {
        // 任务片段（Android 13+）
    }
    
    public class ActivityRecord {
        // Activity状态管理
    }
    
    // 4. 多窗口管理层
    public class FreeformController {
        // 自由窗口管理
    }
    
    public class PictureInPictureController {
        // 画中画管理
    }
    
    public class SplitScreenController {
        // 分屏管理
    }
}

// ========== AMS层（ActivityManagerService）==========
public class ActivityManagerService {
    // 1. 接口层（对外接口）
    public class ActivityManagerInternal {
        // 系统内部使用的Service/Broadcast/Provider接口
    }
    
    public class ActivityManagerServiceStub {
        // Binder接口实现
    }
    
    // 2. 业务逻辑层（核心管理）
    public class ActiveServices {
        // 服务管理
    }
    
    public class BroadcastQueue {
        // 广播队列管理
    }
    
    public class ContentProviderHelper {
        // ContentProvider管理
    }
    
    // 3. 进程管理层
    public class ProcessList {
        // 进程列表管理
    }
    
    public class OomAdjuster {
        // OOM调整逻辑
    }
    
    // 4. 基础层（系统集成）
    public class ActivityManagerConstants {
        // 系统常量配置
    }
    
    public class LowMemoryDetector {
        // 低内存检测
    }
}
```

#### AMS与ATMS职责分离原则
- **单一职责原则**：ATMS专注Activity/Task，AMS专注Service/Broadcast/Provider/进程
- **开闭原则**：对扩展开放，对修改关闭
- **接口隔离原则**：使用IActivityManager和IActivityTaskManager两个独立接口
- **依赖倒置原则**：AMS和ATMS通过Internal接口相互调用，不直接依赖实现

### 1.2 事件驱动模型

AMS和ATMS采用事件驱动模型处理各种系统事件和应用请求，确保系统的响应性和实时性。

#### 事件类型
```java
// AMS处理的主要事件类型
public enum AmsEventType {
    // 服务相关
    SERVICE_START,       // 服务启动事件
    SERVICE_STOP,        // 服务停止事件
    SERVICE_BIND,        // 服务绑定事件
    
    // 广播相关
    BROADCAST_SEND,      // 广播发送事件
    BROADCAST_DELIVER,   // 广播投递事件
    
    // 进程相关
    PROCESS_CREATE,      // 进程创建事件
    PROCESS_KILL,        // 进程杀死事件
    PROCESS_STATE_CHANGE,// 进程状态变更
    
    // 内存相关
    MEMORY_PRESSURE,     // 内存压力事件
    MEMORY_TRIM,         // 内存回收事件
    
    // 用户相关
    USER_SWITCH,         // 用户切换事件
    USER_START,          // 用户启动事件
    USER_STOP,           // 用户停止事件
}

// ATMS处理的主要事件类型
public enum AtmsEventType {
    // Activity相关
    ACTIVITY_START,      // Activity启动事件
    ACTIVITY_FINISH,     // Activity结束事件
    ACTIVITY_RESUME,     // Activity恢复事件
    ACTIVITY_PAUSE,      // Activity暂停事件
    ACTIVITY_DESTROY,    // Activity销毁事件
    
    // 任务相关
    TASK_CREATE,         // 任务创建事件
    TASK_REMOVE,         // 任务移除事件
    TASK_MOVE,           // 任务移动事件
    
    // 窗口模式相关
    SPLIT_SCREEN_ENTER,  // 进入分屏
    SPLIT_SCREEN_EXIT,   // 退出分屏
    PIP_ENTER,           // 进入画中画
    PIP_EXIT,            // 退出画中画
    
    // 显示相关
    DISPLAY_ADDED,       // 显示器添加
    DISPLAY_REMOVED,     // 显示器移除
    DISPLAY_CHANGED,     // 显示器变更
}
```

#### 事件处理流程
```java
// AMS事件处理机制
public class AmsEventDispatcher {
    private final Map<AmsEventType, List<AmsEventListener>> mEventListeners;
    private final Handler mEventHandler;
    
    public void registerEventListener(AmsEventType type, AmsEventListener listener) {
        List<AmsEventListener> listeners = mEventListeners.get(type);
        if (listeners == null) {
            listeners = new ArrayList<>();
            mEventListeners.put(type, listeners);
        }
        listeners.add(listener);
    }
    
    public void dispatchEvent(AmsEvent event) {
        // 在主线程处理事件
        mEventHandler.post(() -> {
            List<AmsEventListener> listeners = mEventListeners.get(event.getType());
            if (listeners != null) {
                for (AmsEventListener listener : listeners) {
                    listener.onEvent(event);
                }
            }
        });
    }
}

// ATMS事件处理机制
public class AtmsEventDispatcher {
    private final Map<AtmsEventType, List<AtmsEventListener>> mEventListeners;
    private final Handler mEventHandler;
    
    // 通知任务栈变化
    public void notifyTaskStackChanged() {
        dispatchEvent(new AtmsEvent(AtmsEventType.TASK_MOVE));
    }
    
    // 通知窗口模式变化
    public void notifyWindowingModeChanged(int taskId, int windowingMode) {
        dispatchEvent(new AtmsEvent(AtmsEventType.SPLIT_SCREEN_ENTER));
    }
}
```

### 1.3 状态机设计

AMS和ATMS使用状态机模型管理Activity、Service、Process等组件的生命周期状态。

#### Activity状态机（ATMS管理）
```java
// Activity生命周期状态机
public class ActivityStateMachine {
    // Activity状态定义
    public enum ActivityState {
        INITIALIZING,    // 初始化中
        CREATED,         // 已创建
        STARTED,         // 已启动
        RESUMED,         // 已恢复
        PAUSING,         // 暂停中
        PAUSED,          // 已暂停
        STOPPING,        // 停止中
        STOPPED,         // 已停止
        DESTROYING,      // 销毁中
        DESTROYED,       // 已销毁
        RESTARTING       // 重启中（Android 11+新增）
    }
    
    // 状态转换规则
    private final Map<ActivityState, Set<ActivityState>> mTransitionRules;
    
    public ActivityStateMachine() {
        mTransitionRules = new EnumMap<>(ActivityState.class);
        
        // 定义合法的状态转换
        mTransitionRules.put(ActivityState.INITIALIZING, 
            EnumSet.of(ActivityState.CREATED, ActivityState.DESTROYING));
        mTransitionRules.put(ActivityState.CREATED, 
            EnumSet.of(ActivityState.STARTED, ActivityState.DESTROYING));
        mTransitionRules.put(ActivityState.STARTED, 
            EnumSet.of(ActivityState.RESUMED, ActivityState.STOPPING));
        mTransitionRules.put(ActivityState.RESUMED, 
            EnumSet.of(ActivityState.PAUSING));
        mTransitionRules.put(ActivityState.PAUSING, 
            EnumSet.of(ActivityState.PAUSED, ActivityState.RESUMED));
        mTransitionRules.put(ActivityState.PAUSED, 
            EnumSet.of(ActivityState.STOPPING, ActivityState.RESUMED));
        mTransitionRules.put(ActivityState.STOPPING, 
            EnumSet.of(ActivityState.STOPPED, ActivityState.DESTROYING));
        mTransitionRules.put(ActivityState.STOPPED, 
            EnumSet.of(ActivityState.RESTARTING, ActivityState.DESTROYING));
        mTransitionRules.put(ActivityState.RESTARTING, 
            EnumSet.of(ActivityState.STARTED, ActivityState.DESTROYING));
        mTransitionRules.put(ActivityState.DESTROYING, 
            EnumSet.of(ActivityState.DESTROYED));
    }
    
    public boolean canTransition(ActivityState from, ActivityState to) {
        Set<ActivityState> allowedTransitions = mTransitionRules.get(from);
        return allowedTransitions != null && allowedTransitions.contains(to);
    }
}
```

#### Task状态机（ATMS管理）
```java
// Task生命周期状态机
public class TaskStateMachine {
    public enum TaskState {
        CREATED,         // 任务创建
        RUNNING,         // 任务运行
        BACKGROUND,      // 任务后台
        PAUSING,         // 任务暂停中
        PAUSED,          // 任务已暂停
        STOPPING,        // 任务停止中
        STOPPED,         // 任务已停止
        REMOVING,        // 任务移除中
        REMOVED          // 任务已移除
    }
}
```

#### 进程状态机（AMS管理）
```java
// 进程状态定义
public class ProcessList {
    // 进程状态常量（Android 11+更新）
    public static final int PROCESS_STATE_UNKNOWN = -1;
    public static final int PROCESS_STATE_PERSISTENT = 0;
    public static final int PROCESS_STATE_PERSISTENT_UI = 1;
    public static final int PROCESS_STATE_TOP = 2;
    public static final int PROCESS_STATE_BOUND_TOP = 3;
    public static final int PROCESS_STATE_FOREGROUND_SERVICE = 4;
    public static final int PROCESS_STATE_BOUND_FOREGROUND_SERVICE = 5;
    public static final int PROCESS_STATE_IMPORTANT_FOREGROUND = 6;
    public static final int PROCESS_STATE_IMPORTANT_BACKGROUND = 7;
    public static final int PROCESS_STATE_TRANSIENT_BACKGROUND = 8;
    public static final int PROCESS_STATE_BACKUP = 9;
    public static final int PROCESS_STATE_SERVICE = 10;
    public static final int PROCESS_STATE_RECEIVER = 11;
    public static final int PROCESS_STATE_TOP_SLEEPING = 12;
    public static final int PROCESS_STATE_HEAVY_WEIGHT = 13;
    public static final int PROCESS_STATE_HOME = 14;
    public static final int PROCESS_STATE_LAST_ACTIVITY = 15;
    public static final int PROCESS_STATE_CACHED_ACTIVITY = 16;
    public static final int PROCESS_STATE_CACHED_ACTIVITY_CLIENT = 17;
    public static final int PROCESS_STATE_CACHED_RECENT = 18;
    public static final int PROCESS_STATE_CACHED_EMPTY = 19;
    public static final int PROCESS_STATE_NONEXISTENT = 20;
    
    // 进程状态转换逻辑
    public static int computeProcessState(ProcessRecord app, WindowProcessController wpc) {
        if (app == null) {
            return PROCESS_STATE_NONEXISTENT;
        }
        
        if (app.isPersistent()) {
            return app.hasShownUi() ? PROCESS_STATE_PERSISTENT_UI : PROCESS_STATE_PERSISTENT;
        }
        
        // 从ATMS查询Activity状态
        if (wpc != null) {
            ActivityRecord topActivity = wpc.getTopResumedActivity();
            if (topActivity != null && topActivity.isFocused()) {
                return app.isSleeping() ? PROCESS_STATE_TOP_SLEEPING : PROCESS_STATE_TOP;
            }
        }
        
        if (app.hasForegroundServices()) {
            return PROCESS_STATE_FOREGROUND_SERVICE;
        }
        
        // 其他状态判断逻辑...
        return PROCESS_STATE_CACHED_EMPTY;
    }
}
```

### 1.4 策略模式应用

AMS使用策略模式实现可配置的管理策略，支持不同场景下的策略切换。

#### 进程管理策略
```java
// 进程管理策略接口
public interface ProcessManagementStrategy {
    boolean shouldKillProcess(ProcessRecord proc, int minAdj);
    int calculateOomAdj(ProcessRecord proc);
    void updateProcessState(ProcessRecord proc);
}

// 默认策略实现
public class DefaultProcessStrategy implements ProcessManagementStrategy {
    @Override
    public boolean shouldKillProcess(ProcessRecord proc, int minAdj) {
        return proc.setAdj >= minAdj && !proc.isPersistent();
    }
    
    @Override
    public int calculateOomAdj(ProcessRecord proc) {
        // 基于Activity、Service等状态计算OOM调整值
        if (proc.foregroundActivities) {
            return ProcessList.FOREGROUND_APP_ADJ;
        } else if (proc.foregroundServices) {
            return ProcessList.FOREGROUND_SERVICE_ADJ;
        }
        // ... 其他条件判断
        return ProcessList.CACHED_APP_MAX_ADJ;
    }
}

// 游戏模式策略
public class GamingProcessStrategy implements ProcessManagementStrategy {
    @Override
    public boolean shouldKillProcess(ProcessRecord proc, int minAdj) {
        // 游戏模式下不杀死游戏进程
        if (isGamingApp(proc)) {
            return false;
        }
        return proc.setAdj >= minAdj && !proc.isPersistent();
    }
    
    @Override
    public int calculateOomAdj(ProcessRecord proc) {
        if (isGamingApp(proc)) {
            return ProcessList.FOREGROUND_APP_ADJ; // 游戏进程保持高优先级
        }
        // ... 其他计算逻辑
    }
}
```

## 线程进程模型

### 2.1 主线程模型

AMS和ATMS运行在system_server进程的主线程中，负责处理系统级的管理任务。

#### AMS主线程职责
```java
// AMS主线程处理逻辑
public void systemReady(Runnable goingToBootingCallback, TimingsTraceLog t) {
    // 1. 系统准备阶段
    synchronized (this) {
        // 初始化系统服务
        mActiveServices.systemReady();
        mProcessList.systemReady();
        
        // 准备应用管理
        mSystemReady = true;
        
        // 通知ATMS
        mAtmInternal.onSystemReady();
    }
    
    // 2. 进入主循环
    Looper.loop();
}

// 处理Binder调用
public int onTransact(int code, Parcel data, Parcel reply, int flags) {
    try {
        switch (code) {
            case START_SERVICE_TRANSACTION:
                data.enforceInterface(IActivityManager.descriptor);
                // 处理服务启动请求
                ComponentName result = startService(...);
                reply.writeNoException();
                reply.writeParcelable(result, 0);
                return true;
            
            case BROADCAST_INTENT_TRANSACTION:
                // 处理广播发送请求
                // ...
                
            case FORCE_STOP_PACKAGE_TRANSACTION:
                // 处理强制停止请求
                // ...
        }
    } catch (RemoteException e) {
        // 异常处理
    }
    return super.onTransact(code, data, reply, flags);
}
```

#### ATMS主线程职责
```java
// ATMS主线程处理逻辑
public class ActivityTaskManagerService {
    // ATMS初始化
    public void onSystemReady() {
        synchronized (mGlobalLock) {
            // 初始化窗口容器
            mRootWindowContainer.onSystemReady();
            
            // 初始化最近任务
            mRecentTasks.onSystemReady();
            
            // 初始化多窗口支持
            initializeMultiWindow();
        }
    }
    
    // 处理Binder调用
    public int onTransact(int code, Parcel data, Parcel reply, int flags) {
        try {
            switch (code) {
                case START_ACTIVITY_TRANSACTION:
                    data.enforceInterface(IActivityTaskManager.descriptor);
                    // 处理Activity启动请求
                    int result = startActivity(...);
                    reply.writeNoException();
                    reply.writeInt(result);
                    return true;
                
                case MOVE_TASK_TO_FRONT_TRANSACTION:
                    // 处理任务移动请求
                    // ...
                    
                case ENTER_PICTURE_IN_PICTURE_TRANSACTION:
                    // 处理画中画请求
                    // ...
            }
        } catch (RemoteException e) {
            // 异常处理
        }
        return super.onTransact(code, data, reply, flags);
    }
}
```

### 2.2 工作线程模型

AMS和ATMS使用多个工作线程处理不同类型的任务，避免阻塞主线程。

#### 工作线程分类
```java
// AMS工作线程管理器
public class AmsWorkerThreadManager {
    // 进程管理线程
    private final HandlerThread mProcessThread;
    private final Handler mProcessHandler;
    
    // 内存管理线程
    private final HandlerThread mMemoryThread;
    private final Handler mMemoryHandler;
    
    // 统计信息线程
    private final HandlerThread mStatsThread;
    private final Handler mStatsHandler;
    
    // AppOps线程
    private final HandlerThread mAppOpsThread;
    private final Handler mAppOpsHandler;
    
    public AmsWorkerThreadManager() {
        // 初始化进程管理线程
        mProcessThread = new HandlerThread("AMS:proc", Process.THREAD_PRIORITY_FOREGROUND);
        mProcessThread.start();
        mProcessHandler = new Handler(mProcessThread.getLooper());
        
        // 初始化内存管理线程
        mMemoryThread = new HandlerThread("AMS:mem", Process.THREAD_PRIORITY_BACKGROUND);
        mMemoryThread.start();
        mMemoryHandler = new Handler(mMemoryThread.getLooper());
        
        // 初始化统计信息线程
        mStatsThread = new HandlerThread("AMS:stats");
        mStatsThread.start();
        mStatsHandler = new Handler(mStatsThread.getLooper());
    }
    
    // 提交进程管理任务
    public void submitProcessTask(Runnable task) {
        mProcessHandler.post(task);
    }
    
    // 提交内存管理任务
    public void submitMemoryTask(Runnable task) {
        mMemoryHandler.post(task);
    }
}

// ATMS工作线程管理器
public class AtmsWorkerThreadManager {
    // 动画线程
    private final HandlerThread mAnimationThread;
    private final Handler mAnimationHandler;
    
    // 任务快照线程
    private final HandlerThread mSnapshotThread;
    private final Handler mSnapshotHandler;
    
    public AtmsWorkerThreadManager() {
        // 初始化动画线程
        mAnimationThread = new HandlerThread("ATMS:anim", Process.THREAD_PRIORITY_DISPLAY);
        mAnimationThread.start();
        mAnimationHandler = new Handler(mAnimationThread.getLooper());
        
        // 初始化快照线程
        mSnapshotThread = new HandlerThread("ATMS:snapshot");
        mSnapshotThread.start();
        mSnapshotHandler = new Handler(mSnapshotThread.getLooper());
    }
}
```

### 2.3 进程间通信模型

AMS和ATMS通过Binder机制与其他进程进行通信，实现跨进程的应用管理。

#### Binder通信架构
```java
// AMS Binder接口定义
public interface IActivityManager extends IInterface {
    // 服务管理接口
    ComponentName startService(IApplicationThread caller, ...);
    int stopService(IApplicationThread caller, ...);
    
    // 广播管理接口
    int broadcastIntent(IApplicationThread caller, ...);
    Intent registerReceiver(IApplicationThread caller, ...);
    
    // 进程管理接口
    void killBackgroundProcesses(String packageName);
    void forceStopPackage(String packageName);
    
    // 其他管理接口
    // ...
}

// ATMS Binder接口定义（Android 10+）
public interface IActivityTaskManager extends IInterface {
    // Activity管理接口
    int startActivity(IApplicationThread caller, ...);
    boolean finishActivity(IBinder token, ...);
    
    // 任务管理接口
    List<RunningTaskInfo> getTasks(int maxNum);
    void moveTaskToFront(int taskId, ...);
    
    // 多窗口接口
    void setTaskWindowingMode(int taskId, int windowingMode, ...);
    boolean enterPictureInPictureMode(IBinder token, ...);
}

// Binder通信流程
public class ActivityManagerProxy implements IActivityManager {
    private final IBinder mRemote;
    
    @Override
    public ComponentName startService(IApplicationThread caller, ...) {
        Parcel data = Parcel.obtain();
        Parcel reply = Parcel.obtain();
        
        try {
            data.writeInterfaceToken(IActivityManager.descriptor);
            // 写入参数
            data.writeStrongBinder(caller != null ? caller.asBinder() : null);
            // ... 其他参数
            
            // 发起Binder调用
            mRemote.transact(START_SERVICE_TRANSACTION, data, reply, 0);
            
            // 读取结果
            reply.readException();
            return ComponentName.CREATOR.createFromParcel(reply);
        } finally {
            data.recycle();
            reply.recycle();
        }
    }
}

// ATMS Binder代理
public class ActivityTaskManagerProxy implements IActivityTaskManager {
    private final IBinder mRemote;
    
    @Override
    public int startActivity(IApplicationThread caller, ...) {
        Parcel data = Parcel.obtain();
        Parcel reply = Parcel.obtain();
        
        try {
            data.writeInterfaceToken(IActivityTaskManager.descriptor);
            // 写入参数
            data.writeStrongBinder(caller != null ? caller.asBinder() : null);
            // ... 其他参数
            
            // 发起Binder调用
            mRemote.transact(START_ACTIVITY_TRANSACTION, data, reply, 0);
            
            // 读取结果
            reply.readException();
            return reply.readInt();
        } finally {
            data.recycle();
            reply.recycle();
        }
    }
}
```

#### AMS与ATMS内部通信
```java
// AMS与ATMS内部通信接口
public class ActivityManagerInternal {
    // AMS调用ATMS
    public void onProcessStarted(ProcessRecord app) {
        // 通知ATMS进程已启动
        mActivityTaskManagerInternal.onProcessStarted(
            app.getProcessName(),
            app.getUid(),
            app.getPid());
    }
    
    // 查询Activity状态
    public boolean hasActiveActivity(String packageName, int userId) {
        return mActivityTaskManagerInternal.hasActiveActivity(packageName, userId);
    }
}

public class ActivityTaskManagerInternal {
    // ATMS调用AMS
    public void startProcessForActivity(ActivityRecord r) {
        // 委托AMS启动进程
        mActivityManagerInternal.startProcessLocked(
            r.getProcessName(),
            r.getActivityInfo().applicationInfo,
            "activity",
            r.getActivityInfo().name);
    }
    
    // 更新进程状态
    public void updateProcessActivityState(ProcessRecord app) {
        mActivityManagerInternal.updateOomAdj(app);
    }
}
```

### 2.4 线程同步机制

AMS和ATMS使用多种同步机制确保多线程环境下的数据一致性。

#### 同步机制实现
```java
// AMS全局锁
public class ActivityManagerService {
    // AMS全局锁
    public static final Object mGlobalLock = new Object();
    
    // 进程锁（按进程粒度加锁）
    private final Map<String, Object> mProcessLocks = new ConcurrentHashMap<>();
}

// ATMS全局锁（Android 11+使用WindowContainer层级锁）
public class ActivityTaskManagerService {
    // ATMS全局锁
    public static final WindowManagerGlobalLock mGlobalLock = 
        new WindowManagerGlobalLock();
    
    // 窗口容器层级锁
    // 使用WindowContainer自带的锁机制
}

// 窗口管理器全局锁
public class WindowManagerGlobalLock {
    // 用于保护窗口层级结构的锁
}

// 同步工具类
public class AmsAtmSyncUtils {
    // 同时获取AMS和ATMS锁
    public static void acquireBothLocks(Runnable action) {
        synchronized (ActivityManagerService.mGlobalLock) {
            synchronized (ActivityTaskManagerService.mGlobalLock) {
                action.run();
            }
        }
    }
    
    // 按进程粒度加锁
    public static void withProcessLock(ProcessRecord app, Runnable action) {
        synchronized (app) {
            action.run();
        }
    }
    
    // 按任务粒度加锁
    public static void withTaskLock(Task task, Runnable action) {
        synchronized (task) {
            action.run();
        }
    }
}
```

### 2.5 进程模型

AMS管理系统中所有应用进程的生命周期和状态，与ATMS协同工作。

#### 进程状态管理
```java
// 进程状态定义（Android 11+更新）
public class ProcessList {
    // 进程状态常量
    public static final int PROCESS_STATE_UNKNOWN = -1;
    public static final int PROCESS_STATE_PERSISTENT = 0;
    public static final int PROCESS_STATE_PERSISTENT_UI = 1;
    public static final int PROCESS_STATE_TOP = 2;
    public static final int PROCESS_STATE_BOUND_TOP = 3;
    public static final int PROCESS_STATE_FOREGROUND_SERVICE = 4;
    public static final int PROCESS_STATE_BOUND_FOREGROUND_SERVICE = 5;
    public static final int PROCESS_STATE_IMPORTANT_FOREGROUND = 6;
    public static final int PROCESS_STATE_IMPORTANT_BACKGROUND = 7;
    public static final int PROCESS_STATE_TRANSIENT_BACKGROUND = 8;
    public static final int PROCESS_STATE_BACKUP = 9;
    public static final int PROCESS_STATE_SERVICE = 10;
    public static final int PROCESS_STATE_RECEIVER = 11;
    public static final int PROCESS_STATE_TOP_SLEEPING = 12;
    public static final int PROCESS_STATE_HEAVY_WEIGHT = 13;
    public static final int PROCESS_STATE_HOME = 14;
    public static final int PROCESS_STATE_LAST_ACTIVITY = 15;
    public static final int PROCESS_STATE_CACHED_ACTIVITY = 16;
    public static final int PROCESS_STATE_CACHED_ACTIVITY_CLIENT = 17;
    public static final int PROCESS_STATE_CACHED_RECENT = 18;
    public static final int PROCESS_STATE_CACHED_EMPTY = 19;
    public static final int PROCESS_STATE_NONEXISTENT = 20;
    
    // 进程状态转换逻辑
    public static int computeProcessState(ProcessRecord app, WindowProcessController wpc) {
        if (app == null) {
            return PROCESS_STATE_NONEXISTENT;
        }
        
        // 持久进程
        if (app.isPersistent()) {
            return app.hasShownUi() ? PROCESS_STATE_PERSISTENT_UI : PROCESS_STATE_PERSISTENT;
        }
        
        // 从ATMS查询Activity状态
        if (wpc != null && wpc.hasActivities()) {
            ActivityRecord topActivity = wpc.getTopResumedActivity();
            if (topActivity != null) {
                if (topActivity.isFocused()) {
                    return app.isSleeping() ? PROCESS_STATE_TOP_SLEEPING : PROCESS_STATE_TOP;
                }
            }
            
            // 可见Activity
            if (wpc.hasVisibleActivities()) {
                return PROCESS_STATE_IMPORTANT_FOREGROUND;
            }
        }
        
        // 前台服务
        if (app.hasForegroundServices()) {
            return PROCESS_STATE_FOREGROUND_SERVICE;
        }
        
        // 绑定前台服务
        if (app.hasBoundForegroundService()) {
            return PROCESS_STATE_BOUND_FOREGROUND_SERVICE;
        }
        
        // 服务进程
        if (app.hasRunningServices()) {
            return PROCESS_STATE_SERVICE;
        }
        
        // 广播接收者
        if (app.hasReceivers()) {
            return PROCESS_STATE_RECEIVER;
        }
        
        // Home进程
        if (app.isHomeProcess()) {
            return PROCESS_STATE_HOME;
        }
        
        // 缓存进程
        if (app.hasActivities()) {
            return PROCESS_STATE_CACHED_ACTIVITY;
        }
        
        return PROCESS_STATE_CACHED_EMPTY;
    }
}
```

#### 进程优先级与OOM调整值
```java
// 进程优先级调整值（Android 11+更新）
public class ProcessList {
    // 进程优先级调整值
    public static final int UNKNOWN_ADJ = 1001;
    public static final int CACHED_APP_MAX_ADJ = 999;
    public static final int CACHED_APP_MIN_ADJ = 900;
    public static final int CACHED_LMK_FIRST_ADJ = 950;
    
    // 服务相关
    public static final int SERVICE_B_ADJ = 800;
    public static final int PREVIOUS_APP_ADJ = 700;
    
    // Home进程
    public static final int HOME_APP_ADJ = 600;
    public static final int SERVICE_ADJ = 500;
    
    // 重要进程
    public static final int HEAVY_WEIGHT_APP_ADJ = 400;
    public static final int BACKUP_APP_ADJ = 300;
    public static final int PERCEPTIBLE_APP_ADJ = 200;
    public static final int VISIBLE_APP_ADJ = 100;
    public static final int VISIBLE_APP_LAYER_MAX = 99;
    
    // 前台进程
    public static final int FOREGROUND_APP_ADJ = 0;
    public static final int PERSISTENT_SERVICE_ADJ = -700;
    public static final int PERSISTENT_PROC_ADJ = -800;
    public static final int SYSTEM_ADJ = -900;
    public static final int NATIVE_ADJ = -1000;
}
```

通过深入理解AMS和ATMS的设计思路和线程进程模型，开发者可以更好地进行系统定制、性能优化和故障排查。