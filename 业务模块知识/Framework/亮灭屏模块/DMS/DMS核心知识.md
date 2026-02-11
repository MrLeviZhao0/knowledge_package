# DMS (Display Manager Service) 核心知识

## 1. 概述
DisplayManagerService（DMS）是Android系统中的核心服务之一，负责管理设备的显示设备、显示状态、显示模式等。DMS与PowerManagerService（PMS）紧密协作，共同完成设备的显示管理功能，如屏幕亮灭、亮度调节、显示模式切换等。

## 2. 主要数据结构

### 2.1 DisplayManagerService
**定义**：显示管理核心服务，管理设备显示状态
**核心成员变量**：
```java
public class DisplayManagerService extends SystemService {
    // 显示设备列表
    private final ArrayList<DisplayDevice> mDisplayDevices;
    // 逻辑显示列表
    private final ArrayList<LogicalDisplay> mLogicalDisplays;
    // 显示适配器列表
    private final ArrayList<DisplayAdapter> mDisplayAdapters;
    // 显示电源控制器
    private final DisplayPowerController mDisplayPowerController;
    // 显示亮度设置
    private int mScreenBrightnessSetting;
    // 显示亮度模式
    private int mScreenBrightnessModeSetting;
    // 显示超时时间
    private long mScreenOffTimeoutSetting;
    // 息屏显示支持
    private boolean mAlwaysOnDisplayAvailable;
}
```

### 2.2 DisplayDevice
**定义**：物理显示设备的抽象表示
**核心成员变量**：
```java
private abstract class DisplayDevice {
    // 显示设备ID
    private final int mId;
    // 显示设备名称
    private final String mName;
    // 显示设备物理尺寸
    private final Point mPhysicalSize;
    // 显示设备像素密度
    private final int mDensityDpi;
    // 显示设备刷新率
    private final float mRefreshRate;
    // 显示设备当前亮度
    private int mCurrentBrightness;
    // 显示设备当前状态
    private int mCurrentState;
}
```

### 2.3 LogicalDisplay
**定义**：逻辑显示，可能对应一个或多个物理显示设备
**核心成员变量**：
```java
private class LogicalDisplay {
    // 逻辑显示ID
    private final int mId;
    // 物理显示设备
    private DisplayDevice mDisplayDevice;
    // 显示尺寸
    private final Point mSize;
    // 显示密度
    private final int mDensityDpi;
    // 显示旋转角度
    private int mRotation;
    // 显示模式
    private int mMode;
    // 显示内容可见性
    private boolean mContentVisible;
}
```

### 2.4 DisplayPowerController
**定义**：显示电源控制器，管理屏幕亮度和开关
**核心成员变量**：
```java
private class DisplayPowerController {
    // 显示电源状态
    private int mPowerState;
    // 当前显示亮度
    private int mActualBrightness;
    // 请求的显示亮度
    private int mRequestedBrightness;
    // 自动亮度调节启用状态
    private boolean mAutoBrightnessEnabled;
    // 亮度传感器值
    private int mLightSensorValue;
    // 屏幕是否处于低亮度模式
    private boolean mDimmed;
    // 屏幕是否点亮
    private boolean mScreenOn;
}
```

## 3. 设计思路

### 3.1 分层设计
- **应用层**：通过DisplayManager API访问显示管理功能
- **系统服务层**：DMS作为核心服务，管理显示设备和状态
- **硬件抽象层**：通过HAL接口与显示硬件交互

### 3.2 设备抽象
- **物理显示设备**：直接与硬件对应的显示设备
- **逻辑显示**：应用程序感知到的显示设备，可能映射到一个或多个物理显示设备
- **显示适配器**：负责检测和管理物理显示设备

### 3.3 状态管理
- **显示状态**：屏幕点亮、变暗、熄灭等状态
- **显示模式**：不同的显示分辨率、刷新率等模式
- **亮度调节**：手动和自动亮度调节机制

## 4. 线程进程模型

### 4.1 主要线程
- **SystemServer线程**：DMS服务启动线程
- **DisplayManagerService线程**：DMS核心工作线程
- **DisplayPowerController线程**：显示电源控制线程
- **SensorService线程**：亮度传感器数据处理线程

### 4.2 进程模型
- **SystemServer进程**：DMS运行在此进程中
- **应用进程**：通过Binder与DMS通信

## 5. 核心流程

### 5.1 显示设备检测流程
```java
// 显示设备检测流程
private void detectDisplayDevices() {
    synchronized (mSyncRoot) {
        // 遍历所有显示适配器
        for (DisplayAdapter adapter : mDisplayAdapters) {
            // 检测显示设备
            adapter.detectDisplayDevices();
        }
    }
}
```

### 5.2 屏幕点亮流程
```java
// 屏幕点亮流程
public void requestDisplayState(int state, int reason) {
    synchronized (mSyncRoot) {
        // 更新显示状态请求
        mPendingDisplayState = state;
        mPendingDisplayStateReason = reason;
        // 发送显示状态变更请求
        sendUpdatePowerStateLocked();
    }
}
```

### 5.3 亮度调节流程
```java
// 亮度调节流程
public void setBrightness(int brightness) {
    synchronized (mSyncRoot) {
        // 更新亮度设置
        mScreenBrightnessSetting = brightness;
        // 更新显示电源状态
        updateDisplayPowerStateLocked();
    }
}
```

## 6. 主要功能

### 6.1 显示设备管理
- 物理显示设备的检测和配置
- 逻辑显示的创建和管理
- 显示设备的热插拔支持

### 6.2 显示状态管理
- 屏幕点亮和熄灭控制
- 屏幕亮度调节（手动和自动）
- 屏幕旋转控制

### 6.3 显示模式管理
- 不同显示分辨率的支持
- 不同刷新率的支持
- 显示模式的切换

### 6.4 息屏显示支持
- 息屏显示的启用和禁用
- 息屏显示内容的管理
- 息屏显示功耗优化

## 7. 常用API和指令

### 7.1 主要API
- `DisplayManager.getDisplays()`：获取显示设备列表
- `Display.getSize()`：获取显示尺寸
- `Display.getRotation()`：获取显示旋转角度
- `DisplayManager.setBrightness()`：设置显示亮度
- `DisplayManager.setBrightnessMode()`：设置显示亮度模式

### 7.2 adb指令
```bash
# 查看显示管理状态
adb shell dumpsys display

# 查看显示设备列表
adb shell dumpsys display devices

# 设置显示亮度
adb shell settings put system screen_brightness 200

# 设置显示亮度模式（0：手动，1：自动）
adb shell settings put system screen_brightness_mode 1

# 设置显示超时时间
adb shell settings put system screen_off_timeout 60000
```