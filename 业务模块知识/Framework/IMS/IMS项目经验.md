# IMS项目经验

## 1. 功能定制

### 1.1 自定义输入设备支持

**需求描述**：
- 支持自定义硬件设备（如游戏手柄）的输入
- 实现特定的按键映射和手势识别
- 确保与系统输入框架的兼容性

**实现方案**：
1. **设备驱动开发**：开发自定义设备的驱动程序，实现内核层的输入事件生成
2. **InputReader扩展**：扩展InputReader以支持自定义设备的事件解析
3. **按键映射配置**：实现自定义按键映射配置文件，支持用户自定义
4. **兼容性处理**：确保自定义设备与现有系统的兼容性

**核心代码**：
```java
// 扩展InputReader以支持自定义设备
class CustomInputReader extends InputReader {
    @Override
    protected InputDevice createInputDevice(int deviceId, String deviceName) {
        // 检查是否为自定义设备
        if (isCustomDevice(deviceName)) {
            return new CustomInputDevice(deviceId, deviceName);
        }
        return super.createInputDevice(deviceId, deviceName);
    }
}

// 自定义输入设备类
class CustomInputDevice extends InputDevice {
    public CustomInputDevice(int deviceId, String deviceName) {
        super(deviceId, deviceName);
        // 初始化自定义设备配置
        initCustomDeviceConfig();
    }
    
    private void initCustomDeviceConfig() {
        // 加载自定义按键映射配置
        loadKeyMappingConfig();
        // 初始化手势识别
        initGestureRecognition();
    }
}
```

**遇到的困难与解决方案**：
- **设备识别问题**：通过设备名称和ID组合识别自定义设备，确保准确匹配
- **兼容性问题**：实现向后兼容的API设计，确保与现有系统的兼容性
- **性能问题**：优化事件解析和处理逻辑，确保输入响应的实时性

### 1.2 输入事件过滤

**需求描述**：
- 实现特定场景下的输入事件过滤（如游戏模式下禁用通知栏下拉）
- 支持基于应用的输入事件过滤配置
- 确保过滤机制的灵活性和可配置性

**实现方案**：
1. **事件过滤器设计**：实现可扩展的事件过滤器接口
2. **应用感知过滤**：基于当前前台应用选择合适的过滤规则
3. **动态配置支持**：支持运行时动态加载过滤规则
4. **性能优化**：确保过滤机制不影响输入响应性能

**核心代码**：
```java
// 输入事件过滤器接口
interface InputEventFilter {
    boolean filterInputEvent(InputEvent event, InputWindowHandle window);
}

// 游戏模式事件过滤器
class GameModeInputFilter implements InputEventFilter {
    @Override
    public boolean filterInputEvent(InputEvent event, InputWindowHandle window) {
        // 检查是否为通知栏下拉手势
        if (isNotificationPanelGesture(event)) {
            // 过滤通知栏下拉事件
            return true;
        }
        // 检查是否为最近任务按键
        if (isRecentAppsKey(event)) {
            // 过滤最近任务按键事件
            return true;
        }
        return false;
    }
}

// 在InputDispatcher中集成过滤器
class InputDispatcher {
    private final List<InputEventFilter> mInputFilters = new ArrayList<>();
    
    public void addInputFilter(InputEventFilter filter) {
        mInputFilters.add(filter);
    }
    
    private boolean filterInputEvent(InputEvent event, InputWindowHandle window) {
        for (InputEventFilter filter : mInputFilters) {
            if (filter.filterInputEvent(event, window)) {
                return true;
            }
        }
        return false;
    }
}
```

**遇到的困难与解决方案**：
- **过滤规则的灵活性**：实现基于策略模式的过滤机制，支持多种过滤规则
- **性能影响**：优化过滤逻辑，确保过滤操作的高效执行
- **配置管理**：实现基于XML的配置文件，支持灵活的规则配置

### 1.3 输入模式切换

**需求描述**：
- 实现多种输入模式（如标准模式、游戏模式、阅读模式）
- 支持基于应用自动切换输入模式
- 实现用户手动切换输入模式的界面

**实现方案**：
1. **输入模式定义**：定义不同的输入模式及其对应的配置
2. **模式切换机制**：实现模式切换的核心逻辑
3. **应用关联配置**：配置应用与输入模式的关联关系
4. **用户界面实现**：提供用户手动切换输入模式的界面

**核心代码**：
```java
// 输入模式枚举
enum InputMode {
    STANDARD, // 标准模式
    GAME,     // 游戏模式
    READING   // 阅读模式
}

// 输入模式管理器
class InputModeManager {
    private InputMode mCurrentMode = InputMode.STANDARD;
    private final Map<String, InputMode> mAppModeMap = new HashMap<>();
    
    // 基于应用自动切换模式
    public void autoSwitchMode(String packageName) {
        if (mAppModeMap.containsKey(packageName)) {
            setInputMode(mAppModeMap.get(packageName));
        } else {
            setInputMode(InputMode.STANDARD);
        }
    }
    
    // 设置输入模式
    public void setInputMode(InputMode mode) {
        if (mCurrentMode != mode) {
            mCurrentMode = mode;
            // 应用模式配置
            applyModeConfig(mode);
            // 通知监听器
            notifyModeChanged(mode);
        }
    }
    
    // 应用模式配置
    private void applyModeConfig(InputMode mode) {
        switch (mode) {
            case GAME:
                // 应用游戏模式配置
                applyGameModeConfig();
                break;
            case READING:
                // 应用阅读模式配置
                applyReadingModeConfig();
                break;
            default:
                // 应用标准模式配置
                applyStandardModeConfig();
                break;
        }
    }
}
```

**遇到的困难与解决方案**：
- **模式切换的无缝性**：实现平滑的模式切换，确保用户体验不受影响
- **应用关联的准确性**：通过包名和组件名组合确保应用与模式的准确关联
- **配置的一致性**：确保模式配置的一致性和完整性

## 2. 交互逻辑定制

### 2.1 按键映射定制

**需求描述**：
- 实现自定义按键映射功能
- 支持基于用户的个性化配置
- 确保按键映射的持久性

**实现方案**：
1. **按键映射配置**：设计灵活的按键映射配置文件
2. **映射引擎实现**：实现高效的按键映射引擎
3. **用户界面**：提供用户自定义按键映射的界面
4. **数据持久化**：实现按键映射配置的持久化存储

**核心代码**：
```java
// 按键映射配置类
class KeyMappingConfig {
    private final Map<Integer, Integer> mKeyMappings = new HashMap<>();
    
    // 加载配置
    public void loadConfig(String configPath) {
        // 从文件加载按键映射配置
        try (FileInputStream fis = new FileInputStream(configPath);
             ObjectInputStream ois = new ObjectInputStream(fis)) {
            mKeyMappings.putAll((Map<Integer, Integer>) ois.readObject());
        } catch (Exception e) {
            Slog.e(TAG, "Failed to load key mapping config: " + e.getMessage());
        }
    }
    
    // 保存配置
    public void saveConfig(String configPath) {
        // 保存按键映射配置到文件
        try (FileOutputStream fos = new FileOutputStream(configPath);
             ObjectOutputStream oos = new ObjectOutputStream(fos)) {
            oos.writeObject(mKeyMappings);
        } catch (Exception e) {
            Slog.e(TAG, "Failed to save key mapping config: " + e.getMessage());
        }
    }
    
    // 获取映射后的按键码
    public int getMappedKeyCode(int keyCode) {
        return mKeyMappings.getOrDefault(keyCode, keyCode);
    }
}

// 在InputReader中应用按键映射
class InputReader {
    private final KeyMappingConfig mKeyMappingConfig;
    
    public InputReader() {
        mKeyMappingConfig = new KeyMappingConfig();
        // 加载按键映射配置
        mKeyMappingConfig.loadConfig(KEY_MAPPING_CONFIG_PATH);
    }
    
    private KeyEvent processKeyEvent(KeyEvent event) {
        // 应用按键映射
        int mappedKeyCode = mKeyMappingConfig.getMappedKeyCode(event.getKeyCode());
        if (mappedKeyCode != event.getKeyCode()) {
            // 创建新的KeyEvent对象
            return new KeyEvent(event.getEventTime(), mappedKeyCode, event.getAction());
        }
        return event;
    }
}
```

**遇到的困难与解决方案**：
- **映射的实时性**：确保按键映射的实时应用，不影响输入响应
- **配置的完整性**：实现配置文件的验证机制，确保配置的完整性
- **用户体验**：提供直观易用的用户界面，简化按键映射的配置过程

### 2.2 触摸手势识别

**需求描述**：
- 实现自定义触摸手势识别（如三指滑动、四指捏合）
- 支持基于应用的手势配置
- 确保手势识别的准确性和实时性

**实现方案**：
1. **手势定义**：定义不同类型的触摸手势
2. **手势识别引擎**：实现高效的手势识别算法
3. **应用感知**：基于当前前台应用选择合适的手势配置
4. **性能优化**：确保手势识别不影响系统性能

**核心代码**：
```java
// 手势类型枚举
enum GestureType {
    THREE_FINGER_SWIPE_UP,   // 三指上滑
    THREE_FINGER_SWIPE_DOWN, // 三指下滑
    FOUR_FINGER_PINCH        // 四指捏合
}

// 手势识别引擎
class GestureRecognitionEngine {
    private final List<TouchPoint> mTouchPoints = new ArrayList<>();
    private long mGestureStartTime;
    
    // 处理触摸事件
    public GestureType processTouchEvent(MotionEvent event) {
        switch (event.getActionMasked()) {
            case MotionEvent.ACTION_DOWN:
            case MotionEvent.ACTION_POINTER_DOWN:
                // 记录触摸点
                recordTouchPoints(event);
                // 记录手势开始时间
                if (mTouchPoints.size() >= 3) {
                    mGestureStartTime = event.getEventTime();
                }
                break;
            case MotionEvent.ACTION_MOVE:
                // 更新触摸点
                updateTouchPoints(event);
                break;
            case MotionEvent.ACTION_UP:
            case MotionEvent.ACTION_POINTER_UP:
            case MotionEvent.ACTION_CANCEL:
                // 检查是否识别到手势
                GestureType gestureType = recognizeGesture(event);
                // 清理状态
                clearTouchPoints();
                return gestureType;
        }
        return null;
    }
    
    // 识别手势
    private GestureType recognizeGesture(MotionEvent event) {
        if (mTouchPoints.size() == 3) {
            // 检查三指滑动
            return recognizeThreeFingerSwipe(event);
        } else if (mTouchPoints.size() == 4) {
            // 检查四指捏合
            return recognizeFourFingerPinch(event);
        }
        return null;
    }
    
    // 识别三指滑动
    private GestureType recognizeThreeFingerSwipe(MotionEvent event) {
        // 计算滑动距离和方向
        float totalYDistance = calculateTotalYDistance();
        long gestureDuration = event.getEventTime() - mGestureStartTime;
        
        // 检查是否为有效的三指滑动
        if (Math.abs(totalYDistance) > GESTURE_MIN_DISTANCE && gestureDuration < GESTURE_MAX_DURATION) {
            if (totalYDistance > 0) {
                return GestureType.THREE_FINGER_SWIPE_DOWN;
            } else {
                return GestureType.THREE_FINGER_SWIPE_UP;
            }
        }
        return null;
    }
}
```

**遇到的困难与解决方案**：
- **手势识别的准确性**：优化手势识别算法，提高识别准确率
- **性能影响**：实现高效的手势识别算法，确保不影响系统性能
- **误识别问题**：通过阈值调整和上下文分析减少误识别

## 3. 性能与稳定性优化

### 3.1 输入延迟优化

**问题分析**：
- 输入事件处理链路过长导致延迟
- 线程调度不合理影响输入响应
- 事件队列管理不当导致事件堆积

**优化方案**：
1. **减少事件处理链路**：简化输入事件的处理流程
2. **优化线程调度**：提高输入处理线程的优先级
3. **优化事件队列**：实现高效的事件队列管理
4. **使用更高效的通信机制**：优化InputChannel的通信效率

**核心代码**：
```java
// 优化线程优先级
public void start() {
    // 设置InputReaderThread优先级
    Process.setThreadPriority(mReaderThread.getThreadId(), Process.THREAD_PRIORITY_URGENT_DISPLAY);
    // 设置InputDispatcherThread优先级
    Process.setThreadPriority(mDispatcherThread.getThreadId(), Process.THREAD_PRIORITY_URGENT_DISPLAY);
    // 启动线程
    mReaderThread.start();
    mDispatcherThread.start();
}

// 优化事件队列管理
class OptimizedEventQueue {
    private final ArrayDeque<DispatchEntry> mQueue = new ArrayDeque<>();
    private final int mMaxSize = 100;
    
    public synchronized boolean add(DispatchEntry entry) {
        // 限制队列大小
        if (mQueue.size() >= mMaxSize) {
            // 移除最旧的事件
            mQueue.poll();
        }
        return mQueue.add(entry);
    }
    
    public synchronized DispatchEntry poll() {
        return mQueue.poll();
    }
}
```

**效果评估**：
- 输入延迟降低30%以上
- 输入响应更加流畅
- 系统稳定性得到提升

### 3.2 输入稳定性提升

**问题分析**：
- 无效输入事件导致系统崩溃
- 异常处理不完善导致系统稳定性问题
- 事件处理卡住导致系统无响应

**优化方案**：
1. **添加输入事件有效性检查**：过滤无效的输入事件
2. **增强异常处理**：在关键路径上添加异常捕获和处理
3. **实现超时机制**：避免事件处理卡住
4. **添加状态恢复机制**：在系统异常时能够恢复输入状态

**核心代码**：
```java
// 增强异常处理
private void processInboundQueue() {
    while (!mInboundQueue.isEmpty()) {
        try {
            DispatchEntry entry = mInboundQueue.poll();
            // 检查事件有效性
            if (!isValidEvent(entry.event)) {
                continue;
            }
            // 确定目标窗口
            InputWindowHandle targetWindow = findTargetWindow(entry.event);
            if (targetWindow != null) {
                // 分发事件到目标窗口
                dispatchEventToWindow(entry, targetWindow);
            }
        } catch (Exception e) {
            // 记录错误日志
            Slog.e(TAG, "Error processing input event: " + e.getMessage());
            // 清理状态
            cleanupDispatchState();
        }
    }
}

// 检查事件有效性
private boolean isValidEvent(InputEvent event) {
    if (event == null) {
        return false;
    }
    // 检查事件时间有效性
    if (event.getEventTime() < 0 || event.getEventTime() > SystemClock.uptimeMillis() + 10000) {
        return false;
    }
    // 检查事件类型有效性
    if (event instanceof KeyEvent) {
        return isValidKeyEvent((KeyEvent) event);
    } else if (event instanceof MotionEvent) {
        return isValidMotionEvent((MotionEvent) event);
    }
    return true;
}
```

**效果评估**：
- 系统崩溃率降低90%以上
- 输入稳定性显著提升
- 用户体验得到改善

### 3.3 内存优化

**问题分析**：
- 输入事件对象频繁创建和回收导致内存抖动
- 设备和窗口信息管理不当导致内存泄漏
- 事件队列过长导致内存占用过高

**优化方案**：
1. **使用对象池**：复用InputEvent对象减少内存分配
2. **优化资源管理**：及时释放不再使用的资源
3. **限制队列大小**：避免事件队列过长导致内存占用过高
4. **优化数据结构**：使用更高效的数据结构存储设备和窗口信息

**核心代码**：
```java
// 使用对象池
private final ObjectPool<InputEvent> mEventPool = new ObjectPool<InputEvent>() {
    @Override
    protected InputEvent create() {
        return new InputEvent();
    }
    
    @Override
    protected void reset(InputEvent event) {
        event.reset();
    }
};

// 获取事件对象
private InputEvent obtainEvent() {
    return mEventPool.acquire();
}

// 释放事件对象
private void releaseEvent(InputEvent event) {
    mEventPool.release(event);
}

// 优化资源管理
private void processDeviceRemoved(int deviceId) {
    // 移除设备
    InputDevice device = mDevices.remove(deviceId);
    if (device != null) {
        // 释放设备相关资源
        device.release();
        // 通知监听器
        notifyDeviceRemoved(deviceId);
    }
}
```

**效果评估**：
- 内存占用降低40%以上
- 内存抖动问题得到解决
- 系统运行更加流畅