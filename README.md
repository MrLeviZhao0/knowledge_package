# Android知识库全面索引

## 项目概述

本知识库是一个全面的Android开发知识体系，涵盖业务模块知识、基础技术八股文知识、语言技巧知识三大核心领域，为Android系统开发、应用开发、性能优化等提供完整的知识支持。

## 整体知识图谱

```
Android知识库
├── 业务模块知识 (Business Modules)
│   ├── Framework核心服务
│   │   ├── WMS (Window Manager Service)
│   │   ├── IMS (Input Manager Service)
│   │   ├── AMS (Activity Manager Service)
│   │   ├── PKMS (Package Manager Service)
│   │   └── 亮灭屏模块
│   │       ├── PMS (Power Manager Service)
│   │       ├── DMS (Display Manager Service)
│   │       ├── Thermal (温控模块)
│   │       └── AON (Always On Display)
│   ├── APM开发 (性能监控)
│   │   ├── Hook技术
│   │   └── 指标监控
│   ├── 性能优化
│   ├── 稳定性保障
│   ├── 绘制渲染
│   │   ├── RenderNode
│   │   ├── RenderThread
│   │   ├── 高斯模糊
│   │   └── DeliQueue
│   ├── Display
│   │   ├── 合成 (SurfaceFlinger)
│   │   ├── DRM/KMS (显示驱动管理)
│   │   ├── KGSL (GPU驱动管理)
│   │   ├── Fence (同步机制)
│   │   ├── Bringup (显示系统启动)
│   │   ├── Panel (显示面板)
│   │   ├── Display Feature (显示特性)
│   │   ├── 显存管理
│   │   └── 从View到Display的流转
│   └── 游戏开发
│       ├── 开源游戏列表
│       └── 游戏引擎
├── 基础技术八股文知识 (Core Technologies)
│   ├── App基础
│   │   ├── Binder机制
│   │   ├── Handler机制
│   │   └── App冷启动
│   ├── Native基础
│   │   ├── JNI开发
│   │   ├── AIDL/HIDL
│   │   └── Poll机制
│   ├── BSP基础
│   │   ├── Ioctl机制
│   │   └── 系统启动流程
│   ├── 安全技术
│   │   ├── SELinux
│   │   └── TrustZone/TUI
│   └── 编译系统
│       └── Soong & Bazel
└── 语言技巧知识 (Language Skills)
    ├── AArch64汇编
    ├── C++语言
    ├── Java语言
    ├── Kotlin语言
    ├── Rust语言
    ├── Smali逆向
    └── ViberCoding (AI编程助手)
```

## 1. 业务模块知识

### 1.1 Framework核心服务

#### 1.1.1 WMS (Window Manager Service)
**核心职责**：窗口管理、布局、动画、多窗口支持
- **核心知识**：[WMS核心知识_概述与数据结构](业务模块知识/Framework/WMS/WMS核心知识_概述与数据结构.md)
- **设计思路**：[WMS核心知识_设计思路与线程进程模型](业务模块知识/Framework/WMS/WMS核心知识_设计思路与线程进程模型.md)
- **接口流程**：[WMS核心知识_接口与运转流程](业务模块知识/Framework/WMS/WMS核心知识_接口与运转流程.md)
- **主要功能**：[WMS核心知识_主要功能与优化](业务模块知识/Framework/WMS/WMS核心知识_主要功能与优化.md)
- **项目经验**：[WMS项目经验](业务模块知识/Framework/WMS/WMS项目经验.md)
- **面试技巧**：[WMS厂商技术面试技巧](业务模块知识/Framework/WMS/WMS厂商技术面试技巧.md)

#### 1.1.2 IMS (Input Manager Service)
**核心职责**：输入事件处理、触摸、按键、手势识别
- **核心知识**：[IMS核心知识_概述与数据结构](业务模块知识/Framework/IMS/IMS核心知识_概述与数据结构.md)
- **设计思路**：[IMS核心知识_设计思路与线程进程模型](业务模块知识/Framework/IMS/IMS核心知识_设计思路与线程进程模型.md)
- **接口流程**：[IMS核心知识_接口与运转流程](业务模块知识/Framework/IMS/IMS核心知识_接口与运转流程.md)
- **主要功能**：[IMS核心知识_主要功能与优化](业务模块知识/Framework/IMS/IMS核心知识_主要功能与优化.md)
- **项目经验**：[IMS项目经验](业务模块知识/Framework/IMS/IMS项目经验.md)
- **面试技巧**：[IMS厂商技术面试技巧](业务模块知识/Framework/IMS/IMS厂商技术面试技巧.md)

#### 1.1.3 AMS (Activity Manager Service)
**核心职责**：应用生命周期管理、进程调度、任务栈管理
- **核心知识**：[AMS核心知识_概述与数据结构](业务模块知识/Framework/AMS/AMS核心知识_概述与数据结构.md)
- **设计思路**：[AMS核心知识_设计思路与线程进程模型](业务模块知识/Framework/AMS/AMS核心知识_设计思路与线程进程模型.md)
- **接口流程**：[AMS核心知识_接口与运转流程](业务模块知识/Framework/AMS/AMS核心知识_接口与运转流程.md)
- **主要功能**：[AMS核心知识_主要功能与优化](业务模块知识/Framework/AMS/AMS核心知识_主要功能与优化.md)
- **项目经验**：[AMS项目经验](业务模块知识/Framework/AMS/AMS项目经验.md)
- **面试技巧**：[AMS厂商技术面试技巧](业务模块知识/Framework/AMS/AMS厂商技术面试技巧.md)

#### 1.1.4 PKMS (Package Manager Service)
**核心职责**：应用包管理、权限管理、组件解析
- **核心知识**：[PKMS核心知识_概述与数据结构](业务模块知识/Framework/PKMS/PKMS核心知识_概述与数据结构.md)
- **设计思路**：[PKMS核心知识_设计思路与线程进程模型](业务模块知识/Framework/PKMS/PKMS核心知识_设计思路与线程进程模型.md)
- **接口流程**：[PKMS核心知识_接口与运转流程](业务模块知识/Framework/PKMS/PKMS核心知识_接口与运转流程.md)
- **主要功能**：[PKMS核心知识_主要功能与优化](业务模块知识/Framework/PKMS/PKMS核心知识_主要功能与优化.md)
- **项目经验**：[PKMS项目经验](业务模块知识/Framework/PKMS/PKMS项目经验.md)
- **面试技巧**：[PKMS厂商技术面试技巧](业务模块知识/Framework/PKMS/PKMS厂商技术面试技巧.md)

#### 1.1.5 Choreographer (时序协调器)
**核心职责**：UI时序协调、VSync信号处理、回调调度
- **核心知识**：[Choreographer核心知识_概述与数据结构](业务模块知识/Framework/Choreographer/Choreographer核心知识_概述与数据结构.md)
- **设计思路**：[Choreographer核心知识_设计思路与线程进程模型](业务模块知识/Framework/Choreographer/Choreographer核心知识_设计思路与线程进程模型.md)
- **接口流程**：[Choreographer核心知识_接口与运转流程](业务模块知识/Framework/Choreographer/Choreographer核心知识_接口与运转流程.md)
- **主要功能**：[Choreographer核心知识_主要功能与优化](业务模块知识/Framework/Choreographer/Choreographer核心知识_主要功能与优化.md)
- **项目经验**：[Choreographer项目经验](业务模块知识/Framework/Choreographer/Choreographer项目经验.md)
- **面试技巧**：[Choreographer厂商技术面试技巧](业务模块知识/Framework/Choreographer/Choreographer厂商技术面试技巧.md)

#### 1.1.6 亮灭屏模块
**核心职责**：电源管理、显示控制、温度监控、息屏显示

**PMS (Power Manager Service)**
- **核心知识**：[PMS核心知识](业务模块知识/Framework/亮灭屏模块/PMS/PMS核心知识.md)
- **项目经验**：[PMS项目经验](业务模块知识/Framework/亮灭屏模块/PMS/PMS项目经验.md)
- **面试技巧**：[PMS厂商技术面试技巧](业务模块知识/Framework/亮灭屏模块/PMS/PMS厂商技术面试技巧.md)

**DMS (Display Manager Service)**
- **核心知识**：[DMS核心知识](业务模块知识/Framework/亮灭屏模块/DMS/DMS核心知识.md)
- **项目经验**：[DMS项目经验](业务模块知识/Framework/亮灭屏模块/DMS/DMS项目经验.md)
- **面试技巧**：[DMS厂商技术面试技巧](业务模块知识/Framework/亮灭屏模块/DMS/DMS厂商技术面试技巧.md)

**Thermal (温控模块)**
- **核心知识**：[Thermal核心知识](业务模块知识/Framework/亮灭屏模块/Thermal/Thermal核心知识.md)
- **项目经验**：[Thermal项目经验](业务模块知识/Framework/亮灭屏模块/Thermal/Thermal项目经验.md)
- **面试技巧**：[Thermal厂商技术面试技巧](业务模块知识/Framework/亮灭屏模块/Thermal/Thermal厂商技术面试技巧.md)

**AON (Always On Display)**
- **核心知识**：[AON核心知识](业务模块知识/Framework/亮灭屏模块/AON/AON核心知识.md)
- **项目经验**：[AON项目经验](业务模块知识/Framework/亮灭屏模块/AON/AON项目经验.md)
- **面试技巧**：[AON厂商技术面试技巧](业务模块知识/Framework/亮灭屏模块/AON/AON厂商技术面试技巧.md)

### 1.2 APM开发 (性能监控)

#### 1.2.1 Hook技术
- **ELF文件格式**：[ELF文件格式详解](业务模块知识/APM开发/Hook技术/ELF文件格式详解.md)
- **Hook核心原理**：[Hook技术核心原理](业务模块知识/APM开发/Hook技术/Hook技术核心原理.md)
- **Java Hook**：[Java-Hook技术详解](业务模块知识/APM开发/Hook技术/Java-Hook技术详解.md)
- **Native Hook**：[Native-Hook技术详解](业务模块知识/APM开发/Hook技术/Native-Hook技术详解.md)
- **流行框架**：[流行Hook框架详解](业务模块知识/APM开发/Hook技术/流行Hook框架详解.md)

#### 1.2.2 指标监控
- **启动性能**：[启动性能监控](业务模块知识/APM开发/指标监控/启动性能监控.md)
- **内存监控**：[内存监控](业务模块知识/APM开发/指标监控/内存监控.md)
- **慢函数监控**：[慢函数监控](业务模块知识/APM开发/指标监控/慢函数监控.md)
- **稳定性指标**：[稳定性指标监控](业务模块知识/APM开发/指标监控/稳定性指标监控.md)

### 1.3 性能优化
- **方法论**：[性能优化方法论](业务模块知识/性能/性能优化方法论.md)
- **知识体系**：[性能知识体系](业务模块知识/性能/性能知识体系.md)
- **真实案例**：[真实案例库](业务模块知识/性能/真实案例库.md)

### 1.4 稳定性保障
- **NE信号**：[NE信号类型详解](业务模块知识/稳定性/NE信号类型详解.md)
- **监控框架**：[稳定性监控框架与实现原理](业务模块知识/稳定性/稳定性监控框架与实现原理.md)
- **知识体系**：[稳定性知识体系](业务模块知识/稳定性/稳定性知识体系.md)
- **真实案例**：[真实案例库](业务模块知识/稳定性/真实案例库.md)

### 1.5 绘制渲染
#### 1.5.1 RenderNode
- **核心知识**：[RenderNode核心知识](业务模块知识/绘制渲染/RenderNode/RenderNode核心知识.md)

#### 1.5.2 RenderThread
- **核心知识**：[RenderThread核心知识](业务模块知识/绘制渲染/RenderThread/RenderThread核心知识.md)

#### 1.5.3 高斯模糊
- **核心知识**：[高斯模糊核心知识](业务模块知识/绘制渲染/高斯模糊/高斯模糊核心知识.md)

#### 1.5.4 DeliQueue
- **核心知识**：[DeliQueue核心知识](业务模块知识/绘制渲染/DeliQueue核心知识.md)

### 1.6 Display
#### 1.6.1 合成 (SurfaceFlinger)
**核心职责**：图层合成管理、显示输出、帧率控制、性能优化
- **核心知识**：[SurfaceFlinger核心知识_概述与数据结构](业务模块知识/Display/合成/SurfaceFlinger核心知识_概述与数据结构.md)
- **设计思路**：[SurfaceFlinger核心知识_设计思路与线程进程模型](业务模块知识/Display/合成/SurfaceFlinger核心知识_设计思路与线程进程模型.md)
- **接口流程**：[SurfaceFlinger核心知识_接口与运转流程](业务模块知识/Display/合成/SurfaceFlinger核心知识_接口与运转流程.md)
- **主要功能**：[SurfaceFlinger核心知识_主要功能与优化](业务模块知识/Display/合成/SurfaceFlinger核心知识_主要功能与优化.md)
- **项目经验**：[SurfaceFlinger项目经验](业务模块知识/Display/合成/SurfaceFlinger项目经验.md)
- **面试技巧**：[SurfaceFlinger厂商技术面试技巧](业务模块知识/Display/合成/SurfaceFlinger厂商技术面试技巧.md)

#### 1.6.2 DRM/KMS
**核心职责**：显示驱动管理、模式设置、硬件加速、多屏显示
- **核心知识**：[DRM_KMS核心知识_概述与数据结构](业务模块知识/Display/DRM/DRM_KMS核心知识_概述与数据结构.md)
- **设计思路**：[DRM_KMS核心知识_设计思路与线程进程模型](业务模块知识/Display/DRM/DRM_KMS核心知识_设计思路与线程进程模型.md)
- **接口流程**：[DRM_KMS核心知识_接口与运转流程](业务模块知识/Display/DRM/DRM_KMS核心知识_接口与运转流程.md)
- **主要功能**：[DRM_KMS核心知识_主要功能与优化](业务模块知识/Display/DRM/DRM_KMS核心知识_主要功能与优化.md)

#### 1.6.3 KGSL (Kernel Graphics Support Layer)
**核心职责**：GPU驱动管理、图形内存管理、命令提交、同步机制
- **核心知识**：[KGSL核心知识_概述与数据结构](业务模块知识/Display/kgsl/KGSL核心知识_概述与数据结构.md)
- **设计思路**：[KGSL核心知识_设计思路与线程进程模型](业务模块知识/Display/kgsl/KGSL核心知识_设计思路与线程进程模型.md)
- **接口流程**：[KGSL核心知识_接口与运转流程](业务模块知识/Display/kgsl/KGSL核心知识_接口与运转流程.md)
- **主要功能**：[KGSL核心知识_主要功能与优化](业务模块知识/Display/kgsl/KGSL核心知识_主要功能与优化.md)
- **项目经验**：[KGSL项目经验](业务模块知识/Display/kgsl/KGSL项目经验.md)
- **面试技巧**：[KGSL厂商技术面试技巧](业务模块知识/Display/kgsl/KGSL厂商技术面试技巧.md)

#### 1.6.4 Fence同步机制
**核心职责**：图形流水线同步、缓冲区管理、性能优化
- **核心知识**：[fence核心知识_概述与数据结构](业务模块知识/Display/fence/fence核心知识_概述与数据结构.md)
- **设计思路**：[fence核心知识_设计思路与线程进程模型](业务模块知识/Display/fence/fence核心知识_设计思路与线程进程模型.md)
- **接口流程**：[fence核心知识_接口与运转流程](业务模块知识/Display/fence/fence核心知识_接口与运转流程.md)
- **主要功能**：[fence核心知识_主要功能与优化](业务模块知识/Display/fence/fence核心知识_主要功能与优化.md)
- **项目经验**：[fence项目经验](业务模块知识/Display/fence/fence项目经验.md)

#### 1.6.5 Display Bringup
**核心职责**：显示系统启动、硬件初始化、驱动调试、问题排查
- **核心知识**：[Display Bringup核心知识_概述与数据结构](业务模块知识/Display/bringup/Display Bringup核心知识_概述与数据结构.md)
- **设计思路**：[Display Bringup核心知识_设计思路与线程进程模型](业务模块知识/Display/bringup/Display Bringup核心知识_设计思路与线程进程模型.md)
- **接口流程**：[Display Bringup核心知识_接口与运转流程](业务模块知识/Display/bringup/Display Bringup核心知识_接口与运转流程.md)
- **主要功能**：[Display Bringup核心知识_主要功能与优化](业务模块知识/Display/bringup/Display Bringup核心知识_主要功能与优化.md)
- **项目经验**：[Display Bringup项目经验](业务模块知识/Display/bringup/Display Bringup项目经验.md)
- **面试技巧**：[Display Bringup厂商技术面试技巧](业务模块知识/Display/bringup/Display Bringup厂商技术面试技巧.md)

#### 1.6.6 Panel显示面板
**核心职责**：显示面板驱动、AOD技术、超分技术、面板特性
- **核心知识**：[panel核心知识_概述与数据结构](业务模块知识/Display/panel/panel核心知识_概述与数据结构.md)
- **设计思路**：[panel核心知识_设计思路与线程进程模型](业务模块知识/Display/panel/panel核心知识_设计思路与线程进程模型.md)
- **主要功能**：[panel核心知识_AOD与超分技术](业务模块知识/Display/panel/panel核心知识_AOD与超分技术.md)

#### 1.6.7 Display Feature
**核心职责**：显示特性管理、功能定制、性能优化
- **核心知识**：[displayfeature核心知识_概述与数据结构](业务模块知识/Display/displayfeature/displayfeature核心知识_概述与数据结构.md)
- **设计思路**：[displayfeature核心知识_设计思路与实现技术](业务模块知识/Display/displayfeature/displayfeature核心知识_设计思路与实现技术.md)

#### 1.6.8 显存管理
**核心职责**：图形内存分配、监控管理、异常处理、性能优化
- **核心知识**：[显存核心知识_概述与数据结构](业务模块知识/Display/显存/显存核心知识_概述与数据结构.md)
- **申请通路**：[显存核心知识_申请通路与实例](业务模块知识/Display/显存/显存核心知识_申请通路与实例.md)
- **监控实现**：[显存核心知识_监控实现与水位管理](业务模块知识/Display/显存/显存核心知识_监控实现与水位管理.md)
- **指标分析**：[显存核心知识_获取指令与指标分析](业务模块知识/Display/显存/显存核心知识_获取指令与指标分析.md)
- **异常处理**：[显存核心知识_异常案例与解决方法](业务模块知识/Display/显存/显存核心知识_异常案例与解决方法.md)

#### 1.6.9 从View到Display的流转
**核心职责**：从应用层View到硬件Display的完整渲染流程
- **核心知识**：[从View到Display的流转核心知识](业务模块知识/Display/从View到Display的流转核心知识.md)

### 1.7 游戏开发
#### 1.7.1 开源游戏列表
**核心职责**：开源游戏资源收集、分类与学习价值分析
- **核心知识**：[开源游戏列表](业务模块知识/游戏开发/开源游戏列表.md)

#### 1.7.2 游戏引擎
**核心职责**：游戏引擎技术分析、使用案例与开发实践

**libGDX**
- **核心知识**：[libGDX使用案例](业务模块知识/游戏开发/游戏引擎/libGDX使用案例.md)

## 2. 基础技术八股文知识

### 2.1 App基础

#### 2.1.1 Binder机制
- **核心知识**：[binder核心知识](基础技术八股文知识/app基础/binder/binder核心知识.md)
- **项目经验**：[binder项目经验](基础技术八股文知识/app基础/binder/binder项目经验.md)
- **面试技巧**：[binder厂商技术面试技巧](基础技术八股文知识/app基础/binder/binder厂商技术面试技巧.md)

#### 2.1.2 Handler机制
- **核心知识**：[handler核心知识](基础技术八股文知识/app基础/handler/handler核心知识.md)
- **项目经验**：[handler项目经验](基础技术八股文知识/app基础/handler/handler项目经验.md)
- **面试技巧**：[handler厂商技术面试技巧](基础技术八股文知识/app基础/handler/handler厂商技术面试技巧.md)

#### 2.1.3 App冷启动
- **核心知识**：[App冷启动核心知识](基础技术八股文知识/app基础/App冷启动/App冷启动核心知识.md)
- **项目经验**：[App冷启动项目经验](基础技术八股文知识/app基础/App冷启动/App冷启动项目经验.md)
- **面试技巧**：[App冷启动厂商技术面试技巧](基础技术八股文知识/app基础/App冷启动/App冷启动厂商技术面试技巧.md)

### 2.2 Native基础

#### 2.2.1 JNI开发
- **核心知识**：[JNI核心知识](基础技术八股文知识/naitve基础/JNI/JNI核心知识.md)
- **项目经验**：[JNI项目经验](基础技术八股文知识/naitve基础/JNI/JNI项目经验.md)
- **面试技巧**：[JNI厂商技术面试技巧](基础技术八股文知识/naitve基础/JNI/JNI厂商技术面试技巧.md)

#### 2.2.2 AIDL/HIDL
- **核心知识**：[AIDL_HIDL核心知识](基础技术八股文知识/naitve基础/aidl_hidl/AIDL_HIDL核心知识.md)
- **项目经验**：[AIDL_HIDL项目经验](基础技术八股文知识/naitve基础/aidl_hidl/AIDL_HIDL项目经验.md)
- **面试技巧**：[AIDL_HIDL厂商技术面试技巧](基础技术八股文知识/naitve基础/aidl_hidl/AIDL_HIDL厂商技术面试技巧.md)

#### 2.2.3 Poll机制
- **核心知识**：[Poll机制核心知识](基础技术八股文知识/naitve基础/poll机制/Poll机制核心知识.md)
- **项目经验**：[Poll机制项目经验](基础技术八股文知识/naitve基础/poll机制/Poll机制项目经验.md)
- **面试技巧**：[Poll机制厂商技术面试技巧](基础技术八股文知识/naitve基础/poll机制/Poll机制厂商技术面试技巧.md)

### 2.3 BSP基础

#### 2.3.1 Ioctl机制
- **核心知识**：[Ioctl核心知识](基础技术八股文知识/bsp基础/ioctl/Ioctl核心知识.md)
- **项目经验**：[Ioctl项目经验](基础技术八股文知识/bsp基础/ioctl/Ioctl项目经验.md)
- **面试技巧**：[Ioctl厂商技术面试技巧](基础技术八股文知识/bsp基础/ioctl/Ioctl厂商技术面试技巧.md)

#### 2.3.2 系统启动流程
- **核心知识**：[系统启动流程核心知识](基础技术八股文知识/bsp基础/系统启动流程/系统启动流程核心知识.md)
- **项目经验**：[系统启动流程项目经验](基础技术八股文知识/bsp基础/系统启动流程/系统启动流程项目经验.md)
- **面试技巧**：[系统启动流程厂商技术面试技巧](基础技术八股文知识/bsp基础/系统启动流程/系统启动流程厂商技术面试技巧.md)

### 2.4 安全技术

#### 2.4.1 SELinux
- **核心知识**：[SELinux核心知识](基础技术八股文知识/安全/selinux/SELinux核心知识.md)
- **项目经验**：[SELinux项目经验](基础技术八股文知识/安全/selinux/SELinux项目经验.md)
- **面试技巧**：[SELinux厂商技术面试技巧](基础技术八股文知识/安全/selinux/SELinux厂商技术面试技巧.md)

#### 2.4.2 TrustZone/TUI
- **核心知识**：[TrustZone_TUI核心知识](基础技术八股文知识/安全/trustzone_tui/TrustZone_TUI核心知识.md)
- **项目经验**：[TrustZone_TUI项目经验](基础技术八股文知识/安全/trustzone_tui/TrustZone_TUI项目经验.md)
- **面试技巧**：[TrustZone_TUI厂商技术面试技巧](基础技术八股文知识/安全/trustzone_tui/TrustZone_TUI厂商技术面试技巧.md)

### 2.5 编译系统

#### 2.5.1 Soong & Bazel
- **核心知识**：[soong&bazel核心知识](基础技术八股文知识/编译/soong&bazel/soong&bazel核心知识.md)
- **项目经验**：[soong&bazel项目经验](基础技术八股文知识/编译/soong&bazel/soong&bazel项目经验.md)
- **面试技巧**：[soong&bazel厂商技术面试技巧](基础技术八股文知识/编译/soong&bazel/soong&bazel厂商技术面试技巧.md)

## 3. 语言技巧知识

### 3.1 AArch64汇编
- **指令集基础**：[指令集基础](语言技巧知识/aarch64/指令集基础.md)
- **寄存器系统**：[寄存器系统](语言技巧知识/aarch64/寄存器系统.md)
- **内存模型**：[内存模型](语言技巧知识/aarch64/内存模型.md)
- **函数调用约定**：[函数调用约定](语言技巧知识/aarch64/函数调用约定.md)
- **系统调用分析**：[系统调用分析](语言技巧知识/aarch64/系统调用分析.md)
- **反汇编分析**：[反汇编分析](语言技巧知识/aarch64/反汇编分析.md)
- **异常处理**：[异常处理](语言技巧知识/aarch64/异常处理.md)
- **循环优化**：[循环优化](语言技巧知识/aarch64/循环优化.md)
- **SIMD编程**：[SIMD编程](语言技巧知识/aarch64/SIMD编程.md)
- **内存优化**：[内存优化](语言技巧知识/aarch64/内存优化.md)
- **性能优化**：[性能优化](语言技巧知识/aarch64/性能优化.md)
- **加密算法识别**：[加密算法识别](语言技巧知识/aarch64/加密算法识别.md)

### 3.2 C++语言
- **语法基础**：[语法基础](语言技巧知识/cpp/语法基础.md)
- **常见问题**：[常见问题](语言技巧知识/cpp/常见问题.md)

### 3.3 Java语言
- **语法基础**：[语法基础](语言技巧知识/java/语法基础.md)
- **面向对象**：[面向对象](语言技巧知识/java/面向对象.md)
- **集合框架**：[集合框架](语言技巧知识/java/集合框架.md)
- **异常处理**：[异常处理](语言技巧知识/java/异常处理.md)
- **常见问题**：[常见问题](语言技巧知识/java/常见问题.md)

### 3.4 Kotlin语言
- **语法基础**：[语法基础](语言技巧知识/kotlin/语法基础.md)
- **与Java对比**：[与Java对比](语言技巧知识/kotlin/与Java对比.md)
- **空安全机制**：[空安全机制](语言技巧知识/kotlin/空安全机制.md)
- **扩展函数**：[扩展函数](语言技巧知识/kotlin/扩展函数.md)
- **委托属性**：[委托属性](语言技巧知识/kotlin/委托属性.md)
- **协程编程**：[协程编程](语言技巧知识/kotlin/协程编程.md)
- **函数式编程**：[函数式编程](语言技巧知识/kotlin/函数式编程.md)
- **状态管理**：[状态管理](语言技巧知识/kotlin/状态管理.md)
- **性能优化**：[性能优化](语言技巧知识/kotlin/性能优化.md)
- **常见问题**：[常见问题](语言技巧知识/kotlin/常见问题.md)
- **代码练习**：[代码练习](语言技巧知识/kotlin/代码练习.md)
- **Android开发**：[Android开发](语言技巧知识/kotlin/Android开发.md)
- **Compose基础**：[Compose基础](语言技巧知识/kotlin/Compose基础.md)
- **导航和架构**：[导航和架构](语言技巧知识/kotlin/导航和架构.md)
- **主题和动画**：[主题和动画](语言技巧知识/kotlin/主题和动画.md)

### 3.5 Rust语言
- **语法基础**：[语法基础](语言技巧知识/rust/语法基础.md)
- **所有权系统**：[所有权系统](语言技巧知识/rust/所有权系统.md)
- **类型系统**：[类型系统](语言技巧知识/rust/类型系统.md)
- **并发编程**：[并发编程](语言技巧知识/rust/并发编程.md)
- **性能优化**：[性能优化](语言技巧知识/rust/性能优化.md)
- **高级特性**：[高级特性](语言技巧知识/rust/高级特性.md)
- **与C++对比**：[与C++对比](语言技巧知识/rust/与C++对比.md)
- **常见问题**：[常见问题](语言技巧知识/rust/常见问题.md)
- **代码练习**：[代码练习](语言技巧知识/rust/代码练习.md)
- **项目实战**：[项目实战](语言技巧知识/rust/项目实战.md)
- **Android集成**：[Android集成](语言技巧知识/rust/Android集成.md)

### 3.6 Smali逆向
- **语法基础**：[语法基础](语言技巧知识/smali/语法基础.md)
- **反编译原理**：[反编译原理](语言技巧知识/smali/反编译原理.md)
- **类型系统**：[类型系统](语言技巧知识/smali/类型系统.md)
- **代码分析**：[代码分析](语言技巧知识/smali/代码分析.md)
- **资源保护**：[资源保护](语言技巧知识/smali/资源保护.md)
- **签名验证**：[签名验证](语言技巧知识/smali/签名验证.md)
- **权限检查**：[权限检查](语言技巧知识/smali/权限检查.md)
- **反调试技术**：[反调试技术](语言技巧知识/smali/反调试技术.md)
- **混淆对抗**：[混淆对抗](语言技巧知识/smali/混淆对抗.md)
- **行为监控**：[行为监控](语言技巧知识/smali/行为监控.md)
- **日志插桩**：[日志插桩](语言技巧知识/smali/日志插桩.md)
- **工具使用**：
  - [Apktool使用](语言技巧知识/smali/Apktool使用.md)
  - [Jadx使用](语言技巧知识/smali/Jadx使用.md)
  - [Frida使用](语言技巧知识/smali/Frida使用.md)

### 3.7 ViberCoding (AI编程助手)
**核心职责**：AI编程助手使用、模型原理理解、智能代码生成
- **知识库概述**：[ViberCoding知识库](语言技巧知识/ViberCoding/ViberCoding知识库.md)
- **模型演进历程**：[模型演进历程-CNN-RNN-Transformer-Diffusion](语言技巧知识/ViberCoding/模型演进历程-CNN-RNN-Transformer-Diffusion.md)
- **大语言模型原理**：[大语言模型原理深度解析](语言技巧知识/ViberCoding/大语言模型原理深度解析.md)
- **Android开发工具**：[Android开发MCP工具推荐](语言技巧知识/ViberCoding/Android开发MCP工具推荐.md)

## 4. 快速索引指南

### 4.1 按技术领域索引

**系统开发**：
- Framework服务：WMS、IMS、AMS、PKMS
- 系统基础：Binder、Handler、JNI、AIDL/HIDL
- 底层技术：Ioctl、Poll、系统启动流程

**显示技术**：
- 显示合成：SurfaceFlinger、DRM/KMS、KGSL
- 同步机制：Fence、显存管理
- 显示系统：Display Bringup、Panel、Display Feature

**性能优化**：
- APM开发：Hook技术、指标监控
- 性能知识：优化方法论、真实案例
- 汇编优化：AArch64性能优化

**安全技术**：
- 系统安全：SELinux、TrustZone/TUI
- 逆向安全：Smali逆向、反调试

**编译构建**：
- 编译系统：Soong & Bazel

### 4.2 按学习阶段索引

**初级学习**：
- 语言基础：Kotlin、Rust语法基础
- 基础概念：Binder、Handler核心知识

**中级进阶**：
- 系统服务：Framework各服务核心知识
- 底层技术：JNI、AIDL/HIDL、Poll机制
- 安全基础：SELinux、Smali语法

**高级深入**：
- 性能优化：APM开发、性能优化方法论
- 系统底层：AArch64汇编、系统启动流程
- 安全深入：TrustZone、逆向分析

### 4.3 按面试准备索引

**高频面试点**：
- Framework服务：AMS、PKMS、WMS、IMS
- 基础技术：Binder、Handler、JNI
- 性能优化：启动优化、内存优化

**厂商特色**：
- 系统开发：各服务厂商技术面试技巧
- 安全技术：SELinux、TrustZone面试技巧
- 底层技术：Ioctl、Poll机制面试技巧

## 5. 使用建议

### 5.1 学习路径建议

**Android系统开发工程师**：
1. 基础技术 → 2. Framework服务 → 3. 性能优化 → 4. 安全技术

**Android应用开发工程师**：
1. 语言基础 → 2. 基础技术 → 3. 性能优化 → 4. 逆向安全

**Android安全工程师**：
1. 安全基础 → 2. 逆向技术 → 3. 系统安全 → 4. 底层技术

### 5.2 文档结构说明

每个技术模块都遵循统一的文档结构：
- **核心知识**：技术原理、核心概念、关键实现
- **接口流程**：API接口、工作流程、调用关系
- **主要功能**：核心功能、特性介绍、使用场景
- **项目经验**：实际案例、问题解决、优化经验
- **面试技巧**：常见问题、回答策略、技术要点

### 5.3 更新维护

本索引文档会随着知识库的更新而同步更新，确保索引的准确性和完整性。

---

**最后更新时间**：2026-02-12  
**版本**：v1.0  
**维护者**：知识库维护团队