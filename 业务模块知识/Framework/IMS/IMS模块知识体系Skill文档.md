# IMS模块知识体系Skill文档

## 1. 核心知识部分

### 1.1 主要数据结构
- **InputManagerService**：Input系统核心服务，管理输入事件的采集、处理和分发
- **InputDispatcher**：负责将输入事件分发给合适的应用窗口
- **InputReader**：从输入设备读取原始数据并转换为输入事件
- **InputChannel**：应用与IMS间的通信通道
- **InputEvent**：输入事件抽象类（KeyEvent、MotionEvent等）
- **InputWindowHandle**：窗口输入处理句柄，用于确定事件目标

### 1.2 设计思路
- **分层设计**：InputReader（硬件交互）、InputDispatcher（事件分发）、应用层（事件处理）
- **事件驱动模型**：基于事件驱动确保输入响应实时性
- **安全机制**：权限检查确保合法应用接收输入事件
- **多设备支持**：统一设备抽象层支持多种输入设备类型

### 1.3 线程进程模型
- **主要线程**：InputReaderThread（读取原始数据）、InputDispatcherThread（分发事件）、应用主线程（处理事件）
- **线程通信**：InputReader→InputDispatcher（队列）、InputDispatcher→应用（InputChannel跨进程通信）
- **进程模型**：IMS运行在system_server进程，应用通过InputChannel通信

### 1.4 对外接口
- **InputManager**：应用访问IMS的主要接口
- **InputMethodManager**：输入法管理接口
- **adb指令**：`adb shell dumpsys input`（查看输入系统状态）、`adb shell getevent`（监听原始事件）

### 1.5 核心流程
- **启动流程**：SystemServer创建IMS实例→初始化InputReader/InputDispatcher→启动线程→注册设备监听
- **事件处理流程**：InputReader读取数据→转换为InputEvent→发送到InputDispatcher队列
- **事件分发流程**：InputDispatcher取事件→确定目标窗口→通过InputChannel发送到应用

### 1.6 主要功能
- **输入设备管理**：识别、配置和管理各种输入设备
- **事件采集处理**：读取并解析输入数据
- **事件分发**：准确分发给目标应用
- **焦点管理**：跟踪和管理当前输入焦点

## 2. 项目经验部分

### 2.1 功能定制
- **自定义输入设备支持**：扩展InputReader和InputDevice，添加设备驱动支持
- **输入事件过滤**：在InputDispatcher中添加事件过滤机制
- **输入模式切换**：扩展IMS添加模式管理功能

### 2.2 交互逻辑定制
- **按键映射定制**：修改PhoneWindowManager中的按键处理逻辑
- **触摸手势识别**：在InputDispatcher中添加手势识别模块

### 2.3 性能优化
- **输入延迟优化**：减少事件处理链路，优化线程调度
- **稳定性提升**：添加输入事件有效性检查，增强异常处理

## 3. 厂商技术面试技巧

### 3.1 基础概念问题
- IMS的主要功能是什么？
- InputReader和InputDispatcher的职责分别是什么？

### 3.2 工作流程问题
- 描述输入事件从硬件到应用的完整流程
- 输入焦点是如何管理的？

### 3.3 高级问题
- 如何优化输入延迟？
- 如何处理多点触控事件？

### 3.4 实际应用问题
- 如何排查输入无响应的问题？
- 如何实现自定义按键映射？