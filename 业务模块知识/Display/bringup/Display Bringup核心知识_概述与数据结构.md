# Display Bringup核心知识_概述与数据结构

## 1. 概述

Display Bringup是Android系统开发中显示模块的启动和配置过程，涉及硬件初始化、驱动配置、时序参数设置等关键环节。基于高通平台的Display Bringup主要包括MIPI DSI接口配置、Panel参数设置、PMIC电源管理等内容。

### 1.1 核心职责
- **硬件初始化**：显示控制器、MIPI DSI PHY、Panel的初始化
- **时序配置**：根据Panel规格书配置正确的时序参数
- **电源管理**：PMIC电源序列配置和电压设置
- **驱动调试**：解决Bringup过程中的各种显示问题

### 1.2 技术架构
```
应用层 (Application Layer)
    ↓
SurfaceFlinger (显示合成服务)
    ↓
HWC (硬件合成器)
    ↓
DRM/KMS (显示驱动框架)
    ↓
高通显示驱动 (Qualcomm Display Driver)
    ↓
MIPI DSI控制器 (硬件层)
    ↓
显示面板 (Panel)
```

## 2. 主要数据结构

### 2.1 DTSI配置结构

**Panel设备树节点结构**
```dts
&mdss_dsi0 {
    qcom,dsi-pref-prim-pan = <&dsi_panel_name>;
    
    dsi_panel_name: qcom,mdss_dsi_panel_name {
        qcom,mdss-dsi-panel-name = "panel_name";
        qcom,mdss-dsi-panel-type = "dsi_video_mode";
        qcom,mdss-dsi-panel-physical-type = "lcd";
        
        // 时序参数
        qcom,mdss-dsi-panel-width = <1080>;
        qcom,mdss-dsi-panel-height = <2400>;
        qcom,mdss-dsi-h-front-porch = <100>;
        qcom,mdss-dsi-h-back-porch = <100>;
        qcom,mdss-dsi-h-pulse-width = <8>;
        qcom,mdss-dsi-h-sync-skew = <0>;
        qcom,mdss-dsi-v-back-porch = <20>;
        qcom,mdss-dsi-v-front-porch = <54>;
        qcom,mdss-dsi-v-pulse-width = <10>;
        
        // 时钟配置
        qcom,mdss-dsi-panel-framerate = <60>;
        qcom,mdss-dsi-panel-clockrate = <1107000000>;
        qcom,mdss-dsi-h-left-border = <0>;
        qcom,mdss-dsi-h-right-border = <0>;
        qcom,mdss-dsi-v-top-border = <0>;
        qcom,mdss-dsi-v-bottom-border = <0>;
        
        // MIPI DSI配置
        qcom,mdss-dsi-h-sync-pulse = <0>;
        qcom,mdss-dsi-traffic-mode = "non_burst_sync_event";
        qcom,mdss-dsi-bllp-eof-power-mode;
        qcom,mdss-dsi-bllp-power-mode;
        qcom,mdss-dsi-lane-0-state;
        qcom,mdss-dsi-lane-1-state;
        qcom,mdss-dsi-lane-2-state;
        qcom,mdss-dsi-lane-3-state;
        
        // 电源序列
        qcom,mdss-dsi-reset-sequence = <1 10>, <0 10>, <1 10>;
    };
};
```

### 2.2 Panel配置数据结构

**Panel配置参数结构体**
```c
struct mdss_panel_config {
    u32 panel_width;           // 面板宽度
    u32 panel_height;          // 面板高度
    u32 h_front_porch;        // 水平前廊
    u32 h_back_porch;         // 水平后廊
    u32 h_pulse_width;        // 水平同步脉冲宽度
    u32 v_front_porch;        // 垂直前廊
    u32 v_back_porch;         // 垂直后廊
    u32 v_pulse_width;        // 垂直同步脉冲宽度
    u32 frame_rate;           // 帧率
    u32 clock_rate;           // 像素时钟频率
    u32 num_of_lanes;         // DSI通道数量
    bool h_sync_pulse;        // 水平同步脉冲模式
    char traffic_mode[32];    // 数据传输模式
    struct reset_sequence reset_seq; // 复位序列
};
```

### 2.3 PMIC电源配置结构

**PMIC电源序列配置**
```dts
&soc {
    dsi_panel_pwr_supply: dsi_panel_pwr_supply {
        #address-cells = <1>;
        #size-cells = <0>;

        qcom,panel-supply-entry@0 {
            reg = <0>;
            qcom,supply-name = "vddio";
            qcom,supply-min-voltage = <1800000>;
            qcom,supply-max-voltage = <1800000>;
            qcom,supply-enable-load = <62000>;
            qcom,supply-disable-load = <80>;
            qcom,supply-post-on-sleep = <20>;
        };

        qcom,panel-supply-entry@1 {
            reg = <1>;
            qcom,supply-name = "lab";
            qcom,supply-min-voltage = <4600000>;
            qcom,supply-max-voltage = <6000000>;
            qcom,supply-enable-load = <100000>;
            qcom,supply-disable-load = <100>;
            qcom,supply-post-on-sleep = <5>;
        };

        qcom,panel-supply-entry@2 {
            reg = <2>;
            qcom,supply-name = "ibb";
            qcom,supply-min-voltage = <4600000>;
            qcom,supply-max-voltage = <6000000>;
            qcom,supply-enable-load = <100000>;
            qcom,supply-disable-load = <100>;
            qcom,supply-post-on-sleep = <5>;
        };
    };
};
```

## 3. 核心接口

### 3.1 DTSI配置接口

**时序参数配置接口**
```dts
// 基本时序参数
qcom,mdss-dsi-panel-width = <分辨率宽度>;
qcom,mdss-dsi-panel-height = <分辨率高度>;
qcom,mdss-dsi-h-front-porch = <水平前廊>;
qcom,mdss-dsi-h-back-porch = <水平后廊>;
qcom,mdss-dsi-h-pulse-width = <水平同步脉冲宽度>;
qcom,mdss-dsi-v-front-porch = <垂直前廊>;
qcom,mdss-dsi-v-back-porch = <垂直后廊>;
qcom,mdss-dsi-v-pulse-width = <垂直同步脉冲宽度>;

// 时钟配置
qcom,mdss-dsi-panel-framerate = <帧率>;
qcom,mdss-dsi-panel-clockrate = <像素时钟频率>;

// MIPI DSI配置
qcom,mdss-dsi-traffic-mode = <数据传输模式>;
qcom,mdss-dsi-lane-map = <通道映射>;
qcom,mdss-dsi-h-sync-pulse = <同步脉冲模式>;
```

### 3.2 PMIC电源管理接口

**电源序列配置**
```dts
// 电源供应器配置
qcom,supply-name = "电源名称";
qcom,supply-min-voltage = <最小电压>;
qcom,supply-max-voltage = <最大电压>;
qcom,supply-enable-load = <使能负载>;
qcom,supply-disable-load = <禁用负载>;
qcom,supply-post-on-sleep = <上电后延时>;
qcom,supply-pre-off-sleep = <断电前延时>;
```

## 4. 核心集合

### 4.1 时序参数集合

**典型时序参数配置示例**
| 参数类型 | 1080x2400@60Hz | 1440x3200@120Hz | 说明 |
|---------|---------------|-----------------|------|
| 分辨率 | 1080x2400 | 1440x3200 | 面板物理分辨率 |
| 帧率 | 60Hz | 120Hz | 刷新频率 |
| H Front Porch | 100 | 80 | 水平前廊 |
| H Back Porch | 100 | 100 | 水平后廊 |
| H Pulse Width | 8 | 10 | 水平同步脉冲 |
| V Front Porch | 54 | 40 | 垂直前廊 |
| V Back Porch | 20 | 30 | 垂直后廊 |
| V Pulse Width | 10 | 12 | 垂直同步脉冲 |
| 像素时钟 | 1107MHz | 2500MHz | 像素时钟频率 |

### 4.2 PMIC电压配置集合

**常见PMIC电压配置**
| 电源类型 | 典型电压 | 电压范围 | 用途 |
|---------|---------|---------|------|
| VDDIO | 1.8V | 1.7V-1.9V | I/O电压 |
| VSP | 5.6V | 5.4V-5.8V | 正电压 |
| VSN | -5.6V | -5.4V至-5.8V | 负电压 |
| VGH | 18V | 16V-20V | 栅极高电压 |
| VGL | -12V | -10V至-14V | 栅极低电压 |
| AVDD | 9.6V | 9.0V-10.0V | 模拟电压 |

## 5. 关键配置参数详解

### 5.1 时序参数计算

**像素时钟计算公式**
```
Pixel Clock = (H_Total × V_Total × Frame_Rate) / 1000000 (MHz)

其中：
H_Total = H_Active + H_Front_Porch + H_Sync_Width + H_Back_Porch
V_Total = V_Active + V_Front_Porch + V_Sync_Width + V_Back_Porch
```

**示例计算（1080x2400@60Hz）**
```
H_Total = 1080 + 100 + 8 + 100 = 1288
V_Total = 2400 + 54 + 10 + 20 = 2484
Pixel Clock = (1288 × 2484 × 60) / 1000000 = 191.8 MHz
```

### 5.2 MIPI DSI参数配置

**DSI Lane配置规则**
- **1 Lane**：适用于低分辨率面板（<720p）
- **2 Lanes**：适用于720p-1080p分辨率
- **4 Lanes**：适用于1080p+高分辨率面板

**数据传输模式选择**
- **Burst Mode**：高效率，但时序要求严格
- **Non-burst Sync Pulse**：兼容性好，常用模式
- **Non-burst Sync Event**：稳定性最佳

## 6. 数据结构关系图

### 6.1 Display Bringup配置关系
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Panel规格书    │───▶│   DTSI配置      │───▶│   内核驱动      │
│                 │    │                 │    │                 │
│ - 分辨率        │    │ - 时序参数      │    │ - 硬件初始化    │
│ - 时序参数      │    │ - 时钟配置      │    │ - 寄存器配置    │
│ - 电源要求      │    │ - 电源序列      │    │ - 中断处理      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   PMIC规格      │───▶│  电源管理配置   │───▶│  显示输出      │
│                 │    │                 │    │                 │
│ - 电压范围      │    │ - 电压设置      │    │ - 图像显示      │
│ - 电流能力      │    │ - 时序控制      │    │ - 色彩校正      │
│ - 保护机制      │    │ - 状态监控      │    │ - 亮度调节      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 6.2 配置参数依赖关系
```
Panel规格书
    ↓
时序参数计算
    ↓
DTSI配置生成
    ↓
PMIC电源配置
    ↓
内核驱动加载
    ↓
硬件初始化
    ↓
显示输出验证
```

## 总结

Display Bringup的核心数据结构主要包括DTSI配置、Panel参数、PMIC电源配置等关键部分。正确的数据结构配置是确保显示正常工作的基础，需要严格按照Panel规格书和硬件设计文档进行配置。时序参数的计算和验证是Bringup过程中最重要的环节，直接影响显示质量和稳定性。