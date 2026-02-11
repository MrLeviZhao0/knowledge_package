# AON (Always On) 核心知识

## 1. 概述
AON（Always On）模块是Android系统中负责息屏显示和相关功能的子系统，主要包括息屏显示（Always On Display，AOD）、手势识别（如双击亮屏、画字母唤醒）和人来亮屏等功能。AON模块与PowerManagerService、DisplayManagerService等系统服务紧密协作，在设备处于低功耗状态时提供基本的显示和交互功能。

## 2. 主要数据结构

### 2.1 AlwaysOnDisplayService
**定义**：息屏显示核心服务，管理息屏显示功能
**核心成员变量**：
```java
public class AlwaysOnDisplayService extends SystemService {
    // 息屏显示控制器
    private final AlwaysOnDisplayController mController;
    // 息屏显示策略
    private final AlwaysOnDisplayPolicy mPolicy;
    // 手势识别管理器
    private final GestureRecognitionManager mGestureManager;
    // 人来亮屏管理器
    private final ProximityWakeManager mProximityWakeManager;
    // 息屏显示支持状态
    private boolean mAodSupported;
    // 息屏显示启用状态
    private boolean mAodEnabled;
    // 息屏显示亮度
    private int mAodBrightness;
    // 息屏显示超时时间
    private long mAodTimeout;
    // 亮灭屏控制接口
    private final PowerManager mPowerManager;
    private final DisplayManager mDisplayManager;
    // 传感器接口
    private final SensorManager mSensorManager;
}
```

### 2.2 AlwaysOnDisplayController
**定义**：息屏显示控制器，负责息屏显示的具体实现
**核心成员变量**：
```java
private class AlwaysOnDisplayController {
    // 息屏显示Surface
    private Surface mAodSurface;
    // 息屏显示画布
    private Canvas mAodCanvas;
    // 息屏显示渲染器
    private final AlwaysOnDisplayRenderer mRenderer;
    // 息屏显示内容管理器
    private final AlwaysOnDisplayContentManager mContentManager;
    // 息屏显示当前状态
    private int mCurrentState;
    // 息屏显示更新间隔
    private long mUpdateInterval;
    // 息屏显示亮度
    private int mBrightness;
    // 息屏显示功耗监控
    private final AodPowerMonitor mPowerMonitor;
}
```

### 2.3 GestureRecognitionManager
**定义**：手势识别管理器，负责息屏手势的识别和处理
**核心成员变量**：
```java
private class GestureRecognitionManager {
    // 手势传感器
    private final Sensor mGestureSensor;
    // 手势传感器事件监听器
    private final SensorEventListener mGestureListener;
    // 支持的手势列表
    private final List<Gesture> mSupportedGestures;
    // 当前识别的手势
    private Gesture mCurrentGesture;
    // 手势识别状态
    private int mRecognitionState;
    // 手势识别灵敏度
    private int mSensitivity;
}
```

### 2.4 ProximityWakeManager
**定义**：人来亮屏管理器，通过传感器检测用户靠近自动亮屏
**核心成员变量**：
```java
private class ProximityWakeManager {
    // 接近传感器
    private final Sensor mProximitySensor;
    // 光线传感器
    private final Sensor mLightSensor;
    // 传感器事件监听器
    private final SensorEventListener mSensorListener;
    // 人来亮屏启用状态
    private boolean mEnabled;
    // 接近传感器阈值
    private float mProximityThreshold;
    // 光线传感器阈值
    private float mLightThreshold;
    // 检测延迟时间
    private long mDetectionDelay;
}
```

### 2.5 Gesture
**定义**：手势的抽象表示
**核心成员变量**：
```java
private class Gesture {
    // 手势ID
    private final int mId;
    // 手势名称
    private final String mName;
    // 手势类型
    private final int mType;
    // 手势触发动作
    private final GestureAction mAction;
    // 手势识别参数
    private final GestureRecognitionParams mParams;
    // 手势启用状态
    private boolean mEnabled;
}
```

### 2.6 AlwaysOnDisplayPolicy
**定义**：息屏显示策略，定义息屏显示的行为规则
**核心成员变量**：
```java
private class AlwaysOnDisplayPolicy {
    // 息屏显示支持的时间格式
    private final List<String> mTimeFormats;
    // 息屏显示支持的通知类型
    private final List<String> mSupportedNotifications;
    // 充电时是否启用息屏显示
    private boolean mEnabledWhileCharging;
    // 电池电量低于多少时禁用息屏显示
    private int mDisableBelowBatteryLevel;
    // 高温时是否禁用息屏显示
    private boolean mDisableOnHighTemperature;
    // 手势支持列表
    private final List<Integer> mSupportedGestures;
}
```

## 3. 设计思路

### 3.1 低功耗设计
- **硬件优化**：利用显示屏的部分像素点亮技术，只点亮需要显示的像素
- **软件优化**：减少CPU和传感器的工作时间，降低系统功耗
- **定时唤醒**：定期唤醒更新显示内容，其余时间保持休眠状态

### 3.2 分层设计
- **服务层**：AlwaysOnDisplayService提供核心服务
- **控制层**：AlwaysOnDisplayController负责具体实现
- **内容层**：管理息屏显示的内容（时间、通知、天气等）
- **交互层**：处理手势识别和人来亮屏等交互功能

### 3.3 传感器融合
- **多传感器协作**：结合接近传感器、光线传感器、加速度传感器等实现复杂功能
- **传感器低功耗模式**：使用传感器的低功耗工作模式，减少电量消耗
- **智能传感器调度**：根据使用场景动态调整传感器的工作状态

### 3.4 与亮灭屏的协同
- **无缝切换**：在亮屏和息屏显示之间实现无缝切换
- **状态同步**：与PowerManagerService和DisplayManagerService保持状态同步
- **功耗协同**：在不同电源状态下调整息屏显示的行为

## 4. 线程进程模型

### 4.1 主要线程
- **SystemServer线程**：AlwaysOnDisplayService服务启动线程
- **AOD Render Thread**：息屏显示渲染线程，负责绘制息屏显示内容
- **Gesture Recognition Thread**：手势识别线程，处理手势传感器数据
- **Sensor Thread**：传感器数据处理线程，处理接近传感器、光线传感器等数据

### 4.2 进程模型
- **SystemServer进程**：AlwaysOnDisplayService运行在此进程中
- **应用进程**：通过Binder与AlwaysOnDisplayService通信

## 5. 核心流程

### 5.1 息屏显示启动流程
```java
// 息屏显示启动流程
private void startAlwaysOnDisplay() {
    synchronized (mLock) {
        // 检查息屏显示是否支持和启用
        if (!mAodSupported || !mAodEnabled) {
            return;
        }
        // 检查设备状态
        if (!checkDeviceStateForAod()) {
            return;
        }
        // 初始化息屏显示Surface
        initAodSurface();
        // 初始化息屏显示内容
        initAodContent();
        // 启动息屏显示渲染
        startAodRendering();
        // 注册息屏显示更新定时器
        registerAodUpdateTimer();
        // 启动手势识别
        mGestureManager.start();
        // 启动人来亮屏检测
        mProximityWakeManager.start();
    }
}
```

### 5.2 手势识别流程
```java
// 手势识别流程
private void recognizeGesture(SensorEvent event) {
    synchronized (mLock) {
        // 检查手势识别是否启用
        if (!mGestureManager.isEnabled()) {
            return;
        }
        // 处理手势传感器数据
        GestureData gestureData = processGestureData(event);
        // 匹配支持的手势
        Gesture recognizedGesture = matchGesture(gestureData);
        if (recognizedGesture != null) {
            // 执行手势触发的动作
            executeGestureAction(recognizedGesture);
        }
    }
}
```

### 5.3 人来亮屏流程
```java
// 人来亮屏流程
private void processProximitySensorEvent(SensorEvent event) {
    synchronized (mLock) {
        // 检查人来亮屏是否启用
        if (!mProximityWakeManager.isEnabled()) {
            return;
        }
        // 获取接近传感器值
        float proximityValue = event.values[0];
        // 获取光线传感器值
        float lightValue = getCurrentLightValue();
        // 检查是否满足人来亮屏条件
        if (checkProximityWakeConditions(proximityValue, lightValue)) {
            // 唤醒设备
            mPowerManager.wakeUp(SystemClock.uptimeMillis(), PowerManager.WAKE_REASON_PROXIMITY, "Proximity Wake");
        }
    }
}
```

## 6. 主要功能

### 6.1 息屏显示
- 时间显示
- 日期显示
- 通知显示
- 天气信息显示
- 自定义息屏显示内容

### 6.2 手势识别
- 双击亮屏
- 画字母唤醒（如画C启动相机）
- 三指上滑显示通知
- 自定义手势支持

### 6.3 人来亮屏
- 接近传感器检测
- 光线传感器辅助检测
- 智能唤醒策略

### 6.4 功耗管理
- 息屏显示功耗监控
- 智能亮度调节
- 定时休眠机制

### 6.5 与亮灭屏协同
- 亮屏时自动关闭息屏显示
- 灭屏时自动启动息屏显示
- 根据电源状态调整息屏显示行为

## 7. 常用API和指令

### 7.1 主要API
- `AlwaysOnDisplayManager.isAlwaysOnDisplayAvailable()`：检查息屏显示是否可用
- `AlwaysOnDisplayManager.setAlwaysOnEnabled()`：启用或禁用息屏显示
- `GestureManager.registerGestureListener()`：注册手势监听器
- `ProximityWakeManager.setEnabled()`：启用或禁用人来亮屏

### 7.2 adb指令
```bash
# 查看息屏显示状态
adb shell dumpsys deviceidle aod

# 启用息屏显示
adb shell settings put global always_on_display_available 1

# 禁用息屏显示
adb shell settings put global always_on_display_available 0

# 设置息屏显示超时时间
adb shell settings put global always_on_display_timeout 60000

# 测试手势识别
adb shell input gesture swipe 100 100 200 200
```