# Display Bringup核心知识_接口与运转流程

## 1. 对外提供的接口

### 1.1 DTSI配置接口

**Panel设备树配置接口**
```dts
// 基本显示参数配置
qcom,mdss-dsi-panel-name = "面板名称标识";
qcom,mdss-dsi-panel-type = "dsi_video_mode"; // 视频模式
qcom,mdss-dsi-panel-physical-type = "lcd";    // 物理类型

// 分辨率配置
qcom,mdss-dsi-panel-width = <1080>;    // 水平分辨率
qcom,mdss-dsi-panel-height = <2400>;   // 垂直分辨率
qcom,mdss-dsi-h-active = <1080>;       // 水平有效像素
qcom,mdss-dsi-v-active = <2400>;       // 垂直有效像素

// 时序参数配置
qcom,mdss-dsi-h-front-porch = <100>;   // 水平前廊
qcom,mdss-dsi-h-back-porch = <100>;    // 水平后廊
qcom,mdss-dsi-h-pulse-width = <8>;     // 水平同步脉冲
qcom,mdss-dsi-h-sync-skew = <0>;       // 水平同步偏移
qcom,mdss-dsi-v-back-porch = <20>;     // 垂直后廊
qcom,mdss-dsi-v-front-porch = <54>;    // 垂直前廊
qcom,mdss-dsi-v-pulse-width = <10>;    // 垂直同步脉冲

// 时钟配置
qcom,mdss-dsi-panel-framerate = <60>;  // 帧率(Hz)
qcom,mdss-dsi-panel-clockrate = <1107000000>; // 像素时钟频率(Hz)
```

**使用示例：配置1080x2400@60Hz面板**
```dts
dsi_panel_1080x2400_60hz: qcom,mdss_dsi_panel_1080x2400_60hz {
    qcom,mdss-dsi-panel-name = "truly_1080p_video";
    qcom,mdss-dsi-panel-type = "dsi_video_mode";
    qcom,mdss-dsi-panel-physical-type = "lcd";
    
    qcom,mdss-dsi-panel-width = <1080>;
    qcom,mdss-dsi-panel-height = <2400>;
    qcom,mdss-dsi-h-front-porch = <100>;
    qcom,mdss-dsi-h-back-porch = <100>;
    qcom,mdss-dsi-h-pulse-width = <8>;
    qcom,mdss-dsi-h-sync-skew = <0>;
    qcom,mdss-dsi-v-back-porch = <20>;
    qcom,mdss-dsi-v-front-porch = <54>;
    qcom,mdss-dsi-v-pulse-width = <10>;
    
    qcom,mdss-dsi-panel-framerate = <60>;
    qcom,mdss-dsi-panel-clockrate = <1107000000>;
    
    // MIPI DSI配置
    qcom,mdss-dsi-h-sync-pulse = <0>;
    qcom,mdss-dsi-traffic-mode = "non_burst_sync_event";
    qcom,mdss-dsi-bllp-eof-power-mode;
    qcom,mdss-dsi-bllp-power-mode;
    
    // 通道配置
    qcom,mdss-dsi-lane-0-state;
    qcom,mdss-dsi-lane-1-state;
    qcom,mdss-dsi-lane-2-state;
    qcom,mdss-dsi-lane-3-state;
    
    // 复位序列
    qcom,mdss-dsi-reset-sequence = <1 10>, <0 10>, <1 10>;
};
```

### 1.2 PMIC电源管理接口

**电源供应器配置接口**
```dts
// 电源供应器配置结构
qcom,panel-supply-entry@0 {
    reg = <0>;                          // 电源索引
    qcom,supply-name = "vddio";        // 电源名称
    qcom,supply-min-voltage = <1800000>; // 最小电压(uV)
    qcom,supply-max-voltage = <1800000>; // 最大电压(uV)
    qcom,supply-enable-load = <62000>;  // 使能负载(uA)
    qcom,supply-disable-load = <80>;    // 禁用负载(uA)
    qcom,supply-post-on-sleep = <20>;   // 上电后延时(ms)
    qcom,supply-pre-off-sleep = <10>;   // 断电前延时(ms)
};
```

**完整电源配置示例**
```dts
&soc {
    dsi_panel_pwr_supply: dsi_panel_pwr_supply {
        #address-cells = <1>;
        #size-cells = <0>;

        // I/O电压供应器
        qcom,panel-supply-entry@0 {
            reg = <0>;
            qcom,supply-name = "vddio";
            qcom,supply-min-voltage = <1800000>;
            qcom,supply-max-voltage = <1800000>;
            qcom,supply-enable-load = <62000>;
            qcom,supply-disable-load = <80>;
            qcom,supply-post-on-sleep = <20>;
        };

        // LAB电压供应器（正电压）
        qcom,panel-supply-entry@1 {
            reg = <1>;
            qcom,supply-name = "lab";
            qcom,supply-min-voltage = <4600000>;
            qcom,supply-max-voltage = <6000000>;
            qcom,supply-enable-load = <100000>;
            qcom,supply-disable-load = <100>;
            qcom,supply-post-on-sleep = <5>;
        };

        // IBB电压供应器（负电压）
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

### 1.3 核心配置接口

**调试和配置接口**
```dts
// 调试相关配置
qcom,mdss-dsi-panel-status-check-mode = "reg_read"; // 状态检查模式
qcom,mdss-dsi-panel-status-command = [06 01 00 01 00]; // 状态读取命令
qcom,mdss-dsi-panel-status-command-state = "dsi_lp_mode"; // 命令状态
qcom,mdss-dsi-panel-status-value = <0x9c>; // 期望的状态值
qcom,mdss-dsi-panel-on-check-value = <0x9c>; // 开机检查值
qcom,mdss-dsi-panel-status-read-length = <1>; // 读取长度

// 色彩配置
qcom,mdss-dsi-color-order = "rgb_swap_rgb"; // 色彩顺序
qcom,mdss-dsi-underflow-color = <0xff>; // 下溢颜色
qcom,mdss-dsi-border-color = <0>; // 边框颜色
```

## 2. 对内主要运转流程

### 2.1 模块启动流程

**Display Bringup完整启动调用栈**
```
内核启动阶段：
start_kernel()
├── platform_driver_register(&mdss_dsi_driver)
│   └── mdss_dsi_probe()
│       ├── 解析设备树参数
│       ├── 分配显示资源
│       ├── 配置时钟系统
│       ├── 初始化MIPI DSI PHY
│       ├── 配置Panel参数
│       └── 注册显示设备
│
├── mdss_dsi_host_init()
│   ├── 配置DSI主机控制器
│   ├── 设置时序参数
│   └── 使能显示引擎
│
└── mdss_dsi_panel_init()
    ├── 发送Panel复位序列
    ├── 配置初始化命令
    ├── 设置显示模式
    └── 启动显示输出
```

**具体实现伪代码**
```c
// 显示驱动探测函数
static int mdss_dsi_probe(struct platform_device *pdev)
{
    struct mdss_dsi_ctrl *ctrl;
    int ret;
    
    // 1. 分配控制结构体
    ctrl = devm_kzalloc(&pdev->dev, sizeof(*ctrl), GFP_KERNEL);
    if (!ctrl)
        return -ENOMEM;
    
    // 2. 解析设备树参数
    ret = mdss_dsi_parse_dt(pdev, ctrl);
    if (ret) {
        pr_err("Failed to parse device tree\n");
        goto free_ctrl;
    }
    
    // 3. 配置时钟系统
    ret = mdss_dsi_clk_init(ctrl);
    if (ret) {
        pr_err("Failed to init clocks\n");
        goto free_resources;
    }
    
    // 4. 初始化MIPI DSI PHY
    ret = mdss_dsi_phy_init(ctrl);
    if (ret) {
        pr_err("Failed to init DSI PHY\n");
        goto clk_deinit;
    }
    
    // 5. 配置Panel参数
    ret = mdss_dsi_panel_init(ctrl);
    if (ret) {
        pr_err("Failed to init panel\n");
        goto phy_deinit;
    }
    
    // 6. 注册显示设备
    ret = mdss_dsi_register_device(ctrl);
    if (ret) {
        pr_err("Failed to register display device\n");
        goto panel_deinit;
    }
    
    return 0;
    
panel_deinit:
    mdss_dsi_panel_deinit(ctrl);
phy_deinit:
    mdss_dsi_phy_deinit(ctrl);
clk_deinit:
    mdss_dsi_clk_deinit(ctrl);
free_resources:
    mdss_dsi_free_resources(ctrl);
free_ctrl:
    devm_kfree(&pdev->dev, ctrl);
    return ret;
}
```

### 2.2 核心流程1：Panel初始化序列

**Panel初始化详细流程**
```
1. 电源序列启动
   ├── 使能VDDIO电压 (1.8V)
   ├── 延时20ms等待稳定
   ├── 使能LAB正电压 (5.6V)
   ├── 延时5ms等待稳定
   ├── 使能IBB负电压 (-5.6V)
   └── 延时5ms等待稳定

2. Panel复位序列
   ├── 拉高复位引脚
   ├── 保持10ms
   ├── 拉低复位引脚
   ├── 保持10ms
   ├── 再次拉高复位引脚
   └── 保持10ms等待初始化完成

3. DCS命令发送
   ├── 发送Sleep Out命令 (0x11)
   ├── 延时120ms等待Panel唤醒
   ├── 发送色彩模式设置命令
   ├── 发送亮度控制命令
   ├── 发送显示使能命令 (0x29)
   └── 验证Panel状态

4. 时序参数配置
   ├── 配置水平时序参数
   ├── 配置垂直时序参数
   ├── 设置像素时钟
   ├── 配置MIPI DSI参数
   └── 启动显示输出
```

**具体实现代码**
```c
// Panel初始化函数
static int mdss_dsi_panel_init(struct mdss_dsi_ctrl *ctrl)
{
    int ret;
    
    // 1. 电源序列启动
    ret = mdss_dsi_panel_power_on(ctrl);
    if (ret) {
        pr_err("Failed to power on panel\n");
        return ret;
    }
    
    // 2. Panel复位序列
    ret = mdss_dsi_panel_reset(ctrl);
    if (ret) {
        pr_err("Failed to reset panel\n");
        goto power_off;
    }
    
    // 3. 发送DCS初始化命令
    ret = mdss_dsi_send_init_commands(ctrl);
    if (ret) {
        pr_err("Failed to send init commands\n");
        goto power_off;
    }
    
    // 4. 配置时序参数
    ret = mdss_dsi_config_timing(ctrl);
    if (ret) {
        pr_err("Failed to config timing\n");
        goto power_off;
    }
    
    // 5. 启动显示输出
    ret = mdss_dsi_enable_display(ctrl);
    if (ret) {
        pr_err("Failed to enable display\n");
        goto power_off;
    }
    
    return 0;
    
power_off:
    mdss_dsi_panel_power_off(ctrl);
    return ret;
}
```

### 2.3 核心流程2：MIPI DSI PHY初始化

**PHY初始化详细流程**
```
1. 电源管理
   ├── 使能PHY电源
   ├── 配置电压调节器
   └── 等待电源稳定

2. 时钟配置
   ├── 配置PLL锁相环
   ├── 设置像素时钟频率
   ├── 配置MIPI DSI时钟
   └── 校准时钟相位

3. PHY寄存器配置
   ├── 执行软复位
   ├── 配置时序参数
   ├── 设置驱动强度
   └── 配置阻抗匹配

4. 通道校准
   ├── 执行通道对齐
   ├── 验证信号质量
   ├── 优化时序参数
   └── 使能数据传输
```

**PHY配置代码示例**
```c
// MIPI DSI PHY初始化函数
static int mdss_dsi_phy_init(struct mdss_dsi_ctrl *ctrl)
{
    struct mdss_dsi_phy *phy = &ctrl->phy;
    int ret;
    
    // 1. 电源使能
    ret = regulator_enable(phy->vreg);
    if (ret) {
        pr_err("Failed to enable PHY regulator\n");
        return ret;
    }
    
    // 2. 时钟配置
    ret = clk_prepare_enable(phy->pll_clk);
    if (ret) {
        pr_err("Failed to enable PLL clock\n");
        goto disable_vreg;
    }
    
    // 3. PHY寄存器配置
    ret = mdss_dsi_phy_sw_reset(ctrl);
    if (ret) {
        pr_err("Failed to reset PHY\n");
        goto disable_clk;
    }
    
    // 4. 时序参数配置
    ret = mdss_dsi_phy_timing_config(ctrl);
    if (ret) {
        pr_err("Failed to config PHY timing\n");
        goto disable_clk;
    }
    
    // 5. 通道校准
    ret = mdss_dsi_phy_calibration(ctrl);
    if (ret) {
        pr_err("Failed to calibrate PHY\n");
        goto disable_clk;
    }
    
    return 0;
    
disable_clk:
    clk_disable_unprepare(phy->pll_clk);
disable_vreg:
    regulator_disable(phy->vreg);
    return ret;
}
```

### 2.4 核心流程3：显示引擎配置

**显示引擎配置流程**
```
1. 分辨率设置
   ├── 配置显示宽度和高度
   ├── 设置有效显示区域
   └── 配置边框参数

2. 色彩空间配置
   ├── 选择色彩格式 (RGB888/RGB565)
   ├── 配置Gamma校正
   ├── 设置色彩深度
   └── 配置色彩映射

3. 显示模式选择
   ├── 选择视频模式/命令模式
   ├── 配置刷新率
   ├── 设置同步模式
   └── 配置扫描方向

4. 硬件合成配置
   ├── 配置覆盖层参数
   ├── 设置混合模式
   ├── 配置缩放参数
   └── 使能硬件加速
```

## 3. 调试指令

### 3.1 常用调试命令

**内核调试命令**
```bash
# 查看显示状态
cat /sys/kernel/debug/mdss/status

# 查看Panel信息
cat /sys/kernel/debug/mdss/panel_info

# 查看MIPI DSI状态
cat /sys/kernel/debug/mdss/dsi_status

# 查看时钟配置
cat /sys/kernel/debug/clk/mdss_clocks

# 查看电源状态
cat /sys/kernel/debug/regulator/regulator_summary
```

**用户空间调试命令**
```bash
# 查看显示设备信息
dumpsys display

# 查看SurfaceFlinger状态
dumpsys SurfaceFlinger

# 查看显示配置
dumpsys display | grep -A 20 "DisplayDevice"

# 强制刷新显示
service call SurfaceFlinger 1008 i32 1

# 查看VSync状态
dumpsys SurfaceFlinger | grep -i vsync
```

### 3.2 调试参数配置

**调试模式配置**
```dts
// 启用详细调试日志
qcom,mdss-dsi-panel-debug-enabled;

// 配置调试级别
qcom,mdss-dsi-debug-log-level = <7>; // 0-7, 7为最详细

// 启用时序调试
qcom,mdss-dsi-timing-debug;

// 配置错误检测
qcom,mdss-dsi-error-check-mode = "bta"; // 总线转向确认
```

## 总结

Display Bringup的接口与运转流程涵盖了从硬件配置到软件初始化的完整过程。关键接口包括DTSI配置接口、PMIC电源管理接口和调试接口，这些接口的正确配置是Bringup成功的基础。运转流程则详细描述了Panel初始化、MIPI DSI PHY配置和显示引擎设置的完整序列，每个步骤都需要严格按照硬件规范执行。

在实际Bringup过程中，需要特别注意时序参数的准确性、电源序列的正确性以及调试信息的充分利用。通过合理的接口设计和流程控制，可以确保显示系统的稳定启动和可靠运行。