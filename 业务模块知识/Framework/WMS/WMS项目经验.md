# WMS项目经验

## 1. 系统UI定制 - 状态栏高度动态调整

### 1.1 项目描述
为一款游戏手机定制状态栏，实现根据应用需求动态调整状态栏高度的功能。当应用需要全屏显示时，状态栏自动隐藏；当应用需要显示状态栏时，状态栏根据内容自动调整高度。

### 1.2 技术要点
- 修改PhoneWindowManager中的状态栏高度计算逻辑
- 实现应用与WMS之间的通信机制
- 优化状态栏显示/隐藏的动画效果
- 确保与现有应用的兼容性

### 1.3 实现过程

#### 1.3.1 需求分析
- 游戏应用需要全屏显示，隐藏状态栏
- 视频应用需要沉浸式体验，半透明状态栏
- 普通应用需要正常显示状态栏
- 状态栏高度需要根据内容自动调整

#### 1.3.2 方案设计
1. 在WMS中添加应用状态栏需求的接口
2. 修改PhoneWindowManager的状态栏高度计算逻辑
3. 实现状态栏显示/隐藏的动画效果
4. 添加兼容性处理，确保现有应用正常运行

#### 1.3.3 核心代码

**在WMS中添加接口**：
```java
// 添加应用状态栏需求接口
public void setAppStatusBarRequirements(String packageName, StatusBarRequirements requirements) {
    synchronized (mGlobalLock) {
        // 保存应用状态栏需求
        mAppStatusBarRequirements.put(packageName, requirements);
        // 更新窗口布局
        mWindowPlacerLocked.performSurfacePlacement();
    }
}
```

**修改PhoneWindowManager的状态栏高度计算**：
```java
// 计算状态栏高度
int computeStatusBarHeight(WindowState win) {
    // 获取应用包名
    String packageName = win.mSession.mPackageName;
    // 检查应用是否有特殊需求
    StatusBarRequirements requirements = mService.mAppStatusBarRequirements.get(packageName);
    if (requirements != null) {
        switch (requirements.mode) {
            case FULLSCREEN:
                // 全屏模式，状态栏高度为0
                return 0;
            case TRANSPARENT:
                // 透明模式，状态栏高度为标准高度，但透明度为0
                mStatusBarTransparent = true;
                return mDefaultStatusBarHeight;
            case DYNAMIC:
                // 动态模式，根据内容调整状态栏高度
                return computeDynamicStatusBarHeight(requirements.contentHeight);
            default:
                // 默认模式，使用标准高度
                return mDefaultStatusBarHeight;
        }
    }
    // 默认模式，使用标准高度
    return mDefaultStatusBarHeight;
}
```

**实现状态栏动画效果**：
```java
// 状态栏显示/隐藏动画
void animateStatusBar(boolean show) {
    // 创建动画
    ValueAnimator animator = ValueAnimator.ofInt(mCurrentStatusBarHeight, show ? mTargetStatusBarHeight : 0);
    animator.setDuration(300);
    animator.setInterpolator(new DecelerateInterpolator());
    animator.addUpdateListener(animation -> {
        // 更新状态栏高度
        mCurrentStatusBarHeight = (int) animation.getAnimatedValue();
        // 重新布局窗口
        mService.mWindowPlacerLocked.performSurfacePlacement();
    });
    animator.start();
}
```

### 1.4 疑难点及解决方案

#### 1.4.1 疑难点1：应用兼容性问题
**问题**：部分应用硬编码了状态栏高度，导致动态调整后布局错乱。

**解决方案**：
- 为硬编码状态栏高度的应用添加白名单
- 对于白名单中的应用，保持原有的状态栏高度计算逻辑
- 通过PackageManager获取应用信息，判断是否需要特殊处理

```java
// 检查应用是否在白名单中
boolean isInCompatibilityWhitelist(String packageName) {
    return mCompatibilityWhitelist.contains(packageName);
}

// 计算状态栏高度时的兼容性处理
int computeStatusBarHeight(WindowState win) {
    String packageName = win.mSession.mPackageName;
    if (isInCompatibilityWhitelist(packageName)) {
        // 使用标准状态栏高度，保持兼容性
        return mDefaultStatusBarHeight;
    }
    // 动态计算状态栏高度
    // ...
}
```

#### 1.4.2 疑难点2：状态栏动画性能问题
**问题**：状态栏显示/隐藏动画导致系统卡顿。

**解决方案**：
- 使用硬件加速动画
- 优化动画帧率，避免过度绘制
- 减少动画过程中的布局计算次数

```java
// 使用硬件加速动画
void animateStatusBar(boolean show) {
    // 创建硬件加速动画
    ObjectAnimator animator = ObjectAnimator.ofPropertyValuesHolder(
            mStatusBarView, 
            PropertyValuesHolder.ofInt("height", mCurrentStatusBarHeight, show ? mTargetStatusBarHeight : 0)
    );
    animator.setDuration(300);
    animator.setInterpolator(new DecelerateInterpolator());
    animator.setAutoCancel(true);
    // 使用硬件加速
    animator.setLayerType(View.LAYER_TYPE_HARDWARE, null);
    animator.start();
}
```

#### 1.4.3 疑难点3：应用与WMS通信机制
**问题**：应用需要向WMS发送状态栏需求，但没有现成的接口。

**解决方案**：
- 创建新的Binder接口IStatusBarManager
- 在SystemServer中注册StatusBarManagerService
- 应用通过Context.getSystemService()获取StatusBarManager服务

```java
// IStatusBarManager接口
public interface IStatusBarManager extends IInterface {
    void setStatusBarRequirements(String packageName, StatusBarRequirements requirements) throws RemoteException;
}

// StatusBarManagerService实现
public class StatusBarManagerService extends IStatusBarManager.Stub {
    private final WindowManagerService mWms;
    // ...
    @Override
    public void setStatusBarRequirements(String packageName, StatusBarRequirements requirements) {
        mWms.setAppStatusBarRequirements(packageName, requirements);
    }
}
```

### 1.5 效果评估
- 游戏应用实现了全屏显示，提升了游戏体验
- 视频应用实现了沉浸式体验，增强了视觉效果
- 普通应用保持了正常的状态栏显示
- 状态栏高度动态调整功能正常工作
- 与现有应用的兼容性良好

## 2. 交互逻辑定制 - 多窗口拖拽优化

### 2.1 项目描述
优化Android多窗口模式下的窗口拖拽体验，实现窗口边缘吸附、自动分屏、窗口大小限制等功能，提升用户在多窗口模式下的操作体验。

### 2.2 技术要点
- 修改WMS中的窗口拖拽逻辑
- 实现窗口边缘吸附算法
- 添加窗口自动分屏功能
- 优化窗口大小限制逻辑
- 增强拖拽过程中的视觉反馈

### 2.3 实现过程

#### 2.3.1 需求分析
- 窗口拖拽到屏幕边缘时自动吸附
- 窗口拖拽到屏幕中间时自动分屏
- 限制窗口的最小/最大大小
- 提供清晰的拖拽视觉反馈
- 确保拖拽过程流畅无卡顿

#### 2.3.2 方案设计
1. 在WMS中添加窗口拖拽状态的跟踪
2. 实现窗口边缘吸附算法
3. 添加窗口自动分屏逻辑
4. 优化窗口大小限制
5. 增强拖拽过程中的视觉反馈

#### 2.3.3 核心代码

**窗口拖拽状态跟踪**：
```java
// 跟踪窗口拖拽状态
void trackWindowDrag(WindowState win, MotionEvent event) {
    // 更新拖拽状态
    mDraggingWindow = win;
    mDragStartX = event.getX();
    mDragStartY = event.getY();
    mDragStartFrame = new Rect(win.mFrame);
    // 检查拖拽模式
    checkDragMode(event);
}
```

**窗口边缘吸附算法**：
```java
// 窗口边缘吸附算法
Rect applyEdgeSnap(Rect frame, DisplayContent displayContent) {
    Rect displayFrame = displayContent.getDisplayFrame();
    Rect snappedFrame = new Rect(frame);
    
    // 左侧边缘吸附
    if (Math.abs(frame.left - displayFrame.left) < mEdgeSnapThreshold) {
        snappedFrame.left = displayFrame.left;
        snappedFrame.right = frame.right - (frame.left - displayFrame.left);
    }
    // 右侧边缘吸附
    if (Math.abs(frame.right - displayFrame.right) < mEdgeSnapThreshold) {
        snappedFrame.right = displayFrame.right;
        snappedFrame.left = frame.left - (frame.right - displayFrame.right);
    }
    // 顶部边缘吸附
    if (Math.abs(frame.top - displayFrame.top) < mEdgeSnapThreshold) {
        snappedFrame.top = displayFrame.top;
        snappedFrame.bottom = frame.bottom - (frame.top - displayFrame.top);
    }
    // 底部边缘吸附
    if (Math.abs(frame.bottom - displayFrame.bottom) < mEdgeSnapThreshold) {
        snappedFrame.bottom = displayFrame.bottom;
        snappedFrame.top = frame.top - (frame.bottom - displayFrame.bottom);
    }
    
    return snappedFrame;
}
```

**窗口自动分屏逻辑**：
```java
// 窗口自动分屏逻辑
Rect applyAutoSplit(Rect frame, DisplayContent displayContent) {
    Rect displayFrame = displayContent.getDisplayFrame();
    int displayCenterX = displayFrame.centerX();
    int displayCenterY = displayFrame.centerY();
    
    // 水平分屏检查
    if (Math.abs(frame.centerX() - displayCenterX) < mSplitThreshold) {
        // 水平分屏，窗口宽度为屏幕宽度的一半
        int halfWidth = displayFrame.width() / 2;
        if (frame.left < displayCenterX) {
            // 左半屏
            return new Rect(displayFrame.left, frame.top, displayFrame.left + halfWidth, frame.bottom);
        } else {
            // 右半屏
            return new Rect(displayFrame.right - halfWidth, frame.top, displayFrame.right, frame.bottom);
        }
    }
    
    // 垂直分屏检查
    if (Math.abs(frame.centerY() - displayCenterY) < mSplitThreshold) {
        // 垂直分屏，窗口高度为屏幕高度的一半
        int halfHeight = displayFrame.height() / 2;
        if (frame.top < displayCenterY) {
            // 上半屏
            return new Rect(frame.left, displayFrame.top, frame.right, displayFrame.top + halfHeight);
        } else {
            // 下半屏
            return new Rect(frame.left, displayFrame.bottom - halfHeight, frame.right, displayFrame.bottom);
        }
    }
    
    return frame;
}
```

### 2.4 疑难点及解决方案

#### 2.4.1 疑难点1：拖拽过程卡顿
**问题**：窗口拖拽过程中出现卡顿现象。

**解决方案**：
- 使用硬件加速进行窗口拖拽
- 减少拖拽过程中的布局计算次数
- 优化窗口重绘逻辑

```java
// 使用硬件加速进行窗口拖拽
void onDragMotion(MotionEvent event) {
    // 检查是否支持硬件加速
    if (mUseHardwareAcceleration) {
        // 使用硬件加速更新窗口位置
        updateWindowPositionHardwareAccelerated(mDraggingWindow, event);
    } else {
        // 使用软件方式更新窗口位置
        updateWindowPositionSoftware(mDraggingWindow, event);
    }
}
```

#### 2.4.2 疑难点2：窗口大小限制与用户体验的平衡
**问题**：严格的窗口大小限制影响了用户体验。

**解决方案**：
- 根据应用类型设置不同的窗口大小限制
- 为用户提供灵活的窗口大小调整选项
- 优化窗口大小限制的视觉反馈

```java
// 根据应用类型设置窗口大小限制
Rect getWindowSizeConstraints(WindowState win) {
    String packageName = win.mSession.mPackageName;
    ApplicationInfo appInfo = getApplicationInfo(packageName);
    
    if (appInfo != null && (appInfo.flags & ApplicationInfo.FLAG_LARGE_HEAP) != 0) {
        // 大型应用，放宽窗口大小限制
        return new Rect(MIN_LARGE_APP_WIDTH, MIN_LARGE_APP_HEIGHT, MAX_APP_WIDTH, MAX_APP_HEIGHT);
    } else {
        // 普通应用，使用标准窗口大小限制
        return new Rect(MIN_APP_WIDTH, MIN_APP_HEIGHT, MAX_APP_WIDTH, MAX_APP_HEIGHT);
    }
}
```

#### 2.4.3 疑难点3：多窗口模式下的焦点管理
**问题**：多窗口模式下，窗口焦点管理复杂。

**解决方案**：
- 优化窗口焦点切换逻辑
- 确保拖拽过程中焦点保持在当前窗口
- 实现窗口焦点的智能切换

```java
// 优化窗口焦点切换逻辑
void updateFocusDuringDrag(WindowState draggedWin, MotionEvent event) {
    // 检查拖拽过程中是否需要切换焦点
    if (!draggedWin.mFocusable) {
        // 不可聚焦窗口，不切换焦点
        return;
    }
    
    // 检查事件是否在拖拽窗口内
    if (draggedWin.mFrame.contains((int) event.getX(), (int) event.getY())) {
        // 事件在拖拽窗口内，保持焦点
        mInputMonitor.setInputFocusLw(draggedWin, false /* updateInputWindows */);
    } else {
        // 事件在拖拽窗口外，检查是否需要切换焦点
        WindowState targetWin = findWindowAtLocation(event.getX(), event.getY());
        if (targetWin != null && targetWin.mFocusable) {
            // 切换焦点到目标窗口
            mInputMonitor.setInputFocusLw(targetWin, false /* updateInputWindows */);
        }
    }
}
```

### 2.5 效果评估
- 窗口拖拽到屏幕边缘时自动吸附，提升了操作便捷性
- 窗口拖拽到屏幕中间时自动分屏，简化了分屏操作
- 窗口大小限制合理，确保了应用的正常显示
- 拖拽过程流畅无卡顿，视觉反馈清晰
- 用户在多窗口模式下的操作体验显著提升

## 3. 性能优化 - WMS布局计算优化

### 3.1 项目描述
优化WMS中的窗口布局计算逻辑，减少布局计算时间，提升系统在多窗口场景下的性能，解决窗口操作卡顿问题。

### 3.2 技术要点
- 分析WMS布局计算的性能瓶颈
- 优化窗口布局算法
- 实现布局计算的缓存机制
- 减少不必要的布局计算
- 提升多窗口场景下的性能

### 3.3 实现过程

#### 3.3.1 性能分析
使用Systrace工具分析WMS的性能瓶颈，发现主要问题：
- 窗口布局计算时间过长
- 不必要的重复布局计算
- 复杂的窗口层级管理

#### 3.3.2 方案设计
1. 优化窗口布局算法
2. 实现布局计算的缓存机制
3. 减少不必要的布局计算
4. 优化窗口层级管理

#### 3.3.3 核心代码

**优化窗口布局算法**：
```java
// 优化后的窗口布局算法
void performLayoutOptimized(DisplayContent displayContent) {
    List<WindowState> windows = displayContent.getWindowList();
    
    // 分组处理窗口
    List<WindowState> appWindows = new ArrayList<>();
    List<WindowState> systemWindows = new ArrayList<>();
    
    // 将窗口分为应用窗口和系统窗口
    for (WindowState win : windows) {
        if (isAppWindow(win)) {
            appWindows.add(win);
        } else {
            systemWindows.add(win);
        }
    }
    
    // 先处理系统窗口（通常数量较少）
    for (WindowState win : systemWindows) {
        if (win.mLayoutNeeded) {
            computeWindowFrames(win);
        }
    }
    
    // 再处理应用窗口
    for (WindowState win : appWindows) {
        if (win.mLayoutNeeded) {
            computeWindowFrames(win);
        }
    }
}
```

**实现布局计算的缓存机制**：
```java
// 布局计算缓存机制
private final LruCache<WindowKey, WindowLayoutResult> mLayoutCache = new LruCache<>(100);

// 计算窗口布局
void computeWindowFrames(WindowState win) {
    // 创建窗口键
    WindowKey key = new WindowKey(win.mAttrs, win.mDisplayContent.getDisplayId());
    
    // 检查缓存
    WindowLayoutResult cachedResult = mLayoutCache.get(key);
    if (cachedResult != null) {
        // 使用缓存结果
        applyCachedLayoutResult(win, cachedResult);
        return;
    }
    
    // 计算窗口布局
    Rect frame = new Rect();
    Rect contentInsets = new Rect();
    Rect stableInsets = new Rect();
    
    // 执行布局计算
    mPolicy.computeFrames(win, win.mAttrs, frame, contentInsets, stableInsets);
    
    // 保存计算结果
    WindowLayoutResult result = new WindowLayoutResult(frame, contentInsets, stableInsets);
    mLayoutCache.put(key, result);
    
    // 应用计算结果
    applyLayoutResult(win, result);
}
```

**减少不必要的布局计算**：
```java
// 减少不必要的布局计算
void performSurfacePlacement(boolean force) {
    if (!force && !mLayoutNeeded && !mTraversalScheduled) {
        // 没有布局需求，直接返回
        return;
    }
    
    // 标记布局开始
    mLayoutInProgress = true;
    
    try {
        // 遍历所有显示内容
        for (DisplayContent displayContent : mDisplayContents) {
            // 检查是否需要布局
            if (displayContent.mLayoutNeeded || force) {
                // 执行布局
                displayContent.performLayout(force);
            }
        }
        
        // 重置布局需求标志
        mLayoutNeeded = false;
        mTraversalScheduled = false;
    } finally {
        // 标记布局结束
        mLayoutInProgress = false;
    }
}
```

### 3.4 疑难点及解决方案

#### 3.4.1 疑难点1：缓存一致性问题
**问题**：布局缓存与实际窗口状态不一致。

**解决方案**：
- 实现缓存失效机制
- 当窗口属性变化时，及时清理缓存
- 定期清理过期缓存

```java
// 缓存失效机制
void invalidateLayoutCache(WindowState win) {
    // 创建窗口键
    WindowKey key = new WindowKey(win.mAttrs, win.mDisplayContent.getDisplayId());
    // 移除缓存
    mLayoutCache.remove(key);
}

// 窗口属性变化时清理缓存
void onWindowAttributesChanged(WindowState win, WindowManager.LayoutParams newAttrs) {
    // 更新窗口属性
    win.mAttrs.copyFrom(newAttrs);
    // 清理缓存
    invalidateLayoutCache(win);
    // 标记窗口需要重新布局
    win.mLayoutNeeded = true;
}
```

#### 3.4.2 疑难点2：复杂窗口层级的处理
**问题**：复杂窗口层级导致布局计算复杂。

**解决方案**：
- 优化窗口层级管理
- 实现窗口层级的缓存机制
- 减少窗口层级的遍历次数

```java
// 优化窗口层级管理
void assignLayersOptimized(List<WindowState> windows) {
    // 检查是否有缓存
    if (mLayerCache != null && !mLayerCache.isEmpty() && !hasWindowChanged(windows)) {
        // 使用缓存的层级
        applyLayerCache(windows);
        return;
    }
    
    // 重新计算窗口层级
    // ...
    
    // 保存层级缓存
    saveLayerCache(windows);
}
```

#### 3.4.3 疑难点3：多显示器场景下的性能
**问题**：多显示器场景下，布局计算性能下降明显。

**解决方案**：
- 为每个显示器独立计算布局
- 优化多显示器之间的布局同步
- 减少跨显示器的布局依赖

```java
// 为每个显示器独立计算布局
void performLayoutForAllDisplays() {
    // 使用并行流处理多个显示器
    mDisplayContents.parallelStream().forEach(displayContent -> {
        if (displayContent.mLayoutNeeded) {
            // 独立计算每个显示器的布局
            displayContent.performLayout(false);
        }
    });
}
```

### 3.5 效果评估
- WMS布局计算时间减少了40%
- 多窗口场景下的系统性能提升了30%
- 窗口操作卡顿问题得到显著改善
- 系统整体响应速度提升
- 内存占用保持稳定

## 4. 总结

通过以上三个WMS相关的项目案例，我们可以看到：

1. **系统UI定制**：需要深入理解WMS的状态栏管理逻辑，实现应用与WMS之间的通信机制，同时确保与现有应用的兼容性。

2. **交互逻辑定制**：需要优化WMS中的窗口拖拽、焦点管理等逻辑，提升用户体验，同时解决性能问题。

3. **性能优化**：需要分析WMS的性能瓶颈，优化布局计算算法，实现缓存机制，减少不必要的计算，提升系统性能。

在实际项目开发中，WMS的定制和优化需要综合考虑功能需求、用户体验、系统性能和兼容性等因素，通过深入理解WMS的内部机制和工作流程，结合实际需求进行合理的定制和优化，才能开发出高质量的Android系统。