# WMS厂商技术面试技巧

## 1. 基础概念问题

### 1.1 WMS定义与作用
**问题1**：请简要介绍WMS的全称、作用和主要功能。

**答案**：
- **全称**：WindowManagerService
- **作用**：WMS是Android系统的核心服务之一，负责管理所有应用程序的窗口显示、布局和输入事件分发。
- **主要功能**：
  - 为所有窗口分配Surface
  - 管理Surface的显示顺序、尺寸和位置
  - 管理窗口动画
  - 作为输入系统的中转站，派发系统按键和触摸消息
  - 处理窗口的添加、删除和更新操作
  - 实现窗口的权限控制和安全管理

### 1.2 Window与View的关系
**问题2**：什么是Window？Window和View的关系是什么？

**答案**：
- **Window**：是一个抽象概念，从用户角度看是一个界面，从SurfaceFlinger角度看是一个Layer，从WMS角度看是一个WindowState。Window的本质是Surface，所有的UI绘制都是在Surface上进行的。
- **Window与View的关系**：
  - View是Window上的UI元素，一个Window可以包含多个View
  - Window是View的承载者，View通过ViewRootImpl与Window关联
  - View的绘制、测量和布局都是在Window提供的Surface上进行的
  - WindowManager是管理Window的接口，通过它可以添加、删除和更新Window

### 1.3 Window的类型
**问题3**：Android中Window主要分为哪几种类型？它们的区别是什么？

**答案**：
Android中的Window主要分为以下几种类型：

1. **应用程序窗口（Application Window）**
   - 类型：TYPE_APPLICATION、TYPE_APPLICATION_STARTING等
   - 特点：属于某个Activity，需要有Activity的Token
   - 示例：Activity的界面

2. **子窗口（Sub Window）**
   - 类型：TYPE_APPLICATION_PANEL、TYPE_APPLICATION_SUB_PANEL等
   - 特点：必须依附于父窗口，其Z轴顺序在父窗口之上
   - 示例：Dialog、PopupWindow

3. **系统窗口（System Window）**
   - 类型：TYPE_STATUS_BAR、TYPE_NAVIGATION_BAR、TYPE_SYSTEM_ALERT等
   - 特点：不需要依附于Activity，可以在任何界面之上显示
   - 示例：状态栏、导航栏、系统对话框

### 1.4 WindowToken
**问题4**：什么是WindowToken？它的作用是什么？

**答案**：
- **WindowToken**：是WMS中的一个核心概念，是窗口的令牌，用于标识一组相关的窗口。
- **作用**：
  - 确保窗口创建的合法性和安全性
  - 管理一组相关的窗口，如Activity的所有窗口
  - 实现窗口的权限控制
  - 维护窗口的层级关系

**问题5**：AppWindowToken是什么？它与ActivityRecord的关系是什么？

**答案**：
- **AppWindowToken**：是WindowToken的子类，专门用于描述应用程序窗口的令牌。
- **与ActivityRecord的关系**：
  - AppWindowToken包含一个指向ActivityRecord的引用
  - ActivityRecord是AMS中描述Activity的对象
  - AppWindowToken是WMS中与ActivityRecord对应的对象，用于管理Activity的所有窗口
  - 当Activity启动时，AMS会创建ActivityRecord，同时WMS会创建对应的AppWindowToken

### 1.5 Session
**问题6**：什么是Session？它的作用是什么？

**答案**：
- **Session**：是应用程序进程与WMS通信的中间层，每个应用程序进程对应一个Session实例。
- **作用**：
  - 作为应用程序进程与WMS通信的桥梁
  - 管理应用程序进程的所有窗口
  - 处理应用程序进程向WMS发送的请求
  - 维护应用程序进程的状态信息

## 2. 工作流程问题

### 2.1 WMS启动流程
**问题7**：WMS的启动流程是怎样的？它运行在哪个线程上？

**答案**：
- **WMS启动流程**：
  1. SystemServer进程启动后，调用startOtherServices()方法
  2. 在startOtherServices()方法中，创建InputManagerService实例
  3. 调用WindowManagerService.main()方法创建WMS实例
  4. 将WMS实例注册到ServiceManager中
  5. 调用WMS的onInitReady()方法完成初始化
  6. 调用WMS的systemReady()方法，通知WMS系统初始化完成

- **运行线程**：
  - WMS的创建和主要工作运行在android.display线程上
  - PhoneWindowManager的初始化运行在android.ui线程上
  - WMS的启动入口在system_server线程上

**问题8**：WMS的main()方法主要做了什么？请简要描述其调用栈。

**答案**：
- **WMS的main()方法主要工作**：
  1. 创建DisplayThread线程
  2. 在DisplayThread线程中创建WMS实例
  3. 初始化WMS的各种组件和服务

- **调用栈**：
```
SystemServer.main()
└── SystemServer.run()
    └── SystemServer.startOtherServices()
        └── WindowManagerService.main()
            └── DisplayThread.getHandler().runWithScissors()
                └── new WindowManagerService()
```

### 2.2 窗口添加流程
**问题9**：请详细描述应用进程添加窗口的完整流程，包括客户端和WMS端的处理逻辑。

**答案**：
应用进程添加窗口的完整流程如下：

1. **客户端流程**：
   - Activity调用setContentView()方法
   - PhoneWindow的setContentView()方法创建DecorView
   - Activity的makeVisible()方法调用WindowManager的addView()方法
   - WindowManagerImpl的addView()方法委托给WindowManagerGlobal处理
   - WindowManagerGlobal创建ViewRootImpl实例
   - ViewRootImpl的setView()方法调用requestLayout()方法
   - requestLayout()方法触发scheduleTraversals()方法
   - doTraversal()方法调用performTraversals()方法
   - performTraversals()方法调用relayoutWindow()方法
   - relayoutWindow()方法通过IWindowSession向WMS发送请求

2. **WMS端流程**：
   - Session的addWindow()方法接收客户端请求
   - WMS的addWindow()方法进行权限检查和参数验证
   - 创建WindowState对象，保存窗口的状态和属性
   - 将WindowState添加到mWindowMap中
   - 将WindowState添加到对应的WindowToken中
   - 创建InputChannel，用于窗口接收输入事件
   - 分配窗口层级
   - 计算窗口布局
   - 执行窗口布局，创建Surface并返回给客户端

### 2.3 窗口布局流程
**问题10**：WMS是如何计算窗口的位置和大小的？请简要描述其布局流程。

**答案**：
WMS的窗口布局流程主要包括：

1. **触发布局**：当窗口属性变化、显示内容变化或系统配置变化时，触发窗口布局
2. **收集窗口**：收集所有需要布局的窗口
3. **计算窗口边框**：根据窗口类型、布局参数和显示尺寸，计算窗口的边框
4. **计算窗口边距**：计算窗口的内容边距、稳定边距等
5. **分配窗口层级**：根据窗口类型和属性，分配窗口的Z轴层级
6. **执行布局**：调用WindowPlacerLocked的performSurfacePlacement()方法执行布局
7. **创建Surface**：为需要显示的窗口创建Surface
8. **更新显示**：将窗口信息发送给SurfaceFlinger，更新屏幕显示

### 2.4 输入事件分发流程
**问题11**：请详细描述输入事件从产生到应用进程处理的完整流程，WMS在其中扮演什么角色？

**答案**：
输入事件的完整分发流程如下：

1. **输入事件产生**：硬件输入设备（如触摸屏、键盘）产生输入事件
2. **Linux内核处理**：Linux内核的input子系统接收输入事件，通过/dev/input/event*设备文件传递给Android系统
3. **IMS处理**：InputManagerService接收输入事件，进行初步处理和分发
4. **WMS处理**：
   - IMS将输入事件传递给WMS
   - WMS根据窗口的位置、可见性和焦点状态，确定最合适的目标窗口
   - WMS通过InputChannel将输入事件分发给目标窗口
5. **应用进程处理**：
   - 应用进程的WindowInputEventReceiver接收输入事件
   - 通过ViewRootImpl将输入事件传递给View树
   - View树进行事件分发和处理

**WMS的角色**：
- 作为输入系统的中转站，连接IMS和应用进程
- 管理窗口的输入焦点
- 确定输入事件的目标窗口
- 处理窗口的输入通道

### 2.5 窗口动画流程
**问题12**：WMS是如何管理窗口动画的？请简要描述窗口动画的处理流程。

**答案**：
WMS的窗口动画管理流程如下：

1. **动画请求**：应用进程通过IWindowSession向WMS发送动画请求
2. **动画初始化**：
   - WMS的startAnimation()方法接收动画请求
   - 创建WindowStateAnimator对象，管理窗口动画
   - 设置动画参数和属性
3. **动画执行**：
   - WMS的animate()方法定期执行动画
   - WindowAnimator遍历所有需要动画的窗口
   - WindowStateAnimator的stepAnimation()方法计算动画进度
   - 应用动画变换到窗口的Surface
4. **动画结束**：
   - 当动画完成时，调用WindowStateAnimator的finishAnimation()方法
   - 通知应用进程动画完成
   - 清理动画资源

## 3. 高级问题

### 3.1 WMS与其他系统服务的关系
**问题13**：WMS与AMS、SurfaceFlinger、IMS的关系是什么？它们之间如何通信？

**答案**：
- **WMS与AMS的关系**：
  - AMS负责管理Activity的生命周期，WMS负责管理Activity的窗口
  - AMS创建ActivityRecord时，WMS创建对应的AppWindowToken
  - 它们通过Binder进行通信，共同协作完成Activity的显示和管理

- **WMS与SurfaceFlinger的关系**：
  - WMS负责管理窗口的布局和层级，SurfaceFlinger负责将窗口合成并显示到屏幕
  - WMS为窗口分配Surface，SurfaceFlinger管理这些Surface的合成
  - 它们通过SurfaceControl进行通信

- **WMS与IMS的关系**：
  - IMS负责接收和处理输入事件，WMS负责确定输入事件的目标窗口
  - IMS将输入事件传递给WMS，WMS将输入事件分发给目标窗口
  - 它们通过InputChannel进行通信

### 3.2 窗口层级管理
**问题14**：WMS是如何管理窗口的层级的？窗口层级是如何计算的？

**答案**：
- **窗口层级管理**：
  - WMS使用mLayer变量来表示窗口的层级
  - 层级值越大，窗口显示在越上层
  - 窗口层级分为基础层级（mBaseLayer）和子层级（mSubLayer）

- **窗口层级计算**：
  - 基础层级根据窗口类型计算，不同类型的窗口有不同的基础层级
  - 子层级根据窗口的属性和状态计算，用于区分同一类型窗口的显示顺序
  - 层级计算公式：mLayer = mBaseLayer + mSubLayer
  - 窗口层级的计算由PhoneWindowManager的getWindowLayerFromTypeLw()方法完成

### 3.3 窗口权限控制
**问题15**：WMS是如何进行窗口权限控制的？哪些窗口类型需要特殊权限？

**答案**：
- **窗口权限控制**：
  - 在addWindow()方法中进行权限检查
  - 根据窗口类型和应用程序的权限，决定是否允许创建窗口
  - 使用checkAddPermission()方法检查应用程序是否有创建特定类型窗口的权限

- **需要特殊权限的窗口类型**：
  - TYPE_SYSTEM_ALERT：需要SYSTEM_ALERT_WINDOW权限
  - TYPE_APPLICATION_OVERLAY：需要SYSTEM_ALERT_WINDOW权限
  - TYPE_STATUS_BAR：系统内部窗口，只有系统进程可以创建
  - TYPE_NAVIGATION_BAR：系统内部窗口，只有系统进程可以创建
  - TYPE_INPUT_METHOD：输入法窗口，需要特定的权限

### 3.4 多显示器支持
**问题16**：WMS是如何支持多显示器的？请简要描述其实现机制。

**答案**：
WMS的多显示器支持主要通过以下机制实现：

1. **DisplayContent**：WMS使用DisplayContent对象来描述每个显示器
2. **窗口分配**：每个窗口都属于一个特定的DisplayContent
3. **独立布局**：每个DisplayContent独立计算窗口布局
4. **输入事件处理**：根据输入事件的来源显示器，将事件分发给对应的窗口
5. **资源管理**：为每个显示器分配独立的资源

### 3.5 性能优化
**问题17**：WMS在性能方面有哪些优化措施？请举例说明。

**答案**：
WMS的性能优化措施主要包括：

1. **布局缓存**：
   - 缓存窗口布局计算结果
   - 避免重复计算相同窗口的布局
   - 使用LruCache管理布局缓存

2. **减少不必要的布局计算**：
   - 只有当窗口属性变化时才触发布局
   - 合并多次布局请求
   - 避免在布局过程中进行复杂计算

3. **硬件加速**：
   - 使用硬件加速进行窗口绘制
   - 使用SurfaceControl进行窗口合成
   - 优化动画效果的硬件加速

4. **输入事件优化**：
   - 减少输入事件处理延迟
   - 优化输入事件分发算法
   - 使用异步输入事件处理

5. **内存管理**：
   - 及时释放不再使用的窗口资源
   - 优化Surface的创建和销毁
   - 减少内存泄漏

## 4. 实际应用问题

### 4.1 定制开发
**问题18**：如果需要定制状态栏的高度和样式，应该修改WMS的哪些部分？

**答案**：
要定制状态栏的高度和样式，需要修改以下部分：

1. **PhoneWindowManager**：
   - 修改状态栏高度的计算逻辑
   - 调整状态栏的布局参数
   - 定制状态栏的显示样式

2. **DisplayPolicy**：
   - 调整状态栏的边距和位置
   - 定制状态栏的显示策略

3. **WMS**：
   - 添加状态栏定制的接口
   - 处理应用程序对状态栏的定制请求
   - 确保状态栏定制的兼容性

### 4.2 故障排查
**问题19**：如果应用程序出现"BadTokenException: Unable to add window"错误，可能的原因是什么？如何排查和解决？

**答案**：
- **可能原因**：
  - 应用程序没有创建特定类型窗口的权限
  - 窗口的Token无效或已被销毁
  - Activity已经销毁，但应用程序仍然尝试添加窗口
  - 多线程环境下，窗口操作的时机不当

- **排查方法**：
  - 检查应用程序是否声明了必要的权限
  - 检查Activity的生命周期，确保在合适的时机添加窗口
  - 检查窗口Token的有效性
  - 使用adb命令查看窗口状态：`adb shell dumpsys window windows`

- **解决方法**：
  - 添加必要的权限声明
  - 在Activity的合适生命周期方法中添加窗口
  - 确保窗口操作在主线程中进行
  - 添加异常处理，避免应用程序崩溃

**问题20**：如果系统出现窗口卡顿或显示异常，应该如何使用WMS相关的工具进行排查？

**答案**：
可以使用以下WMS相关的工具进行排查：

1. **adb命令**：
   - `adb shell dumpsys window`：查看WMS的状态信息
   - `adb shell dumpsys window windows`：查看所有窗口的信息
   - `adb shell dumpsys window displays`：查看显示信息
   - `adb shell dumpsys window input`：查看输入窗口信息
   - `adb shell wm size`：查看和设置显示尺寸

2. **Systrace**：
   - 分析WMS的性能瓶颈
   - 查看窗口布局和绘制的耗时
   - 分析输入事件处理的延迟

3. **Logcat**：
   - 查看WMS相关的日志信息
   - 查找错误和异常信息
   - 分析窗口操作的流程

### 4.3 性能调优
**问题21**：在多窗口场景下，如何优化WMS的性能？

**答案**：
在多窗口场景下，可以通过以下方式优化WMS的性能：

1. **优化窗口布局算法**：
   - 减少窗口布局计算的复杂度
   - 使用高效的布局算法
   - 实现布局计算的并行处理

2. **减少窗口层级**：
   - 避免创建过多的窗口
   - 合并相关窗口
   - 优化窗口的层级管理

3. **优化窗口动画**：
   - 使用硬件加速动画
   - 减少动画的复杂度
   - 优化动画的帧率

4. **内存管理优化**：
   - 及时释放不再使用的窗口资源
   - 优化Surface的创建和销毁
   - 减少内存泄漏

5. **输入事件优化**：
   - 减少输入事件处理延迟
   - 优化输入事件分发算法
   - 使用异步输入事件处理

## 5. 版本变化问题

### 5.1 Android版本变化
**问题22**：Android 10及以上版本中，WMS有哪些重要的变化？

**答案**：
Android 10及以上版本中，WMS的重要变化包括：

1. **SurfaceControl**：
   - 引入SurfaceControl API，替代传统的Surface API
   - 提供更强大的窗口控制能力
   - 支持更多的窗口特效

2. **WindowContainer**：
   - 使用WindowContainer体系管理窗口
   - 统一窗口层级结构
   - 简化窗口管理逻辑

3. **多显示器增强**：
   - 改进多显示器支持
   - 增强跨显示器的窗口操作
   - 优化多显示器的性能

4. **权限管理增强**：
   - 加强窗口权限控制
   - 引入TYPE_APPLICATION_OVERLAY窗口类型
   - 改进SYSTEM_ALERT_WINDOW权限的管理

5. **性能优化**：
   - 优化窗口布局算法
   - 减少内存占用
   - 提升窗口操作的响应速度

### 5.2 Android 12及以上版本变化
**问题23**：Android 12及以上版本中，WMS有哪些新特性和改进？

**答案**：
Android 12及以上版本中，WMS的新特性和改进包括：

1. **隐私保护**：
   - 增强窗口的隐私保护
   - 限制应用程序对其他窗口的访问
   - 改进窗口的权限管理

2. **动画增强**：
   - 提供更丰富的窗口动画效果
   - 优化动画的性能
   - 支持自定义窗口动画

3. **手势导航**：
   - 增强手势导航的支持
   - 优化手势事件的处理
   - 提供更流畅的手势体验

4. **性能优化**：
   - 进一步优化窗口布局算法
   - 减少窗口操作的延迟
   - 提升系统的整体响应速度

5. **新API**：
   - 引入新的窗口管理API
   - 提供更强大的窗口控制能力
   - 支持更多的窗口定制需求

## 6. 面试技巧与策略

### 6.1 知识体系构建
**技巧1**：如何构建完整的WMS知识体系？

**策略**：
- **分层学习**：按照WMS的核心数据结构、设计思路、线程进程模型、接口和流程等部分分层学习
- **源码分析**：深入分析WMS的核心源码，理解其内部机制
- **实践应用**：通过实际项目或实验，加深对WMS的理解
- **总结归纳**：定期总结和归纳所学知识，形成完整的知识体系

### 6.2 源码分析方法
**技巧2**：如何高效分析WMS的源码？

**策略**：
- **从整体到局部**：先了解WMS的整体架构，再深入分析各个组件
- **跟踪关键流程**：重点跟踪窗口添加、布局和输入事件分发等关键流程
- **结合调试**：使用调试工具跟踪WMS的运行过程
- **参考文档**：结合官方文档和其他学习资料，辅助源码分析

### 6.3 面试回答技巧
**技巧3**：在面试中回答WMS相关问题时，有哪些技巧？

**策略**：
- **结构化回答**：按照一定的结构组织答案，如定义、作用、流程、优化等
- **结合实例**：使用具体的例子说明问题，增强说服力
- **突出重点**：重点回答问题的核心部分，避免过于冗长
- **展示深度**：适当展示对WMS内部机制的理解，体现技术深度
- **诚实谦逊**：对于不熟悉的问题，诚实回答，避免不懂装懂

### 6.4 常见误区
**技巧4**：在回答WMS相关问题时，有哪些常见的误区需要避免？

**策略**：
- **混淆概念**：避免混淆Window、View、Surface等概念
- **错误流程**：确保准确描述WMS的各种流程
- **忽略细节**：注意回答问题的细节，体现专业水平
- **过度简化**：避免过于简化问题，导致回答不准确
- **脱离实际**：结合实际应用场景回答问题，避免空谈理论

## 7. 总结

WMS作为Android系统的核心服务之一，是Framework开发岗位面试的重点内容。要在面试中取得好成绩，需要：

1. **构建完整的知识体系**：深入理解WMS的核心概念、工作流程和内部机制
2. **掌握源码分析方法**：能够高效分析WMS的核心源码
3. **积累实践经验**：通过实际项目或实验，加深对WMS的理解
4. **学习面试技巧**：掌握回答WMS相关问题的技巧和策略
5. **关注版本变化**：了解WMS在不同Android版本中的变化和新特性

通过系统的学习和准备，结合本文提供的面试问题和答案，相信你能够在WMS相关的面试中取得好成绩。