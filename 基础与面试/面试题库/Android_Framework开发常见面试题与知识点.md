# Android Framework开发常见面试题与知识点

## 1. Activity相关

### 1.1 Activity生命周期
**问题**：请简述Activity的生命周期及其在横竖屏切换时的变化。

**答案要点**：
- 标准生命周期：onCreate() → onStart() → onResume() → onPause() → onStop() → onDestroy()
- 横竖屏切换：默认情况下会销毁当前Activity并重新创建，经历onPause() → onStop() → onDestroy() → onCreate() → onStart() → onResume()
- 可通过在AndroidManifest.xml中设置configChanges属性避免重建：android:configChanges="orientation|screenSize"

### 1.2 Activity启动模式
**问题**：Activity的四种启动模式及其区别？

**答案要点**：
- **standard**：标准模式，每次启动都会创建新实例
- **singleTop**：栈顶复用，如果Activity在栈顶则复用，否则创建新实例
- **singleTask**：栈内复用，如果Activity存在栈中则清除其上的所有Activity并复用
- **singleInstance**：单实例模式，独占一个任务栈

### 1.3 Activity启动流程
**问题**：简述从点击应用到Activity显示的完整流程。

**答案要点**：
1. Launcher发送Intent请求
2. Instrumentation通过ActivityManagerService(AMS)处理请求
3. AMS检查进程是否存在，不存在则通过Zygote创建新进程
4. 进程启动后，ActivityThread通过ApplicationThread与AMS通信
5. AMS通知ActivityThread创建Activity实例
6. 执行Activity的onCreate()、onStart()、onResume()生命周期

## 2. Fragment相关

### 2.1 Fragment生命周期
**问题**：Fragment的生命周期与Activity生命周期的关系？

**答案要点**：
- Fragment生命周期依赖于Activity的生命周期
- Fragment特有生命周期：onAttach() → onCreate() → onCreateView() → onViewCreated() → onActivityCreated() → onStart() → onResume() → onPause() → onStop() → onDestroyView() → onDestroy() → onDetach()
- 在Fragment中使用Context时需要注意生命周期，避免在onDetach()后使用

### 2.2 Fragment常见问题
**问题**：使用Fragment时遇到的常见问题及解决方案？

**答案要点**：
- **Fragment重叠**：在Activity重建时未正确保存Fragment状态，解决方案：在onCreate中判断savedInstanceState是否为null
- **Context获取**：在onAttach()后才能通过getActivity()获取Context，避免在onCreate()中直接使用
- **嵌套Fragment**：使用getChildFragmentManager()而不是getFragmentManager()

## 3. Handler机制

### 3.1 Handler机制原理
**问题**：详细分析Handler机制的工作原理。

**答案要点**：
- Handler机制包含四个核心组件：
  - Handler：发送和处理消息
  - Message：消息对象，包含消息信息
  - MessageQueue：消息队列，存储消息
  - Looper：循环器，从MessageQueue取出消息并分发给Handler
- 工作流程：
  1. 线程创建Handler时关联该线程的Looper和MessageQueue
  2. 通过Handler的sendMessage()将消息放入MessageQueue
  3. Looper循环从MessageQueue取出消息
  4. 调用Handler的handleMessage()处理消息

### 3.2 Handler导致的内存泄漏
**问题**：Handler为什么会造成内存泄漏，如何解决？

**答案要点**：
- 原因：非静态内部类（如匿名内部类）持有外部类（如Activity）的引用，而Handler消息可能延迟执行，导致Activity无法被回收
- 解决方案：
  1. 使用静态内部类+弱引用
  2. 在Activity的onDestroy()中清除Handler的消息队列

## 4. Binder机制

### 4.1 Binder机制原理
**问题**：什么是Binder机制，为什么Android选择Binder作为IPC机制？

**答案要点**：
- Binder是Android中一种高效的IPC（进程间通信）机制
- 优势：
  - 性能高：只需一次数据拷贝，传统管道、消息队列需要两次
  - 实现C/S架构：客户端/服务端模型清晰
  - 安全性好：每个进程都有UID/PID，Binder会验证权限
  - 线程模型好：基于线程池的并发处理

### 4.2 AIDL使用
**问题**：AIDL的全称是什么？如何使用？能处理哪些类型的数据？

**答案要点**：
- AIDL全称：Android Interface Definition Language（Android接口定义语言）
- 使用步骤：
  1. 创建.aidl文件定义接口
  2. 实现接口（Stub类）
  3. 客户端通过ServiceConnection绑定服务
  4. 获取接口实例并调用方法
- 支持的数据类型：
  - 基本数据类型（int, long, boolean等）
  - String和CharSequence
  - Parcelable
  - List和Map（元素必须是支持的数据类型）

### 4.3 Binder一次拷贝原理
**问题**：Binder如何实现一次拷贝？mmap原理是什么？

**答案要点**：
- 传统IPC：发送方内存→内核缓冲区→接收方内存（两次拷贝）
- Binder IPC：通过mmap将接收方用户空间映射到内核空间，发送方数据直接拷贝到内核空间（一次拷贝）
- mmap原理：内存映射，将用户空间的一块地址映射到内核空间，实现用户空间和内核空间共享内存

## 5. 系统服务

### 5.1 AMS（ActivityManagerService）
**问题**：AMS的主要职责是什么？AMS与ActivityThread如何通信？

**答案要点**：
- AMS主要职责：
  - Activity栈管理
  - 进程管理
  - 权限管理
  - 内存管理
- AMS与ActivityThread通信：
  - 通过Binder机制
  - ActivityThread内部类ApplicationThread作为Binder客户端
  - AMS通过IApplicationThread接口调用ActivityThread方法

### 5.2 WMS（WindowManagerService）
**问题**：WMS的主要职责是什么？WMS与SurfaceFlinger的关系？

**答案要点**：
- WMS主要职责：
  - 窗口管理（创建、移除、布局）
  - 输入事件分发
  - 窗口动画
  - 焦点管理
- WMS与SurfaceFlinger关系：
  - WMS负责窗口逻辑管理
  - SurfaceFlinger负责图形合成
  - WMS通过SurfaceFlinger申请Surface，并将窗口内容绘制到Surface

### 5.3 PMS（PackageManagerService）
**问题**：PMS的主要职责是什么？应用安装流程是怎样的？

**答案要点**：
- PMS主要职责：
  - 应用包管理（安装、卸载、更新）
  - 权限管理
  - 组件解析
  - Intent解析
- 应用安装流程：
  1. 解析APK文件（AndroidManifest.xml、资源、代码）
  2. 扫描应用组件（Activity、Service等）
  3. 权限检查和授权
  4. 创建应用数据目录
  5. 更新系统配置

## 6. 显示系统

### 6.1 SurfaceFlinger
**问题**：SurfaceFlinger的主要职责是什么？与WMS如何协作？

**答案要点**：
- SurfaceFlinger主要职责：
  - 图层合成
  - 显示输出
  - VSync信号管理
  - 帧率控制
- 与WMS协作：
  - WMS管理窗口逻辑
  - SurfaceFlinger负责图形合成
  - WMS通过SurfaceFlinger申请Surface
  - 应用将绘制内容写入Surface
  - SurfaceFlinger合成所有Surface并显示

### 6.2 VSync信号
**问题**：VSync信号的作用是什么？双重缓冲和三重缓冲的区别？

**答案要点**：
- VSync信号作用：
  - 同步应用绘制和屏幕刷新
  - 避免画面撕裂
  - 协调CPU和GPU工作
- 双重缓冲：
  - 前缓冲（显示）和后缓冲（绘制）
  - 下一帧开始时交换缓冲
- 三重缓冲：
  - 前缓冲、后缓冲和第三缓冲
  - 解决双重缓冲在帧率低于刷新率时的卡顿问题

## 7. 性能优化

### 7.1 内存泄漏
**问题**：什么是内存泄漏？如何检测和解决？

**答案要点**：
- 定义：不再使用的对象无法被GC回收
- 常见原因：
  - 静态变量持有Activity引用
  - 非静态内部类持有外部类引用
  - 未注销的监听器
  - 未关闭的资源（Cursor、Stream等）
- 检测工具：
  - Android Studio的Memory Profiler
  - LeakCanary
  - MAT（Memory Analyzer Tool）
- 解决方案：
  - 及时释放资源
  - 使用弱引用
  - 避免静态变量持有Activity引用

### 7.2 启动优化
**问题**：如何优化应用启动速度？冷启动和热启动的区别？

**答案要点**：
- 冷启动：系统首次启动应用，需要创建进程
- 热启动：应用已存在进程，只是从后台切换到前台
- 优化方法：
  - Application初始化优化
  - 首屏布局优化
  - 启动阶段异步加载非必要资源
  - 使用Theme.Splash避免白屏
  - 延迟初始化非关键组件

### 7.3 渲染优化
**问题**：如何优化UI渲染性能？过度绘制的检测和解决？

**答案要点**：
- 优化方法：
  - 减少布局层级
  - 使用ConstraintLayout减少嵌套
  - 避免过度绘制
  - 使用ViewStub延迟加载
  - 合理使用RecyclerView的缓存机制
- 过度绘制检测：
  - 开发者选项中的"调试GPU过度绘制"
  - Android Studio的GPU Profiler
- 解决方案：
  - 移除不必要的背景
  - 使用clipRect限制绘制区域
  - 使用View的visibility而非gone

## 8. 系统启动流程

### 8.1 Android系统启动
**问题**：简述Android系统启动流程，涉及Framework部分。

**答案要点**：
1. Bootloader引导内核启动
2. Linux内核启动，启动init进程
3. init进程解析init.rc，启动系统服务
4. 启动Zygote进程
5. Zygote孵化SystemServer进程
6. SystemServer启动系统服务：
   - AMS（ActivityManagerService）
   - WMS（WindowManagerService）
   - PMS（PackageManagerService）
   - 其他系统服务
7. 系统服务准备就绪，启动Launcher

### 8.2 Zygote进程
**问题**：什么是Zygote进程？为什么需要Zygote？

**答案要点**：
- Zygote是Android系统的"应用进程孵化器"
- 作用：
  - 预加载常用类和资源，减少应用启动时间
  - 通过fork()创建应用进程，共享内存空间
  - 提供统一的进程初始化环境
- 启动流程：
  1. init进程启动Zygote
  2. Zygote创建虚拟机并预加载类
  3. 注册Socket监听
  4. 接收AMS请求，fork()创建应用进程

## 9. 最新技术趋势

### 9.1 Kotlin语言特性
**问题**：Kotlin相比Java的优势？在Android开发中的应用？

**答案要点**：
- 优势：
  - 空安全（Null Safety）
  - 扩展函数
  - 数据类（Data Class）
  - 协程（Coroutine）替代线程
  - 更简洁的语法
- 在Android中的应用：
  - Jetpack组件全面支持Kotlin
  - 协程简化异步编程
  - ViewModel和LiveData的Kotlin扩展
  - KTX库提供Kotlin友好的API

### 9.2 跨平台技术
**问题**：Flutter和React Native的原理和区别？

**答案要点**：
- Flutter：
  - 基于Dart语言
  - 自绘引擎（Skia），不依赖原生组件
  - 高性能，但包体积较大
  - 适合对性能要求高的应用
- React Native：
  - 基于JavaScript
  - 桥接原生组件
  - 包体积小，但性能受限
  - 适合快速开发和迭代

## 10. 高级面试题

### 10.1 AMS与ActivityThread通信
**问题**：如何理解AMS和ActivityThread之间的Binder通信？

**答案要点**：
- 双向Binder通信：
  - ActivityThread→AMS：通过ActivityManagerProxy
  - AMS→ActivityThread：通过IApplicationThread
- 通信内容：
  - 启动/停止Activity
  - 服务绑定
  - 广播发送
  - 内容提供者查询
- 实现机制：
  - AIDL生成的接口
  - 单例模式确保唯一性
  - 线程池处理并发请求

### 10.2 WMS与SurfaceFlinger同步
**问题**：dumpsys window和sf一定会一致么？为什么？

**答案要点**：
- 不一定一致
- 原因：
  - WMS和SurfaceFlinger是两个独立进程
  - 数据同步存在延迟
  - 窗口状态变化和Surface更新是异步的
- 同步机制：
  - 通过SurfaceControl同步
  - VSync信号协调更新时机
  - 事务机制保证原子性

### 10.3 Binder线程模型
**问题**：Binder的线程模型是怎样的？如何处理并发请求？

**答案要点**：
- 线程模型：
  - 每个Binder进程有一个线程池（默认15个线程）
  - 主线程（Binder_1）处理特殊请求
  - 工作线程（Binder_2~Binder_15）处理普通请求
- 并发处理：
  - 请求放入队列
  - 线程池分配线程处理
  - 同步调用时客户端线程阻塞
  - 异步调用时通过回调通知结果
- 优化：
  - oneway关键字实现异步调用
  - 批量操作减少IPC次数
  - 合理设计接口粒度