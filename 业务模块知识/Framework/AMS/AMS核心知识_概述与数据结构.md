# AMS核心知识_概述与数据结构

## 概述

ActivityManagerService（AMS）是Android系统中最重要的系统服务之一，负责管理应用程序的生命周期、进程调度、任务栈管理以及四大组件的启动和调度。AMS是Android应用运行环境的核心，直接影响应用的性能和用户体验。

### AMS的主要职责
1. **应用生命周期管理**：管理Activity、Service、BroadcastReceiver、ContentProvider的生命周期
2. **进程管理**：应用进程的创建、销毁、优先级调整
3. **任务栈管理**：管理Activity的任务栈和回退栈
4. **内存管理**：监控内存使用，实施Low Memory Killer策略
5. **权限控制**：验证应用权限，确保系统安全

## 核心数据结构

### 1. ActivityRecord
ActivityRecord代表一个Activity实例，包含Activity的所有运行时信息。

```java
public final class ActivityRecord extends ConfigurationContainer {
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
    AppWindowToken appToken;             // 窗口令牌
    int mRotationAnimationHint;          // 旋转动画提示
    
    // 生命周期状态
    ActivityState state;                 // Activity状态
    boolean paused;                      // 是否暂停
    boolean stopped;                     // 是否停止
    boolean destroying;                  // 是否正在销毁
    
    // 配置信息
    Configuration configuration;         // 配置信息
    int displayId;                       // 显示ID
    
    // 关联对象
    TaskRecord task;                     // 所属任务
    ProcessRecord app;                   // 所属进程
    ActivityStack stack;                 // 所属栈
    
    // 历史记录
    ActivityRecord resultTo;             // 结果接收者
    String resultWho;                    // 结果标识
    int requestCode;                     // 请求代码
    
    // 时间信息
    long createTime;                     // 创建时间
    long lastVisibleTime;                // 最后可见时间
    
    // 方法定义
    void startActivityLocked(...);       // 启动Activity
    void finishIfPossible(...);          // 结束Activity
    void pauseKeyDispatchingLocked(...); // 暂停按键分发
    void resumeKeyDispatchingLocked(...);// 恢复按键分发
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

### 3. TaskRecord
TaskRecord代表一个任务，包含一组相关的Activity。

```java
public class TaskRecord extends ConfigurationContainer {
    // 任务标识
    final int taskId;                    // 任务ID
    final String affinity;               // 任务亲和性
    final Intent intent;                 // 根Intent
    final ComponentName realActivity;    // 根Activity
    
    // 栈信息
    ActivityStack stack;                 // 所属栈
    int mStackId;                        // 栈ID
    
    // Activity管理
    final ArrayList<ActivityRecord> mActivities = new ArrayList<>(); // Activity列表
    ActivityRecord rootActivity;         // 根Activity
    ActivityRecord topActivity;          // 顶部Activity
    
    // 配置信息
    int mTaskType;                       // 任务类型
    int mResizeMode;                     // 调整模式
    Rect mBounds;                        // 边界
    
    // 状态信息
    boolean isAvailable;                 // 是否可用
    boolean isSleeping;                  // 是否休眠
    boolean mDeferRemoval;               // 延迟移除
    
    // 时间信息
    long lastActiveTime;                 // 最后活动时间
    
    // 方法定义
    void addActivityToTop(...);          // 添加Activity到顶部
    void removeActivity(...);            // 移除Activity
    ActivityRecord findActivity(...);    // 查找Activity
    void moveToFront(...);               // 移动到前台
}
```

### 4. ActivityStack
ActivityStack管理Activity的栈结构，支持多窗口和分屏模式。

```java
public class ActivityStack extends ConfigurationContainer {
    // 栈标识
    final int mStackId;                  // 栈ID
    final int mDisplayId;                // 显示ID
    
    // 任务管理
    final ArrayList<TaskRecord> mTaskHistory = new ArrayList<>(); // 任务历史
    TaskRecord mPausingActivity;         // 正在暂停的Activity
    TaskRecord mResumedActivity;         // 已恢复的Activity
    
    // 窗口管理
    ActivityStackSupervisor mStackSupervisor; // 栈监督器
    WindowManagerService mWindowManager; // 窗口管理器
    
    // 状态信息
    boolean mLaunchTaskBehind;           // 在后台启动任务
    boolean mStackSupervisor;            // 栈监督器
    
    // 配置信息
    Rect mBounds;                        // 栈边界
    int mRotation;                       // 旋转方向
    
    // 方法定义
    void startActivityLocked(...);       // 启动Activity
    void resumeTopActivityUncheckedLocked(...); // 恢复顶部Activity
    void finishActivityLocked(...);      // 结束Activity
    void moveTaskToFrontLocked(...);     // 移动任务到前台
}
```

### 5. ActivityStackSupervisor
ActivityStackSupervisor管理所有的ActivityStack，协调多栈操作。

```java
public class ActivityStackSupervisor extends ConfigurationContainer {
    // 栈管理
    final ArrayList<ActivityStack> mStacks = new ArrayList<>(); // 栈列表
    ActivityStack mHomeStack;            // Home栈
    ActivityStack mFocusedStack;         // 焦点栈
    
    // 任务管理
    final RecentTasks mRecentTasks;      // 最近任务
    
    // 进程管理
    final ActivityManagerService mService; // AMS服务
    
    // 启动管理
    ActivityRecord mStartingActivity;    // 正在启动的Activity
    ActivityRecord mResumedActivity;     // 已恢复的Activity
    
    // 方法定义
    ActivityStack getStack(...);         // 获取栈
    void setFocusStackUnchecked(...);    // 设置焦点栈
    void moveTasksToFullscreenStack(...); // 移动任务到全屏栈
}
```

## 数据结构关系图

### 核心对象关系
```
ActivityManagerService
    ↓
ActivityStackSupervisor (管理所有栈)
    ↓
ActivityStack (管理任务栈)
    ↓
TaskRecord (管理任务)
    ↓
ActivityRecord (管理Activity)
    ↓
ProcessRecord (管理进程)
```

### 生命周期状态转换
```
Activity状态转换:
CREATED → STARTED → RESUMED → PAUSED → STOPPED → DESTROYED
    ↑        ↓         ↓        ↓        ↓         ↓
    └───────重启───────┘        └──────恢复───────┘

进程状态转换:
PROCESS_STATE_PERSISTENT (持久进程)
PROCESS_STATE_TOP (前台进程)
PROCESS_STATE_FOREGROUND_SERVICE (前台服务)
PROCESS_STATE_SERVICE (服务进程)
PROCESS_STATE_BACKGROUND (后台进程)
PROCESS_STATE_CACHED_ACTIVITY (缓存Activity)
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