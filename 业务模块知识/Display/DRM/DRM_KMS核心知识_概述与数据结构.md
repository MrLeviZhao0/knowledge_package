# DRM/KMS核心知识_概述与数据结构

## 1. 概述

DRM（Direct Rendering Manager）是Linux内核中的显示驱动框架，KMS（Kernel Mode Setting）是DRM的子模块，负责显示模式的设置和管理。基于高通平台的DRM/KMS实现提供了完整的显示管道抽象，包括CRTC、Encoder、Connector、Plane等核心组件。

### 1.1 核心职责
- **显示管道管理**：管理从帧缓冲到显示输出的完整数据流
- **模式设置**：配置分辨率、刷新率等显示参数
- **硬件抽象**：为不同显示硬件提供统一的接口
- **电源管理**：控制显示系统的电源状态
- **性能优化**：提供硬件加速和性能优化机制

### 1.2 技术架构
```
用户空间 (Userspace)
    ↓
libdrm库 (DRM Library)
    ↓
DRM/KMS内核框架 (Kernel Framework)
    ↓
高通MSM DRM驱动 (Qualcomm MSM DRM Driver)
    ↓
显示硬件 (Display Hardware)
    ├── DPU (Display Processing Unit)
    ├── MIPI DSI控制器
    └── 显示面板 (Panel)
```

## 2. 主要数据结构

### 2.1 DRM核心数据结构

**DRM设备结构体**
```c
struct drm_device {
    struct device *dev;              // 关联的设备
    struct drm_driver *driver;       // 驱动操作函数
    
    // 模式配置管理
    struct drm_mode_config mode_config;
    
    // 组件管理
    struct list_head plane_list;     // Plane列表
    struct list_head crtc_list;      // CRTC列表
    struct list_head encoder_list;   // Encoder列表
    struct list_head connector_list; // Connector列表
    
    // 文件句柄管理
    struct idr ctx_idr;              // 上下文ID管理
    struct idr tile_idr;             // Tile ID管理
    
    // 锁和同步
    struct mutex mode_config_mutex;  // 模式配置锁
    spinlock_t event_lock;           // 事件锁
};
```

**高通MSM DRM设备扩展结构**
```c
struct msm_drm_private {
    struct drm_device *dev;
    struct device *ddev;
    
    // GPU相关
    struct msm_gpu *gpu;
    struct msm_file_private *lastctx;
    
    // 显示相关
    struct msm_mdss *mdss;           // MDSS显示子系统
    struct msm_dpu *dpu;             // DPU显示处理单元
    
    // 电源管理
    struct regulator *vdd;           // 核心电压
    struct clk *core_clk;            // 核心时钟
    
    // 内存管理
    struct msm_mmu *mmu;
    struct drm_mm vram;              // 视频内存管理
};
```

### 2.2 KMS核心组件结构

**CRTC（显示控制器）结构**
```c
struct drm_crtc {
    struct drm_device *dev;          // 关联的DRM设备
    struct list_head head;           // 链表节点
    
    // 硬件特定数据
    void *helper_private;            // 辅助私有数据
    
    // 状态管理
    struct drm_crtc_state *state;    // 当前状态
    
    // 功能操作
    const struct drm_crtc_funcs *funcs; // CRTC操作函数
    
    // 属性管理
    struct drm_object_properties properties; // 属性集合
    
    // 高通扩展
    struct msm_dpu_crtc *dpu_crtc;   // DPU CRTC数据
};

// 高通DPU CRTC扩展
struct msm_dpu_crtc {
    struct drm_crtc base;
    
    // 硬件寄存器
    void __iomem *base_addr;         // 寄存器基地址
    
    // 混合器配置
    struct dpu_hw_mixer *mixer;      // 混合器硬件
    struct dpu_hw_pingpong *pp;      // PingPong硬件
    
    // 时序生成器
    struct dpu_hw_intf *intf;        // 接口硬件
    
    // 性能统计
    struct dpu_crtc_perf perf;       // 性能数据
};
```

**Plane（显示平面）结构**
```c
struct drm_plane {
    struct drm_device *dev;
    struct list_head head;
    
    // 平面类型
    enum drm_plane_type type;        // 平面类型（Primary/Cursor/Overlay）
    
    // 格式支持
    const uint32_t *format_types;    // 支持的格式列表
    unsigned int format_count;       // 格式数量
    
    // 状态管理
    struct drm_plane_state *state;   // 当前状态
    
    // 高通扩展
    struct msm_dpu_plane *dpu_plane; // DPU平面数据
};

// 高通DPU平面扩展
struct msm_dpu_plane {
    struct drm_plane base;
    
    // 硬件配置
    struct dpu_hw_sspp *pipe;        // 管道硬件
    
    // 缩放和旋转
    struct dpu_hw_scaler3_cfg scaler3_cfg; // 缩放配置
    
    // 格式支持
    const struct dpu_format *format; // 像素格式
    
    // 性能优化
    bool async_blit;                 // 异步blit支持
};
```

**Encoder（编码器）结构**
```c
struct drm_encoder {
    struct drm_device *dev;
    struct list_head head;
    
    // 编码器类型
    unsigned int encoder_type;       // 编码器类型（DSI/HDMI/DP）
    
    // CRTC关联
    struct drm_crtc *crtc;           // 当前关联的CRTC
    
    // 高通扩展
    struct msm_dpu_encoder *dpu_encoder; // DPU编码器数据
};

// 高通DPU编码器扩展
struct msm_dpu_encoder {
    struct drm_encoder base;
    
    // 物理接口
    struct dpu_hw_intf *intf;        // 显示接口
    
    // 时序控制
    struct dpu_hw_pingpong *pp;      // PingPong控制
    
    // MIPI DSI配置
    struct msm_dsi *dsi;            // DSI控制器
    
    // 电源管理
    bool enabled;                    // 使能状态
};
```

**Connector（连接器）结构**
```c
struct drm_connector {
    struct drm_device *dev;
    struct list_head head;
    
    // 连接器类型
    int connector_type;              // 连接器类型（DSI/HDMI/DP）
    
    // 显示信息
    struct edid *edid;               // EDID信息
    
    // 状态管理
    struct drm_connector_state *state; // 当前状态
    
    // 属性管理
    struct drm_object_properties properties; // 属性集合
    
    // 高通扩展
    struct msm_dsi_connector *dsi_connector; // DSI连接器数据
};

// 高通DSI连接器扩展
struct msm_dsi_connector {
    struct drm_connector base;
    
    // Panel信息
    struct drm_panel *panel;         // 关联的Panel
    
    // 桥接器
    struct drm_bridge *bridge;       // 桥接器
    
    // 模式支持
    struct drm_display_mode *mode;   // 当前模式
    
    // 热插拔检测
    bool hpd_enabled;                // 热插拔检测使能
};
```

### 2.3 状态管理结构

**原子状态结构**
```c
struct drm_atomic_state {
    struct kref ref;                 // 引用计数
    
    // 组件状态
    struct drm_plane_state **planes; // 平面状态数组
    struct drm_crtc_state **crtcs;   // CRTC状态数组
    struct drm_connector_state **connectors; // 连接器状态数组
    
    // 提交管理
    bool allow_modeset : 1;         // 允许模式设置
    bool legacy_cursor_update : 1;  // 传统光标更新
    
    // 高通扩展
    struct msm_dpu_atomic_state *dpu_state; // DPU原子状态
};

// 高通DPU原子状态扩展
struct msm_dpu_atomic_state {
    struct drm_atomic_state base;
    
    // 硬件状态
    struct dpu_global_state *global_state; // 全局状态
    
    // 性能优化
    bool async_commit;               // 异步提交
    
    // 错误处理
    int error;                        // 错误码
};
```

## 3. 核心接口

### 3.1 DRM设备操作接口

**DRM驱动操作函数表**
```c
struct drm_driver {
    // 设备管理
    int (*load)(struct drm_device *, unsigned long flags);
    void (*unload)(struct drm_device *);
    
    // 文件操作
    int (*open)(struct drm_device *, struct drm_file *);
    void (*postclose)(struct drm_device *, struct drm_file *);
    
    // IOCTL处理
    const struct drm_ioctl_desc *ioctls; // IOCTL函数表
    int num_ioctls;                   // IOCTL数量
    
    // 内存管理
    int (*gem_prime_pin)(struct drm_gem_object *);
    void (*gem_prime_unpin)(struct drm_gem_object *);
    
    // 高通扩展
    const struct msm_drm_funcs *msm_funcs; // 高通特定函数
};
```

### 3.2 KMS组件操作接口

**CRTC操作函数表**
```c
struct drm_crtc_funcs {
    // 模式设置
    int (*set_config)(struct drm_mode_set *set);
    
    // 页面翻转
    int (*page_flip)(struct drm_crtc *crtc,
                     struct drm_framebuffer *fb,
                     struct drm_pending_vblank_event *event,
                     uint32_t flags);
    
    // 原子操作
    int (*atomic_set_property)(struct drm_crtc *crtc,
                              struct drm_crtc_state *state,
                              struct drm_property *property,
                              uint64_t val);
    
    // 高通扩展
    const struct msm_dpu_crtc_funcs *dpu_funcs; // DPU CRTC函数
};
```

**Plane操作函数表**
```c
struct drm_plane_funcs {
    // 平面更新
    int (*update_plane)(struct drm_plane *plane,
                       struct drm_crtc *crtc,
                       struct drm_framebuffer *fb,
                       int crtc_x, int crtc_y,
                       unsigned int crtc_w, unsigned int crtc_h,
                       uint32_t src_x, uint32_t src_y,
                       uint32_t src_w, uint32_t src_h);
    
    // 原子操作
    void (*atomic_update)(struct drm_plane *plane,
                         struct drm_plane_state *old_state);
    
    // 高通扩展
    const struct msm_dpu_plane_funcs *dpu_funcs; // DPU平面函数
};
```

## 4. 核心集合

### 4.1 属性集合

**高通DRM属性定义**
```c
// CRTC属性
static const struct drm_prop_enum_list msm_crtc_properties[] = {
    { DRM_MODE_PROPERTY_CRTC_ID, "CRTC_ID" },
    { DRM_MODE_PROPERTY_ACTIVE, "active" },
    { DRM_MODE_PROPERTY_MODE_ID, "mode_id" },
    { DPU_CRTC_PROP_CACHE_STATE, "cache_state" }, // 高通特有
    { DPU_CRTC_PROP_DEST_SCALER, "dest_scaler" }, // 目标缩放器
};

// Plane属性
static const struct drm_prop_enum_list msm_plane_properties[] = {
    { DRM_MODE_PROPERTY_FB_ID, "FB_ID" },
    { DRM_MODE_PROPERTY_CRTC_ID, "CRTC_ID" },
    { DRM_MODE_PROPERTY_CRTC_X, "CRTC_X" },
    { DRM_MODE_PROPERTY_CRTC_Y, "CRTC_Y" },
    { DRM_MODE_PROPERTY_CRTC_W, "CRTC_W" },
    { DRM_MODE_PROPERTY_CRTC_H, "CRTC_H" },
    { DPU_PLANE_PROP_SRC_CONFIG, "src_config" }, // 高通特有
    { DPU_PLANE_PROP_SCALER_CONFIG, "scaler_config" }, // 缩放配置
};

// Connector属性
static const struct drm_prop_enum_list msm_connector_properties[] = {
    { DRM_MODE_PROPERTY_CRTC_ID, "CRTC_ID" },
    { DRM_MODE_PROPERTY_DPMS, "DPMS" },
    { DRM_MODE_PROPERTY_EDID, "EDID" },
    { DSI_CONNECTOR_PROP_PANEL_MODE, "panel_mode" }, // 高通特有
    { DSI_CONNECTOR_PROP_HDR_METADATA, "hdr_metadata" }, // HDR元数据
};
```

### 4.2 格式支持集合

**高通DPU支持的像素格式**
```c
// RGB格式
static const uint32_t dpu_rgb_formats[] = {
    DRM_FORMAT_XRGB8888,
    DRM_FORMAT_ARGB8888,
    DRM_FORMAT_RGB888,
    DRM_FORMAT_RGB565,
    DRM_FORMAT_BGR565,
    DRM_FORMAT_XRGB2101010,
    DRM_FORMAT_ARGB2101010,
};

// YUV格式
static const uint32_t dpu_yuv_formats[] = {
    DRM_FORMAT_NV12,
    DRM_FORMAT_NV21,
    DRM_FORMAT_NV16,
    DRM_FORMAT_NV61,
    DRM_FORMAT_YUYV,
    DRM_FORMAT_YVYU,
    DRM_FORMAT_UYVY,
    DRM_FORMAT_VYUY,
};

// 压缩格式
static const uint32_t dpu_compressed_formats[] = {
    DRM_FORMAT_P010,      // 10-bit YUV 4:2:0
    DRM_FORMAT_P016,      // 16-bit YUV 4:2:0
};
```

## 5. 高通特定数据结构

### 5.1 DPU硬件抽象层

**DPU混合器配置**
```c
struct dpu_hw_mixer {
    // 硬件寄存器
    void __iomem *base;
    
    // 功能配置
    struct dpu_mixer_cfg cfg;
    
    // 操作函数
    const struct dpu_hw_mixer_ops *ops;
};

// 混合器操作函数
struct dpu_hw_mixer_ops {
    void (*setup_mixer_out)(struct dpu_hw_mixer *ctx,
                           struct dpu_hw_mixer_cfg *cfg);
    void (*setup_blend_config)(struct dpu_hw_mixer *ctx,
                             uint32_t stage, uint32_t fg_alpha,
                             uint32_t bg_alpha, uint32_t blend_op);
    void (*setup_alpha_out)(struct dpu_hw_mixer *ctx, uint32_t mixer_op);
};
```

**DPU管道配置**
```c
struct dpu_hw_sspp {
    // 硬件寄存器
    void __iomem *base;
    
    // 管道配置
    struct dpu_sspp_cfg cfg;
    
    // 操作函数
    const struct dpu_hw_sspp_ops *ops;
};

// 管道操作函数
struct dpu_hw_sspp_ops {
    void (*setup_format)(struct dpu_hw_sspp *ctx, uint32_t fmt,
                        uint32_t flags, uint32_t chroma_samp);
    void (*setup_rects)(struct dpu_hw_sspp *ctx,
                       struct dpu_hw_sspp_rect *src_rect,
                       struct dpu_hw_sspp_rect *dst_rect);
    void (*setup_sourceaddress)(struct dpu_hw_sspp *ctx, uint32_t *addr);
    void (*setup_csc)(struct dpu_hw_sspp *ctx, struct dpu_csc_cfg *data);
};
```

### 5.2 MIPI DSI控制器结构

**DSI主机控制器**
```c
struct msm_dsi_host {
    struct platform_device *pdev;
    
    // 硬件寄存器
    void __iomem *base;
    
    // 配置参数
    struct msm_dsi_cfg *cfg;
    
    // 通道配置
    u32 num_data_lanes;
    
    // 操作函数
    const struct msm_dsi_host_ops *ops;
};

// DSI主机操作函数
struct msm_dsi_host_ops {
    int (*init)(struct msm_dsi_host *msm_host);
    int (*mode_set)(struct msm_dsi_host *msm_host,
                   struct drm_display_mode *mode);
    int (*enable)(struct msm_dsi_host *msm_host);
    int (*disable)(struct msm_dsi_host *msm_host);
    int (*cmd_transfer)(struct msm_dsi_host *msm_host,
                       u8 data_type, const u8 *buf, size_t len);
};
```

## 6. 数据结构关系图

### 6.1 DRM/KMS组件关系
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   DRM设备        │───▶│   模式配置      │───▶│   属性管理      │
│                 │    │                 │    │                 │
│ - 设备管理       │    │ - 分辨率配置    │    │ - 属性定义      │
│ - 驱动操作       │    │ - 刷新率设置    │    │ - 属性值存储    │
│ - 内存管理       │    │ - 时序参数      │    │ - 属性变更通知  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   CRTC控制器    │───▶│   Plane平面     │───▶│   Encoder编码器  │
│                 │    │                 │    │                 │
│ - 显示控制      │    │ - 图层混合      │    │ - 信号转换      │
│ - 时序生成      │    │ - 缩放旋转      │    │ - 接口适配      │
│ - VSync管理     │    │ - Alpha混合     │    │ - 协议处理      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Connector     │───▶│   显示硬件      │───▶│   最终输出      │
│   连接器        │    │                 │    │                 │
│ - 热插拔检测    │    │ - DPU处理单元   │    │ - 图像显示      │
│ - EDID读取      │    │ - MIPI DSI      │    │ - 色彩校正      │
│ - 状态监控      │    │ - 显示面板      │    │ - 亮度调节      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 6.2 高通DPU数据流关系
```
应用层 (Application)
    ↓
帧缓冲 (Framebuffer)
    ↓
DPU管道 (SSPP)
    ├── 格式转换
    ├── 色彩空间转换
    ├── 缩放处理
    └── 旋转处理
    ↓
DPU混合器 (Mixer)
    ├── 图层混合
    ├── Alpha混合
    └── 色彩混合
    ↓
DPU接口 (Interface)
    ├── 时序生成
    ├── 同步信号
    └── 数据打包
    ↓
MIPI DSI控制器
    ├── 协议封装
    ├── 数据编码
    └── 物理传输
    ↓
显示面板 (Panel)
```

## 总结

DRM/KMS核心数据结构提供了完整的显示管道抽象，通过CRTC、Plane、Encoder、Connector等核心组件实现了灵活的显示配置。高通平台的实现在此基础上增加了DPU硬件抽象层，提供了更高效的硬件加速和性能优化能力。

关键数据结构特点：
1. **分层抽象**：硬件细节对上层透明
2. **状态管理**：原子操作确保状态一致性
3. **属性驱动**：通过属性系统实现灵活配置
4. **扩展性强**：支持高通特有的硬件功能
5. **性能优化**：硬件加速和内存管理优化

这些数据结构为Android显示系统提供了坚实的基础，确保了显示功能的稳定性和性能。