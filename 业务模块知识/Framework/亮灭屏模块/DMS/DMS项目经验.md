# DMS (Display Manager Service) 项目经验

## 1. 功能定制

### 1.1 多显示器支持扩展

**需求描述**：
- 实现多显示器支持，允许设备连接外部显示器
- 支持主副显示器不同的显示内容
- 支持显示器之间的内容同步和切换

**实现方案**：
1. **显示器检测模块**：增强DMS的显示器检测能力，支持外部显示器的热插拔
2. **多显示器管理**：实现多显示器的配置和管理功能
3. **显示内容分配**：支持将不同应用分配到不同显示器
4. **内容同步机制**：实现显示器之间的内容同步和切换功能

**核心代码**：
```java
// 多显示器管理器
public class MultiDisplayManager {
    // 主显示器ID
    private int mPrimaryDisplayId;
    // 所有显示器列表
    private final Map<Integer, Display> mDisplays;
    // 显示器内容分配
    private final Map<Integer, List<ApplicationInfo>> mDisplayContentAssignment;
    
    // 检测到新显示器
    public void onDisplayAdded(Display display) {
        int displayId = display.getDisplayId();
        mDisplays.put(displayId, display);
        // 配置新显示器
        configureNewDisplay(display);
        // 通知应用程序
        notifyDisplayAdded(display);
    }
    
    // 配置新显示器
    private void configureNewDisplay(Display display) {
        // 设置显示器分辨率
        setDisplayResolution(display, getOptimalResolution(display));
        // 设置显示器刷新率
        setDisplayRefreshRate(display, getOptimalRefreshRate(display));
        // 设置显示器亮度
        setDisplayBrightness(display, getOptimalBrightness(display));
    }
    
    // 将应用分配到指定显示器
    public void assignApplicationToDisplay(ApplicationInfo appInfo, int displayId) {
        List<ApplicationInfo> apps = mDisplayContentAssignment.get(displayId);
        if (apps == null) {
            apps = new ArrayList<>();
            mDisplayContentAssignment.put(displayId, apps);
        }
        apps.add(appInfo);
        // 更新显示器内容
        updateDisplayContent(displayId);
    }
    
    // 同步显示器内容
    public void syncDisplays(int sourceDisplayId, int targetDisplayId) {
        // 获取源显示器内容
        List<ApplicationInfo> sourceContent = mDisplayContentAssignment.get(sourceDisplayId);
        if (sourceContent != null) {
            // 清空目标显示器内容
            List<ApplicationInfo> targetContent = mDisplayContentAssignment.get(targetDisplayId);
            if (targetContent != null) {
                targetContent.clear();
                // 复制源显示器内容到目标显示器
                targetContent.addAll(sourceContent);
                // 更新目标显示器内容
                updateDisplayContent(targetDisplayId);
            }
        }
    }
}
```

**遇到的困难与解决方案**：
- **显示器兼容性**：通过显示器能力检测，为不同显示器选择合适的配置
- **性能问题**：优化多显示器渲染性能，确保所有显示器都能流畅运行
- **用户体验**：设计直观的多显示器管理界面，方便用户配置和切换

### 1.2 显示模式定制

**需求描述**：
- 实现多种显示模式（如游戏模式、阅读模式、护眼模式等）
- 支持用户自定义显示模式
- 支持根据应用自动切换显示模式

**实现方案**：
1. **显示模式管理**：创建显示模式管理模块，支持多种显示模式
2. **色彩管理**：实现基于显示模式的色彩调整功能
3. **应用关联**：支持将显示模式与特定应用关联
4. **用户配置界面**：提供用户自定义显示模式的界面

**核心代码**：
```java
// 显示模式管理器
public class DisplayModeManager {
    // 支持的显示模式列表
    private final Map<String, DisplayMode> mDisplayModes;
    // 当前激活的显示模式
    private DisplayMode mCurrentMode;
    // 应用与显示模式的关联
    private final Map<String, String> mAppModeAssociations;
    
    // 注册显示模式
    public void registerDisplayMode(DisplayMode mode) {
        mDisplayModes.put(mode.getName(), mode);
    }
    
    // 切换到指定显示模式
    public void switchMode(String modeName) {
        DisplayMode newMode = mDisplayModes.get(modeName);
        if (newMode != null && mCurrentMode != newMode) {
            // 应用新显示模式
            newMode.apply();
            // 更新当前显示模式
            mCurrentMode = newMode;
            // 通知监听器
            notifyModeChanged(newMode);
        }
    }
    
    // 游戏模式
    private class GameMode implements DisplayMode {
        @Override
        public void apply() {
            // 设置游戏模式下的刷新率（最高）
            setDisplayRefreshRate(getMaxRefreshRate());
            // 设置游戏模式下的分辨率（最高）
            setDisplayResolution(getMaxResolution());
            // 调整游戏模式下的色彩（增强对比度）
            adjustColorSettings(1.2f, 1.1f, 1.0f); // 对比度、饱和度、亮度
            // 禁用游戏模式下的通知栏
            disableNotificationBar(true);
        }
    }
    
    // 阅读模式
    private class ReadingMode implements DisplayMode {
        @Override
        public void apply() {
            // 设置阅读模式下的刷新率（适中）
            setDisplayRefreshRate(60.0f);
            // 调整阅读模式下的色彩（护眼模式）
            enableEyeProtectionMode(true);
            // 调整阅读模式下的亮度（柔和）
            setDisplayBrightness(100);
        }
    }
    
    // 根据前台应用自动切换显示模式
    public void autoSwitchMode(String packageName) {
        String modeName = mAppModeAssociations.get(packageName);
        if (modeName != null) {
            switchMode(modeName);
        }
    }
}
```

**遇到的困难与解决方案**：
- **模式切换流畅性**：优化显示模式切换过程，减少视觉闪烁和延迟
- **色彩校准**：实现精确的色彩校准机制，确保不同显示模式的色彩效果准确
- **性能与效果平衡**：在保证显示效果的同时，确保系统性能不受明显影响

## 2. 性能优化

### 2.1 显示刷新率优化

**需求描述**：
- 实现动态刷新率调整，根据内容自动调整显示器刷新率
- 在保证流畅性的同时降低功耗

**实现方案**：
1. **内容分析**：分析当前显示内容的运动特性
2. **刷新率调整**：根据内容运动特性动态调整刷新率
3. **功耗监控**：监控刷新率调整对功耗的影响
4. **用户偏好**：尊重用户的刷新率偏好设置

**核心代码**：
```java
// 动态刷新率管理器
public class DynamicRefreshRateManager {
    // 当前显示器刷新率
    private float mCurrentRefreshRate;
    // 最低刷新率
    private final float mMinRefreshRate;
    // 最高刷新率
    private final float mMaxRefreshRate;
    // 内容运动分析器
    private final ContentMotionAnalyzer mMotionAnalyzer;
    // 刷新率调整策略
    private final RefreshRateAdjustmentPolicy mAdjustmentPolicy;
    
    // 初始化
    public DynamicRefreshRateManager(Display display) {
        Display.Mode[] modes = display.getSupportedModes();
        // 确定最低和最高刷新率
        mMinRefreshRate = getMinRefreshRate(modes);
        mMaxRefreshRate = getMaxRefreshRate(modes);
        // 初始化内容运动分析器
        mMotionAnalyzer = new ContentMotionAnalyzer();
        // 初始化刷新率调整策略
        mAdjustmentPolicy = new AdaptiveRefreshRatePolicy();
    }
    
    // 分析显示内容并调整刷新率
    public void analyzeContentAndAdjustRefreshRate(Surface surface) {
        // 分析内容运动特性
        float motionLevel = mMotionAnalyzer.analyzeMotionLevel(surface);
        // 根据运动特性调整刷新率
        float targetRefreshRate = mAdjustmentPolicy.determineRefreshRate(motionLevel);
        // 设置目标刷新率
        setRefreshRate(targetRefreshRate);
    }
    
    // 自适应刷新率策略
    private class AdaptiveRefreshRatePolicy implements RefreshRateAdjustmentPolicy {
        @Override
        public float determineRefreshRate(float motionLevel) {
            if (motionLevel > HIGH_MOTION_THRESHOLD) {
                // 高运动内容，使用最高刷新率
                return mMaxRefreshRate;
            } else if (motionLevel > MEDIUM_MOTION_THRESHOLD) {
                // 中等运动内容，使用中等刷新率
                return (mMaxRefreshRate + mMinRefreshRate) / 2;
            } else {
                // 低运动或静态内容，使用最低刷新率
                return mMinRefreshRate;
            }
        }
    }
}
```

**遇到的困难与解决方案**：
- **内容分析准确性**：提高内容运动分析的准确性，确保刷新率调整合理
- **刷新率切换延迟**：优化刷新率切换过程，减少切换延迟和视觉影响
- **用户体验**：确保刷新率调整不会影响用户的视觉体验和操作流畅性

### 2.2 显示亮度优化

**需求描述**：
- 优化自动亮度调节算法，提高亮度调节的准确性和舒适度
- 减少亮度频繁变化，提升用户体验

**实现方案**：
1. **环境光传感器优化**：改进环境光传感器的采样和滤波算法
2. **用户习惯学习**：学习用户的亮度调节习惯，提供个性化的亮度设置
3. **内容自适应**：根据显示内容的亮度特性调整屏幕亮度
4. **平滑过渡**：实现亮度变化的平滑过渡，减少视觉闪烁

**核心代码**：
```java
// 智能亮度管理器
public class SmartBrightnessManager {
    // 当前亮度值
    private int mCurrentBrightness;
    // 环境光传感器
    private final Sensor mLightSensor;
    // 亮度调节算法
    private final BrightnessAdjustmentAlgorithm mAlgorithm;
    // 用户习惯学习器
    private final UserBrightnessPreferenceLearner mPreferenceLearner;
    // 亮度平滑过渡器
    private final BrightnessSmoother mSmoother;
    
    // 环境光传感器事件处理
    public void onLightSensorChanged(SensorEvent event) {
        float lightValue = event.values[0];
        // 应用亮度调节算法
        int targetBrightness = mAlgorithm.calculateTargetBrightness(lightValue);
        // 考虑用户习惯调整亮度
        targetBrightness = mPreferenceLearner.adjustBrightness(targetBrightness, lightValue);
        // 平滑过渡到目标亮度
        mSmoother.smoothToBrightness(targetBrightness);
    }
    
    // 高级亮度调节算法
    private class AdvancedBrightnessAlgorithm implements BrightnessAdjustmentAlgorithm {
        @Override
        public int calculateTargetBrightness(float lightValue) {
            // 基础亮度曲线
            int baseBrightness = calculateBaseBrightness(lightValue);
            // 考虑屏幕内容亮度
            int contentAdjustment = calculateContentBrightnessAdjustment();
            // 考虑电池状态
            int batteryAdjustment = calculateBatteryBrightnessAdjustment();
            // 综合计算目标亮度
            return baseBrightness + contentAdjustment + batteryAdjustment;
        }
    }
    
    // 用户亮度偏好学习器
    private class UserBrightnessPreferenceLearner {
        // 用户亮度调整历史
        private final Map<Float, Integer> mUserBrightnessPreferences;
        
        // 调整亮度以匹配用户偏好
        public int adjustBrightness(int targetBrightness, float lightValue) {
            Integer userPreference = findUserPreference(lightValue);
            if (userPreference != null) {
                // 使用用户偏好的亮度值
                return userPreference;
            }
            return targetBrightness;
        }
        
        // 记录用户亮度调整
        public void recordUserAdjustment(int brightness, float lightValue) {
            mUserBrightnessPreferences.put(lightValue, brightness);
        }
    }
}
```

**遇到的困难与解决方案**：
- **传感器精度**：通过滤波算法提高环境光传感器的测量精度
- **个性化学习**：实现高效的用户习惯学习算法，提供个性化的亮度设置
- **平滑过渡**：实现基于时间的亮度平滑过渡算法，减少亮度变化的视觉影响

## 3. 异常处理

### 3.1 显示异常恢复

**需求描述**：
- 处理显示器异常情况（如显示闪烁、花屏、黑屏等）
- 实现显示异常的自动检测和恢复机制

**实现方案**：
1. **显示状态监控**：监控显示器的工作状态
2. **异常检测**：检测显示异常情况
3. **恢复机制**：实现多种显示异常恢复策略
4. **日志记录**：记录显示异常信息，便于分析问题

**核心代码**：
```java
// 显示异常检测器
public class DisplayAnomalyDetector {
    // 显示状态监控器
    private final DisplayStateMonitor mStateMonitor;
    // 异常恢复策略
    private final List<DisplayRecoveryStrategy> mRecoveryStrategies;
    // 异常日志记录器
    private final DisplayAnomalyLogger mAnomalyLogger;
    
    // 显示状态变化
    public void onDisplayStateChanged(DisplayState oldState, DisplayState newState) {
        // 检查是否发生异常
        DisplayAnomaly anomaly = detectAnomaly(oldState, newState);
        if (anomaly != null) {
            // 记录异常
            mAnomalyLogger.logAnomaly(anomaly);
            // 尝试恢复
            attemptRecovery(anomaly);
        }
    }
    
    // 检测显示异常
    private DisplayAnomaly detectAnomaly(DisplayState oldState, DisplayState newState) {
        if (newState.isBlackScreen()) {
            return new DisplayAnomaly(AnomalyType.BLACK_SCREEN, newState);
        } else if (newState.isFlickering()) {
            return new DisplayAnomaly(AnomalyType.FLICKERING, newState);
        } else if (newState.isArtifact()) {
            return new DisplayAnomaly(AnomalyType.ARTIFACT, newState);
        }
        return null;
    }
    
    // 尝试恢复显示异常
    private void attemptRecovery(DisplayAnomaly anomaly) {
        for (DisplayRecoveryStrategy strategy : mRecoveryStrategies) {
            if (strategy.canHandle(anomaly)) {
                boolean recovered = strategy.recover(anomaly);
                if (recovered) {
                    break;
                }
            }
        }
    }
    
    // 显示重置恢复策略
    private class DisplayResetStrategy implements DisplayRecoveryStrategy {
        @Override
        public boolean canHandle(DisplayAnomaly anomaly) {
            // 可以处理大多数显示异常
            return true;
        }
        
        @Override
        public boolean recover(DisplayAnomaly anomaly) {
            try {
                // 重置显示器
                resetDisplay(anomaly.getDisplayId());
                return true;
            } catch (Exception e) {
                return false;
            }
        }
    }
    
    // 刷新率调整恢复策略
    private class RefreshRateAdjustmentStrategy implements DisplayRecoveryStrategy {
        @Override
        public boolean canHandle(DisplayAnomaly anomaly) {
            // 主要处理闪烁和花屏问题
            return anomaly.getType() == AnomalyType.FLICKERING || 
                   anomaly.getType() == AnomalyType.ARTIFACT;
        }
        
        @Override
        public boolean recover(DisplayAnomaly anomaly) {
            try {
                // 降低刷新率到标准值
                setDisplayRefreshRate(anomaly.getDisplayId(), 60.0f);
                return true;
            } catch (Exception e) {
                return false;
            }
        }
    }
}
```

**遇到的困难与解决方案**：
- **异常检测准确性**：结合硬件状态和视觉特征提高显示异常检测的准确性
- **恢复策略有效性**：设计多种恢复策略，从简单到复杂依次尝试
- **用户体验**：确保恢复过程对用户的影响最小化

### 3.2 分辨率兼容性处理

**需求描述**：
- 处理应用程序与显示器分辨率不兼容的问题
- 实现分辨率兼容性解决方案

**实现方案**：
1. **分辨率检测**：检测应用程序的分辨率要求和显示器的实际分辨率
2. **兼容性分析**：分析应用程序与显示器的分辨率兼容性
3. **兼容模式**：实现多种分辨率兼容模式
4. **用户选择**：允许用户选择合适的兼容模式

**核心代码**：
```java
// 分辨率兼容性管理器
public class ResolutionCompatibilityManager {
    // 当前显示器分辨率
    private Point mCurrentResolution;
    // 应用分辨率要求缓存
    private final Map<String, Point> mAppResolutionRequirements;
    // 兼容模式列表
    private final List<CompatibilityMode> mCompatibilityModes;
    
    // 检查应用分辨率兼容性
    public CompatibilityResult checkAppCompatibility(ApplicationInfo appInfo) {
        String packageName = appInfo.packageName;
        Point appResolution = getAppResolutionRequirement(packageName);
        if (appResolution == null) {
            // 未知分辨率要求，假设兼容
            return CompatibilityResult.COMPATIBLE;
        }
        
        // 检查分辨率兼容性
        if (isResolutionCompatible(appResolution, mCurrentResolution)) {
            return CompatibilityResult.COMPATIBLE;
        } else {
            return CompatibilityResult.INCOMPATIBLE;
        }
    }
    
    // 获取应用分辨率要求
    private Point getAppResolutionRequirement(String packageName) {
        Point requirement = mAppResolutionRequirements.get(packageName);
        if (requirement == null) {
            // 分析应用程序的分辨率要求
            requirement = analyzeAppResolutionRequirement(packageName);
            mAppResolutionRequirements.put(packageName, requirement);
        }
        return requirement;
    }
    
    // 应用兼容模式
    public void applyCompatibilityMode(String packageName, CompatibilityMode mode) {
        // 记录应用的兼容模式选择
        recordCompatibilityModeSelection(packageName, mode);
        // 应用兼容模式
        mode.apply(packageName);
    }
    
    // 缩放兼容模式
    private class ScalingCompatibilityMode implements CompatibilityMode {
        @Override
        public void apply(String packageName) {
            // 启用应用缩放
            enableAppScaling(packageName, true);
            // 设置合适的缩放比例
            setScalingFactor(packageName, calculateScalingFactor(packageName));
        }
    }
    
    // 分辨率切换兼容模式
    private class ResolutionSwitchCompatibilityMode implements CompatibilityMode {
        @Override
        public void apply(String packageName) {
            // 获取应用的分辨率要求
            Point appResolution = getAppResolutionRequirement(packageName);
            if (appResolution != null) {
                // 临时切换显示器分辨率以匹配应用要求
                switchDisplayResolution(appResolution);
            }
        }
    }
}
```

**遇到的困难与解决方案**：
- **应用分辨率分析**：实现准确的应用程序分辨率要求分析机制
- **兼容模式性能**：优化兼容模式的性能，确保应用程序流畅运行
- **用户体验**：设计友好的兼容模式选择界面，提供清晰的选项说明