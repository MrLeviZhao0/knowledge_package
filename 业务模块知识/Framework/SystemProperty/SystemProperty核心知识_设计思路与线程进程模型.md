# SystemProperty核心知识 - 设计思路与线程进程模型

## 1. 设计思路

### 1.1 设计目标

SystemProperty的设计旨在解决Android系统中跨进程配置共享的问题，其核心设计目标包括：

- **轻量级存储**：提供简单高效的键值对存储机制
- **全局访问**：所有进程均可访问，实现系统级配置共享
- **权限控制**：通过多层次权限机制保障系统安全
- **性能优化**：内存映射和缓存机制确保访问性能
- **持久化支持**：部分属性可持久化存储

### 1.2 设计原则

#### 1.2.1 简单性原则

- **简单接口**：提供get/set等简单接口，降低使用复杂度
- **统一命名**：通过前缀区分不同类型属性，保持命名一致性
- **类型简化**：主要支持字符串类型，其他类型由客户端转换

#### 1.2.2 安全性原则

- **最小权限**：默认情况下，应用只能访问有限属性
- **分层权限**：通过SeLinux、签名等多层权限控制
- **只读保护**：关键系统属性标记为只读，防止误修改

#### 1.2.3 性能原则

- **内存映射**：属性区域映射到内存，提高访问速度
- **缓存机制**：客户端缓存属性值，减少跨进程通信
- **异步通知**：属性变更通知机制采用异步方式

### 1.3 架构设计

#### 1.3.1 C/S架构

SystemProperty采用典型的客户端/服务器架构：

```
+----------------+      Unix Domain Socket      +----------------+
|   Client App   | <--------------------------> | Property Service|
| (SystemProperty)|                            | (init进程)      |
+----------------+                            +----------------+
       |                                            |
       | 内存映射                                    |
       v                                            v
+----------------+                          +----------------+
|  Client Cache  |                          |  Property Area |
| (本地缓存)      |                          | (共享内存区域)   |
+----------------+                          +----------------+
```

#### 1.3.2 分层设计

```
+---------------------------+
|     应用层 (Java API)     |
+---------------------------+
|    框架层 (JNI/Native)    |
+---------------------------+
|    系统层 (Property Service) |
+---------------------------+
|    内核层 (Unix Socket)    |
+---------------------------+
```

## 2. 线程与进程模型

### 2.1 核心进程

#### 2.1.1 Init进程

Init进程是SystemProperty服务的核心进程，负责：

- **服务启动**：系统启动时启动属性服务
- **属性加载**：从文件系统加载属性到内存
- **请求处理**：处理来自其他进程的属性访问请求
- **持久化**：将持久化属性写入磁盘

```c++
// init进程中的属性服务启动代码
void start_property_service() {
    // 创建属性区域
    property_init();
    
    // 创建Unix Domain Socket
    property_set_fd = create_socket(PROP_SERVICE_NAME, 
                                   SOCK_STREAM | SOCK_CLOEXEC | SOCK_NONBLOCK,
                                   0666, 0, 0, NULL);
    
    // 开始监听
    listen(property_set_fd, 8);
    
    // 注册epoll事件处理器
    register_epoll_handler(property_set_fd, handle_property_set_fd);
}
```

#### 2.1.2 客户端进程

所有需要访问系统属性的进程都是客户端进程，包括：

- **系统服务**：如AMS、WMS等系统服务
- **系统应用**：如Settings、SystemUI等
- **第三方应用**：普通应用进程

### 2.2 线程模型

#### 2.2.1 Init进程线程模型

Init进程采用单线程事件循环模型：

```c++
// init进程主循环
for (;;) {
    // 等待事件
    int nr = epoll_wait(epoll_fd, events, epoll_maxevents, timeout);
    
    if (nr == -1) {
        if (errno == EINTR) continue;
        PLOG(ERROR) << "epoll_wait failed";
    }
    
    // 处理事件
    for (int i = 0; i < nr; ++i) {
        if (events[i].data.ptr) {
            // 调用事件处理函数
            (*reinterpret_cast<EventHandler*>(events[i].data.ptr))();
        }
    }
}
```

#### 2.2.2 属性服务处理流程

```c++
// 属性设置请求处理流程
static void handle_property_set_fd() {
    // 接受连接
    unique_fd s(accept4(property_set_fd, nullptr, nullptr, SOCK_CLOEXEC));
    
    if (s < 0) return;
    
    // 读取请求
    SocketConnection socket(std::move(s));
    uint32_t cmd = 0;
    if (!socket.RecvUint32(&cmd) || !socket.RecvChars(name, PROP_NAME_MAX) ||
        !socket.RecvChars(value, PROP_VALUE_MAX)) {
        return;
    }
    
    // 处理不同类型的请求
    switch (cmd) {
        case PROP_MSG_SETPROP:
            handle_property_set(socket, name, value, true);
            break;
        case PROP_MSG_SETPROP2:
            handle_property_set(socket, name, value, false);
            break;
    }
}
```

#### 2.2.3 客户端线程模型

客户端进程采用多线程模型，每个线程可以独立访问系统属性：

```java
// SystemProperty.java中的线程安全实现
public class SystemProperties {
    // 缓存锁
    private static final Object sCacheLock = new Object();
    
    // 属性变更回调
    private static final ArrayList<Runnable> sChangeCallbacks = new ArrayList<>();
    
    // 线程安全的属性获取
    public static String get(String key, String def) {
        if (TRACK_KEYS) trackKey(key);
        synchronized (sCacheLock) {
            // 检查缓存
            String value = sCache.get(key);
            if (value != null) return value;
            
            // 从native层获取
            value = native_get(key);
            if (value != null) {
                sCache.put(key, value);
            }
            return value == null ? def : value;
        }
    }
}
```

### 2.3 进程间通信

#### 2.3.1 通信机制

SystemProperty使用Unix Domain Socket作为进程间通信机制：

- **服务端点**：/dev/socket/property_service
- **协议类型**：SOCK_STREAM (TCP)
- **数据格式**：二进制协议

#### 2.3.2 通信协议

```c++
// 属性设置请求协议
struct prop_msg {
    // 命令类型
    unsigned int cmd;
    
    // 属性名称
    char name[PROP_NAME_MAX];
    
    // 属性值
    char value[PROP_VALUE_MAX];
};
```

#### 2.3.3 通信流程

```
1. 客户端创建socket连接
2. 发送属性设置请求
3. 服务端进行权限检查
4. 服务端执行属性设置
5. 服务端返回操作结果
6. 客户端接收结果
```

## 3. 内存管理

### 3.1 属性区域内存映射

#### 3.1.1 共享内存区域

```c++
// 属性区域内存映射
static int map_prop_area_rw() {
    // 打开属性区域文件
    int fd = open(property_filename, O_RDWR | O_CREAT | O_NOFOLLOW | O_CLOEXEC, 0644);
    
    // 设置文件大小
    if (ftruncate(fd, PA_SIZE) < 0) goto error;
    
    // 内存映射
    pa_size = PA_SIZE;
    pa_data_size = pa_size - sizeof(prop_area);
    prop_area *pa = static_cast<prop_area*>(mmap(nullptr, pa_size, 
                                               PROT_READ | PROT_WRITE, 
                                               MAP_SHARED, fd, 0));
    
    if (pa == MAP_FAILED) goto error;
    
    // 初始化属性区域
    if (pa->version == 0) {
        pa->magic = PROP_AREA_MAGIC;
        pa->version = PROP_AREA_VERSION;
        memset(pa->reserved, 0, sizeof(pa->reserved));
    }
    
    close(fd);
    __system_property_area__ = pa;
    return 0;
}
```

#### 3.1.2 内存布局

```
+------------------+
|   prop_area      |
| (头部信息)       |
+------------------+
|   prop_info[0]   |
| (属性信息0)      |
+------------------+
|   prop_info[1]   |
| (属性信息1)      |
+------------------+
|       ...        |
+------------------+
|   prop_info[n]   |
| (属性信息n)      |
+------------------+
```

### 3.2 缓存机制

#### 3.2.1 客户端缓存

```java
// SystemProperty.java中的缓存实现
public class SystemProperties {
    // 属性缓存
    private static final ArrayMap<String, String> sCache = new ArrayMap<>();
    
    // 缓存锁
    private static final Object sCacheLock = new Object();
    
    // 缓存大小限制
    private static final int MAX_CACHE_ENTRIES = 1000;
    
    // 获取属性（带缓存）
    public static String get(String key, String def) {
        synchronized (sCacheLock) {
            // 检查缓存
            String value = sCache.get(key);
            if (value != null) return value;
            
            // 从native层获取
            value = native_get(key);
            if (value != null) {
                // 缓存大小检查
                if (sCache.size() >= MAX_CACHE_ENTRIES) {
                    sCache.clear();
                }
                sCache.put(key, value);
            }
            return value == null ? def : value;
        }
    }
}
```

#### 3.2.2 缓存失效机制

```c++
// 属性变更通知机制
void property_changed(const char *name, const char *value) {
    // 通知所有监听者
    if (g_property_change_callback) {
        g_property_change_callback(name, value);
    }
}

// Java层的回调处理
static void property_changed_callback(JNIEnv* env, jobject clazz,
                                     jstring name, jstring value) {
    // 获取属性名
    const char* name_cstr = env->GetStringUTFChars(name, nullptr);
    
    // 清除缓存
    ScopedLocalRef<jclass> systemPropertiesClass(env, 
        env->FindClass("android/os/SystemProperties"));
    jmethodID clearCache = env->GetStaticMethodID(systemPropertiesClass.get(), 
                                                  "clearCache", "(Ljava/lang/String;)V");
    env->CallStaticVoidMethod(systemPropertiesClass.get(), clearCache, name);
    
    // 执行变更回调
    env->CallStaticVoidMethod(systemPropertiesClass.get(), 
                              callChangeCallbacks, name);
    
    env->ReleaseStringUTFChars(name, name_cstr);
}
```

## 4. 并发控制

### 4.1 服务端并发控制

#### 4.1.1 单线程事件循环

Init进程采用单线程事件循环模型，避免了多线程同步问题：

```c++
// 属性服务单线程处理
static void handle_property_set(SocketConnection& socket, 
                               const std::string& name, 
                               const std::string& value, 
                               bool legacy_protocol) {
    // 权限检查
    char* source_ctx = nullptr;
    if (getpeercon(socket.socket(), &source_ctx) < 0) {
        return;
    }
    
    // SeLinux权限检查
    if (check_mac_perms(name, source_ctx, &cr)) {
        // 设置属性
        uint32_t result = property_set(name, value);
        
        // 返回结果
        if (!legacy_protocol) {
            socket.SendUint32(result);
        }
    }
    
    freecon(source_ctx);
}
```

#### 4.1.2 原子操作

属性设置操作是原子的，确保数据一致性：

```c++
// 原子属性设置
uint32_t property_set(const char *name, const char *value) {
    // 查找属性
    prop_info *pi = find_property(name);
    
    if (pi != 0) {
        // 更新属性值（原子操作）
        update_prop_info(pi, name, value);
    } else {
        // 创建新属性（原子操作）
        pi = alloc_prop_info(name, value);
    }
    
    // 通知属性变更
    property_changed(name, value);
    
    return PROP_SUCCESS;
}
```

### 4.2 客户端并发控制

#### 4.2.1 同步访问

客户端通过同步机制保证线程安全：

```java
// SystemProperty.java中的同步访问
public class SystemProperties {
    // 缓存锁
    private static final Object sCacheLock = new Object();
    
    // 回调锁
    private static final Object sChangeCallbacksLock = new Object();
    
    // 线程安全的属性设置
    public static void set(String key, String val) {
        if (val == null) {
            val = "";
        }
        
        // 调用native方法设置属性
        native_set(key, val);
        
        // 清除缓存
        synchronized (sCacheLock) {
            sCache.remove(key);
        }
    }
}
```

#### 4.2.2 读写分离

客户端采用读写分离策略，提高并发性能：

```c++
// 客户端读写分离实现
int __system_property_get(const char *name, char *value) {
    // 获取属性区域
    const prop_info *pi = __system_property_find(name);
    if (pi == 0) return 0;
    
    // 读取属性值（无锁读取）
    return __system_property_read(pi, 0, value);
}

int __system_property_set(const char *key, const char *value) {
    // 建立socket连接
    PropertyServiceConnection connection;
    
    // 发送设置请求
    if (!connection.SendUint32(PROP_MSG_SETPROP2) ||
        !connection.SendString(key) ||
        !connection.SendString(value)) {
        return -1;
    }
    
    // 接收结果
    int result;
    if (!connection.RecvInt32(&result)) {
        return -1;
    }
    
    return result;
}
```

## 5. 性能优化

### 5.1 访问性能优化

#### 5.1.1 客户端缓存

- **本地缓存**：客户端缓存常用属性，减少跨进程通信
- **缓存大小限制**：限制缓存大小，防止内存占用过高
- **LRU策略**：采用LRU策略管理缓存

#### 5.1.2 批量操作

```java
// 批量属性获取
public static Map<String, String> getMultiple(String[] keys) {
    Map<String, String> result = new ArrayMap<>();
    
    // 批量获取属性
    native_get_multiple(keys, result);
    
    return result;
}
```

### 5.2 存储性能优化

#### 5.2.1 内存映射

- **共享内存**：属性区域使用共享内存，避免数据拷贝
- **内存对齐**：属性数据结构内存对齐，提高访问效率

#### 5.2.2 持久化优化

```c++
// 异步持久化
static void async_persist_property(const char *name, const char *value) {
    // 创建持久化任务
    struct persist_task *task = malloc(sizeof(struct persist_task));
    task->name = strdup(name);
    task->value = strdup(value);
    
    // 添加到持久化队列
    pthread_mutex_lock(&persist_queue_lock);
    list_add_tail(&persist_queue, &task->list);
    pthread_cond_signal(&persist_queue_cond);
    pthread_mutex_unlock(&persist_queue_lock);
}

// 持久化线程
static void* persist_thread(void* arg) {
    while (1) {
        struct persist_task *task = NULL;
        
        // 等待持久化任务
        pthread_mutex_lock(&persist_queue_lock);
        while (list_empty(&persist_queue)) {
            pthread_cond_wait(&persist_queue_cond, &persist_queue_lock);
        }
        
        // 获取任务
        task = list_first_entry(&persist_queue, struct persist_task, list);
        list_del(&task->list);
        pthread_mutex_unlock(&persist_queue_lock);
        
        // 执行持久化
        persist_property_to_file(task->name, task->value);
        
        // 释放资源
        free(task->name);
        free(task->value);
        free(task);
    }
    
    return NULL;
}
```

## 6. 错误处理

### 6.1 错误类型

```c++
// 属性操作错误码
#define PROP_SUCCESS                0x0000
#define PROP_ERROR_READ_CMD         0x0004
#define PROP_ERROR_READ_DATA        0x0008
#define PROP_ERROR_READ_ONLY_PROPERTY 0x000B
#define PROP_ERROR_INVALID_NAME     0x0010
#define PROP_ERROR_INVALID_VALUE    0x0014
#define PROP_ERROR_PERMISSION_DENIED 0x0018
#define PROP_ERROR_INVALID_CMD      0x001B
#define PROP_ERROR_SET_FAILED       0x0024
```

### 6.2 错误处理机制

```c++
// 错误处理
static void handle_property_set_error(SocketConnection& socket, uint32_t error_code) {
    // 记录错误日志
    ALOGW("Property set failed: error code 0x%x", error_code);
    
    // 返回错误码
    socket.SendUint32(error_code);
}
```

## 7. 调试与监控

### 7.1 调试工具

- **getprop**：查看系统属性
- **setprop**：设置系统属性（需要root权限）
- **watchprops**：监控属性变更

### 7.2 性能监控

```c++
// 属性访问性能监控
#define PROPERTY_PERFORMANCE_MONITOR 1

#if PROPERTY_PERFORMANCE_MONITOR
static uint64_t property_get_start_time = 0;
static uint64_t property_get_total_time = 0;
static uint32_t property_get_count = 0;

static void property_get_start() {
    property_get_start_time = uptimeMillis();
}

static void property_get_end() {
    uint64_t elapsed = uptimeMillis() - property_get_start_time;
    property_get_total_time += elapsed;
    property_get_count++;
    
    if (property_get_count % 1000 == 0) {
        ALOGD("Property get: count=%d, avg_time=%llums", 
              property_get_count, property_get_total_time / property_get_count);
    }
}
#endif
```