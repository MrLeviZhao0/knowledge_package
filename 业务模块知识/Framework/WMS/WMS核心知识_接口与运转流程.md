# Android WindowManagerService (WMS) 核心知识

## 5. 对外提供的接口

### 5.1 IWindowSession
**定义**：客户端向WMS请求窗口操作的中间代理，进程唯一
**主要方法**：
```java
public interface IWindowSession extends IInterface {
    // 添加窗口
    int add(IWindow window, int seq, WindowManager.LayoutParams attrs, int viewVisibility, Rect outContentInsets, InputChannel outInputChannel) throws RemoteException;
    // 移除窗口
    void remove(IWindow window) throws RemoteException;
    // 重新布局窗口
    int relayout(IWindow window, int seq, WindowManager.LayoutParams attrs, int requestedWidth, int requestedHeight, int viewVisibility, int flags, Rect outFrame, Rect outContentInsets, Rect outVisibleInsets, Configuration outConfig, Surface outSurface) throws RemoteException;
    // 移动窗口
    void move(IWindow window, int seq, WindowManager.LayoutParams attrs, Rect outContentInsets) throws RemoteException;
    // 窗口聚焦改变
    void focusChanged(IWindow window, boolean focused) throws RemoteException;
    // 窗口可见性改变
    void windowVisibilityChanged(IWindow window, boolean visible) throws RemoteException;
    // 窗口动画开始
    void startAnimation(IWindow window, Animation animation, boolean scale) throws RemoteException;
    // 窗口动画结束
    void finishAnimation(IWindow window) throws RemoteException;
}
```

### 5.2 IWindow
**定义**：应用程序进程实现的接口，用于WMS回调
**主要方法**：
```java
public interface IWindow extends IInterface {
    // 窗口大小改变通知
    void resized(Rect frame, Rect overscanInsets, Rect contentInsets, Rect visibleInsets, DisplayCutout.ParcelableWrapper cutout, Configuration newConfig, Rect stableInsets) throws RemoteException;
    // 应用可见性改变通知
    void dispatchAppVisibility(boolean visible) throws RemoteException;
    // 窗口可见性改变通知
    void dispatchWindowVisibility(boolean visible) throws RemoteException;
    // 新Surface分配通知
    void dispatchGetNewSurface(Surface surface) throws RemoteException;
    // 输入通道更新通知
    void dispatchInputChannelChanged(InputChannel inputChannel) throws RemoteException;
    // 窗口聚焦改变通知
    void windowFocusChanged(boolean hasFocus, boolean inTouchMode) throws RemoteException;
    // 窗口局部聚焦改变通知
    void windowLocalFocusChanged(boolean hasLocalFocus) throws RemoteException;
    // 配置改变通知
    void dispatchConfigurationChanged(Configuration newConfig) throws RemoteException;
    // 显示信息改变通知
    void dispatchDisplayChanged(int displayId) throws RemoteException;
}
```

### 5.3 WindowManager.LayoutParams
**定义**：窗口布局参数，包含窗口的位置、大小、类型、flags等
**主要参数**：
- **type**：窗口类型，如TYPE_APPLICATION、TYPE_SYSTEM_ALERT等
- **flags**：窗口标志，如FLAG_FULLSCREEN、FLAG_NOT_TOUCHABLE等
- **gravity**：窗口重力，如GRAVITY_TOP、GRAVITY_CENTER等
- **width/height**：窗口宽度和高度
- **x/y**：窗口左上角坐标
- **format**：窗口像素格式
- **alpha**：窗口透明度
- **token**：窗口令牌

### 5.4 窗口添加流程详解
**应用端流程**：
```java
// WindowManagerImpl.java
@Override
public void addView(View view, ViewGroup.LayoutParams params) {
    applyDefaultToken(params);
    mGlobal.addView(view, params, mDisplay, mParentWindow);
}

// WindowManagerGlobal.java
public void addView(View view, ViewGroup.LayoutParams params, 
                   Display display, Window parentWindow) {
    // 创建ViewRootImpl
    root = new ViewRootImpl(view.getContext(), display);

    // 添加到视图列表
    mViews.add(view);
    mRoots.add(root);
    mParams.add(params);

    // 设置视图
    root.setView(view, params, panelParentView);
}
```

**WMS端流程**：
```java
// WindowManagerService.java
public int addWindow(Session session, IWindow client, int seq,
                    WindowManager.LayoutParams attrs, ...) {
    // 1. 检查权限
    int res = mPolicy.checkAddPermission(attrs, appOp);

    // 2. 获取或创建WindowToken
    WindowToken token = displayContent.getWindowToken(...);
    if (token == null) {
        token = new WindowToken(...);
    }

    // 3. 创建WindowState
    final WindowState win = new WindowState(this, session, client, 
                                          token, parentWindow, ...);

    // 4. 添加到窗口管理结构
    win.attach();
    mWindowMap.put(client.asBinder(), win);

    return res;
}
```

### 5.5 Surface分配流程
每个窗口都需要一个Surface来绘制内容，Surface的分配过程如下：
```java
// WindowState.java
void openInputChannel(InputChannel outInputChannel) {
    // 创建输入通道
    InputChannel[] inputChannels = InputChannel.openInputChannelPair(name);
    mInputChannel = inputChannels[0];  // 服务端
    mClientChannel = inputChannels[1]; // 客户端

    // 注册到InputManager
    mService.mInputManager.registerInputChannel(mInputChannel, mInputWindowHandle);
}
```

### 5.6 WMS与SurfaceFlinger的协作
WMS负责窗口管理，而实际的图形渲染由SurfaceFlinger完成。两者之间的关系可以理解为：
- **WMS**：决定窗口的位置、大小、层级
- **SurfaceFlinger**：将窗口内容（Surface）合成并显示到屏幕

这种设计体现了关注点分离的原则，WMS专注于窗口逻辑管理，SurfaceFlinger专注于图形渲染。

### 5.7 adb指令
**adb shell wm系列指令**：
```bash
# 查看wm指令帮助
adb shell wm help

# 查看显示尺寸
adb shell wm size

# 设置显示尺寸
adb shell wm size 1080x1920

# 重置显示尺寸
adb shell wm size reset

# 查看显示密度
adb shell wm density

# 设置显示密度
adb shell wm density 480

# 重置显示密度
adb shell wm density reset

# 查看显示裁剪
adb shell wm overscan

# 设置显示裁剪
adb shell wm overscan 0,0,0,100

# 重置显示裁剪
adb shell wm overscan reset
```

**adb shell dumpsys window系列指令**：
```bash
# 查看窗口管理器状态
adb shell dumpsys window

# 查看窗口信息
adb shell dumpsys window windows

# 查看特定窗口信息
adb shell dumpsys window windows | grep -E 'mCurrentFocus|mFocusedApp'

# 查看显示内容
adb shell dumpsys window displays

# 查看输入窗口
adb shell dumpsys window input

# 查看动画
adb shell dumpsys window animator

# 查看会话
adb shell dumpsys window sessions
```

## 5. 对内主要运转流程

### 5.1 WMS启动流程
**伪代码**：
```java
public static WindowManagerService main(Context context, InputManagerService im, boolean showBootMsgs, boolean onlyCore, WindowManagerPolicy policy, ActivityTaskManagerService atm) {
    // 创建DisplayThread线程
    DisplayThread.getHandler().runWithScissors(() -> {
        // 创建WMS实例
        sInstance = new WindowManagerService(context, im, showBootMsgs, onlyCore, policy, atm);
    }, 0);
    return sInstance;
}

public WindowManagerService(Context context, InputManagerService inputManager, boolean showBootMsgs, boolean onlyCore, WindowManagerPolicy policy, ActivityTaskManagerService atm) {
    // 初始化上下文
    mContext = context;
    mAtmService = atm;
    mInputManager = inputManager;
    // 初始化策略
    mPolicy = policy;
    // 初始化显示内容
    mDisplayContents = new ArrayList<>();
    // 初始化会话集合
    mSessions = new ArraySet<>();
    // 初始化窗口映射
    mWindowMap = new WindowHashMap();
    // 初始化窗口放置器
    mWindowPlacerLocked = new WindowSurfacePlacer(this);
    // 初始化窗口动画器
    mAnimator = new WindowAnimator(this);
    // 注册显示监听器
    registerDisplayListener();
    // 初始化输入监视器
    mInputMonitor = new InputMonitor(this);
}
```

### 5.2 窗口添加流程
**伪代码**：
```java
// 客户端流程
public void addView(View view, ViewGroup.LayoutParams params) {
    // 检查参数
    if (view == null) {
        throw new IllegalArgumentException("view must not be null");
    }
    if (params == null) {
        throw new IllegalArgumentException("params must not be null");
    }
    // 创建ViewRootImpl实例
    ViewRootImpl root = new ViewRootImpl(view.getContext(), display);
    // 设置视图和布局参数
    root.setView(view, wparams, panelParentView);
}

// ViewRootImpl流程
public void setView(View view, WindowManager.LayoutParams attrs, View panelParentView) {
    synchronized (this) {
        // 检查是否已经设置过视图
        if (mView == null) {
            // 设置视图
            mView = view;
            // 设置布局参数
            mWindowAttributes.copyFrom(attrs);
            // 创建输入通道
            InputChannel inputChannel = null;
            if ((mWindowAttributes.inputFeatures & WindowManager.LayoutParams.INPUT_FEATURE_NO_INPUT_CHANNEL) == 0) {
                inputChannel = new InputChannel();
            }
            // 通过IWindowSession向WMS发送addWindow请求
            res = mWindowSession.add(mWindow, mSeq, mWindowAttributes, getHostVisibility(), mDisplay.getDisplayId(), mAttachInfo.mContentInsets, mInputChannel);
            // 处理结果
            if (res < WindowManagerGlobal.ADD_OKAY) {
                // 处理错误
                switch (res) {
                    case WindowManagerGlobal.ADD_BAD_APP_TOKEN:
                    case WindowManagerGlobal.ADD_BAD_SUBWINDOW_TOKEN:
                        throw new WindowManager.BadTokenException("Unable to add window " + mWindow + " -- token " + attrs.token + " is not valid; is your activity running?");
                    case WindowManagerGlobal.ADD_NOT_APP_TOKEN:
                        throw new WindowManager.BadTokenException("Unable to add window " + mWindow + " -- not for application");
                    // 其他错误处理
                }
            }
            // 处理输入通道
            if (mInputChannel != null) {
                mInputEventReceiver = new WindowInputEventReceiver(mInputChannel, Looper.myLooper());
            }
        }
    }
}

// WMS流程
public int addWindow(Session session, IWindow client, int seq, WindowManager.LayoutParams attrs, int viewVisibility, int displayId, Rect outFrame, Rect outContentInsets, Rect outStableInsets, DisplayCutout.ParcelableWrapper outDisplayCutout, InputChannel outInputChannel, InsetsState outInsetsState, InsetsSourceControl[] outActiveControls) {
    synchronized (mGlobalLock) {
        // 检查参数
        if (client == null) {
            throw new IllegalArgumentException("client must not be null");
        }
        if (attrs == null) {
            throw new IllegalArgumentException("attrs must not be null");
        }
        // 检查权限
        if (!checkAddPermission(attrs, session.mUid, session.mPackageName)) {
            throw new SecurityException("Permission denied for window type " + attrs.type);
        }
        // 查找或创建DisplayContent
        DisplayContent displayContent = getDisplayContentOrCreate(displayId);
        // 查找或创建WindowToken
        WindowToken token = displayContent.getWindowToken(attrs.token);
        if (token == null) {
            // 创建WindowToken
            token = new WindowToken(this, attrs.token, attrs.type, false /* explicit */, displayContent, session.mUid);
            displayContent.addWindowToken(token);
        }
        // 创建WindowState对象
        WindowState win = new WindowState(this, session, client, token, viewVisibility, displayContent);
        // 设置窗口布局参数
        win.mAttrs.copyFrom(attrs);
        // 准备添加窗口
        mPolicy.prepareAddWindow(win, attrs);
        // 添加窗口到映射
        mWindowMap.put(client.asBinder(), win);
        // 添加窗口到Token
        token.addWindow(win);
        // 创建输入通道
        if (outInputChannel != null && (attrs.inputFeatures & WindowManager.LayoutParams.INPUT_FEATURE_NO_INPUT_CHANNEL) == 0) {
            String name = win.makeInputChannelName();
            InputChannel[] inputChannels = InputChannel.openInputChannelPair(name);
            win.mInputChannel = inputChannels[0];
            inputChannels[1].transferTo(outInputChannel);
            mInputManager.registerInputChannel(win.mInputChannel, win.mInputWindowHandle);
        }
        // 计算窗口布局
        displayContent.getDisplayPolicy().adjustWindowParamsForType(win.mAttrs, win.mOwnerUid);
        // 分配窗口层级
        assignLayersLocked(displayContent.getWindowList());
        // 更新输入窗口
        mInputMonitor.setInputFocusLw(win, false /* updateInputWindows */);
        // 执行窗口布局
        mWindowPlacerLocked.performSurfacePlacement();
        // 返回结果
        return WindowManagerGlobal.ADD_OKAY;
    }
}
```

### 5.3 窗口布局流程
**伪代码**：
```java
// WMS窗口布局流程
void performLayoutAndPlaceSurfacesLockedInner(boolean recoveringMemory) {
    // 遍历所有显示内容
    for (int i = 0; i < mDisplayContents.size(); i++) {
        DisplayContent displayContent = mDisplayContents.get(i);
        // 执行显示内容的布局
        displayContent.performLayout(recoveringMemory);
    }
}

// DisplayContent窗口布局流程
void performLayout(boolean recoveringMemory) {
    // 遍历所有窗口
    for (int i = 0; i < getWindowList().size(); i++) {
        WindowState win = getWindowList().get(i);
        // 检查窗口是否需要布局
        if (win.mLayoutNeeded || recoveringMemory) {
            // 计算窗口边框
            computeFrames(win);
            // 计算窗口内容边距
            computeInsets(win);
            // 标记窗口布局完成
            win.mLayoutNeeded = false;
        }
    }
    // 执行窗口放置
    performSurfacePlacement();
}

// 计算窗口边框
void computeFrames(WindowState win) {
    // 获取窗口布局参数
    WindowManager.LayoutParams attrs = win.mAttrs;
    // 获取显示尺寸
    DisplayInfo displayInfo = getDisplayInfo();
    int displayWidth = displayInfo.logicalWidth;
    int displayHeight = displayInfo.logicalHeight;
    // 计算窗口边框
    Rect frame = win.mFrame;
    if (attrs.width == WindowManager.LayoutParams.MATCH_PARENT) {
        frame.width() = displayWidth - attrs.x * 2;
    } else if (attrs.width == WindowManager.LayoutParams.WRAP_CONTENT) {
        // 计算内容宽度
        frame.width() = computeContentWidth(win);
    } else {
        frame.width() = attrs.width;
    }
    if (attrs.height == WindowManager.LayoutParams.MATCH_PARENT) {
        frame.height() = displayHeight - attrs.y * 2;
    } else if (attrs.height == WindowManager.LayoutParams.WRAP_CONTENT) {
        // 计算内容高度
        frame.height() = computeContentHeight(win);
    } else {
        frame.height() = attrs.height;
    }
    // 应用重力
    applyGravity(frame, attrs.gravity, displayWidth, displayHeight);
}
```

### 5.4 输入事件分发流程
**伪代码**：
```java
// IMS输入事件分发流程
void dispatchInputEvent(InputEvent event) {
    // 查找目标窗口
    WindowState targetWindow = findTargetWindow(event);
    if (targetWindow != null) {
        // 获取输入通道
        InputChannel inputChannel = targetWindow.mInputChannel;
        if (inputChannel != null) {
            // 分发输入事件到目标窗口
            inputChannel.sendInputEvent(event);
        }
    }
}

// WMS查找目标窗口流程
WindowState findTargetWindow(InputEvent event) {
    // 获取事件坐标
    float x = event.getX();
    float y = event.getY();
    // 遍历所有窗口，从顶层到底层
    for (int i = getWindowList().size() - 1; i >= 0; i--) {
        WindowState win = getWindowList().get(i);
        // 检查窗口是否可见
        if (!win.mVisible) {
            continue;
        }
        // 检查窗口是否可触摸
        if ((win.mAttrs.flags & WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE) != 0) {
            continue;
        }
        // 检查事件坐标是否在窗口内
        if (win.mFrame.contains((int) x, (int) y)) {
            // 检查窗口是否接收触摸事件
            if ((win.mAttrs.flags & WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL) != 0) {
                // 非触摸模态窗口，检查事件是否在窗口内
                if (win.mTouchableRegion.contains((int) x, (int) y)) {
                    return win;
                }
            } else {
                // 触摸模态窗口，直接返回
                return win;
            }
        }
    }
    // 没有找到目标窗口，返回null
    return null;
}

// 应用进程输入事件处理流程
public class WindowInputEventReceiver extends InputEventReceiver {
    public WindowInputEventReceiver(InputChannel inputChannel, Looper looper) {
        super(inputChannel, looper);
    }
    @Override
    public void onInputEvent(InputEvent event) {
        // 处理输入事件
        enqueueInputEvent(event, this, 0, true);
    }
    @Override
    public void onBatchedInputEventPending() {
        // 处理批量输入事件
        scheduleConsumeBatchedInput();
    }
}
```

### 5.5 窗口动画流程
**伪代码**：
```java
// WMS窗口动画流程
void animateLocked(long frameTimeNs) {
    // 遍历所有显示内容
    for (int i = 0; i < mDisplayContents.size(); i++) {
        DisplayContent displayContent = mDisplayContents.get(i);
        // 执行显示内容的动画
        displayContent.mAnimator.animate(frameTimeNs);
    }
}

// WindowAnimator窗口动画流程
void animate(long frameTimeNs) {
    // 遍历所有窗口动画器
    for (int i = mAnimatingWindows.size() - 1; i >= 0; i--) {
        WindowStateAnimator winAnimator = mAnimatingWindows.get(i);
        // 执行窗口动画
        winAnimator.stepAnimation(frameTimeNs);
        // 检查动画是否完成
        if (winAnimator.isAnimationFinished()) {
            // 移除完成的动画
            mAnimatingWindows.remove(i);
            // 标记窗口动画完成
            winAnimator.mWin.mAppToken.mAppAnimator.clearAnimatingLayers();
        }
    }
}

// WindowStateAnimator窗口动画流程
void stepAnimation(long frameTimeNs) {
    // 检查是否有动画
    if (mAnimation == null) {
        return;
    }
    // 计算动画进度
    float fraction = mAnimation.getTransformation(frameTimeNs, mTransformation);
    // 应用动画变换
    applyTransformation(mTransformation);
    // 检查动画是否完成
    if (fraction >= 1.0f) {
        // 动画完成
        mAnimation = null;
        mTransformation.clear();
        // 通知窗口动画完成
        try {
            mWin.mClient.finishAnimation();
        } catch (RemoteException e) {
            // 处理异常
        }
    }
}
```