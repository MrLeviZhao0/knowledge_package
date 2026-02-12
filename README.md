# Android知识库全面索引

## 项目概述

本知识库是一个全面的Android开发知识体系，涵盖业务模块知识、基础技术八股文知识、语言技巧知识三大核心领域，为Android系统开发、应用开发、性能优化等提供完整的知识支持。

## 整体知识图谱

```
Android知识库
├── [业务模块知识](业务模块知识/) (Business Modules)
│   ├── [Framework核心服务](业务模块知识/Framework/)
│   │   ├── [WMS](业务模块知识/Framework/WMS/) (Window Manager Service)
│   │   ├── [IMS](业务模块知识/Framework/IMS/) (Input Manager Service)
│   │   ├── [AMS](业务模块知识/Framework/AMS/) (Activity Manager Service)
│   │   ├── [PKMS](业务模块知识/Framework/PKMS/) (Package Manager Service)
│   │   └── [亮灭屏模块](业务模块知识/Framework/亮灭屏模块/)
│   │       ├── [PMS](业务模块知识/Framework/亮灭屏模块/PMS/) (Power Manager Service)
│   │       ├── [DMS](业务模块知识/Framework/亮灭屏模块/DMS/) (Display Manager Service)
│   │       ├── [Thermal](业务模块知识/Framework/亮灭屏模块/Thermal/) (温控模块)
│   │       └── [AON](业务模块知识/Framework/亮灭屏模块/AON/) (Always On Display)
│   ├── [APM开发](业务模块知识/APM开发/) (性能监控)
│   │   ├── [Hook技术](业务模块知识/APM开发/Hook技术/)
│   │   └── [指标监控](业务模块知识/APM开发/指标监控/)
│   ├── [性能优化](业务模块知识/性能/)
│   └── [稳定性保障](业务模块知识/稳定性/)
├── [基础技术八股文知识](基础技术八股文知识/) (Core Technologies)
│   ├── [App基础](基础技术八股文知识/app基础/)
│   │   ├── [Binder机制](基础技术八股文知识/app基础/binder/)
│   │   ├── [Handler机制](基础技术八股文知识/app基础/handler/)
│   │   └── [App冷启动](基础技术八股文知识/app基础/App冷启动/)
│   ├── [Native基础](基础技术八股文知识/naitve基础/)
│   │   ├── [JNI开发](基础技术八股文知识/naitve基础/JNI/)
│   │   ├── [AIDL/HIDL](基础技术八股文知识/naitve基础/aidl_hidl/)
│   │   └── [Poll机制](基础技术八股文知识/naitve基础/poll机制/)
│   ├── [BSP基础](基础技术八股文知识/bsp基础/)
│   │   ├── [Ioctl机制](基础技术八股文知识/bsp基础/ioctl/)
│   │   └── [系统启动流程](基础技术八股文知识/bsp基础/系统启动流程/)
│   ├── [安全技术](基础技术八股文知识/安全/)
│   │   ├── [SELinux](基础技术八股文知识/安全/selinux/)
│   │   └── [TrustZone/TUI](基础技术八股文知识/安全/trustzone_tui/)
│   └── [编译系统](基础技术八股文知识/编译/)
│       └── [Soong & Bazel](基础技术八股文知识/编译/soong&bazel/)
└── [语言技巧知识](语言技巧知识/) (Language Skills)
    ├── [AArch64汇编](语言技巧知识/aarch64/)
    ├── [Kotlin语言](语言技巧知识/kotlin/)
    ├── [Rust语言](语言技巧知识/rust/)
    └── [Smali逆向](语言技巧知识/smali/)
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

#### 1.1.5 亮灭屏模块
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

### 3.2 Kotlin语言
- **语法基础**：[语法基础](语言技巧知识/kotlin/语法基础.md)

### 3.3 Rust语言
- **语法基础**：[语法基础](语言技巧知识/rust/语法基础.md)
- **所有权系统**：[所有权系统](语言技巧知识/rust/所有权系统.md)

### 3.4 Smali逆向
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

## 4. 快速索引指南

### 4.1 按技术领域索引

**系统开发**：
- Framework服务：WMS、IMS、AMS、PKMS
- 系统基础：Binder、Handler、JNI、AIDL/HIDL
- 底层技术：Ioctl、Poll、系统启动流程

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