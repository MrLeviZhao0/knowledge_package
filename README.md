# Android Framework 业务模块知识体系

## 项目概述

本项目旨在构建一个全面的Android Framework业务模块知识体系，包含核心系统服务的详细介绍、设计思路、工作流程、项目经验和面试技巧。目前已涵盖WMS、IMS和亮灭屏模块等关键系统服务。

## 整体知识图谱

![Android Framework 知识图谱](https://github.com/MrLeviZhao0/knowledge_package/blob/main/whiteboard_exported_image.png?raw=true)

## 模块目录结构

```
业务模块知识/
└── Framework/
    ├── 业务模块知识体系通用Skill文档模板.md
    ├── WMS/              # Window Manager Service
    ├── IMS/              # Input Manager Service
    └── 亮灭屏模块/        # 屏幕亮灭控制模块
        ├── PMS/          # Power Manager Service
        ├── DMS/          # Display Manager Service
        ├── Thermal/      # 温控模块
        └── AON/          # Always On Display
```

## 模块详细介绍

### 1. WMS (Window Manager Service)

**核心职责**：管理Android系统中的窗口，负责窗口的创建、布局、绘制和动画等。

**主要内容**：
- **核心知识**：窗口管理数据结构、设计思路、线程进程模型
- **接口与流程**：窗口操作接口、窗口生命周期管理、布局流程
- **主要功能**：窗口动画、多窗口支持、输入法窗口管理
- **项目经验**：窗口定制、性能优化、兼容性处理
- **面试技巧**：窗口管理原理、SurfaceFlinger交互、内存管理

**文档位置**：[业务模块知识/Framework/WMS/](https://github.com/MrLeviZhao0/knowledge_package/tree/main/业务模块知识/Framework/WMS/)

### 2. IMS (Input Manager Service)

**核心职责**：管理Android系统的输入事件，包括触摸、按键、传感器等输入的处理和分发。

**主要内容**：
- **核心知识**：输入事件处理数据结构、设计思路、线程模型
- **接口与流程**：输入事件捕获、处理、分发流程
- **主要功能**：触摸事件处理、按键事件处理、手势识别
- **项目经验**：输入事件定制、性能优化、兼容性处理
- **面试技巧**：输入事件流程、触摸事件分发、ANR分析

**文档位置**：[业务模块知识/Framework/IMS/](https://github.com/MrLeviZhao0/knowledge_package/tree/main/业务模块知识/Framework/IMS/)

### 3. 亮灭屏模块

**核心职责**：管理Android设备的屏幕亮灭状态，包括电源管理、显示控制、温度监控和息屏显示等。

#### 3.1 PMS (Power Manager Service)

**核心职责**：管理设备电源状态，包括唤醒、休眠、电源模式切换等。

**主要内容**：
- **核心知识**：电源管理数据结构、WakeLock机制、Doze模式
- **接口与流程**：电源状态切换流程、唤醒锁管理
- **项目经验**：电源策略定制、功耗优化
- **面试技巧**：WakeLock原理、Doze模式、电源状态机

**文档位置**：[业务模块知识/Framework/亮灭屏模块/PMS/](https://github.com/MrLeviZhao0/knowledge_package/tree/main/业务模块知识/Framework/亮灭屏模块/PMS/)

#### 3.2 DMS (Display Manager Service)

**核心职责**：管理设备显示状态，包括屏幕亮度、分辨率、刷新率等。

**主要内容**：
- **核心知识**：显示管理数据结构、多显示器支持
- **接口与流程**：屏幕亮灭流程、亮度调节流程
- **项目经验**：显示模式定制、高刷新率支持
- **面试技巧**：显示设备管理、亮度调节原理

**文档位置**：[业务模块知识/Framework/亮灭屏模块/DMS/](https://github.com/MrLeviZhao0/knowledge_package/tree/main/业务模块知识/Framework/亮灭屏模块/DMS/)

#### 3.3 Thermal (温控模块)

**核心职责**：管理设备温度，防止设备过热，保障设备安全和性能平衡。

**主要内容**：
- **核心知识**：温度监控数据结构、温控策略
- **接口与流程**：温度采集、温控策略执行
- **项目经验**：温控策略定制、性能与温度平衡
- **面试技巧**：温度监控原理、温控策略设计

**文档位置**：[业务模块知识/Framework/亮灭屏模块/Thermal/](https://github.com/MrLeviZhao0/knowledge_package/tree/main/业务模块知识/Framework/亮灭屏模块/Thermal/)

#### 3.4 AON (Always On Display)

**核心职责**：实现息屏显示功能，在设备灭屏状态下显示时间、通知等信息。

**主要内容**：
- **核心知识**：息屏显示数据结构、手势识别
- **接口与流程**：息屏显示启动流程、手势识别流程
- **项目经验**：息屏显示定制、功耗优化
- **面试技巧**：息屏显示原理、手势识别算法

**文档位置**：[业务模块知识/Framework/亮灭屏模块/AON/](https://github.com/MrLeviZhao0/knowledge_package/tree/main/业务模块知识/Framework/亮灭屏模块/AON/)

## 文档模板

所有模块文档均遵循统一的模板结构，确保知识体系的一致性和完整性：

- **核心知识**：主要数据结构、设计思路、线程进程模型
- **接口与流程**：对外接口、核心工作流程
- **主要功能**：模块核心功能介绍
- **项目经验**：实际项目中的定制和优化案例
- **面试技巧**：常见面试问题和解答

**模板位置**：[业务模块知识/Framework/业务模块知识体系通用Skill文档模板.md](https://github.com/MrLeviZhao0/knowledge_package/blob/main/业务模块知识/Framework/业务模块知识体系通用Skill文档模板.md)

## 使用说明

1. 每个模块包含完整的知识体系文档
2. 可以根据模板扩展新的业务模块
3. 项目经验部分提供了实际开发中的解决方案
4. 面试技巧部分涵盖了常见的技术面试问题

## 未来规划

- 扩展更多Android Framework核心模块
- 增加更多实际项目案例
- 完善各模块的高级特性介绍
- 增加代码示例和分析

---

**更新时间**：2026-02-11
**版本**：v1.0