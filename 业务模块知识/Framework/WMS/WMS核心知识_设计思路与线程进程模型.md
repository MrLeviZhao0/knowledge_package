# Android WindowManagerService (WMS) 核心知识

## 3. 设计思路

### 3.1 分层设计
**UI框架层**：在Surface上绘制UI元素并响应输入事件
- 负责View的测量、布局和绘制
- 通过ViewRootImpl与WMS进行通信

**WMS层**：管理Surface分配、层级顺序等
- 负责窗口的创建、添加、移除和布局
- 管理窗口的显示顺序和层级
- 与IMS协作处理输入事件

**SurfaceFlinger层**：将多个Surface混合并输出到屏幕
- 负责将多个Surface合成一个屏幕图像
- 管理Layer和BufferQueue
- 处理显示刷新和VSync信号

### 3.2 Binder通信机制
**客户端与WMS通信**：
1. 客户端通过IWindowSession代理向WMS请求窗口操作
2. WMS通过IWindow接口与应用程序进程通信
3. 通信流程示意图：
```
应用进程                                       WMS进程
┌─────────────┐                               ┌─────────────┐
│ WindowManagerImpl │─────IWindowSession──────>│ Session     │
└─────────────┘                               └───────┬─────┘
        │                                             │
        ▼                                             ▼
┌─────────────┐                               ┌─────────────┐
│ WindowManagerGlobal │                       │ WindowManagerService │
└─────────────┘                               └───────┬─────┘
        │                                             │
        ▼                                             ▼
┌─────────────┐                               ┌─────────────┐
│ ViewRootImpl │<───────IWindow────────────────│ WindowState │
└─────────────┘                               └─────────────┘
```

### 3.3 窗口令牌机制
**窗口令牌的作用**：
1. 确保窗口创建的合法性和安全性
2. 管理一组相关的窗口
3. 实现窗口的权限控制

**不同类型窗口的令牌**：
- Activity窗口：使用AppWindowToken
- Dialog窗口：使用Activity的AppWindowToken
- System Alert窗口：使用系统级令牌
- Toast窗口：使用系统级令牌

### 3.4 权限控制
**窗口权限检查**：
```java
// 在WMS的addWindow方法中进行权限检查
if (!checkAddPermission(attrs, callerUid, callerPackage)) {
    throw new SecurityException("Permission denied for window type " + attrs.type);
}
```

**权限类型**：
- SYSTEM_ALERT_WINDOW：允许显示系统级警告窗口
- INTERNAL_SYSTEM_WINDOW：允许显示内部系统窗口
- TYPE_APPLICATION_OVERLAY：允许显示应用程序覆盖窗口

### 3.5 ATMS与WMS的协同工作机制
**Activity启动过程中的协作**：
1. ATMS接收启动请求
2. ATMS准备启动
3. ATMS通知WMS
4. WMS创建窗口
5. WMS渲染视图
6. WMS显示窗口

**任务栈管理与窗口层级对应**：
- TaskRecord对应WindowToken
- ActivityRecord对应WindowState
- 任务栈顺序与窗口层级

## 4. 线程进程模型

### 4.1 主要线程
**system_server线程**：
- **启动调用栈**：
```
SystemServer.main()
└── SystemServer.run()
    └── SystemServer.startBootstrapServices()
    └── SystemServer.startCoreServices()
    └── SystemServer.startOtherServices()
        └── WindowManagerService.main()
```
- **作用**：SystemServer进程的主线程，负责启动系统服务

**android.display线程**：
- **启动调用栈**：
```
DisplayThread.getHandler()
└── Handler.runWithScissors()
    └── BlockingRunnable.postAndWait()
        └── DisplayThread.run()
            └── Looper.loop()
```
- **作用**：WMS创建和运行的主要线程，处理窗口布局和显示相关的操作

**android.ui线程**：
- **启动调用栈**：
```
UiThread.getHandler()
└── Handler.runWithScissors()
    └── BlockingRunnable.postAndWait()
        └── UiThread.run()
            └── Looper.loop()
```
- **作用**：PhoneWindowManager初始化和运行的线程，处理窗口策略相关的操作

### 4.2 线程间通信
**Handler机制**：
- WMS使用Handler在不同线程之间发送消息
- DisplayThread和UiThread都有自己的Handler

**Binder机制**：
- 应用进程与WMS之间通过Binder进行通信
- Session作为Binder服务端，处理客户端的请求

**线程同步**：
- 使用锁机制确保线程安全，如mWindowMapLock
- 使用信号量和条件变量进行线程同步

### 4.3 进程模型
**WMS进程**：
- 运行在SystemServer进程中
- 负责管理所有应用程序的窗口

**应用进程**：
- 每个应用程序进程对应一个Session实例
- 通过Session与WMS进行通信
- 包含一个或多个WindowState对象

**Session创建流程**：
```java
// 应用进程中
IWindowSession session = WindowManagerGlobal.getWindowSession(Looper.myLooper());

// WMS中
public static IWindowSession getWindowSession(Looper looper) {
    synchronized (WindowManagerGlobal.class) {
        if (sWindowSession == null) {
            try {
                InputMethodManager imm = InputMethodManager.getInstance();
                IWindowManager windowManager = getWindowManagerService();
                sWindowSession = windowManager.openSession(
                        new IWindowSessionCallback.Stub() {
                            @Override
                            public void onAnimatorScaleChanged(float scale) {
                                ValueAnimator.setDurationScale(scale);
                            }
                        },
                        imm.getClient(), imm.getInputContext());
            } catch (RemoteException e) {
                throw e.rethrowFromSystemServer();
            }
        }
        return sWindowSession;
    }
}
```