# Android WindowManagerService (WMS) 核心知识

## 1. 概述

WindowManagerService（WMS）是Android系统中的核心服务之一，负责管理所有应用程序的窗口显示、布局和输入事件分发。WMS与SurfaceFlinger、InputManagerService（IMS）等系统服务紧密协作，共同完成Android系统的UI显示和用户交互功能。

WMS与ATMS（ActivityTaskManagerService）的关系就像戏剧导演和舞台总监：
- **ATMS**：决定"哪个Activity该上场"（管理Activity生命周期）
- **WMS**：决定"这个Activity该怎么展示"（管理窗口显示和布局）

两者通过Binder机制协同工作，共同确保Android系统的流畅运行。

## 2. 主要数据结构

### 2.1 WindowState
**定义**：WMS中描述一个窗口的核心数据结构，包含窗口的状态和属性
**核心成员变量**：
```java
public class WindowState implements WindowManagerPolicy.WindowState {
    // 指向WMS服务
    final WindowManagerService mService;
    // 指向Session的Binder本地对象，表示窗口所属的应用程序进程
    final Session mSession;
    // 指向实现IWindow接口的Binder代理对象，用于与应用程序进程通信
    final IWindow mClient;
    // 窗口的应用操作类型
    final int mAppOp;
    // 指向WindowToken对象，唯一标识一个窗口
    final WindowToken mToken;
    // 窗口所有者的UID
    final int mOwnerUid;
    // 窗口ID
    final IWindowId.Stub mWindowId;
    // 窗口布局参数
    final WindowManager.LayoutParams mAttrs;
    // 窗口视图的可见性
    int mViewVisibility;
    // 窗口所属的显示内容
    DisplayContent mDisplayContent;
    // 窗口策略
    final WindowManagerPolicy mPolicy;
    // 上下文
    final Context mContext;
    // 窗口的Surface控制对象
    SurfaceControl mSurfaceControl;
    // 窗口动画对象
    final WindowStateAnimator mAnimator;
    // 窗口层级
    int mLayer;
    // 基础层级
    int mBaseLayer;
    // 子层级
    int mSubLayer;
    // 父窗口（对子窗口）
    WindowState mAttachedWindow;
    // 子窗口视图是否嵌入父窗口
    boolean mLayoutAttached;
    // 窗口是否可见
    boolean mVisible;
    // 窗口是否聚焦
    boolean mFocusable;
    // 窗口是否接收输入事件
    boolean mTouchable;
    // 窗口的边框
    final Rect mFrame = new Rect();
    // 窗口的内容边距
    final Rect mContentInsets = new Rect();
    // 窗口的稳定边距
    final Rect mStableInsets = new Rect();
}
```

### 2.2 WindowToken
**定义**：窗口令牌，应用程序向WMS申请创建窗口时需要出示的凭证
**核心成员变量**：
```java
class WindowToken extends WindowContainer<WindowState> {
    // 指向WMS服务
    final WindowManagerService mService;
    // 令牌的Binder对象
    final IBinder token;
    // 窗口类型
    final int windowType;
    // 是否是显式令牌
    final boolean explicit;
    // 令牌是否隐藏
    boolean hidden;
    // 令牌是否有可见窗口
    boolean hasVisible;
    // 令牌是否正在等待显示
    boolean waitingToShow;
    // 令牌是否正在被发送到底部
    boolean sendingToBottom;
}
```

### 2.3 AppWindowToken
**定义**：WindowToken的子类，专门描述应用程序的WindowToken结构
**核心成员变量**：
```java
class AppWindowToken extends WindowToken {
    // 指向ActivityRecord对象
    final ActivityRecord activityRecord;
    // 任务信息
    Task mTask;
    // 应用窗口的动画
    AppWindowAnimator mAppAnimator;
    // 应用窗口的可见性
    boolean mVisibleRequested;
    // 应用窗口是否正在切换
    boolean mChangingConfigurations;
}
```

### 2.4 Session
**定义**：应用程序进程与WMS通信的中间层，每个应用程序进程对应一个Session实例
**核心成员变量**：
```java
class Session extends IWindowSession.Stub implements IBinder.DeathRecipient {
    // 指向WMS服务
    final WindowManagerService mService;
    // 应用程序进程的UID
    final int mUid;
    // 应用程序进程的PID
    final int mPid;
    // 应用程序的包名
    final String mPackageName;
    // 应用程序的WindowManager
    final WindowManagerGlobal mWindowManager;
    // 应用程序的IWindow对象集合
    final ArrayMap<IWindow, WindowState> mWindowMap = new ArrayMap<>();
    // 应用程序的输入通道集合
    final ArrayMap<IBinder, InputChannel> mInputChannels = new ArrayMap<>();
}
```

### 2.5 WindowManagerPolicy (WMP)
**定义**：窗口策略接口，定义窗口管理的通用规范
**核心方法**：
```java
public interface WindowManagerPolicy {
    // 初始化窗口策略
    void init(Context context, WindowManagerService service, WindowManagerPolicy.WindowManagerFuncs windowManagerFuncs);
    // 准备添加窗口
    void prepareAddWindow(WindowState win, WindowManager.LayoutParams attrs);
    // 添加窗口
    void addWindow(WindowState win, WindowManager.LayoutParams attrs);
    // 移除窗口
    void removeWindow(WindowState win);
    // 窗口聚焦改变
    void focusChanged(WindowState win);
    // 窗口可见性改变
    void windowVisibilityChanged(WindowState win, boolean visible);
    // 计算窗口的边框和边距
    void computeFrames(WindowState win, WindowManager.LayoutParams attrs, Rect outFrame, Rect outContentInsets, Rect outStableInsets);
    // 处理输入事件
    long interceptKeyBeforeQueueing(KeyEvent event, int policyFlags);
    // 处理触摸事件
    boolean interceptMotionBeforeQueueingNonInteractive(long whenNanos, int policyFlags);
    // 处理窗口动画
    void animateLayoutLocked(WindowState win, boolean layoutNeeded);
}
```

### 2.6 核心集合
- `mSessions`：ArraySet<Session>类型，保存所有向WMS提出窗口管理服务的客户端Session
- `mWindowMap`：HashMap<IBinder, WindowState>类型，保存WMS中所有窗口
- `mFinishedStarting`：ArrayList<AppWindowToken>类型，保存已完成启动的应用窗口令牌
- `mWindowContainers`：ArrayList<WindowContainer<?>>类型，保存所有窗口容器
- `mDisplayContents`：ArrayList<DisplayContent>类型，保存所有显示内容

### 2.7 TaskFragment（多窗口任务片段）
**定义**：TaskFragment是Activity的容器，支持更灵活的多窗口管理。一个Task可以包含多个TaskFragment，实现分屏、自由窗口等多种显示模式。

**核心成员变量**：
```java
public class TaskFragment extends WindowContainer<WindowContainer> {
    // 关联的顶部Activity
    private ActivityRecord mTopActivity;
    // TaskFragment的边界
    private final Rect mBounds = new Rect();
    // 是否可见
    private boolean mVisible;
    // 所属的Task
    private Task mTask;
    // 组织者接口
    private ITaskFragmentOrganizer mOrganizer;
    // 组织者的令牌
    private final IBinder mOrganizerToken;
    // 是否等待组织者回调
    private boolean mWaitingOnOrganizer;
    // 嵌套等级
    private int mNestingCount;
}
```

### 2.8 TaskFragmentOrganizer
**定义**：管理TaskFragment的生命周期和布局的接口，应用通过实现此接口来控制TaskFragment的行为。

**核心接口方法**：
```java
public interface ITaskFragmentOrganizer extends IInterface {
    // TaskFragment创建回调
    void onTaskFragmentCreated(in TaskFragmentCreationParams params);
    
    // TaskFragment销毁回调
    void onTaskFragmentDestroyed(IBinder taskFragmentToken);
    
    // TaskFragment边界变化回调
    void onTaskFragmentBoundsChanged(IBinder taskFragmentToken, in Rect bounds);
    
    // TaskFragment可见性变化回调
    void onTaskFragmentVisibilityChanged(IBinder taskFragmentToken, boolean visible);
    
    // TaskFragment错误回调
    void onTaskFragmentError(IBinder taskFragmentToken, int errorCode, in Throwable exception);
    
    // TaskFragment大小变化开始
    void onTaskFragmentResizeStart(IBinder taskFragmentToken);
    
    // TaskFragment大小变化结束
    void onTaskFragmentResizeFinish(IBinder taskFragmentToken);
}
```

### 2.9 TaskFragmentInfo
**定义**：描述TaskFragment状态的数据结构，用于在WMS和客户端之间传递信息。

**核心成员变量**：
```java
public final class TaskFragmentInfo implements Parcelable {
    // TaskFragment令牌
    private final IBinder mToken;
    // 对应的Task令牌
    private final IBinder mTaskToken;
    // 边界
    private final Rect mBounds;
    // 顶部Activity信息
    private final ActivityInfo mTopActivityInfo;
    // 是否可见
    private final boolean mVisible;
    // 是否最小化
    private final boolean mMinimized;
    // 是否最大化
    private final boolean mMaximized;
    // 窗口模式
    private final int mWindowingMode;
    // 组织者令牌
    private final IBinder mOrganizerToken;
}
```

### 2.10 DisplayArea（显示区域）
**定义**：显示区域的抽象，用于管理显示器上的不同区域，如状态栏区域、导航栏区域、应用区域等。

**核心成员变量**：
```java
public class DisplayArea<T extends WindowContainer> extends WindowContainer<T> {
    // 显示区域类型
    private final Type mType;
    // 显示区域层级
    private final int mLayer;
    // 是否可见
    private boolean mVisible;
    // 是否可聚焦
    private boolean mFocusable;
    // 边界
    private final Rect mBounds = new Rect();
    // 所属DisplayContent
    private final DisplayContent mDisplayContent;
    
    // 显示区域类型枚举
    public enum Type {
        // 根显示区域
        ROOT,
        // 应用显示区域
        APPLICATION,
        // 系统装饰显示区域（如状态栏、导航栏）
        SYSTEM_DECOR,
        // 分屏显示区域
        SPLIT_SCREEN,
        // 任务栏显示区域
        TASKBAR
    }
}
```

### 2.11 多显示器支持数据结构

**VirtualDisplay（虚拟显示器）**：
```java
public class VirtualDisplay {
    // 显示器ID
    private final int mDisplayId;
    // 显示器名称
    private final String mName;
    // Surface
    private final Surface mSurface;
    // 宽度
    private final int mWidth;
    // 高度
    private final int mHeight;
    // DPI
    private final int mDensityDpi;
    // 标志
    private final int mFlags;
    // 回调
    private final Callback mCallback;
    // 渲染线程
    private final SurfaceControl mSurfaceControl;
}
```

**FreeformWindow（自由窗口）**：
```java
public class FreeformWindowParams {
    // 窗口边界
    private final Rect mBounds;
    // 窗口标题
    private final String mTitle;
    // 窗口图标
    private final Bitmap mIcon;
    // 是否可调整大小
    private final boolean mResizable;
    // 最小尺寸
    private final int mMinWidth;
    private final int mMinHeight;
    // 最大尺寸
    private final int mMaxWidth;
    private final int mMaxHeight;
    // 窗口装饰类型
    private final int mDecorType;
}