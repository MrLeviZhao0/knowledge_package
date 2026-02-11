# Thermal（温控）核心知识

## 1. 概述
Thermal（温控）系统是Android系统中的重要组成部分，负责监控设备温度并采取相应的控制措施，以确保设备在安全温度范围内运行。温控系统与亮灭屏功能密切相关，当设备温度过高时，可能会降低屏幕亮度或关闭屏幕以减少热量产生。

## 2. 主要数据结构

### 2.1 ThermalManagerService
**定义**：温控核心服务，管理设备温度监控和控制
**核心成员变量**：
```java
public class ThermalManagerService extends SystemService {
    // 温控策略管理器
    private final ThermalPolicyManager mPolicyManager;
    // 温度区域列表
    private final List<ThermalZone> mThermalZones;
    // 温度传感器列表
    private final List<ThermalSensor> mThermalSensors;
    // 温控动作列表
    private final List<ThermalAction> mThermalActions;
    // 当前温度状态
    private int mCurrentThermalState;
    // 高温警告阈值
    private int mHighTemperatureThreshold;
    // 过热保护阈值
    private int mOverTemperatureThreshold;
    // 温度监控间隔
    private long mMonitoringInterval;
    // 亮灭屏控制接口
    private final PowerManager mPowerManager;
    private final DisplayManager mDisplayManager;
}
```

### 2.2 ThermalZone
**定义**：温度区域，设备上不同温度监测点的抽象表示
**核心成员变量**：
```java
private class ThermalZone {
    // 温度区域ID
    private final int mId;
    // 温度区域名称
    private final String mName;
    // 温度区域类型
    private final int mType;
    // 当前温度值
    private int mCurrentTemperature;
    // 历史温度数据
    private final List<Integer> mTemperatureHistory;
    // 温度变化趋势
    private int mTemperatureTrend;
    // 关联的传感器
    private final List<ThermalSensor> mAssociatedSensors;
}
```

### 2.3 ThermalSensor
**定义**：温度传感器，负责采集温度数据
**核心成员变量**：
```java
private class ThermalSensor {
    // 传感器ID
    private final int mId;
    // 传感器名称
    private final String mName;
    // 传感器类型
    private final int mType;
    // 传感器位置
    private final String mLocation;
    // 传感器当前温度
    private int mCurrentTemperature;
    // 传感器采样率
    private final int mSampleRate;
    // 传感器精度
    private final int mAccuracy;
}
```

### 2.4 ThermalAction
**定义**：温控动作，当温度达到特定阈值时执行的操作
**核心成员变量**：
```java
private class ThermalAction {
    // 动作ID
    private final int mId;
    // 动作名称
    private final String mName;
    // 触发温度阈值
    private final int mTemperatureThreshold;
    // 动作类型
    private final int mActionType;
    // 动作参数
    private final Bundle mActionParams;
    // 动作执行优先级
    private final int mPriority;
    // 动作是否已执行
    private boolean mExecuted;
}
```

### 2.5 ThermalPolicy
**定义**：温控策略，定义不同温度条件下的控制逻辑
**核心成员变量**：
```java
private class ThermalPolicy {
    // 策略ID
    private final int mId;
    // 策略名称
    private final String mName;
    // 策略适用场景
    private final int mScenario;
    // 策略包含的动作列表
    private final List<ThermalAction> mActions;
    // 策略启用状态
    private boolean mEnabled;
    // 策略触发条件
    private final ThermalCondition mTriggerCondition;
}
```

## 3. 设计思路

### 3.1 分层设计
- **应用层**：通过ThermalManager API访问温控功能
- **系统服务层**：ThermalManagerService作为核心服务，管理温度监控和控制
- **硬件抽象层**：通过HAL接口与温度传感器交互
- **驱动层**：温度传感器驱动程序，采集原始温度数据

### 3.2 温度监控机制
- **多区域监控**：监控设备不同部位的温度（如CPU、GPU、电池、显示屏等）
- **实时数据采集**：定期采集温度传感器数据
- **温度趋势分析**：分析温度变化趋势，预测温度发展
- **阈值触发机制**：当温度达到特定阈值时触发相应的温控动作

### 3.3 温控策略
- **分级控制**：根据温度高低采取不同程度的控制措施
- **场景适配**：针对不同使用场景（如游戏、视频、充电等）采用不同的温控策略
- **动态调整**：根据设备使用情况和环境条件动态调整温控策略

### 3.4 与亮灭屏的协同
- **亮度调节**：当温度升高时降低屏幕亮度，减少热量产生
- **屏幕关闭**：当温度过高时关闭屏幕，保护设备安全
- **息屏显示控制**：在高温条件下禁用息屏显示功能

## 4. 线程进程模型

### 4.1 主要线程
- **SystemServer线程**：ThermalManagerService服务启动线程
- **ThermalMonitoringThread**：温度监控线程，定期采集和分析温度数据
- **ThermalActionThread**：温控动作执行线程，执行温控策略
- **SensorService线程**：温度传感器数据处理线程

### 4.2 进程模型
- **SystemServer进程**：ThermalManagerService运行在此进程中
- **应用进程**：通过Binder与ThermalManagerService通信

## 5. 核心流程

### 5.1 温度监控流程
```java
// 温度监控流程
private void monitorTemperature() {
    synchronized (mLock) {
        // 遍历所有温度区域
        for (ThermalZone zone : mThermalZones) {
            // 更新温度数据
            updateThermalZoneTemperature(zone);
            // 检查温度阈值
            checkTemperatureThreshold(zone);
        }
        // 分析温度趋势
        analyzeTemperatureTrend();
        // 更新温度状态
        updateThermalState();
    }
}
```

### 5.2 温控动作执行流程
```java
// 温控动作执行流程
private void executeThermalActions(int thermalState) {
    synchronized (mLock) {
        // 获取当前温度状态对应的温控策略
        ThermalPolicy policy = mPolicyManager.getPolicyForState(thermalState);
        if (policy != null) {
            // 遍历策略中的所有动作
            for (ThermalAction action : policy.getActions()) {
                // 检查动作是否需要执行
                if (shouldExecuteAction(action)) {
                    // 执行温控动作
                    executeAction(action);
                    // 标记动作已执行
                    action.setExecuted(true);
                }
            }
        }
    }
}
```

### 5.3 温度与亮灭屏协同流程
```java
// 温度与亮灭屏协同流程
private void adjustDisplayBasedOnTemperature(int temperature) {
    synchronized (mLock) {
        if (temperature >= mHighTemperatureThreshold) {
            // 高温时降低屏幕亮度
            mDisplayManager.setBrightness(LOW_BRIGHTNESS_LEVEL);
        } else if (temperature >= mOverTemperatureThreshold) {
            // 过热时关闭屏幕
            mPowerManager.goToSleep(SystemClock.uptimeMillis(), PowerManager.GO_TO_SLEEP_REASON_OVERHEAT, 0);
            // 禁用息屏显示
            disableAlwaysOnDisplay();
        } else {
            // 温度正常时恢复屏幕亮度
            mDisplayManager.setBrightness(NORMAL_BRIGHTNESS_LEVEL);
            // 启用息屏显示
            enableAlwaysOnDisplay();
        }
    }
}
```

## 6. 主要功能

### 6.1 温度监控
- 多区域温度数据采集
- 温度实时监控和分析
- 温度趋势预测

### 6.2 温控策略管理
- 多种温控策略支持
- 策略动态切换
- 策略自定义配置

### 6.3 温控动作执行
- 屏幕亮度调节
- 屏幕开关控制
- CPU/GPU性能限制
- 充电限制
- 应用后台限制

### 6.4 温度警告与保护
- 高温警告通知
- 过热保护机制
- 设备安全关机

### 6.5 与亮灭屏协同
- 根据温度调整屏幕亮度
- 高温时自动关闭屏幕
- 控制息屏显示功能

## 7. 常用API和指令

### 7.1 主要API
- `ThermalManager.getThermalState()`：获取当前温度状态
- `ThermalManager.registerThermalStatusListener()`：注册温度状态监听器
- `ThermalManager.getThermalZones()`：获取温度区域列表
- `ThermalManager.getThermalSensors()`：获取温度传感器列表

### 7.2 adb指令
```bash
# 查看温控系统状态
adb shell dumpsys thermal

# 查看温度区域信息
adb shell dumpsys thermal zones

# 查看温度传感器信息
adb shell dumpsys thermal sensors

# 查看当前温度状态
adb shell cat /sys/class/thermal/thermal_zone*/temp

# 设置温度监控间隔
adb shell settings put global thermal_monitoring_interval 1000

# 设置高温警告阈值
adb shell settings put global thermal_high_temperature_threshold 45000
```