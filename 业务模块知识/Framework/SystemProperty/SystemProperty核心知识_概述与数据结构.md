# SystemProperty核心知识 - 概述与数据结构

## 1. SystemProperty概述

SystemProperty是Android系统中用于存储和访问系统级属性的关键机制，它提供了一个轻量级的键值对存储系统，用于在系统各组件间共享配置信息。这些属性在系统启动时加载，并在整个系统生命周期内保持可访问。

### 1.1 核心特点

- **全局共享**：所有进程均可访问，实现跨进程数据共享
- **持久性**：部分属性可以持久化存储，重启后保持
- **权限控制**：通过SeLinux和签名机制实现严格的访问控制
- **分类管理**：通过前缀区分不同类型的属性（如ro.、persist.、ctl.等）

### 1.2 主要用途

- 系统配置信息存储（如ro.product.model）
- 运行时参数调整（如debug.log.tags）
- 功能开关控制（如ro.debuggable）
- 系统服务通信（如sys.usb.config）
- 性能参数调优（如ro.config.low_ram）

## 2. 属性分类与命名规则

### 2.1 按访问权限分类

| 前缀 | 权限级别 | 说明 | 示例 |
|------|----------|------|------|
| ro. | 只读(Read-Only) | 系统启动后不可修改，通常存储硬件信息 | ro.product.model |
| persist. | 持久化(Persistent) | 修改后会持久化到/data/property目录 | persist.sys.timezone |
| ctl. | 控制(Control) | 用于启动/停止系统服务 | ctl.start |
| debug. | 调试(Debug) | 用于调试和开发 | debug.log.tags |
| sys. | 系统(System) | 系统运行时状态 | sys.usb.state |
| dalvik.vm. | Dalvik虚拟机 | 虚拟机相关配置 | dalvik.vm.heapsize |

### 2.2 按功能域分类

- **硬件相关**：ro.hardware、ro.board.platform等
- **系统服务**：sys.usb.config、persist.radio等
- **性能调优**：ro.config.low_ram、dalvik.vm.heapsize等
- **安全相关**：ro.secure、ro.adb.secure等
- **UI相关**：ro.sf.lcd_density、persist.sys.ui.daynight等

## 3. 核心数据结构

### 3.1 属性存储结构

```c++
// 属性值结构体定义
struct prop_info {
    // 属性名称
    char name[PROP_NAME_MAX];
    // 属性值
    char value[PROP_VALUE_MAX];
    // 序列号，用于变更检测
    uint32_t serial;
    // 属性类型标记
    uint8_t type;
    // 其他控制字段
    uint8_t reserved[3];
};
```

### 3.2 属性区域管理

```c++
// 属性区域结构
struct prop_area {
    // 版本号
    uint32_t version;
    // 魔数，用于校验
    uint32_t magic;
    // 属性区域大小
    uint32_t size;
    // 属性数量
    uint32_t count;
    // 属性数据区
    char data[0];
};
```

### 3.3 属性服务连接

```c++
// 属性服务连接结构
class PropertyServiceConnection {
private:
    // socket文件描述符
    int socket_;
    // 最后错误码
    int last_error_;
    
public:
    // 构造函数，建立连接
    PropertyServiceConnection();
    
    // 发送属性设置请求
    bool SendInt32(int32_t value);
    
    // 接收属性设置结果
    bool RecvInt32(int32_t* value);
};
```

## 4. 属性访问接口

### 4.1 Java层接口

```java
// SystemProperty类主要接口
public class SystemProperties {
    // 获取字符串属性
    public static String get(String key);
    public static String get(String key, String def);
    
    // 获取整型属性
    public static int getInt(String key, int def);
    
    // 获取布尔型属性
    public static boolean getBoolean(String key, boolean def);
    
    // 设置属性值
    public static void set(String key, String val);
    
    // 添加属性变更监听
    public static void addChangeCallback(Runnable callback);
}
```

### 4.2 Native层接口

```c++
// 属性操作接口
int property_get(const char *key, char *value, const char *default_value);
int property_set(const char *key, const char *value);

// 属性列表操作
int property_list(void (*propfn)(const char *key, const char *value, void *cookie), void *cookie);

// 属性文件操作
int property_get_fd(const char *name);
```

## 5. 属性存储位置

### 5.1 只读属性

- **存储位置**：/system/build.prop、/system/build.prop等
- **加载时机**：系统启动时由init进程加载
- **特点**：只读，不可修改，存储在内存中

### 5.2 持久化属性

- **存储位置**：/data/property/
- **文件格式**：每个属性一个文件，文件名为属性名
- **特点**：可修改，修改后持久化存储

### 5.3 运行时属性

- **存储位置**：内存中
- **特点**：系统重启后丢失

## 6. 属性服务架构

### 6.1 属性服务进程

- **服务进程**：init进程
- **服务端点**：/dev/socket/property_service
- **通信方式**：Unix Domain Socket

### 6.2 属性访问流程

1. **客户端请求**：应用通过SystemProperty.set()发起请求
2. **建立连接**：通过socket连接到属性服务
3. **权限检查**：SeLinux权限检查
4. **属性设置**：服务端执行属性设置
5. **结果返回**：返回设置结果（成功/失败）

### 6.3 属性变更通知

- **通知机制**：inotify机制监控属性变更
- **回调执行**：通过addChangeCallback注册的回调会被执行
- **应用场景**：配置热更新、运行时参数调整等

## 7. 权限控制机制

### 7.1 SeLinux权限控制

- **策略文件**：/system/sepolicy/
- **权限类型**：property_service
- **操作类型**：set、get
- **上下文匹配**：基于进程上下文和属性上下文

### 7.2 签名权限控制

- **系统级应用**：需要platform签名
- **特权应用**：需要特定签名
- **普通应用**：只能访问部分属性

## 8. 常见问题与限制

### 8.1 常见问题

1. **权限拒绝**：错误码0x18，表示SeLinux权限不足
2. **属性不存在**：返回默认值
3. **属性过长**：名称和值都有长度限制
4. **属性过多**：系统有最大属性数量限制

### 8.2 系统限制

- **属性名称最大长度**：PROP_NAME_MAX (32)
- **属性值最大长度**：PROP_VALUE_MAX (92)
- **最大属性数量**：系统限制，通常为32767
- **属性访问性能**：频繁访问可能影响性能

## 9. 最佳实践

### 9.1 属性命名规范

- 使用有意义的名称，避免缩写
- 按功能域分组，使用统一前缀
- 避免使用保留前缀（如ro.、persist.等）

### 9.2 性能优化

- 避免频繁调用property_get/property_set
- 对于频繁访问的属性，考虑本地缓存
- 使用属性变更通知机制，而非轮询

### 9.3 安全考虑

- 敏感信息不应存储在属性中
- 使用SeLinux策略限制属性访问
- 考虑属性值的加密存储