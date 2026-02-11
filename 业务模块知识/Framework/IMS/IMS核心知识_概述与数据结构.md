# Android InputManagerService (IMS) 核心知识

## 1. 概述
InputManagerService（IMS）是Android系统中的核心服务之一，负责管理所有输入事件的采集、处理和分发。IMS与WindowManagerService（WMS）、SurfaceFlinger等系统服务紧密协作，共同完成Android系统的用户输入处理功能。

## 2. 主要数据结构

### 2.1 InputManagerService
**定义**：输入系统的核心服务，管理输入事件的完整生命周期
**核心成员变量**：
```java
public class InputManagerService {  
    // 指向WMS服务
    final WindowManagerService mWindowManagerService;  
    // 输入调度器
    final InputDispatcher mDispatcher;
    // 输入读取器
    final InputReader mReader;
    // 输入读取线程
    InputReaderThread mReaderThread;
    // 输入调度线程
    InputDispatcherThread mDispatcherThread;
    // 输入设备管理器
    InputDeviceManager mInputDeviceManager;
    // 上下文
    final Context mContext;
}
```

### 2.2 InputDispatcher
**定义**：负责将输入事件分发给合适的应用窗口
**核心成员变量**：
```java
class InputDispatcher {  
    // 指向IMS服务
    final InputManagerService mService;
    // 输入事件队列
    final Queue<DispatchEntry> mInboundQueue;
    // 等待焦点的事件队列
    final Queue<DispatchEntry> mPendingFocusEvents;
    // 输入窗口列表
    final List<InputWindowHandle> mWindowHandles;
    // 当前焦点窗口
    InputWindowHandle mFocusedWindow;
    // 输入通道映射
    final Map<String, InputChannel> mInputChannels;
}
```

### 2.3 InputReader
**定义**：负责从输入设备读取原始数据并转换为输入事件
**核心成员变量**：
```java
class InputReader {  
    // 指向IMS服务
    final InputManagerService mService;
    // 输入设备管理器
    final InputDeviceManager mDeviceManager;
    // 输入事件监听器
    final InputListener mListener;
    // 输入设备列表
    final Map<Integer, InputDevice> mDevices;
    // 输入事件过滤器
    final InputEventFilter mFilter;
}
```

### 2.4 InputChannel
**定义**：应用程序与IMS之间的通信通道
**核心成员变量**：
```java
public final class InputChannel implements Parcelable {  
    // 输入通道名称
    final String mName;
    // 本地文件描述符
    final int mFd;
    // 输入通道令牌
    final IBinder mToken;
}
```

### 2.5 InputEvent
**定义**：输入事件的抽象类，包含KeyEvent、MotionEvent等子类
**核心成员变量**：
```java
public abstract class InputEvent implements Parcelable {  
    // 事件发生时间
    private long mEventTime;
    // 事件来源
    private int mSource;
    // 事件标志
    private int mFlags;
    // 事件设备ID
    private int mDeviceId;
    // 事件显示ID
    private int mDisplayId;
}
```

### 2.6 InputWindowHandle
**定义**：窗口的输入处理句柄，用于判断输入事件的目标窗口
**核心成员变量**：
```java
public class InputWindowHandle implements Parcelable {  
    // 窗口令牌
    final IBinder mToken;
    // 窗口名称
    String mName;
    // 窗口帧
    Rect mFrame;
    // 窗口可见区域
    Rect mVisibleFrame;
    // 窗口属性
    int mFlags;
    // 窗口类型
    int mType;
    // 窗口焦点
    boolean mHasFocus;
    // 窗口可见性
    boolean mVisible;
    // 窗口触摸模式
    boolean mTouchable;
    // 输入通道
    InputChannel mInputChannel;
}
```

### 2.7 InputDevice
**定义**：输入设备的抽象表示
**核心成员变量**：
```java
public final class InputDevice implements Parcelable {  
    // 设备ID
    private final int mId;
    // 设备名称
    private final String mName;
    // 设备描述
    private final String mDescriptor;
    // 设备类别
    private final int mSources;
    // 设备键盘布局
    private final KeyboardLayout mKeyboardLayout;
    // 设备指针参数
    private final PointerProperties[] mPointerProperties;
    // 设备指针坐标
    private final PointerCoords[] mPointerCoords;
}
```