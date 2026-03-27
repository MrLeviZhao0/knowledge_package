# AMS核心知识_概述与数据结构

## 概述

ActivityManagerService（AMS）是Android系统中最重要的系统服务之一。从Android 10开始，Google对AMS进行了重大重构，将Activity和Task相关的管理职责剥离到独立的ActivityTaskManagerService（ATMS）中。AMS现在主要负责Service、BroadcastReceiver、ContentProvider的生命周期管理，以及进程管理、权限控制等核心功能。

### AMS与ATMS职责分离

#### AMS（ActivityManagerService）主要职责
1. **Service管理**：管理Service的生命周期、绑定、启动等
2. **BroadcastReceiver管理**：管理广播的发送、接收、权限控制
3. **ContentProvider管理**：管理ContentProvider的生命周期和数据访问
4. **进程管理**：应用进程的创建、销毁、优先级调整
5. **内存管理**：监控内存使用，实施Low Memory Killer策略
6. **权限控制**：验证应用权限，确保系统安全
7. **用户管理**：多用户环境下的用户切换和管理

#### ATMS（ActivityTaskManagerService）主要职责
1. **Activity生命周期管理**：管理Activity的创建、启动、暂停、销毁等
2. **Task管理**：管理Activity的任务栈和回退栈
3. **窗口层级管理**：与WMS协同管理窗口层级和显示区域
4. **多窗口支持**：分屏、画中画、自由窗口等多窗口模式
5. **任务快照**：管理最近任务列表和任务快照
6. **Activity启动优化**：预测性启动、预加载等优化机制

## 核心数据结构

### 1. ActivityRecord（ATMS管理）
ActivityRecord代表一个Activity实例，从Android 11开始归属于ATMS管理。包含Activity的所有运行时信息。

```java
public final class ActivityRecord extends WindowToken implements WindowManagerService.WindowChangeListener {
    // 基本信息
    final ActivityInfo activityInfo;      // Activity的静态信息
    final ApplicationInfo appInfo;        // 应用信息
    final String packageName;             // 包名
    final String processName;             // 进程名
    final Intent intent;                  // 启动Intent
    final ComponentName realActivity;     // 实际组件名
    
    // 状态信息
    int launchMode;                      // 启动模式
    int taskAffinity;                    // 任务亲和性
    boolean finishAfterTransition;       // 转场后结束
    boolean visible;                     // 是否可见
    boolean stateNotNeeded;              // 状态不需要保存
    
    // 窗口相关
    private Task mTask;                  // 所属任务（Android 11+使用Task替代TaskRecord）
    ActivityRecord mWaitingVisible;      // 等待可见的Activity
    ActivityRecord mLastFocusedActivity; // 最后聚焦的Activity
    
    // 生命周期状态
    private ActivityState mState;        // Activity状态
    boolean mPaused;                     // 是否暂停
    boolean mStopped;                    // 是否停止
    boolean mFinishing;                  // 是否正在结束
    boolean mDestroying;                 // 是否正在销毁
    
    // 配置信息
    Configuration mConfiguration;        // 配置信息
    int mDisplayId;                      // 显示ID
    private TaskDisplayArea mDisplayArea;// 所属显示区域
    
    // 关联对象
    private Task mTask;                  // 所属任务
    WindowProcessController mApp;        // 所属进程控制器
    private TaskFragment mTaskFragment;  // 所属任务片段
    
    // 历史记录
    ActivityRecord mResultTo;            // 结果接收者
    String mResultWho;                   // 结果标识
    int mRequestCode;                    // 请求代码
    
    // 时间信息
    long mCreateTime;                    // 创建时间
    long mLastVisibleTime;               // 最后可见时间
    long mLastResumeTime;                // 最后恢复时间
    
    // 新增：启动结果回调
    private IActivityStartResultCallback mStartResultCallback;
    
    // 新增：预测性返回手势支持
    private boolean mIsInPredictiveBack;
    
    // 方法定义
    void setTask(Task task);             // 设置所属任务
    void setState(ActivityState state, String reason); // 设置状态
    boolean canTurnScreenOn();           // 是否可以点亮屏幕
    void onWindowFocusChanged(boolean hasFocus); // 窗口焦点变化
}
```

### 2. ProcessRecord
ProcessRecord代表一个应用进程，管理进程的生命周期和资源。

```java
public final class ProcessRecord {
    // 进程标识
    final int pid;                       // 进程ID
    final int uid;                       // 用户ID
    final String processName;            // 进程名
    final ApplicationInfo info;          // 应用信息
    
    // 状态信息
    int curProcState;                    // 当前进程状态
    int setProcState;                    // 设置的进程状态
    boolean killed;                      // 是否被杀死
    boolean killedByAm;                  // 是否被AMS杀死
    boolean crashing;                    // 是否正在崩溃
    
    // 内存信息
    long lastPss;                        // 上次PSS值
    long lastCachedPss;                  // 上次缓存PSS值
    long initialIdlePss;                 // 初始空闲PSS值
    
    // 优先级信息
    int maxAdj;                          // 最大调整值
    int curAdj;                          // 当前调整值
    int setAdj;                          // 设置调整值
    int lruSeq;                          // LRU序列号
    
    // 关联对象
    final ArraySet<ActivityRecord> activities = new ArraySet<>(); // 活动Activity
    final ArraySet<ServiceRecord> services = new ArraySet<>();    // 服务
    final ArraySet<ProviderRecord> providers = new ArraySet<>();  // 内容提供者
    final ArraySet<BroadcastRecord> curReceivers = new ArraySet<>(); // 广播接收者
    
    // 线程信息
    IApplicationThread thread;           // 应用线程接口
    WindowProcessController mWindowProcessController; // 窗口进程控制器
    
    // 时间信息
    long lastActivityTime;               // 最后活动时间
    long lastStateTime;                  // 最后状态时间
    
    // 方法定义
    boolean isPersistent();              // 是否是持久进程
    void kill(...);                      // 杀死进程
    void updateProcessInfo(...);         // 更新进程信息
}
```

### 3. Task（ATMS管理）
从Android 11开始，TaskRecord被重构为Task类，作为TaskFragment的子类，更清晰地表示任务层级结构。

```java
class Task extends TaskFragment {
    // 任务标识
    final int mTaskId;                   // 任务ID
    final String mAffinity;              // 任务亲和性
    private Intent mIntent;              // 根Intent
    final ComponentName mRealActivity;   // 根Activity
    
    // 层级结构
    private TaskDisplayArea mDisplayArea;// 所属显示区域
    private Task mRootTask;              // 根任务
    
    // Activity管理
    private final ArrayList<ActivityRecord> mActivities = new ArrayList<>();
    ActivityRecord mRootActivity;        // 根Activity
    private ActivityRecord mTopActivity; // 顶部Activity
    
    // 配置信息
    private int mTaskType;               // 任务类型
    private int mResizeMode;             // 调整模式
    private Rect mBounds;                // 边界
    
    // 多窗口相关
    private boolean mSupportsMultiWindow; // 是否支持多窗口
    private boolean mIsResizeable;       // 是否可调整大小
    private int mWindowingMode;          // 窗口模式
    
    // 分屏相关
    private Task mRootTaskOfTaskFragment; // 任务片段的根任务
    private boolean mIsAdjacentToFocus;   // 是否与焦点任务相邻
    
    // 状态信息
    boolean mIsAvailable;                // 是否可用
    boolean mIsSleeping;                 // 是否休眠
    private boolean mDeferRemoval;       // 延迟移除
    
    // 时间信息
    long mLastActiveTime;                // 最后活动时间
    long mLastTaskMoveTime;              // 最后任务移动时间
    
    // 任务快照
    private TaskSnapshot mSnapshot;      // 任务快照
    
    // 方法定义
    void addChild(ActivityRecord r);     // 添加Activity
    void removeChild(ActivityRecord r);  // 移除Activity
    ActivityRecord topActivity();        // 获取顶部Activity
    void moveToTop(String reason);       // 移动到顶部
    boolean canBeResumed();              // 是否可以恢复
    void onResize();                     // 大小调整回调
}
```

### 3.1 TaskFragment（Android 13新增）
TaskFragment是任务管理的原子单位，支持更灵活的任务组织方式。

```java
class TaskFragment extends WindowContainer<WindowContainer> {
    // 基本信息
    private TaskFragmentOrganizer mOrganizer; // 组织器
    private IBinder mFragmentToken;           // 片段令牌
    
    // 层级关系
    private Task mTask;                       // 所属任务
    
    // 状态信息
    private boolean mIsRemovalDeferred;       // 延迟移除标志
    private boolean mIsWaitingTaskFragmentRemoved; // 等待移除
    
    // Activity管理
    private final ArrayList<ActivityRecord> mChildren = new ArrayList<>();
    
    // 窗口相关
    private Rect mPreviousBounds;             // 之前的边界
    private int mWindowingMode;               // 窗口模式
    
    // 方法定义
    void setTask(Task task);                  // 设置所属任务
    void addChild(ActivityRecord child);      // 添加子元素
    void removeChild(ActivityRecord child);   // 移除子元素
    boolean isEmbedded();                     // 是否为嵌入式
}
```

### 4. RootWindowContainer（ATMS管理）
从Android 11开始，ActivityStackSupervisor被移除，其职责由RootWindowContainer承担，作为窗口容器的根节点。

```java
class RootWindowContainer extends WindowContainer<DisplayContent> {
    // 显示管理
    private final DisplayManager mDisplayManager;
    private final ArrayList<DisplayContent> mChildren = new ArrayList<>();
    
    // 焦点管理
    private ActivityRecord mFocusedActivity;      // 焦点Activity
    private Task mFocusedTask;                    // 焦点任务
    private ActivityRecord mLastFocusedActivity;  // 最后焦点Activity
    
    // 任务管理
    private Task mTopDisplayFocusedRootTask;      // 顶层显示焦点根任务
    
    // 服务引用
    private final ActivityTaskManagerService mService;
    private final WindowManagerService mWindowManager;
    
    // 最近任务
    private RecentTasks mRecentTasks;
    
    // 方法定义
    void setFocusedTask(Task task);               // 设置焦点任务
    ActivityRecord getTopResumedActivity();       // 获取顶层恢复Activity
    Task getTopDisplayFocusedRootTask();          // 获取顶层显示焦点根任务
    DisplayContent getDisplayContent(int displayId); // 获取显示内容
    void onDisplayAdded(int displayId);           // 显示添加回调
    void onDisplayRemoved(int displayId);         // 显示移除回调
}
```

### 5. TaskDisplayArea（ATMS管理）
TaskDisplayArea表示显示区域，用于组织和管理任务在显示器上的布局。

```java
class TaskDisplayArea extends DisplayArea<DisplayArea> {
    // 基本信息
    private final int mDisplayId;                 // 显示ID
    private final String mName;                   // 名称
    
    // 任务管理
    private final ArrayList<Task> mRootTasks = new ArrayList<>(); // 根任务列表
    private Task mFocusedRootTask;                // 焦点根任务
    
    // 分屏相关
    private Task mTopRootTask;                    // 顶层根任务
    private Task mBottomRootTask;                 // 底层根任务（分屏时）
    
    // 窗口模式
    private int mWindowingMode;                   // 窗口模式
    
    // 方法定义
    Task getRootTask(int taskId);                 // 获取根任务
    Task getFocusedRootTask();                    // 获取焦点根任务
    void addChild(Task task);                     // 添加任务
    void removeChild(Task task);                  // 移除任务
    void onStackWindowingModeChanged(Task task); // 窗口模式变化回调
}
```

### 6. DisplayContent（ATMS与WMS共享）
DisplayContent代表一个物理或虚拟显示器的所有窗口内容。

```java
class DisplayContent extends WindowContainer<DisplayArea> {
    // 显示信息
    private final int mDisplayId;                 // 显示ID
    private final DisplayInfo mDisplayInfo;       // 显示信息
    private final Display mDisplay;               // Display对象
    
    // 显示区域
    private TaskDisplayArea mTaskDisplayArea;     // 任务显示区域
    private DisplayArea mImeContainer;            // 输入法容器
    
    // 任务管理
    private Task mTask;                           // 关联任务
    
    // 窗口模式
    private int mWindowingMode;                   // 窗口模式
    private boolean mSupportsMultiWindow;         // 是否支持多窗口
    
    // 分屏相关
    private boolean mIsSplitScreenActive;         // 分屏是否激活
    private Task mTopSplitScreenRootTask;         // 分屏顶层任务
    
    // 方法定义
    TaskDisplayArea getDefaultTaskDisplayArea();  // 获取默认任务显示区域
    boolean canShowTasksInRecents();              // 是否能在最近任务显示
    void onWindowingModeChanged();                // 窗口模式变化回调
}
```

## 数据结构关系图

### 核心对象关系（Android 11+）
```
ActivityTaskManagerService (ATMS)
    ↓
RootWindowContainer (根窗口容器，替代ActivityStackSupervisor)
    ↓
DisplayContent (显示器内容)
    ↓
TaskDisplayArea (任务显示区域)
    ↓
Task (任务，替代TaskRecord)
    ↓
TaskFragment (任务片段，Android 13+)
    ↓
ActivityRecord (Activity记录)
    ↓
WindowProcessController (进程控制器)

---

ActivityManagerService (AMS)
    ↓
ActiveServices (服务管理)
    ↓
ServiceRecord (服务记录)

ActiveServices
BroadcastQueue (广播队列)
    ↓
BroadcastRecord (广播记录)

ProcessList (进程列表)
    ↓
ProcessRecord (进程记录)
```

### ATMS与AMS协作关系
```
┌─────────────────────────────────────────────────────────────┐
│                      system_server                          │
├─────────────────────────────────────────────────────────────┤
│  ATMS (ActivityTaskManagerService)                          │
│  ├── Activity/Task生命周期管理                               │
│  ├── 窗口层级管理                                            │
│  └── 多窗口支持                                              │
│                    ↕ IPC通信                                 │
│  AMS (ActivityManagerService)                               │
│  ├── Service/Broadcast/Provider管理                         │
│  ├── 进程管理                                                │
│  ├── 内存管理                                                │
│  └── 权限控制                                                │
├─────────────────────────────────────────────────────────────┤
│  WMS (WindowManagerService)                                 │
│  └── 窗口管理、Surface管理                                   │
└─────────────────────────────────────────────────────────────┘
```

### 生命周期状态转换
```
Activity状态转换:
INITIALIZING → CREATED → STARTED → RESUMED
                               ↓
                           PAUSING
                               ↓
                            PAUSED
                               ↓
                          STOPPING
                               ↓
                           STOPPED
                               ↓
                         DESTROYING
                               ↓
                          DESTROYED

进程状态转换:
PROCESS_STATE_PERSISTENT (持久进程)
PROCESS_STATE_PERSISTENT_UI (持久UI进程)
PROCESS_STATE_TOP (前台进程)
PROCESS_STATE_FOREGROUND_SERVICE (前台服务)
PROCESS_STATE_BOUND_FOREGROUND_SERVICE (绑定前台服务)
PROCESS_STATE_IMPORTANT_FOREGROUND (重要前台)
PROCESS_STATE_IMPORTANT_BACKGROUND (重要后台)
PROCESS_STATE_BACKUP (备份进程)
PROCESS_STATE_SERVICE (服务进程)
PROCESS_STATE_RECEIVER (接收者进程)
PROCESS_STATE_TOP_SLEEPING (休眠前台)
PROCESS_STATE_HEAVY_WEIGHT (重量级进程)
PROCESS_STATE_HOME (Home进程)
PROCESS_STATE_LAST_ACTIVITY (最后活动)
PROCESS_STATE_CACHED_ACTIVITY (缓存Activity)
PROCESS_STATE_CACHED_ACTIVITY_CLIENT (缓存Activity客户端)
PROCESS_STATE_CACHED_EMPTY (空缓存)
```

## 关键配置参数

### 进程优先级参数
```java
// 进程优先级调整值
static final int UNKNOWN_ADJ = 16;           // 未知进程
static final int CACHED_APP_MAX_ADJ = 15;    // 缓存应用最大调整值
static final int CACHED_APP_MIN_ADJ = 9;     // 缓存应用最小调整值
static final int SERVICE_B_ADJ = 8;          // B列表服务
static final int PREVIOUS_APP_ADJ = 7;       // 上一个应用
static final int HOME_APP_ADJ = 6;           // Home应用
static final int SERVICE_ADJ = 5;            // 服务进程
static final int HEAVY_WEIGHT_APP_ADJ = 4;   // 重量级应用
static final int BACKUP_APP_ADJ = 3;         // 备份应用
static final int PERCEPTIBLE_APP_ADJ = 2;    // 可感知应用
static final int VISIBLE_APP_ADJ = 1;        // 可见应用
static final int FOREGROUND_APP_ADJ = 0;     // 前台应用
static final int PERSISTENT_SERVICE_ADJ = -11; // 持久服务
static final int PERSISTENT_PROC_ADJ = -12;  // 持久进程
static final int SYSTEM_ADJ = -16;           // 系统进程
```

### 内存管理参数
```java
// Low Memory Killer参数
static final int[] LMK_ADJ = new int[] {
    0, 1, 2, 4, 9, 15
};

static final int[] LMK_MINFREE = new int[] {
    12288, 18432, 24576, 36864, 43008, 49152
};

// OOM调整参数
static final int OOM_SCORE_ADJ_MAX = 1000;   // 最大OOM分数
static final int OOM_SCORE_ADJ_MIN = -1000;  // 最小OOM分数
```

通过深入理解AMS的核心数据结构，开发者可以更好地进行系统定制、性能优化和故障排查。