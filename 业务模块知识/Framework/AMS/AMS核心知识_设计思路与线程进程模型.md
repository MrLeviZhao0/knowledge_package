# AMS核心知识_设计思路与线程进程模型

## 设计思路

### 1.1 分层架构设计

AMS采用分层架构设计，将复杂的应用管理功能分解为多个层次，每个层次负责特定的功能模块。

#### 架构层次划分
```java
// AMS分层架构（伪代码）
public class ActivityManagerService {
    // 1. 接口层（对外接口）
    public class ActivityManagerInternal {
        // 系统内部使用的接口
    }
    
    public class ActivityManagerNative {
        // Binder接口实现
    }
    
    // 2. 业务逻辑层（核心管理）
    public class ActivityStackSupervisor {
        // 栈管理逻辑
    }
    
    public class RecentTasks {
        // 最近任务管理
    }
    
    public class ActiveServices {
        // 服务管理
    }
    
    // 3. 数据层（状态管理）
    public class ProcessRecord {
        // 进程状态管理
    }
    
    public class ActivityRecord {
        // Activity状态管理
    }
    
    public class TaskRecord {
        // 任务状态管理
    }
    
    // 4. 基础层（系统集成）
    public class ActivityManagerConstants {
        // 系统常量配置
    }
    
    public class OomAdjuster {
        // OOM调整逻辑
    }
}
```

#### 设计原则
- **单一职责原则**：每个类只负责一个明确的功能
- **开闭原则**：对扩展开放，对修改关闭
- **依赖倒置原则**：高层模块不依赖低层模块，都依赖抽象
- **接口隔离原则**：使用多个专门的接口，而不是单一的总接口

### 1.2 事件驱动模型

AMS采用事件驱动模型处理各种系统事件和应用请求，确保系统的响应性和实时性。

#### 事件类型
```java
// AMS处理的主要事件类型
public enum AmsEventType {
    ACTIVITY_START,      // Activity启动事件
    ACTIVITY_FINISH,     // Activity结束事件
    SERVICE_START,       // 服务启动事件
    SERVICE_STOP,        // 服务停止事件
    PROCESS_CREATE,      // 进程创建事件
    PROCESS_KILL,        // 进程杀死事件
    CONFIG_CHANGE,       // 配置变更事件
    MEMORY_PRESSURE,     // 内存压力事件
    USER_SWITCH,         // 用户切换事件
}
```

#### 事件处理流程
```java
// 事件处理机制
public class AmsEventDispatcher {
    private final Map<AmsEventType, List<AmsEventListener>> mEventListeners;
    
    public void registerEventListener(AmsEventType type, AmsEventListener listener) {
        List<AmsEventListener> listeners = mEventListeners.get(type);
        if (listeners == null) {
            listeners = new ArrayList<>();
            mEventListeners.put(type, listeners);
        }
        listeners.add(listener);
    }
    
    public void dispatchEvent(AmsEvent event) {
        List<AmsEventListener> listeners = mEventListeners.get(event.getType());
        if (listeners != null) {
            for (AmsEventListener listener : listeners) {
                listener.onEvent(event);
            }
        }
    }
}
```

### 1.3 状态机设计

AMS使用状态机模型管理Activity、Service、Process等组件的生命周期状态。

#### Activity状态机
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
        DESTROYED        // 已销毁
    }
    
    // 状态转换规则
    private final Map<ActivityState, Set<ActivityState>> mTransitionRules;
    
    public ActivityStateMachine() {
        mTransitionRules = new EnumMap<>(ActivityState.class);
        
        // 定义合法的状态转换
        mTransitionRules.put(ActivityState.INITIALIZING, 
            EnumSet.of(ActivityState.CREATED));
        mTransitionRules.put(ActivityState.CREATED, 
            EnumSet.of(ActivityState.STARTED, ActivityState.DESTROYING));
        mTransitionRules.put(ActivityState.STARTED, 
            EnumSet.of(ActivityState.RESUMED, ActivityState.STOPPING));
        mTransitionRules.put(ActivityState.RESUMED, 
            EnumSet.of(ActivityState.PAUSING));
        // ... 其他状态转换规则
    }
    
    public boolean canTransition(ActivityState from, ActivityState to) {
        Set<ActivityState> allowedTransitions = mTransitionRules.get(from);
        return allowedTransitions != null && allowedTransitions.contains(to);
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

AMS运行在system_server进程的主线程中，负责处理系统级的管理任务。

#### 主线程职责
```java
// AMS主线程处理逻辑
public void systemReady() {
    // 1. 系统准备阶段
    synchronized (this) {
        // 初始化系统服务
        startCoreServices();
        
        // 启动系统进程
        startSystemProcesses();
        
        // 准备应用管理
        mSystemReady = true;
    }
    
    // 2. 进入主循环
    Looper.loop();
}

// 处理Binder调用
public int onTransact(int code, Parcel data, Parcel reply, int flags) {
    try {
        switch (code) {
            case START_ACTIVITY_TRANSACTION:
                data.enforceInterface(IActivityManager.descriptor);
                // 处理Activity启动请求
                int result = startActivity(...);
                reply.writeNoException();
                reply.writeInt(result);
                return true;
            
            case START_SERVICE_TRANSACTION:
                // 处理服务启动请求
                // ...
                
            // 其他Binder调用处理
        }
    } catch (RemoteException e) {
        // 异常处理
    }
    return super.onTransact(code, data, reply, flags);
}
```

### 2.2 工作线程模型

AMS使用多个工作线程处理不同类型的任务，避免阻塞主线程。

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
    
    public AmsWorkerThreadManager() {
        // 初始化进程管理线程
        mProcessThread = new HandlerThread("AMS-Process");
        mProcessThread.start();
        mProcessHandler = new Handler(mProcessThread.getLooper());
        
        // 初始化内存管理线程
        mMemoryThread = new HandlerThread("AMS-Memory");
        mMemoryThread.start();
        mMemoryHandler = new Handler(mMemoryThread.getLooper());
        
        // 初始化统计信息线程
        mStatsThread = new HandlerThread("AMS-Stats");
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
    
    // 提交统计任务
    public void submitStatsTask(Runnable task) {
        mStatsHandler.post(task);
    }
}
```

### 2.3 进程间通信模型

AMS通过Binder机制与其他进程进行通信，实现跨进程的应用管理。

#### Binder通信架构
```java
// AMS Binder接口定义
public interface IActivityManager extends IInterface {
    // Activity管理接口
    int startActivity(IApplicationThread caller, ...);
    boolean finishActivity(IBinder token, ...);
    
    // 服务管理接口
    ComponentName startService(IApplicationThread caller, ...);
    int stopService(IApplicationThread caller, ...);
    
    // 进程管理接口
    void killBackgroundProcesses(String packageName);
    void forceStopPackage(String packageName);
    
    // 其他管理接口
    // ...
}

// Binder通信流程
public class ActivityManagerProxy implements IActivityManager {
    private final IBinder mRemote;
    
    @Override
    public int startActivity(IApplicationThread caller, ...) {
        Parcel data = Parcel.obtain();
        Parcel reply = Parcel.obtain();
        
        try {
            data.writeInterfaceToken(IActivityManager.descriptor);
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

### 2.4 线程同步机制

AMS使用多种同步机制确保多线程环境下的数据一致性。

#### 同步机制实现
```java
// AMS同步管理器
public class AmsSynchronizer {
    // 全局锁（用于保护核心数据结构）
    private final Object mGlobalLock = new Object();
    
    // 进程锁（按进程粒度加锁）
    private final Map<String, Object> mProcessLocks = new ConcurrentHashMap<>();
    
    // Activity栈锁（按栈粒度加锁）
    private final Map<Integer, Object> mStackLocks = new ConcurrentHashMap<>();
    
    // 获取全局锁
    public void acquireGlobalLock() {
        synchronized (mGlobalLock) {
            // 执行需要全局同步的操作
        }
    }
    
    // 获取进程锁
    public void acquireProcessLock(String processName) {
        Object lock = mProcessLocks.computeIfAbsent(processName, k -> new Object());
        synchronized (lock) {
            // 执行进程相关的操作
        }
    }
    
    // 获取栈锁
    public void acquireStackLock(int stackId) {
        Object lock = mStackLocks.computeIfAbsent(stackId, k -> new Object());
        synchronized (lock) {
            // 执行栈相关的操作
        }
    }
}
```

### 2.5 进程模型

AMS管理系统中所有应用进程的生命周期和状态。

#### 进程状态管理
```java
// 进程状态定义
public class ProcessList {
    // 进程状态常量
    public static final int PROCESS_STATE_PERSISTENT = 0;      // 持久进程
    public static final int PROCESS_STATE_PERSISTENT_UI = 1;   // 持久UI进程
    public static final int PROCESS_STATE_TOP = 2;             // 前台进程
    public static final int PROCESS_STATE_FOREGROUND_SERVICE = 3; // 前台服务
    public static final int PROCESS_STATE_BOUND_FOREGROUND_SERVICE = 4; // 绑定前台服务
    public static final int PROCESS_STATE_IMPORTANT_FOREGROUND = 5; // 重要前台
    public static final int PROCESS_STATE_IMPORTANT_BACKGROUND = 6; // 重要后台
    public static final int PROCESS_STATE_BACKUP = 7;          // 备份进程
    public static final int PROCESS_STATE_SERVICE = 8;         // 服务进程
    public static final int PROCESS_STATE_RECEIVER = 9;        // 接收者进程
    public static final int PROCESS_STATE_TOP_SLEEPING = 10;   // 休眠前台
    public static final int PROCESS_STATE_HEAVY_WEIGHT = 11;   // 重量级进程
    public static final int PROCESS_STATE_HOME = 12;           // Home进程
    public static final int PROCESS_STATE_LAST_ACTIVITY = 13;  // 最后活动
    public static final int PROCESS_STATE_CACHED_ACTIVITY = 14; // 缓存Activity
    public static final int PROCESS_STATE_CACHED_ACTIVITY_CLIENT = 15; // 缓存Activity客户端
    public static final int PROCESS_STATE_CACHED_EMPTY = 16;   // 空缓存
    
    // 进程状态转换逻辑
    public static int computeProcessState(ProcessRecord app) {
        if (app == null) {
            return PROCESS_STATE_NONEXISTENT;
        }
        
        if (app.isPersistent()) {
            return app.hasShownUi ? PROCESS_STATE_PERSISTENT_UI : PROCESS_STATE_PERSISTENT;
        }
        
        if (app.foregroundActivities) {
            return app.isSleeping ? PROCESS_STATE_TOP_SLEEPING : PROCESS_STATE_TOP;
        }
        
        if (app.foregroundServices) {
            return PROCESS_STATE_FOREGROUND_SERVICE;
        }
        
        // ... 其他状态判断逻辑
        
        return PROCESS_STATE_CACHED_EMPTY;
    }
}
```

通过深入理解AMS的设计思路和线程进程模型，开发者可以更好地进行系统定制、性能优化和故障排查。