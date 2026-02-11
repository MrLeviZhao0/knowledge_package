# PMS (Power Manager Service) 核心知识

## 1. 概述
PowerManagerService（PMS）是Android系统中的核心服务之一，负责管理设备的电源状态、唤醒和休眠策略、电池管理等功能。PMS与其他系统服务（如DisplayManagerService、ActivityManagerService等）紧密协作，共同完成设备的电源管理。

## 2. 主要数据结构

### 2.1 PowerManagerService
**定义**：电源管理核心服务，管理设备电源状态
**核心成员变量**：
```java
public class PowerManagerService extends SystemService {
    // 设备电源状态
    private PowerState mPowerState;
    // 显示电源状态
    private DisplayPowerState mDisplayPowerState;
    // 唤醒锁管理
    private SparseArray<WakeLock> mWakeLocks;
    // 电源按键处理
    private PowerButtonReceiver mPowerButtonReceiver;
    // 灭屏超时时间
    private long mScreenOffTimeoutSetting;
    // 亮屏超时时间
    private long mScreenDimDurationSetting;
    // 电池信息
    private BatteryInfo mBatteryInfo;
    // 充电状态
    private boolean mIsCharging;
}
```

### 2.2 WakeLock
**定义**：唤醒锁，控制设备唤醒状态
**核心成员变量**：
```java
public final class WakeLock {
    // 唤醒锁类型
    private final int mFlags;
    // 唤醒锁标签
    private final String mTag;
    // 唤醒锁所有者
    private final String mOwnerPackageName;
    // 唤醒锁计数器
    private int mCount;
    // 唤醒锁获取时间
    private long mAcquireTime;
    // 唤醒锁超时时间
    private long mTimeout;
}
```

### 2.3 PowerState
**定义**：设备电源状态，管理设备整体电源状态
**核心成员变量**：
```java
private class PowerState {
    // 设备是否处于唤醒状态
    boolean mIsAwake;
    // 设备是否处于休眠状态
    boolean mIsAsleep;
    // 设备是否处于低功耗模式
    boolean mIsLowPowerMode;
    // 设备是否处于省电模式
    boolean mIsPowerSaveMode;
    // 设备是否处于充电状态
    boolean mIsCharging;
    // 设备剩余电量百分比
    int mBatteryLevel;
}
```

### 2.4 DisplayPowerState
**定义**：显示电源状态，管理屏幕亮度和开关
**核心成员变量**：
```java
private class DisplayPowerState {
    // 屏幕是否点亮
    boolean mScreenOn;
    // 屏幕亮度
    int mScreenBrightness;
    // 屏幕亮度模式（自动/手动）
    int mScreenBrightnessMode;
    // 屏幕是否处于低亮度模式
    boolean mScreenDimmed;
    // 息屏显示是否开启
    boolean mAlwaysOnEnabled;
}
```

## 3. 设计思路

### 3.1 分层设计
- **应用层**：通过PowerManager API访问电源管理功能
- **系统服务层**：PMS作为核心服务，管理电源状态和策略
- **硬件抽象层**：通过HAL接口与硬件交互（如电池、传感器等）

### 3.2 状态机设计
PMS使用状态机管理设备电源状态：
- **ON_STATE**：设备正常工作状态
- **DIM_STATE**：屏幕变暗状态
- **OFF_STATE**：屏幕关闭状态
- **DOZE_STATE**：低功耗深度休眠状态
- **SUSPEND_STATE**：设备挂起状态

### 3.3 唤醒锁机制
唤醒锁用于控制设备唤醒状态，防止设备进入休眠：
- **PARTIAL_WAKE_LOCK**：保持CPU运行，屏幕和键盘灯可能关闭
- **SCREEN_DIM_WAKE_LOCK**：保持CPU运行，允许屏幕变暗
- **SCREEN_BRIGHT_WAKE_LOCK**：保持CPU运行，屏幕保持高亮
- **FULL_WAKE_LOCK**：保持CPU运行，屏幕和键盘灯都开启

## 4. 线程进程模型

### 4.1 主要线程
- **SystemServer线程**：PMS服务启动线程
- **PowerManagerService线程**：PMS核心工作线程
- **BatteryService线程**：电池信息更新线程
- **SensorService线程**：传感器数据处理线程

### 4.2 进程模型
- **SystemServer进程**：PMS运行在此进程中
- **应用进程**：通过Binder与PMS通信

## 5. 核心流程

### 5.1 亮屏流程
```java
// 亮屏流程
public void wakeUp(long eventTime, String reason, int flags) {
    synchronized (mLock) {
        // 检查是否需要亮屏
        if (shouldWakeUp(eventTime, reason, flags)) {
            // 更新电源状态
            updatePowerStateLocked();
            // 发送亮屏广播
            sendWakeUpBroadcast(eventTime, reason, flags);
            // 通知其他服务
            notifyWakeUp(eventTime, reason, flags);
        }
    }
}
```

### 5.2 灭屏流程
```java
// 灭屏流程
public void goToSleep(long eventTime, int reason, int flags) {
    synchronized (mLock) {
        // 检查是否需要灭屏
        if (shouldGoToSleep(eventTime, reason, flags)) {
            // 更新电源状态
            updatePowerStateLocked();
            // 发送灭屏广播
            sendGoToSleepBroadcast(eventTime, reason, flags);
            // 通知其他服务
            notifyGoToSleep(eventTime, reason, flags);
        }
    }
}
```

### 5.3 唤醒锁获取流程
```java
// 唤醒锁获取流程
public void acquireWakeLock(WakeLock wakeLock, int flags, String tag, String packageName) {
    synchronized (mLock) {
        // 检查唤醒锁权限
        checkWakeLockPermission(wakeLock, flags, packageName);
        // 添加唤醒锁
        addWakeLockLocked(wakeLock, flags, tag, packageName);
        // 更新电源状态
        updatePowerStateLocked();
    }
}
```

## 6. 主要功能

### 6.1 电源状态管理
- 设备唤醒和休眠控制
- 电源按键处理
- 灭屏超时管理

### 6.2 唤醒锁管理
- 唤醒锁的获取和释放
- 唤醒锁权限检查
- 唤醒锁超时管理

### 6.3 电池管理
- 电池信息采集和更新
- 充电状态管理
- 低电量提醒

### 6.4 功耗优化
- 低功耗模式管理
- 省电模式管理
- 应用功耗监控

## 7. 常用API和指令

### 7.1 主要API
- `PowerManager.wakeUp()`：唤醒设备
- `PowerManager.goToSleep()`：让设备进入休眠
- `PowerManager.newWakeLock()`：创建唤醒锁
- `WakeLock.acquire()`：获取唤醒锁
- `WakeLock.release()`：释放唤醒锁

### 7.2 adb指令
```bash
# 查看电源管理状态
adb shell dumpsys power

# 唤醒设备
adb shell input keyevent KEYCODE_WAKEUP

# 让设备进入休眠
adb shell input keyevent KEYCODE_SLEEP

# 设置灭屏超时时间
adb shell settings put system screen_off_timeout 60000
```