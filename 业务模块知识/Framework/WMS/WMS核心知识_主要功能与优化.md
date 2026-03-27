# Android WindowManagerService (WMS) 核心知识

## 6. 涉及的主要功能

### 6.1 窗口管理
**功能描述**：负责窗口的创建、添加、移除、更新等操作
**核心调用栈**：
```
// 窗口添加
WindowManager.addView()
└── WindowManagerImpl.addView()
    └── WindowManagerGlobal.addView()
        └── ViewRootImpl.setView()
            └── IWindowSession.add()
                └── Session.add()
                    └── WindowManagerService.addWindow()

// 窗口移除
WindowManager.removeView()
└── WindowManagerImpl.removeView()
    └── WindowManagerGlobal.removeView()
        └── ViewRootImpl.dispatchDetachedFromWindow()
            └── IWindowSession.remove()
                └── Session.remove()
                    └── WindowManagerService.removeWindow()

// 窗口更新
WindowManager.updateViewLayout()
└── WindowManagerImpl.updateViewLayout()
    └── WindowManagerGlobal.updateViewLayout()
        └── ViewRootImpl.setLayoutParams()
            └── ViewRootImpl.scheduleTraversals()
                └── ViewRootImpl.performTraversals()
                    └── IWindowSession.relayout()
                        └── Session.relayout()
                            └── WindowManagerService.relayoutWindow()
```
**伪代码**：
```java
// 窗口添加
public int addWindow(Session session, IWindow client, int seq, WindowManager.LayoutParams attrs, int viewVisibility, int displayId, Rect outFrame, Rect outContentInsets, Rect outStableInsets, DisplayCutout.ParcelableWrapper outDisplayCutout, InputChannel outInputChannel, InsetsState outInsetsState, InsetsSourceControl[] outActiveControls) {
    // 权限检查
    // 创建WindowState对象
    // 添加到mWindowMap
    // 添加到WindowToken
    // 创建InputChannel
    // 分配Layer
    // 执行布局
    return WindowManagerGlobal.ADD_OKAY;
}

// 窗口移除
public void removeWindow(Session session, IWindow client) {
    // 从mWindowMap中移除
    // 从WindowToken中移除
    // 销毁InputChannel
    // 执行布局
}

// 窗口更新
public int relayoutWindow(Session session, IWindow client, WindowManager.LayoutParams attrs, int requestedWidth, int requestedHeight, int viewVisibility, int flags, Rect outFrame, Rect outContentInsets, Rect outStableInsets, DisplayCutout.ParcelableWrapper outDisplayCutout, InputChannel outInputChannel, InsetsState outInsetsState, InsetsSourceControl[] outActiveControls) {
    // 更新WindowState属性
    // 重新计算布局
    // 创建或更新Surface
    // 返回结果
    return WindowManagerGlobal.RELAYOUT_RES_FIRST_TIME;
}
```

### 6.2 布局管理
**功能描述**：负责计算窗口的位置、大小、边距等布局参数
**核心调用栈**：
```
WindowManagerService.performLayoutAndPlaceSurfacesLockedInner()
└── DisplayContent.performLayout()
    └── WindowState.computeFrames()
    └── WindowState.computeInsets()
└── DisplayContent.performSurfacePlacement()
    └── WindowSurfacePlacer.performSurfacePlacement()
        └── WindowSurfacePlacer.performSurfacePlacementInner()
            └── WindowStateAnimator.createSurfaceControl()
            └── WindowState.setSurfaceControl()
            └── SurfaceControl.setPosition()
            └── SurfaceControl.setSize()
```
**伪代码**：
```java
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

// 计算窗口内容边距
void computeInsets(WindowState win) {
    // 获取显示策略
    DisplayPolicy displayPolicy = getDisplayPolicy();
    // 计算内容边距
    Rect contentInsets = win.mContentInsets;
    displayPolicy.computeContentInsets(win, contentInsets);
    // 计算稳定边距
    Rect stableInsets = win.mStableInsets;
    displayPolicy.computeStableInsets(win, stableInsets);
}
```

### 6.3 动画管理
**功能描述**：负责窗口的进入、退出、切换等动画效果
**核心调用栈**：
```
// 窗口动画开始
WindowManager.startAnimation()
└── WindowManagerImpl.startAnimation()
    └── WindowManagerGlobal.startAnimation()
        └── ViewRootImpl.startAnimation()
            └── IWindowSession.startAnimation()
                └── Session.startAnimation()
                    └── WindowManagerService.startAnimation()
                        └── WindowState.startAnimation()
                            └── WindowStateAnimator.startAnimation()

// 窗口动画执行
Choreographer.doFrame()
└── WindowManagerService.animate()
    └── WindowAnimator.animate()
        └── WindowStateAnimator.stepAnimation()

// 窗口动画结束
WindowManager.finishAnimation()
└── WindowManagerImpl.finishAnimation()
    └── WindowManagerGlobal.finishAnimation()
        └── ViewRootImpl.finishAnimation()
            └── IWindowSession.finishAnimation()
                └── Session.finishAnimation()
                    └── WindowManagerService.finishAnimation()
                        └── WindowState.finishAnimation()
                            └── WindowStateAnimator.finishAnimation()
```
**伪代码**：
```java
// 开始窗口动画
public void startAnimation(IWindow client, Animation animation, boolean scale) {
    // 获取WindowState对象
    WindowState win = mWindowMap.get(client.asBinder());
    if (win == null) {
        return;
    }
    // 设置动画
    win.mAnimator.setAnimation(animation, scale);
    // 标记窗口需要布局
    win.mLayoutNeeded = true;
    // 执行窗口布局
    mWindowPlacerLocked.performSurfacePlacement();
}

// 执行窗口动画
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

// 结束窗口动画
public void finishAnimation(IWindow client) {
    // 获取WindowState对象
    WindowState win = mWindowMap.get(client.asBinder());
    if (win == null) {
        return;
    }
    // 取消动画
    win.mAnimator.cancelAnimation();
    // 标记窗口需要布局
    win.mLayoutNeeded = true;
    // 执行窗口布局
    mWindowPlacerLocked.performSurfacePlacement();
}
```

### 6.4 输入事件分发
**功能描述**：负责将输入事件分发给合适的窗口处理
**核心调用栈**：
```
InputManagerService.dispatchInputEvent()
└── InputDispatcher.dispatchEvent()
    └── InputDispatcher.findFocusedWindow()
    └── InputDispatcher.findTouchedWindow()
    └── InputDispatcher.dispatchEventToWindow()
        └── InputChannel.sendInputEvent()
            └── WindowInputEventReceiver.onInputEvent()
                └── ViewRootImpl.enqueueInputEvent()
                    └── ViewRootImpl.doProcessInputEvents()
                        └── ViewRootImpl.dispatchInputEvent()
                            └── View.dispatchKeyEvent()
                            └── View.dispatchTouchEvent()
```
**伪代码**：
```java
// 查找目标窗口
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

// 分发输入事件
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
```

### 6.5 窗口策略
**功能描述**：负责定义窗口的行为规则，如窗口类型、层级、输入处理等
**核心调用栈**：
```
PhoneWindowManager.init()
└── WindowManagerPolicy.init()
PhoneWindowManager.prepareAddWindow()
└── WindowManagerPolicy.prepareAddWindow()
PhoneWindowManager.addWindow()
└── WindowManagerPolicy.addWindow()
PhoneWindowManager.removeWindow()
└── WindowManagerPolicy.removeWindow()
PhoneWindowManager.interceptKeyBeforeQueueing()
└── WindowManagerPolicy.interceptKeyBeforeQueueing()
PhoneWindowManager.interceptMotionBeforeQueueingNonInteractive()
└── WindowManagerPolicy.interceptMotionBeforeQueueingNonInteractive()
```
**伪代码**：
```java
// 初始化窗口策略
public void init(Context context, WindowManagerService service, WindowManagerPolicy.WindowManagerFuncs windowManagerFuncs) {
    // 初始化上下文
    mContext = context;
    // 初始化WMS服务
    mService = service;
    // 初始化WindowManagerFuncs
    mWindowManagerFuncs = windowManagerFuncs;
    // 初始化配置
    mConfig = new Configuration();
    // 初始化显示信息
    mDisplayInfo = new DisplayInfo();
    // 初始化按键映射
    initKeyMappings();
    // 初始化触摸事件处理
    initTouchEventHandling();
    // 初始化窗口类型策略
    initWindowTypePolicy();
}

// 准备添加窗口
public void prepareAddWindow(WindowState win, WindowManager.LayoutParams attrs) {
    // 检查窗口类型
    switch (attrs.type) {
        case WindowManager.LayoutParams.TYPE_APPLICATION:
            // 应用程序窗口处理
            break;
        case WindowManager.LayoutParams.TYPE_SYSTEM_ALERT:
            // 系统警告窗口处理
            break;
        case WindowManager.LayoutParams.TYPE_INPUT_METHOD:
            // 输入法窗口处理
            break;
        // 其他窗口类型处理
    }
    // 检查窗口标志
    if ((attrs.flags & WindowManager.LayoutParams.FLAG_FULLSCREEN) != 0) {
        // 全屏窗口处理
    }
    // 检查窗口重力
    if (attrs.gravity == Gravity.TOP) {
        // 顶部窗口处理
    }
}

// 拦截按键事件
public long interceptKeyBeforeQueueing(KeyEvent event, int policyFlags) {
    // 检查按键类型
    switch (event.getKeyCode()) {
        case KeyEvent.KEYCODE_HOME:
            // 主页按键处理
            return FLAG_WAKE_DROPPED;
        case KeyEvent.KEYCODE_BACK:
            // 返回按键处理
            return FLAG_WAKE_DROPPED;
        case KeyEvent.KEYCODE_POWER:
            // 电源按键处理
            return FLAG_WAKE_DROPPED;
        // 其他按键处理
    }
    // 默认处理
    return 0;
}
```

## 7. 性能优化

### 7.1 窗口布局优化
**优化策略**：
- 减少窗口布局计算次数
- 优化窗口层级结构
- 使用硬件加速

**实现方法**：
```java
// 减少布局计算次数
void performLayout(boolean force) {
    if (!force && !mLayoutNeeded) {
        return;
    }
    // 执行布局计算
    // 标记布局完成
    mLayoutNeeded = false;
}

// 优化窗口层级
void assignLayersLocked(List<WindowState> windows) {
    // 按窗口类型分配基础层级
    for (int i = 0; i < windows.size(); i++) {
        WindowState win = windows.get(i);
        int baseLayer = mPolicy.getWindowLayerFromTypeLw(win.mAttrs.type, false);
        win.mBaseLayer = baseLayer;
        win.mSubLayer = getSubLayerForWindow(win);
    }
    // 按层级排序窗口
    Collections.sort(windows, mLayoutComparator);
}
```

### 7.2 窗口动画优化
**优化策略**：
- 使用硬件加速动画
- 减少动画复杂度
- 优化动画帧率

**实现方法**：
```java
// 使用硬件加速动画
void startAnimation(Animation animation) {
    // 检查动画是否支持硬件加速
    if (animation instanceof HardwareAcceleratedAnimation) {
        // 使用硬件加速动画
        mHardwareAccelerated = true;
    } else {
        // 使用软件动画
        mHardwareAccelerated = false;
    }
    // 设置动画
    mAnimation = animation;
}

// 优化动画帧率
void stepAnimation(long frameTimeNs) {
    // 计算动画进度
    float fraction = mAnimation.getTransformation(frameTimeNs, mTransformation);
    // 应用动画变换
    applyTransformation(mTransformation);
    // 检查是否需要重绘
    if (mHardwareAccelerated) {
        // 硬件加速动画不需要重绘
    } else {
        // 软件动画需要重绘
        invalidate();
    }
}
```

### 7.3 输入事件优化
**优化策略**：
- 减少输入事件处理延迟
- 优化输入事件分发算法
- 使用异步输入事件处理

**实现方法**：
```java
// 减少输入事件处理延迟
void dispatchInputEvent(InputEvent event) {
    // 异步处理输入事件
    mHandler.post(() -> {
        // 处理输入事件
        processInputEvent(event);
    });
}

// 优化输入事件分发算法
WindowState findTargetWindow(InputEvent event) {
    // 使用空间划分算法快速查找目标窗口
    SpatialIndex<WindowState> spatialIndex = getSpatialIndex();
    return spatialIndex.findClosest(event.getX(), event.getY());
}
```

## 7. 多窗口管理

### 7.1 TaskFragment管理

#### 7.1.1 TaskFragment创建与布局
TaskFragment支持灵活的多窗口任务片段管理，允许将一个Task分割成多个显示区域。

```java
// TaskFragment控制器
public class TaskFragmentController {
    private final WindowManagerService mService;
    private final ITaskFragmentOrganizer mOrganizer;
    
    // 创建TaskFragment
    public void createTaskFragment(Task task, Rect bounds) {
        // 1. 创建TaskFragment实例
        TaskFragment fragment = new TaskFragment(task);
        fragment.setBounds(bounds);
        fragment.setOrganizer(mOrganizer);
        
        // 2. 添加到Task
        task.addChild(fragment, POSITION_TOP);
        
        // 3. 触发布局计算
        task.layoutNeeded = true;
        
        // 4. 通知组织者
        notifyTaskFragmentCreated(fragment);
    }
    
    // 分割Task为多个TaskFragment
    public void splitTask(Task task, Rect[] boundsArray) {
        for (Rect bounds : boundsArray) {
            createTaskFragment(task, bounds);
        }
        
        // 执行布局
        mService.mWindowPlacerLocked.performSurfacePlacement();
    }
    
    // 调整TaskFragment大小
    public void resizeTaskFragment(TaskFragment fragment, Rect newBounds) {
        fragment.setBounds(newBounds);
        
        // 触发动画过渡
        animateTaskFragmentBounds(fragment, newBounds);
        
        // 通知组织者
        notifyTaskFragmentBoundsChanged(fragment, newBounds);
    }
    
    // 处理TaskFragment中的Activity分配
    public void assignActivityToFragment(
        ActivityRecord activity,
        TaskFragment fragment
    ) {
        // 将Activity分配到指定TaskFragment
        activity.reparent(fragment);
        fragment.addActivity(activity);
        
        // 更新可见性
        updateFragmentVisibility(fragment);
    }
}
```

#### 7.1.2 TaskFragment可见性管理

```java
// TaskFragment可见性管理
public class TaskFragmentVisibilityController {
    // 更新TaskFragment可见性
    public void updateVisibility(TaskFragment fragment) {
        // 检查是否有可见Activity
        boolean hasVisibleActivity = hasVisibleActivities(fragment);
        
        // 检查边界是否有效
        boolean hasValidBounds = isValidBounds(fragment.getBounds());
        
        // 设置可见性
        boolean shouldBeVisible = hasVisibleActivity && hasValidBounds;
        
        if (fragment.isVisible() != shouldBeVisible) {
            fragment.setVisible(shouldBeVisible);
            
            // 通知组织者
            notifyVisibilityChanged(fragment, shouldBeVisible);
        }
    }
    
    // 处理TaskFragment遮挡关系
    public void handleOcclusion(TaskFragment[] fragments) {
        // 按Z序排序
        sortByZOrder(fragments);
        
        Region occludedRegion = new Region();
        
        for (TaskFragment fragment : fragments) {
            if (fragment.isVisible()) {
                // 计算可见区域（扣除遮挡部分）
                Region visibleRegion = new Region(fragment.getBounds());
                visibleRegion.op(occludedRegion, Region.Op.DIFFERENCE);
                
                fragment.setVisibleRegion(visibleRegion);
                
                // 更新遮挡区域
                if (!fragment.isTranslucent()) {
                    occludedRegion.op(fragment.getBounds(), Region.Op.UNION);
                }
            }
        }
    }
}
```

### 7.2 自由窗口模式

#### 7.2.1 自由窗口创建与管理

```java
// 自由窗口管理
public class FreeformWindowManager {
    private final WindowManagerService mService;
    
    // 创建自由窗口
    public WindowState createFreeformWindow(
        ActivityRecord activity,
        Rect bounds
    ) {
        // 1. 创建WindowState
        WindowState ws = new WindowState(mService, activity);
        ws.setBounds(bounds);
        ws.setWindowingMode(WINDOWING_MODE_FREEFORM);
        
        // 2. 设置窗口装饰
        enableWindowDecorations(ws);
        
        // 3. 配置自由窗口参数
        FreeformWindowParams params = new FreeformWindowParams();
        params.setBounds(bounds);
        params.setResizable(true);
        params.setDecorType(DECOR_TYPE_FREEFORM);
        
        // 4. 添加到DisplayArea
        DisplayArea freeformArea = getFreeformDisplayArea();
        freeformArea.addChild(ws);
        
        return ws;
    }
    
    // 窗口拖拽处理
    public void handleWindowDrag(WindowState ws, int deltaX, int deltaY) {
        Rect bounds = new Rect(ws.getBounds());
        bounds.offset(deltaX, deltaY);
        
        // 限制在屏幕范围内
        constrainToBounds(bounds);
        
        // 更新窗口位置
        ws.setBounds(bounds);
        
        // 触发布局
        mService.mWindowPlacerLocked.performSurfacePlacement();
    }
    
    // 窗口调整大小
    public void handleWindowResize(
        WindowState ws,
        int newWidth,
        int newHeight
    ) {
        // 检查最小/最大尺寸限制
        int width = Math.max(ws.getMinWidth(), newWidth);
        int height = Math.max(ws.getMinHeight(), newHeight);
        
        Rect bounds = new Rect(ws.getBounds());
        bounds.right = bounds.left + width;
        bounds.bottom = bounds.top + height;
        
        // 更新窗口大小
        ws.setBounds(bounds);
        
        // 触发重新布局
        mService.mWindowPlacerLocked.performSurfacePlacement();
    }
    
    // 窗口最小化
    public void minimizeWindow(WindowState ws) {
        // 最小化到任务栏
        Taskbar taskbar = getTaskbar();
        taskbar.addMinimizedWindow(ws);
        
        ws.setVisible(false);
        ws.setMinimized(true);
    }
}
```

#### 7.2.2 窗口层级管理

```java
// 窗口层级管理
public class WindowLayerController {
    // 调整窗口层级
    public void bringToFront(WindowState ws) {
        DisplayArea area = ws.getDisplayArea();
        
        // 移到最上层
        area.positionChildAt(POSITION_TOP, ws);
        
        // 更新输入窗口
        mService.mInputMonitor.updateInputWindowsLw(false);
    }
    
    // 处理窗口层级冲突
    public void resolveLayerConflicts(WindowState[] windows) {
        // 按优先级和类型排序
        Arrays.sort(windows, (a, b) -> {
            int priorityA = getWindowPriority(a);
            int priorityB = getWindowPriority(b);
            
            if (priorityA != priorityB) {
                return priorityB - priorityA;
            }
            
            return a.getLayer() - b.getLayer();
        });
        
        // 重新分配层级
        for (int i = 0; i < windows.length; i++) {
            windows[i].setLayer(i);
        }
    }
    
    // 窗口优先级
    private int getWindowPriority(WindowState ws) {
        // 焦点窗口优先级最高
        if (ws.isFocused()) {
            return 100;
        }
        
        // 系统窗口次之
        if (ws.isSystemWindow()) {
            return 80;
        }
        
        // 应用窗口
        return 50;
    }
}
```

### 7.3 桌面模式与多显示器

#### 7.3.1 多显示器支持

```java
// 多显示器管理
public class DisplayWindowController {
    // 添加外部显示器
    public void addExternalDisplay(DisplayDevice display) {
        // 1. 创建DisplayContent
        DisplayContent dc = mService.createDisplayContent(display);
        
        // 2. 配置桌面模式
        if (isDesktopModeSupported()) {
            enableDesktopMode(dc);
        }
        
        // 3. 设置显示区域
        setupDisplayAreas(dc);
        
        // 4. 配置输入通道
        setupInputChannels(dc);
    }
    
    // 启用桌面模式
    private void enableDesktopMode(DisplayContent dc) {
        // 创建桌面显示区域
        DisplayArea desktopArea = createDesktopArea(dc);
        
        // 启用任务栏
        Taskbar taskbar = createTaskbar(dc);
        dc.addDisplayArea(taskbar);
        
        // 配置自由窗口支持
        dc.setSupportsFreeform(true);
        
        // 设置默认窗口模式
        dc.setDefaultWindowingMode(WINDOWING_MODE_FREEFORM);
    }
    
    // 显示器热插拔处理
    public void handleDisplayHotplug(DisplayDevice display, boolean connected) {
        if (connected) {
            addExternalDisplay(display);
        } else {
            removeExternalDisplay(display);
        }
    }
}
```

#### 7.3.2 任务栏实现

```java
// 任务栏实现
public class Taskbar {
    private final DisplayContent mDisplayContent;
    private final List<WindowState> mMinimizedWindows = new ArrayList<>();
    
    // 添加最小化窗口
    public void addMinimizedWindow(WindowState ws) {
        mMinimizedWindows.add(ws);
        
        // 更新任务栏UI
        updateTaskbarUI();
    }
    
    // 恢复窗口
    public void restoreWindow(WindowState ws) {
        mMinimizedWindows.remove(ws);
        
        // 恢复窗口显示
        ws.setVisible(true);
        ws.setMinimized(false);
        
        // 将窗口移到前台
        mDisplayContent.positionChildAt(POSITION_TOP, ws);
        
        updateTaskbarUI();
    }
    
    // 更新任务栏UI
    private void updateTaskbarUI() {
        // 通知任务栏更新显示
        Intent intent = new Intent(ACTION_UPDATE_TASKBAR);
        intent.putParcelableArrayListExtra("windows", 
            new ArrayList<>(mMinimizedWindows));
        mContext.sendBroadcast(intent);
    }
}
```

### 7.4 分屏模式

#### 7.4.1 分屏布局管理

```java
// 分屏布局管理
public class SplitScreenController {
    // 进入分屏模式
    public void enterSplitScreen(Task task) {
        // 1. 创建分屏容器
        DisplayArea splitArea = createSplitScreenArea();
        
        // 2. 分割Task为两个TaskFragment
        Rect leftBounds = new Rect(0, 0, screenWidth / 2, screenHeight);
        Rect rightBounds = new Rect(screenWidth / 2, 0, screenWidth, screenHeight);
        
        TaskFragment leftFragment = mTaskFragmentController
            .createTaskFragment(task, leftBounds);
        TaskFragment rightFragment = mTaskFragmentController
            .createTaskFragment(task, rightBounds);
        
        // 3. 配置分屏参数
        configureSplitScreen(splitArea, leftFragment, rightFragment);
        
        // 4. 触发布局
        mService.mWindowPlacerLocked.performSurfacePlacement();
    }
    
    // 调整分屏分割线
    public void adjustSplitDivider(float position) {
        // 计算新的边界
        int dividerX = (int)(screenWidth * position);
        
        Rect leftBounds = new Rect(0, 0, dividerX, screenHeight);
        Rect rightBounds = new Rect(dividerX, 0, screenWidth, screenHeight);
        
        // 更新TaskFragment边界
        mLeftFragment.setBounds(leftBounds);
        mRightFragment.setBounds(rightBounds);
        
        // 触发布局
        mService.mWindowPlacerLocked.performSurfacePlacement();
    }
    
    // 退出分屏模式
    public void exitSplitScreen() {
        // 移除分屏容器
        removeSplitScreenArea();
        
        // 合并TaskFragment
        mergeTaskFragments();
        
        // 触发布局
        mService.mWindowPlacerLocked.performSurfacePlacement();
    }
}
```

### 7.5 窗口过渡动画

#### 7.5.1 新的动画框架

```java
// 窗口过渡动画控制器
public class WindowTransitionController {
    // 启动过渡动画
    public void startTransition(
        WindowState from,
        WindowState to,
        TransitionInfo info
    ) {
        // 1. 创建动画实例
        Transition animation = createTransition(info);
        
        // 2. 设置共享元素
        if (info.hasSharedElements()) {
            setupSharedElementTransition(animation, info);
        }
        
        // 3. 配置动画参数
        animation.setDuration(info.getDuration());
        animation.setInterpolator(info.getInterpolator());
        
        // 4. 启动动画
        animation.start();
    }
    
    // 共享元素过渡
    private void setupSharedElementTransition(
        Transition animation,
        TransitionInfo info
    ) {
        for (SharedElement element : info.getSharedElements()) {
            // 计算元素位置和大小变化
            Rect fromBounds = element.getFromBounds();
            Rect toBounds = element.getToBounds();
            
            // 创建共享元素动画
            Transition elementTransition = new SharedElementTransition(
                element.getView(),
                fromBounds,
                toBounds
            );
            
            animation.addTransition(elementTransition);
        }
    }
}
```

#### 7.5.2 硬件加速动画

```java
// 硬件加速动画实现
public class HardwareAnimationController {
    // 应用硬件加速动画
    public void applyHardwareAnimation(
        WindowState ws,
        Animation anim
    ) {
        SurfaceControl sc = ws.getSurfaceControl();
        
        // 创建RenderNode
        RenderNode node = sc.getRenderNode();
        
        // 设置动画属性
        if (anim instanceof AlphaAnimation) {
            node.setAlpha(anim.getAlpha());
        } else if (anim instanceof ScaleAnimation) {
            node.setScale(anim.getScaleX(), anim.getScaleY());
        } else if (anim instanceof TranslateAnimation) {
            node.setTranslation(anim.getTranslationX(), 
                                anim.getTranslationY());
        }
        
        // 启用硬件加速
        node.setUseHardwareAcceleration(true);
        
        // 提交事务
        SurfaceControl.Transaction t = new SurfaceControl.Transaction();
        t.setRenderNode(node);
        t.apply();
    }
}
```

## 8. 总结
WMS作为Android系统的核心服务之一，负责管理所有应用程序的窗口显示、布局和输入事件分发。它通过与SurfaceFlinger、InputManagerService等系统服务紧密协作，共同完成Android系统的UI显示和用户交互功能。

WMS的核心设计包括：
- 使用WindowState、WindowToken、Session等核心数据结构管理窗口
- 采用分层设计和Binder通信机制实现进程间通信
- 使用窗口令牌机制确保窗口创建的合法性和安全性
- 采用多线程模型处理窗口布局、动画和输入事件

理解WMS的工作原理和实现机制对于Android系统开发和应用程序开发都具有重要意义，可以帮助开发者更好地理解Android系统的UI显示和用户交互流程，从而开发出更加高效、稳定的应用程序。