# DRM/KMS核心知识_设计思路与线程进程模型

## 1. 设计思路

### 1.1 分层设计

DRM/KMS采用分层设计架构，确保各层职责清晰，便于维护和扩展：

**用户空间层 (Userspace Layer)**
```
┌─────────────────┐
│   应用层         │ ← 图形应用、窗口管理器
├─────────────────┤
│   Mesa/Gallium  │ ← OpenGL/Vulkan驱动
├─────────────────┤
│   Wayland/X11   │ ← 显示服务器协议
├─────────────────┤
│   libdrm库      │ ← DRM系统调用封装
└─────────────────┘
```

**内核空间层 (Kernel Space Layer)**
```
┌─────────────────┐
│   DRM核心框架    │ ← 通用DRM功能
├─────────────────┤
│   KMS子系统     │ ← 模式设置和显示管理
├─────────────────┤
│   高通MSM驱动    │ ← 硬件特定实现
├─────────────────┤
│   DPU硬件抽象    │ ← 显示处理单元抽象
├─────────────────┤
│   显示硬件       │ ← 物理显示控制器
└─────────────────┘
```

### 1.2 通信机制

**用户空间与内核空间通信**
```c
// DRM IOCTL系统调用接口
struct drm_ioctl_desc {
    unsigned int cmd;                 // IOCTL命令
    int (*func)(struct drm_device *, void *, struct drm_file *);
    unsigned int flags;              // 标志位
};

// 典型IOCTL处理函数
static int drm_ioctl_mode_getresources(struct drm_device *dev,
                                       void *data, struct drm_file *file_priv)
{
    struct drm_mode_card_res *card_res = data;
    
    // 获取显示资源信息
    card_res->count_fbs = dev->mode_config.num_fb;
    card_res->count_crtcs = dev->mode_config.num_crtc;
    card_res->count_connectors = dev->mode_config.num_connector;
    card_res->count_encoders = dev->mode_config.num_encoder;
    
    // 复制到用户空间
    if (copy_to_user((void __user *)card_res->fb_id_ptr,
                     dev->mode_config.fb_id_list,
                     sizeof(uint32_t) * card_res->count_fbs))
        return -EFAULT;
    
    return 0;
}
```

**内核组件间通信**
```c
// 组件状态变更通知机制
static void drm_mode_config_notify(struct drm_device *dev,
                                  struct drm_mode_config *config,
                                  enum drm_mode_config_event event)
{
    struct drm_connector *connector;
    
    // 通知所有连接器
    list_for_each_entry(connector, &config->connector_list, head) {
        if (connector->funcs->mode_config_notify)
            connector->funcs->mode_config_notify(connector, event);
    }
    
    // 通知所有编码器
    struct drm_encoder *encoder;
    list_for_each_entry(encoder, &config->encoder_list, head) {
        if (encoder->funcs->mode_config_notify)
            encoder->funcs->mode_config_notify(encoder, event);
    }
}
```

### 1.3 核心机制

**原子提交机制**
```c
// 原子状态验证和提交流程
static int drm_atomic_check_only(struct drm_atomic_state *state)
{
    struct drm_device *dev = state->dev;
    struct drm_mode_config *config = &dev->mode_config;
    int ret;
    
    // 1. 验证平面状态
    ret = drm_atomic_helper_check_planes(dev, state);
    if (ret)
        return ret;
    
    // 2. 验证CRTC状态
    ret = drm_atomic_helper_check_crtcs(dev, state);
    if (ret)
        return ret;
    
    // 3. 验证连接器状态
    ret = drm_atomic_helper_check_connectors(dev, state);
    if (ret)
        return ret;
    
    // 4. 验证整体模式设置
    ret = drm_atomic_helper_check_modeset(dev, state);
    if (ret)
        return ret;
    
    return 0;
}

// 原子状态提交
static int drm_atomic_commit(struct drm_atomic_state *state)
{
    struct drm_device *dev = state->dev;
    int ret;
    
    // 1. 准备提交
    ret = drm_atomic_helper_setup_commit(state, true);
    if (ret)
        return ret;
    
    // 2. 预提交阶段
    ret = drm_atomic_helper_prepare_planes(dev, state);
    if (ret)
        return ret;
    
    // 3. 提交到硬件
    ret = drm_atomic_helper_commit_tail(state);
    if (ret)
        return ret;
    
    // 4. 清理工作
    drm_atomic_helper_commit_cleanup_done(state);
    
    return 0;
}
```

### 1.4 权限控制

**DRM设备访问权限控制**
```c
// DRM设备文件打开权限检查
static int drm_open(struct inode *inode, struct file *filp)
{
    struct drm_device *dev = ...;
    struct drm_file *file_priv;
    int ret;
    
    // 检查设备访问权限
    if (!capable(CAP_SYS_ADMIN) && 
        dev->driver->unload && 
        drm_is_primary_client(file_priv)) {
        return -EACCES;
    }
    
    // 创建文件私有数据
    file_priv = kzalloc(sizeof(*file_priv), GFP_KERNEL);
    if (!file_priv)
        return -ENOMEM;
    
    // 初始化文件私有数据
    file_priv->minor = minor;
    file_priv->authenticated = capable(CAP_SYS_ADMIN);
    file_priv->lock_count = 0;
    
    // 添加到设备文件列表
    list_add(&file_priv->lhead, &dev->filelist);
    
    filp->private_data = file_priv;
    return 0;
}
```

## 2. 线程进程模型

### 2.1 主要线程

**DRM内核线程架构**
```
主进程：kthreadd (PID: 2)
├── DRM事件处理线程 (drm_event_thread)
│   ├── VSync事件分发
│   ├── 页面翻转完成通知
│   └── 热插拔事件处理
│
├── DPU工作线程 (dpu_work_thread)
│   ├── 硬件命令提交
│   ├── 性能监控
│   └── 错误恢复
│
├── MIPI DSI事件线程 (dsi_event_thread)
│   ├── Panel状态监控
│   ├── 命令传输完成通知
│   └── 错误检测和处理
│
└── 电源管理线程 (power_management_thread)
    ├── 显示电源状态管理
    ├── 背光控制
    └── 功耗优化
```

**高通MSM DRM特定线程**
```
内核线程：msm_drm_event (PID: 0)
├── GPU事件处理
├── 显示事件同步
└── 性能统计收集

内核线程：msm_dpu_commit (PID: 0)
├── DPU配置提交
├── 硬件寄存器更新
└── 时序参数应用

内核线程：msm_dsi_cmd (PID: 0)
├── DSI命令队列处理
├── Panel通信管理
└── 传输错误恢复
```

### 2.2 线程间通信

**VSync信号传递机制**
```c
// VSync中断处理
static irqreturn_t msm_dpu_vsync_irq_handler(int irq, void *data)
{
    struct msm_dpu_crtc *dpu_crtc = data;
    struct drm_crtc *crtc = &dpu_crtc->base;
    
    // 1. 禁用中断避免重入
    disable_irq_nosync(irq);
    
    // 2. 记录VSync时间戳
    ktime_t vblank_time = ktime_get();
    drm_crtc_handle_vblank(crtc);
    
    // 3. 通知用户空间
    drm_handle_vblank_events(crtc->dev, drm_crtc_index(crtc));
    
    // 4. 唤醒等待VSync的线程
    wake_up_all(&dpu_crtc->vsync_waitq);
    
    // 5. 重新使能中断
    enable_irq(irq);
    
    return IRQ_HANDLED;
}

// 用户空间VSync等待
static int msm_drm_wait_vsync(struct drm_device *dev, void *data,
                             struct drm_file *file_priv)
{
    struct msm_drm_private *priv = dev->dev_private;
    struct msm_dpu_crtc *dpu_crtc;
    int ret;
    
    // 查找活动的CRTC
    dpu_crtc = msm_dpu_get_active_crtc(priv);
    if (!dpu_crtc)
        return -ENODEV;
    
    // 等待VSync信号
    ret = wait_event_interruptible_timeout(dpu_crtc->vsync_waitq,
                                          atomic_read(&dpu_crtc->vsync_pending),
                                          msecs_to_jiffies(100));
    
    if (ret == 0)
        return -ETIMEDOUT;
    else if (ret < 0)
        return ret;
    
    atomic_set(&dpu_crtc->vsync_pending, 0);
    return 0;
}
```

### 2.3 进程模型

**显示服务进程关系**
```
system_server (PID: xxx)
├── WindowManagerService
│   └── 窗口管理、布局计算
│
├── ActivityManagerService
│   └── 应用生命周期管理
│
└── DisplayManagerService
    └── 显示设备管理、配置变更

surfaceflinger (PID: yyy)
├── 显示合成引擎
├── HWC硬件抽象
├── VSync管理
└── 图层混合

内核空间 (PID: 0)
├── DRM/KMS驱动框架
├── 高通MSM DRM驱动
├── DPU硬件控制
└── MIPI DSI控制器
```

### 2.4 线程同步

**显示资源配置同步**
```c
// 显示配置锁
static DEFINE_MUTEX(msm_drm_lock);

// 原子提交同步机制
static int msm_atomic_commit(struct drm_device *dev,
                            struct drm_atomic_state *state,
                            bool nonblock)
{
    struct msm_drm_private *priv = dev->dev_private;
    int ret;
    
    // 获取显示配置锁
    if (!nonblock) {
        mutex_lock(&msm_drm_lock);
    } else {
        if (!mutex_trylock(&msm_drm_lock))
            return -EBUSY;
    }
    
    // 验证原子状态
    ret = drm_atomic_check_only(state);
    if (ret) {
        mutex_unlock(&msm_drm_lock);
        return ret;
    }
    
    // 提交到硬件
    ret = msm_dpu_atomic_commit(priv->dpu, state);
    
    mutex_unlock(&msm_drm_lock);
    return ret;
}

// 硬件寄存器访问同步
static void msm_dpu_reg_write(struct dpu_hw_blk *blk, u32 reg, u32 val)
{
    struct msm_dpu *dpu = blk->dpu;
    
    // 获取硬件访问锁
    spin_lock_irqsave(&dpu->hw_lock, flags);
    
    // 写入寄存器
    writel_relaxed(val, blk->base_addr + reg);
    
    // 内存屏障确保写入完成
    wmb();
    
    spin_unlock_irqrestore(&dpu->hw_lock, flags);
}
```

## 3. 显示初始化流程

### 3.1 启动调用栈

**DRM/KMS完整启动调用栈**
```
内核启动阶段：
start_kernel()
├── platform_driver_register(&msm_drm_platform_driver)
│   └── msm_drm_probe()
│       ├── 设备树解析和资源分配
│       ├── DRM设备初始化
│       ├── DPU硬件探测和初始化
│       ├── 显示组件注册（CRTC/Plane/Encoder/Connector）
│       └── 中断和时钟配置
│
├── drm_dev_register()
│   ├── 字符设备注册
│   ├── 模式配置初始化
│   └── 显示服务启动
│
└── msm_dpu_init()
    ├── DPU硬件寄存器映射
    ├── 混合器和管道配置
    ├── 时序生成器初始化
    └── 性能监控设置
```

**具体实现伪代码**
```c
// DRM驱动探测函数
static int msm_drm_probe(struct platform_device *pdev)
{
    struct msm_drm_private *priv;
    struct drm_device *ddev;
    int ret;
    
    // 1. 分配DRM设备结构
    ddev = drm_dev_alloc(&msm_drm_driver, &pdev->dev);
    if (IS_ERR(ddev))
        return PTR_ERR(ddev);
    
    // 2. 分配私有数据结构
    priv = kzalloc(sizeof(*priv), GFP_KERNEL);
    if (!priv) {
        ret = -ENOMEM;
        goto fail;
    }
    
    ddev->dev_private = priv;
    priv->dev = ddev;
    
    // 3. 平台特定初始化
    ret = msm_drm_init(pdev, ddev);
    if (ret)
        goto fail;
    
    // 4. DPU硬件初始化
    ret = msm_dpu_init(ddev);
    if (ret)
        goto fail;
    
    // 5. 显示组件注册
    ret = msm_drm_kms_init(ddev);
    if (ret)
        goto fail;
    
    // 6. 注册DRM设备
    ret = drm_dev_register(ddev, 0);
    if (ret)
        goto fail;
    
    return 0;
    
fail:
    msm_drm_uninit(ddev);
    kfree(priv);
    drm_dev_put(ddev);
    return ret;
}
```

### 3.2 关键初始化步骤

**DPU硬件初始化序列**
```c
// DPU硬件初始化函数
static int msm_dpu_init(struct drm_device *dev)
{
    struct msm_drm_private *priv = dev->dev_private;
    struct msm_dpu *dpu;
    int ret;
    
    // 1. 分配DPU结构
    dpu = kzalloc(sizeof(*dpu), GFP_KERNEL);
    if (!dpu)
        return -ENOMEM;
    
    priv->dpu = dpu;
    dpu->dev = dev;
    
    // 2. 映射硬件寄存器
    dpu->mmio = msm_ioremap(pdev, "mdss");
    if (IS_ERR(dpu->mmio)) {
        ret = PTR_ERR(dpu->mmio);
        goto fail;
    }
    
    // 3. 配置时钟系统
    ret = msm_dpu_clk_init(dpu);
    if (ret)
        goto fail;
    
    // 4. 初始化硬件模块
    ret = msm_dpu_hw_init(dpu);
    if (ret)
        goto fail;
    
    // 5. 配置中断
    ret = msm_dpu_irq_init(dpu);
    if (ret)
        goto fail;
    
    return 0;
    
fail:
    msm_dpu_destroy(dpu);
    return ret;
}

// 硬件模块初始化
static int msm_dpu_hw_init(struct msm_dpu *dpu)
{
    int i, ret;
    
    // 初始化混合器
    for (i = 0; i < dpu->caps->mixer_count; i++) {
        ret = msm_dpu_mixer_init(dpu, i);
        if (ret)
            return ret;
    }
    
    // 初始化管道
    for (i = 0; i < dpu->caps->sspp_count; i++) {
        ret = msm_dpu_sspp_init(dpu, i);
        if (ret)
            return ret;
    }
    
    // 初始化接口
    for (i = 0; i < dpu->caps->intf_count; i++) {
        ret = msm_dpu_intf_init(dpu, i);
        if (ret)
            return ret;
    }
    
    return 0;
}
```

## 4. 错误处理机制

### 4.1 显示异常检测

**硬件状态监控机制**
```c
// DPU硬件状态检查
static int msm_dpu_check_hw_status(struct msm_dpu *dpu)
{
    u32 status, error_mask;
    
    // 读取全局状态寄存器
    status = dpu_readl(dpu, DPU_GLOBAL_STATUS);
    
    // 检查错误标志位
    error_mask = DPU_STATUS_ERROR_MASK;
    if (status & error_mask) {
        pr_err("DPU hardware error detected: 0x%08x\n", status);
        
        // 记录错误日志
        msm_dpu_log_error(dpu, status);
        
        return -EIO;
    }
    
    // 检查各个模块状态
    if (!(status & DPU_STATUS_READY)) {
        pr_warn("DPU not ready, status: 0x%08x\n", status);
        return -EAGAIN;
    }
    
    return 0;
}

// MIPI DSI状态监控
static int msm_dsi_check_status(struct msm_dsi_host *msm_host)
{
    u32 status;
    
    // 读取DSI状态寄存器
    status = msm_dsi_readl(msm_host, DSI_STATUS);
    
    // 检查通信错误
    if (status & DSI_STATUS_ERROR_MASK) {
        pr_err("DSI communication error: 0x%08x\n", status);
        return -EIO;
    }
    
    // 检查时钟锁定状态
    if (!(status & DSI_STATUS_PLL_LOCKED)) {
        pr_warn("DSI PLL not locked\n");
        return -EAGAIN;
    }
    
    return 0;
}
```

### 4.2 恢复机制

**多层次错误恢复流程**
```
检测到显示异常
    ↓
记录错误日志和状态
    ↓
尝试软复位显示控制器
    ↓
重新初始化DPU硬件模块
    ↓
重新配置显示时序参数
    ↓
验证显示输出状态
    ↓
恢复正常显示或进入安全模式
```

**具体恢复实现**
```c
// 显示错误恢复函数
static int msm_drm_recover_from_error(struct drm_device *dev)
{
    struct msm_drm_private *priv = dev->dev_private;
    int ret, recovery_level = 0;
    
    // Level 1: 软复位显示控制器
    ret = msm_dpu_soft_reset(priv->dpu);
    if (ret == 0) {
        pr_info("Level 1 recovery successful\n");
        return 0;
    }
    recovery_level++;
    
    // Level 2: 重新初始化DPU硬件
    ret = msm_dpu_reinit(priv->dpu);
    if (ret == 0) {
        pr_info("Level 2 recovery successful\n");
        return 0;
    }
    recovery_level++;
    
    // Level 3: 硬复位整个显示子系统
    ret = msm_drm_hard_reset(dev);
    if (ret == 0) {
        pr_info("Level 3 recovery successful\n");
        return 0;
    }
    recovery_level++;
    
    pr_err("All recovery levels failed\n");
    return -EIO;
}

// 安全模式显示
static int msm_drm_safe_mode_display(struct drm_device *dev)
{
    struct drm_display_mode safe_mode = {
        .hdisplay = 640,
        .vdisplay = 480,
        .vrefresh = 60,
    };
    
    // 使用安全模式参数
    return msm_drm_set_display_mode(dev, &safe_mode);
}
```

## 5. 性能优化设计

### 5.1 显示流水线优化

**并行处理机制**
```c
// 显示流水线并行优化
static void msm_dpu_parallel_processing(struct msm_dpu *dpu)
{
    struct workqueue_struct *hw_wq = alloc_workqueue("dpu_hw", 
                                                     WQ_UNBOUND, 4);
    
    // 创建并行工作队列
    INIT_WORK(&dpu->mixer_work, msm_dpu_mixer_config_work);
    INIT_WORK(&dpu->sspp_work, msm_dpu_sspp_config_work);
    INIT_WORK(&dpu->intf_work, msm_dpu_intf_config_work);
    
    // 并行执行硬件配置
    queue_work(hw_wq, &dpu->mixer_work);
    queue_work(hw_wq, &dpu->sspp_work);
    queue_work(hw_wq, &dpu->intf_work);
    
    // 等待所有任务完成
    flush_workqueue(hw_wq);
}

// 异步命令提交
static int msm_dpu_async_commit(struct msm_dpu *dpu,
                               struct dpu_commit *commit)
{
    // 使用异步工作队列提交命令
    INIT_WORK(&commit->work, msm_dpu_commit_work);
    
    // 添加到异步队列
    queue_work(dpu->commit_wq, &commit->work);
    
    // 非阻塞返回
    return 0;
}
```

### 5.2 内存管理优化

**显示缓冲区管理**
```c
// 帧缓冲区分配策略
struct msm_framebuffer {
    struct drm_framebuffer base;
    
    // GEM对象管理
    struct drm_gem_object *obj[4];    // 多平面支持
    
    // DMA地址
    dma_addr_t dma_addr[4];
    
    // 格式信息
    uint32_t format;
    uint32_t modifier;
    
    // 性能优化
    bool cached;                      // 缓存状态
    atomic_t refcount;                // 引用计数
};

// 缓冲区重用机制
static struct msm_framebuffer *msm_framebuffer_reuse(struct drm_device *dev,
                                                    uint32_t width,
                                                    uint32_t height,
                                                    uint32_t format)
{
    // 首先尝试从缓存池获取
    struct msm_framebuffer *fb = msm_fb_cache_get(dev, width, height, format);
    if (fb) {
        atomic_inc(&fb->refcount);
        return fb;
    }
    
    // 缓存池中没有则重新分配
    return msm_framebuffer_create(dev, width, height, format);
}

// 内存访问优化
static void msm_dpu_optimize_memory_access(struct msm_dpu *dpu)
{
    // 启用预取机制
    dpu_writel(dpu, DPU_PREFETCH_CONFIG, DPU_PREFETCH_ENABLE);
    
    // 配置缓存策略
    dpu_writel(dpu, DPU_CACHE_CONFIG, DPU_CACHE_WRITE_COMBINE);
    
    // 优化内存访问模式
    dpu_writel(dpu, DPU_MEMORY_CONFIG, DPU_MEMORY_BURST_16);
}
```

## 总结

DRM/KMS的设计思路强调分层架构、模块化设计和错误恢复能力。线程进程模型确保了显示服务的稳定性和性能，通过合理的线程划分和同步机制，实现了高效的显示处理流水线。关键的设计原则包括：

1. **分层抽象**：硬件细节对上层透明，便于维护和扩展
2. **原子操作**：确保显示状态的一致性，避免画面撕裂
3. **异步处理**：避免阻塞关键路径，提高系统响应性
4. **错误恢复**：多层次恢复机制，确保系统稳定性
5. **性能优化**：并行处理、内存优化、硬件加速

这种设计思路为Android显示系统提供了坚实的基础架构，确保了显示功能的可靠性和性能。高通平台的实现在此基础上增加了DPU硬件抽象层，提供了更高效的硬件加速和性能优化能力。