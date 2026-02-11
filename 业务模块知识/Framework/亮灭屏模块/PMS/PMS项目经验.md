# PMS (Power Manager Service) 项目经验

## 1. 功能定制

### 1.1 自定义亮屏策略

**需求描述**：
- 实现会议模式，在会议期间自动延长亮屏时间
- 实现夜间模式，在夜间自动降低屏幕亮度并缩短亮屏时间
- 支持用户自定义亮屏策略

**实现方案**：
1. **策略管理模块**：创建亮屏策略管理模块，支持多种亮屏策略
2. **场景识别**：通过日历事件、时间、位置等识别当前场景
3. **策略切换**：根据识别到的场景自动切换亮屏策略
4. **用户配置界面**：提供用户自定义亮屏策略的界面

**核心代码**：
```java
// 亮屏策略管理类
public class ScreenOnPolicyManager {
    // 支持的策略列表
    private final Map<String, ScreenOnPolicy> mPolicies;
    // 当前激活的策略
    private ScreenOnPolicy mCurrentPolicy;
    // 策略切换监听器
    private final List<PolicyChangeListener> mListeners;
    
    // 注册亮屏策略
    public void registerPolicy(ScreenOnPolicy policy) {
        mPolicies.put(policy.getName(), policy);
    }
    
    // 切换到指定策略
    public void switchPolicy(String policyName) {
        ScreenOnPolicy newPolicy = mPolicies.get(policyName);
        if (newPolicy != null && mCurrentPolicy != newPolicy) {
            // 应用新策略
            newPolicy.apply();
            // 更新当前策略
            mCurrentPolicy = newPolicy;
            // 通知监听器
            notifyPolicyChanged(newPolicy);
        }
    }
    
    // 会议模式策略
    private class MeetingPolicy implements ScreenOnPolicy {
        @Override
        public void apply() {
            // 设置会议模式下的亮屏时间（延长至10分钟）
            Settings.System.putLong(mContext.getContentResolver(), 
                Settings.System.SCREEN_OFF_TIMEOUT, 10 * 60 * 1000);
            // 设置会议模式下的亮度（适中）
            Settings.System.putInt(mContext.getContentResolver(), 
                Settings.System.SCREEN_BRIGHTNESS, 150);
        }
    }
    
    // 夜间模式策略
    private class NightPolicy implements ScreenOnPolicy {
        @Override
        public void apply() {
            // 设置夜间模式下的亮屏时间（缩短至30秒）
            Settings.System.putLong(mContext.getContentResolver(), 
                Settings.System.SCREEN_OFF_TIMEOUT, 30 * 1000);
            // 设置夜间模式下的亮度（降低）
            Settings.System.putInt(mContext.getContentResolver(), 
                Settings.System.SCREEN_BRIGHTNESS, 50);
        }
    }
}
```

**遇到的困难与解决方案**：
- **场景识别准确性**：通过多维度信息（日历、时间、位置、连接的WiFi等）综合判断当前场景，提高识别准确性
- **策略冲突处理**：实现策略优先级机制，当多个策略条件同时满足时，应用优先级最高的策略
- **用户体验平衡**：在延长亮屏时间的同时，考虑电池续航影响，提供用户可配置的选项

### 1.2 唤醒锁管理优化

**需求描述**：
- 监控应用程序的唤醒锁使用情况
- 识别异常唤醒锁（如长时间持有唤醒锁的应用）
- 提供唤醒锁使用统计和优化建议

**实现方案**：
1. **唤醒锁监控**：Hook PMS的唤醒锁相关方法，监控唤醒锁的获取和释放
2. **异常检测**：检测长时间持有唤醒锁的应用，判断是否存在异常
3. **统计分析**：收集唤醒锁使用数据，进行统计分析
4. **用户反馈**：向用户提供唤醒锁使用情况报告和优化建议

**核心代码**：
```java
// 唤醒锁监控类
public class WakeLockMonitor {
    // 唤醒锁使用记录
    private final Map<String, WakeLockRecord> mWakeLockRecords;
    // 异常唤醒锁阈值（10分钟）
    private static final long ANOMALY_THRESHOLD = 10 * 60 * 1000;
    
    // 监控唤醒锁获取
    public void onWakeLockAcquired(String packageName, String tag, int flags) {
        WakeLockRecord record = mWakeLockRecords.get(packageName);
        if (record == null) {
            record = new WakeLockRecord(packageName);
            mWakeLockRecords.put(packageName, record);
        }
        record.acquire(tag, flags);
    }
    
    // 监控唤醒锁释放
    public void onWakeLockReleased(String packageName, String tag) {
        WakeLockRecord record = mWakeLockRecords.get(packageName);
        if (record != null) {
            record.release(tag);
            // 检查是否存在异常唤醒锁
            checkAnomalyWakeLock(record);
        }
    }
    
    // 检查异常唤醒锁
    private void checkAnomalyWakeLock(WakeLockRecord record) {
        long totalHoldTime = record.getTotalHoldTime();
        if (totalHoldTime > ANOMALY_THRESHOLD) {
            // 报告异常唤醒锁
            reportAnomalyWakeLock(record);
        }
    }
    
    // 唤醒锁记录类
    private class WakeLockRecord {
        private final String mPackageName;
        private final Map<String, WakeLockInfo> mWakeLocks;
        private long mTotalHoldTime;
        
        // 唤醒锁获取
        public void acquire(String tag, int flags) {
            WakeLockInfo info = mWakeLocks.get(tag);
            if (info == null) {
                info = new WakeLockInfo(tag, flags);
                mWakeLocks.put(tag, info);
            }
            info.acquire();
        }
        
        // 唤醒锁释放
        public void release(String tag) {
            WakeLockInfo info = mWakeLocks.get(tag);
            if (info != null) {
                long holdTime = info.release();
                mTotalHoldTime += holdTime;
            }
        }
    }
}
```

**遇到的困难与解决方案**：
- **Hook技术实现**：使用Xposed或Magisk框架实现对PMS唤醒锁方法的Hook
- **性能影响**：优化监控逻辑，减少对系统性能的影响
- **误判问题**：考虑合法的长时间唤醒锁使用场景（如音乐播放、下载等），避免误判

## 2. 性能优化

### 2.1 亮灭屏速度优化

**需求描述**：
- 优化设备亮灭屏速度，提升用户体验
- 减少亮灭屏过程中的延迟和卡顿

**实现方案**：
1. **异步处理**：将非关键操作移到后台线程执行
2. **预加载资源**：在合适时机预加载亮屏所需资源
3. **减少同步操作**：减少亮灭屏过程中的同步锁和阻塞操作
4. **优化动画**：简化或加速亮灭屏动画

**核心代码**：
```java
// 优化后的亮屏流程
public void wakeUp(long eventTime, String reason, int flags) {
    synchronized (mLock) {
        // 快速执行关键操作
        performQuickWakeUpActions(eventTime, reason, flags);
        
        // 将非关键操作移到后台线程
        mHandler.post(new Runnable() {
            @Override
            public void run() {
                performDeferredWakeUpActions();
            }
        });
    }
}

// 快速执行的关键操作
private void performQuickWakeUpActions(long eventTime, String reason, int flags) {
    // 更新电源状态
    mPowerState.setAwake(true);
    // 通知显示电源控制器开启屏幕
    mDisplayPowerController.requestPowerState(PowerManager.SCREEN_BRIGHT_WAKE_LOCK, true);
    // 发送唤醒广播
    sendWakeUpBroadcast(eventTime, reason, flags);
}

// 延迟执行的非关键操作
private void performDeferredWakeUpActions() {
    // 更新电池信息
    updateBatteryInfo();
    // 通知其他服务
    notifyOtherServices();
    // 记录唤醒统计信息
    recordWakeUpStats();
}
```

**遇到的困难与解决方案**：
- **关键操作识别**：分析亮灭屏流程，识别真正影响用户感知的关键操作
- **线程安全**：确保异步操作与同步操作之间的线程安全
- **状态一致性**：保证异步操作不会导致系统状态不一致

### 2.2 电池续航优化

**需求描述**：
- 优化电源管理策略，提高设备电池续航
- 减少不必要的唤醒和亮屏操作

**实现方案**：
1. **智能唤醒锁管理**：优化唤醒锁的使用，减少不必要的唤醒
2. **传感器优化**：减少传感器的采样频率，降低传感器功耗
3. **后台应用限制**：限制后台应用的CPU和网络使用，减少唤醒
4. **亮屏策略优化**：根据使用场景智能调整亮屏时间和亮度

**核心代码**：
```java
// 电池续航优化管理器
public class BatteryOptimizationManager {
    // 唤醒锁优化器
    private final WakeLockOptimizer mWakeLockOptimizer;
    // 传感器优化器
    private final SensorOptimizer mSensorOptimizer;
    // 后台应用限制器
    private final BackgroundAppLimiter mAppLimiter;
    // 亮屏策略优化器
    private final ScreenOnPolicyOptimizer mScreenOnOptimizer;
    
    // 唤醒锁优化器
    private class WakeLockOptimizer {
        // 合并短时间内的唤醒锁请求
        public void optimizeWakeLockRequests() {
            // 实现唤醒锁请求合并逻辑
            // ...
        }
        
        // 自动释放超时唤醒锁
        public void autoReleaseTimeoutWakeLocks() {
            // 实现超时唤醒锁自动释放逻辑
            // ...
        }
    }
    
    // 亮屏策略优化器
    private class ScreenOnPolicyOptimizer {
        // 根据使用模式预测最佳亮屏时间
        public long predictOptimalScreenOnTimeout() {
            // 分析用户使用模式，预测最佳亮屏时间
            // ...
            return optimalTimeout;
        }
        
        // 动态调整屏幕亮度
        public void adjustScreenBrightnessBasedOnUsage() {
            // 根据用户使用习惯动态调整屏幕亮度
            // ...
        }
    }
}
```

**遇到的困难与解决方案**：
- **用户体验与续航平衡**：在优化续航的同时，确保用户体验不受明显影响
- **使用模式学习**：通过机器学习算法分析用户使用模式，提供个性化的优化策略
- **兼容性问题**：确保优化策略与不同应用程序兼容，避免影响应用功能

## 3. 异常处理

### 3.1 避免频繁亮灭屏

**需求描述**：
- 防止设备因软件问题导致频繁亮灭屏
- 实现亮灭屏频率限制机制

**实现方案**：
1. **频率监控**：监控亮灭屏事件的发生频率
2. **阈值限制**：设置合理的亮灭屏频率阈值
3. **保护机制**：当频率超过阈值时，触发保护机制
4. **恢复机制**：在保护机制触发后，提供恢复正常状态的方法

**核心代码**：
```java
// 亮灭屏频率监控器
public class ScreenOnOffFrequencyMonitor {
    // 亮灭屏事件记录
    private final Queue<Long> mEventTimes;
    // 时间窗口大小（1分钟）
    private static final long TIME_WINDOW = 60 * 1000;
    // 频率阈值（每分钟5次）
    private static final int FREQUENCY_THRESHOLD = 5;
    // 保护机制是否已触发
    private boolean mProtectionTriggered;
    // 保护机制触发时间
    private long mProtectionTriggerTime;
    // 保护机制持续时间（10分钟）
    private static final long PROTECTION_DURATION = 10 * 60 * 1000;
    
    // 记录亮屏事件
    public void recordScreenOnEvent() {
        recordEvent(SystemClock.uptimeMillis());
    }
    
    // 记录灭屏事件
    public void recordScreenOffEvent() {
        recordEvent(SystemClock.uptimeMillis());
    }
    
    // 记录亮灭屏事件
    private void recordEvent(long eventTime) {
        // 添加新事件
        mEventTimes.add(eventTime);
        
        // 移除时间窗口外的事件
        long windowStart = eventTime - TIME_WINDOW;
        while (!mEventTimes.isEmpty() && mEventTimes.peek() < windowStart) {
            mEventTimes.poll();
        }
        
        // 检查频率是否超过阈值
        checkFrequency();
    }
    
    // 检查亮灭屏频率
    private void checkFrequency() {
        if (!mProtectionTriggered && mEventTimes.size() > FREQUENCY_THRESHOLD) {
            // 触发保护机制
            triggerProtection();
        } else if (mProtectionTriggered && SystemClock.uptimeMillis() - mProtectionTriggerTime > PROTECTION_DURATION) {
            // 保护机制到期，恢复正常
            restoreNormal();
        }
    }
    
    // 触发保护机制
    private void triggerProtection() {
        mProtectionTriggered = true;
        mProtectionTriggerTime = SystemClock.uptimeMillis();
        
        // 应用保护措施
        // 1. 延长亮屏时间（避免频繁灭屏）
        Settings.System.putLong(mContext.getContentResolver(), 
            Settings.System.SCREEN_OFF_TIMEOUT, 5 * 60 * 1000);
        
        // 2. 禁用某些可能导致频繁亮灭屏的功能
        disableProblematicFeatures();
        
        // 3. 通知用户
        notifyUser();
    }
}
```

**遇到的困难与解决方案**：
- **阈值设置**：根据用户正常使用习惯设置合理的频率阈值
- **误判处理**：考虑特殊使用场景（如调试、测试），避免误触发保护机制
- **恢复机制**：提供手动和自动恢复机制，确保用户可以正常使用设备

### 3.2 唤醒异常处理

**需求描述**：
- 处理设备无法正常唤醒的问题
- 实现唤醒异常的检测和恢复机制

**实现方案**：
1. **唤醒状态监控**：监控设备的唤醒状态转换
2. **异常检测**：检测唤醒异常情况
3. **恢复机制**：实现多种唤醒异常恢复策略
4. **日志记录**：记录唤醒异常信息，便于分析问题

**核心代码**：
```java
// 唤醒异常检测器
public class WakeUpAnomalyDetector {
    // 唤醒操作超时阈值（5秒）
    private static final long WAKE_UP_TIMEOUT = 5 * 1000;
    // 唤醒操作记录
    private WakeUpOperation mCurrentOperation;
    // 唤醒超时定时器
    private final Timer mWakeUpTimer;
    
    // 开始监控唤醒操作
    public void startMonitoringWakeUp(long eventTime, String reason) {
        // 取消之前的定时器
        cancelTimer();
        
        // 创建新的唤醒操作记录
        mCurrentOperation = new WakeUpOperation(eventTime, reason);
        
        // 设置唤醒超时定时器
        mWakeUpTimer.schedule(new TimerTask() {
            @Override
            public void run() {
                // 唤醒操作超时，触发异常处理
                handleWakeUpTimeout();
            }
        }, WAKE_UP_TIMEOUT);
    }
    
    // 唤醒操作完成
    public void onWakeUpCompleted() {
        // 取消定时器
        cancelTimer();
        
        // 记录唤醒操作完成
        if (mCurrentOperation != null) {
            mCurrentOperation.setCompleted(true);
            mCurrentOperation = null;
        }
    }
    
    // 处理唤醒超时异常
    private void handleWakeUpTimeout() {
        // 记录唤醒异常日志
        logWakeUpAnomaly();
        
        // 尝试恢复策略1：重新执行唤醒操作
        if (!retryWakeUp()) {
            // 尝试恢复策略2：重置显示电源状态
            if (!resetDisplayPowerState()) {
                // 尝试恢复策略3：重启相关服务
                restartRelatedServices();
            }
        }
    }
    
    // 重新执行唤醒操作
    private boolean retryWakeUp() {
        try {
            // 重新执行唤醒操作
            mPowerManager.wakeUp(SystemClock.uptimeMillis(), PowerManager.WAKE_REASON_UNKNOWN, "WakeUpRetry");
            return true;
        } catch (Exception e) {
            // 记录错误日志
            return false;
        }
    }
    
    // 重置显示电源状态
    private boolean resetDisplayPowerState() {
        try {
            // 重置显示电源状态
            mDisplayPowerController.reset();
            return true;
        } catch (Exception e) {
            // 记录错误日志
            return false;
        }
    }
}
```

**遇到的困难与解决方案**：
- **异常场景覆盖**：考虑各种可能的唤醒异常场景，提供全面的处理方案
- **恢复策略优先级**：设计合理的恢复策略优先级，从简单到复杂依次尝试
- **避免循环异常**：确保恢复策略不会导致新的异常或进入循环异常状态