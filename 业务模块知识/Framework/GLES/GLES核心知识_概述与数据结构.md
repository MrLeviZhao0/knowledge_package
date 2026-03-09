# GLES核心知识 - 概述与数据结构

## 1. GLES概述

OpenGL ES (OpenGL for Embedded Systems) 是OpenGL的子集，专为嵌入式设备设计，是Android系统中图形渲染的核心API。它提供了一套跨平台的图形渲染接口，使开发者能够利用GPU硬件加速进行2D和3D图形渲染。

### 1.1 GLES在Android系统中的地位

GLES在Android显示系统中占据核心地位，是连接上层应用和底层GPU的桥梁：

- **图形渲染引擎**：为应用提供硬件加速的图形渲染能力
- **UI渲染基础**：Android的UI渲染系统基于GLES实现
- **多媒体支持**：视频播放、相机预览等多媒体功能依赖GLES
- **游戏开发基础**：Android游戏开发的主要图形API

### 1.2 GLES版本演进

Android系统支持多个GLES版本，每个版本都有其特性和优势：

| 版本 | Android支持 | 主要特性 | 典型用途 |
|------|-------------|----------|----------|
| GLES 1.0 | Android 1.0+ | 固定功能管线 | 简单2D图形、早期游戏 |
| GLES 1.1 | Android 1.0+ | 增加固定功能 | 改进的2D图形 |
| GLES 2.0 | Android 2.2+ | 可编程着色器 | 现代UI、复杂游戏 |
| GLES 3.0 | Android 4.3+ | 增强着色器、纹理 | 高级游戏、图形应用 |
| GLES 3.1 | Android 5.0+ | 计算着色器 | GPU计算、高级特效 |
| GLES 3.2 | Android 6.0+ | 高级渲染技术 | 专业图形应用 |

### 1.3 GLES与Android图形系统关系

```
+-------------------+
|     应用层        |
| (View/Game/App)  |
+-------------------+
|    Skia/OpenGL    |
+-------------------+
|   EGL接口层       |
+-------------------+
|   GLES驱动层      |
+-------------------+
|   GPU硬件层       |
+-------------------+
```

## 2. GLES核心概念

### 2.1 渲染管线

GLES渲染管线是将3D场景转换为2D图像的处理流程，主要包括以下阶段：

1. **顶点处理**：处理顶点数据，包括变换、光照等
2. **图元装配**：将顶点组装成图元（点、线、三角形）
3. **光栅化**：将图元转换为像素片段
4. **片段处理**：对每个片段进行纹理映射、颜色计算等
5. **逐片段操作**：进行深度测试、模板测试、混合等操作

### 2.2 着色器

着色器是在GPU上运行的小程序，用于控制渲染管线的特定阶段：

- **顶点着色器**：处理顶点数据，进行坐标变换、光照计算等
- **片段着色器**：处理片段数据，进行纹理采样、颜色计算等
- **几何着色器**（GLES 3.2+）：处理图元，可以生成新的几何体
- **计算着色器**（GLES 3.1+）：进行通用GPU计算

### 2.3 缓冲区对象

缓冲区对象是GLES中用于存储数据的重要机制：

- **顶点缓冲区对象(VBO)**：存储顶点数据
- **索引缓冲区对象(IBO)**：存储顶点索引数据
- **像素缓冲区对象(PBO)**：存储像素数据
- **统一缓冲区对象(UBO)**：存储着色器统一变量
- **着色器存储缓冲区对象(SSBO)**：GLES 3.1+，着色器可读写的数据存储

## 3. GLES数据结构

### 3.1 上下文(Context)

GLES上下文是GLES状态机的容器，保存了所有GLES状态：

```c
// GLES上下文结构（简化版）
struct gles_context {
    // 状态标志
    struct {
        bool depth_test_enabled;
        bool stencil_test_enabled;
        bool blend_enabled;
        bool cull_face_enabled;
        // ...更多状态
    } state;
    
    // 视口和裁剪
    struct {
        GLint x, y;
        GLsizei width, height;
    } viewport;
    
    // 清除颜色
    GLfloat clear_color[4];
    GLfloat clear_depth;
    GLint clear_stencil;
    
    // 当前绑定的对象
    struct {
        GLuint array_buffer;
        GLuint element_array_buffer;
        GLuint texture[32]; // 支持多个纹理单元
        GLuint framebuffer;
        GLuint renderbuffer;
        GLuint program;
        GLuint vertex_array;
    } bindings;
    
    // 着色器信息
    struct {
        GLuint current_program;
        GLint uniform_locations[256];
        GLint attrib_locations[16];
    } shader;
    
    // 错误状态
    GLenum error;
};
```

### 3.2 纹理(Texture)

纹理是GLES中用于存储图像数据的对象：

```c
// 纹理对象结构（简化版）
struct gles_texture {
    GLenum target;        // GL_TEXTURE_2D, GL_TEXTURE_CUBE_MAP等
    GLsizei width;        // 纹理宽度
    GLsizei height;       // 纹理高度
    GLsizei depth;        // 纹理深度（3D纹理）
    GLenum internal_format; // 内部格式
    GLenum format;        // 数据格式
    GLenum type;          // 数据类型
    
    // 纹理参数
    struct {
        GLenum min_filter;  // 缩小过滤器
        GLenum mag_filter;  // 放大过滤器
        GLenum wrap_s;      // S方向包装模式
        GLenum wrap_t;      // T方向包装模式
        GLenum wrap_r;      // R方向包装模式（3D纹理）
    } params;
    
    // 纹理数据
    void* data;
    size_t data_size;
    
    // 多级渐远纹理
    int levels;
    struct {
        void* data;
        size_t size;
    } mipmaps[16];
};
```

### 3.3 缓冲区对象(Buffer)

缓冲区对象用于存储各种类型的GPU数据：

```c
// 缓冲区对象结构（简化版）
struct gles_buffer {
    GLuint id;
    GLsizeiptr size;     // 缓冲区大小
    void* data;          // 映射的CPU地址
    GLenum usage;        // 使用模式：GL_STATIC_DRAW, GL_DYNAMIC_DRAW等
    GLenum access;       // 访问模式：GL_READ_ONLY, GL_WRITE_ONLY等
    
    // 缓冲区用途标志
    struct {
        bool is_vertex_buffer;
        bool is_index_buffer;
        bool is_uniform_buffer;
        bool is_shader_storage;
    } usage_flags;
    
    // 映射信息
    struct {
        void* ptr;       // 映射指针
        GLintptr offset;  // 映射偏移
        GLsizeiptr length; // 映射长度
        GLbitfield access; // 映射访问权限
    } mapping;
};
```

### 3.4 着色器程序(Shader Program)

着色器程序是链接后的着色器对象集合：

```c
// 着色器程序结构（简化版）
struct gles_program {
    GLuint id;
    
    // 链接的着色器
    struct {
        GLuint vertex_shader;
        GLuint fragment_shader;
        GLuint geometry_shader;   // GLES 3.2+
        GLuint compute_shader;    // GLES 3.1+
        GLuint tess_control_shader; // GLES 3.2+
        GLuint tess_evaluation_shader; // GLES 3.2+
    } shaders;
    
    // 统一变量信息
    struct {
        char name[64];      // 变量名
        GLenum type;         // 变量类型
        GLint size;          // 数组大小
        GLint location;      // 位置
        GLint block_index;   // 统一块索引
        GLint offset;        // 块内偏移
    } uniforms[256];
    int uniform_count;
    
    // 属性信息
    struct {
        char name[64];      // 属性名
        GLenum type;         // 属性类型
        GLint size;          // 数组大小
        GLint location;      // 位置
    } attributes[16];
    int attribute_count;
    
    // 统一块信息
    struct {
        GLuint id;           // 块ID
        GLint size;          // 块大小
        GLint uniform_count; // 块中统一变量数量
    } uniform_blocks[16];
    int uniform_block_count;
    
    // 链接状态
    GLboolean linked;
    char info_log[1024];  // 链接信息日志
};
```

### 3.5 帧缓冲区(Framebuffer)

帧缓冲区是渲染输出的目标：

```c
// 帧缓冲区结构（简化版）
struct gles_framebuffer {
    GLuint id;
    GLsizei width;        // 帧缓冲区宽度
    GLsizei height;       // 帧缓冲区高度
    
    // 附加点
    struct {
        struct {
            GLuint texture_id;   // 附加的纹理ID
            GLuint renderbuffer_id; // 附加的渲染缓冲区ID
            GLenum attachment;   // 附加点：GL_COLOR_ATTACHMENT0等
            GLenum format;       // 格式
        } color[8]; // 最多8个颜色附加点
        
        struct {
            GLuint texture_id;
            GLuint renderbuffer_id;
            GLenum format;
        } depth;
        
        struct {
            GLuint texture_id;
            GLuint renderbuffer_id;
            GLenum format;
        } stencil;
    } attachments;
    
    // 帧缓冲区状态
    struct {
        GLenum color_buffers[8]; // 绘制缓冲区
        GLenum read_buffer;       // 读取缓冲区
        bool completeness_checked; // 是否已检查完整性
        bool complete;            // 是否完整
    } state;
};
```

## 4. EGL接口

### 4.1 EGL概述

EGL(Embedded-System Graphics Library)是GLES与本地窗口系统之间的接口，负责：

- **渲染表面管理**：创建和管理渲染表面
- **上下文管理**：创建和管理GLES上下文
- **缓冲区交换**：交换前后缓冲区
- **同步机制**：提供GPU与CPU之间的同步

### 4.2 EGL数据结构

```c
// EGL显示连接
struct egl_display {
    void* native_display;  // 原生显示句柄
    EGLint major_version;  // 主版本号
    EGLint minor_version;  // 次版本号
    
    // 支持的配置
    EGLConfig* configs;
    EGLint config_count;
    
    // 扩展支持
    char* extensions;
    bool debug_enabled;
};

// EGL表面
struct egl_surface {
    EGLDisplay display;
    EGLConfig config;
    void* native_window;   // 原生窗口句柄
    EGLint width;         // 表面宽度
    EGLint height;        // 表面高度
    
    // 表面类型
    enum {
        WINDOW_SURFACE,
        PBUFFER_SURFACE,
        PIXMAP_SURFACE
    } type;
    
    // 缓冲区属性
    struct {
        EGLint red_size;
        EGLint green_size;
        EGLint blue_size;
        EGLint alpha_size;
        EGLint depth_size;
        EGLint stencil_size;
        EGLint samples;      // 多重采样
    } buffer_config;
    
    // 渲染状态
    bool bound_to_context;
    bool swap_behavior_preserved;
};

// EGL上下文
struct egl_context {
    EGLDisplay display;
    EGLConfig config;
    EGLint client_version; // GLES版本
    
    // 绑定的表面
    EGLSurface draw_surface;
    EGLSurface read_surface;
    
    // 上下文状态
    bool is_current;
    bool bound_to_thread;
    pthread_t bound_thread;
    
    // GLES上下文
    struct gles_context* gles_ctx;
};
```

## 5. GLES在Android中的实现

### 5.1 Android GLES架构

Android中的GLES实现采用分层架构：

```
+-------------------+
|   应用层API       |
| (GLES 1.0/2.0/3.x) |
+-------------------+
|   libGLESv2.so    |
|   (GLES API实现)   |
+-------------------+
|   EGL接口         |
|   (libEGL.so)     |
+-------------------+
|   GPU驱动         |
|   (厂商特定)       |
+-------------------+
|   硬件抽象层(HAL)  |
+-------------------+
|   GPU硬件         |
+-------------------+
```

### 5.2 GLES与SurfaceFlinger交互

GLES与SurfaceFlinger的交互是Android显示系统的核心：

1. **应用渲染**：应用使用GLES渲染到图形缓冲区
2. **缓冲区队列**：通过BufferQueue与SurfaceFlinger交换缓冲区
3. **合成显示**：SurfaceFlinger合成多个图层的缓冲区
4. **显示输出**：合成后的图像发送到显示设备

### 5.3 GLES性能考虑

在Android中使用GLES需要考虑以下性能因素：

- **状态变更**：减少不必要的状态变更
- **绘制调用**：合并绘制调用，减少CPU开销
- **内存带宽**：优化内存访问模式，减少带宽使用
- **GPU利用率**：保持GPU忙碌，避免空闲时间
- **电池消耗**：优化渲染效率，减少电池消耗

## 6. GLES调试与分析

### 6.1 调试工具

Android提供了多种GLES调试工具：

- **OpenGL ES Tracer**：捕获GLES API调用序列
- **GPU Debugger**：实时调试GLES应用
- **Systrace**：系统级性能分析
- **Profile GPU Rendering**：分析UI渲染性能

### 6.2 常见问题

GLES开发中常见的问题包括：

- **着色器编译错误**：语法错误、不兼容的函数
- **状态错误**：不正确的GLES状态设置
- **内存泄漏**：未释放的GLES对象
- **性能问题**：过多的绘制调用、状态变更
- **兼容性问题**：不同GPU驱动的差异

### 6.3 最佳实践

GLES开发的最佳实践：

- **资源管理**：及时释放不再使用的GLES对象
- **错误检查**：定期检查GLES错误状态
- **性能优化**：使用适当的优化技术
- **兼容性处理**：处理不同设备和GPU的差异
- **电池优化**：减少不必要的渲染操作