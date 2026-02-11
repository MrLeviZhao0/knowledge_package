# Android InputManagerService (IMS) 核心知识

## 1. 对外提供的接口

### 1.1 IInputManager
**定义**：应用程序与IMS通信的主要接口
**主要方法**：
```java
public interface IInputManager extends IInterface {  
    // 获取输入设备列表
    List<InputDeviceInfo> getInputDeviceIds() throws RemoteException;
    // 获取输入设备信息
    InputDeviceInfo getInputDevice(int id) throws RemoteException;
    // 注入输入事件
    boolean injectInputEvent(InputEvent event, int mode) throws RemoteException;
    // 注册输入设备监听器
    void registerInputDeviceListener(IInputDeviceListener listener, Handler handler) throws RemoteException;
    // 注册输入管理器监听器
    void registerInputManagerListener(IInputManagerListener listener, Handler handler) throws RemoteException;
    // 获取输入焦点
    IBinder getFocusedWindowToken() throws RemoteException;
}
```

### 1.2 InputChannel
**定义**：应用程序与IMS之间的通信通道
**主要方法**：
```java
public final class InputChannel implements Parcelable {  
    // 创建输入通道对
    public static InputChannel[] openInputChannelPair(String name);
    // 发送输入事件
    public boolean sendInputEvent(InputEvent event);
    // 接收输入事件
    public InputEvent receiveInputEvent();
    // 关闭输入通道
    public void close();
}
```

### 1.3 InputMethodManager
**定义**：输入法管理接口
**主要方法**：
```java
public final class InputMethodManager {  
    // 显示输入法
    public boolean showSoftInput(View view, int flags);
    // 隐藏输入法
    public boolean hideSoftInputFromWindow(IBinder windowToken, int flags);
    // 切换输入法
    public void switchToLastInputMethod(IBinder token);
    // 获取当前输入法
    public InputMethodInfo getCurrentInputMethodInfo();
}
```

### 1.4 调试指令

**adb shell dumpsys input**：
```bash
# 查看输入系统状态
adb shell dumpsys input

# 查看输入设备列表
adb shell dumpsys input devices

# 查看输入窗口信息
adb shell dumpsys input windows

# 查看输入调度器状态
adb shell dumpsys input dispatcher
```

**adb shell getevent**：
```bash
# 监听所有输入设备的原始事件
adb shell getevent

# 监听特定输入设备的原始事件
adb shell getevent /dev/input/event0
```

**adb shell sendevent**：
```bash
# 发送按键事件（按下HOME键）
adb shell sendevent /dev/input/event0 1 102 1
adb shell sendevent /dev/input/event0 0 0 0
adb shell sendevent /dev/input/event0 1 102 0
adb shell sendevent /dev/input/event0 0 0 0
```

## 2. 对内主要运转流程

### 2.1 IMS启动流程
**伪代码**：
```java
public static InputManagerService main(Context context) {
    // 创建IMS实例
    InputManagerService ims = new InputManagerService(context);
    // 启动线程
    ims.start();
    return ims;
}

public InputManagerService(Context context) {
    mContext = context;
    // 初始化InputReader
    mReader = new InputReader(this);
    // 初始化InputDispatcher
    mDispatcher = new InputDispatcher(this);
    // 创建线程
    mReaderThread = new InputReaderThread(mReader);
    mDispatcherThread = new InputDispatcherThread(mDispatcher);
}

public void start() {
    // 启动InputReaderThread
    mReaderThread.start();
    // 启动InputDispatcherThread
    mDispatcherThread.start();
    // 注册输入设备监听
    registerInputDeviceListener();
}
```

### 2.2 输入事件处理流程
**伪代码**：
```java
// InputReader线程循环
public void run() {
    while (!mQuitRequested) {
        // 从设备读取原始数据
        RawInputEvent[] rawEvents = mDeviceManager.readEvents();
        // 转换为InputEvent
        for (RawInputEvent rawEvent : rawEvents) {
            InputEvent event = convertToInputEvent(rawEvent);
            // 发送到InputDispatcher
            mListener.onInputEvent(event);
        }
        // 处理设备变化
        processDeviceChanges();
    }
}

// 转换原始数据为InputEvent
private InputEvent convertToInputEvent(RawInputEvent rawEvent) {
    switch (rawEvent.type) {
        case EV_KEY:
            return new KeyEvent(rawEvent.time, rawEvent.code, rawEvent.value);
        case EV_ABS:
            return new MotionEvent(rawEvent.time, rawEvent.x, rawEvent.y);
        default:
            return null;
    }
}
```

### 2.3 输入事件分发流程
**伪代码**：
```java
// InputDispatcher处理输入事件
public void dispatchInputEvent(InputEvent event) {
    synchronized (mLock) {
        // 创建分发条目
        DispatchEntry entry = new DispatchEntry(event);
        // 添加到输入队列
        mInboundQueue.add(entry);
        // 唤醒分发线程
        mDispatcherThread.getLooper().wake();
    }
}

// InputDispatcher线程循环
public void run() {
    while (!mQuitRequested) {
        // 处理输入队列
        processInboundQueue();
        // 处理等待焦点的事件
        processPendingFocusEvents();
        // 处理超时事件
        processTimeouts();
    }
}

// 处理输入队列
private void processInboundQueue() {
    while (!mInboundQueue.isEmpty()) {
        DispatchEntry entry = mInboundQueue.poll();
        // 确定目标窗口
        InputWindowHandle targetWindow = findTargetWindow(entry.event);
        if (targetWindow != null) {
            // 分发事件到目标窗口
            dispatchEventToWindow(entry, targetWindow);
        }
    }
}

// 确定目标窗口
private InputWindowHandle findTargetWindow(InputEvent event) {
    if (event instanceof KeyEvent) {
        // 键盘事件发送到焦点窗口
        return mFocusedWindow;
    } else if (event instanceof MotionEvent) {
        MotionEvent motionEvent = (MotionEvent) event;
        float x = motionEvent.getX();
        float y = motionEvent.getY();
        // 触摸事件发送到触摸位置的窗口
        return findWindowAtPosition(x, y);
    }
    return null;
}

// 分发事件到目标窗口
private void dispatchEventToWindow(DispatchEntry entry, InputWindowHandle window) {
    // 获取输入通道
    InputChannel inputChannel = window.mInputChannel;
    if (inputChannel != null) {
        // 发送事件
        inputChannel.sendInputEvent(entry.event);
    }
}
```

### 2.4 输入焦点管理流程
**伪代码**：
```java
// WMS通知IMS焦点变化
public void setFocusedWindow(IBinder token) {
    synchronized (mLock) {
        // 查找窗口句柄
        InputWindowHandle windowHandle = findWindowHandleByToken(token);
        if (windowHandle != null) {
            // 更新焦点窗口
            mFocusedWindow = windowHandle;
            // 处理等待焦点的事件
            processPendingFocusEvents();
        }
    }
}

// 处理等待焦点的事件
private void processPendingFocusEvents() {
    while (!mPendingFocusEvents.isEmpty()) {
        DispatchEntry entry = mPendingFocusEvents.poll();
        // 重新分发事件到新的焦点窗口
        dispatchEventToWindow(entry, mFocusedWindow);
    }
}
```