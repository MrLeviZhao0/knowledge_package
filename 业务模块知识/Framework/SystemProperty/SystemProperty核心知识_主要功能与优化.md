# SystemProperty核心知识 - 主要功能与优化

## 1. 主要功能

### 1.1 系统配置管理

#### 1.1.1 硬件信息存储

SystemProperty是存储硬件相关信息的主要机制，包括：

- **设备型号**：ro.product.model、ro.product.brand
- **硬件平台**：ro.board.platform、ro.hardware
- **屏幕信息**：ro.sf.lcd_density、ro.sf.hwrotation
- **CPU信息**：ro.product.cpu.abi、ro.product.cpu.abilist
- **内存信息**：ro.config.low_ram、dalvik.vm.heapsize

```c++
// 硬件信息属性示例
static void init_hardware_properties() {
    // 设置设备型号
    property_set("ro.product.model", "Pixel 6");
    property_set("ro.product.brand", "Google");
    
    // 设置硬件平台
    property_set("ro.board.platform", "gs101");
    property_set("ro.hardware", "gs101");
    
    // 设置屏幕信息
    property_set("ro.sf.lcd_density", "440");
    property_set("ro.sf.hwrotation", "0");
    
    // 设置CPU信息
    property_set("ro.product.cpu.abi", "arm64-v8a");
    property_set("ro.product.cpu.abilist", "arm64-v8a,armeabi-v7a,armeabi");
    
    // 设置内存信息
    bool is_low_ram = is_low_ram_device();
    property_set("ro.config.low_ram", is_low_ram ? "true" : "false");
    
    if (is_low_ram) {
        property_set("dalvik.vm.heapsize", "256m");
    } else {
        property_set("dalvik.vm.heapsize", "512m");
    }
}
```

#### 1.1.2 系统服务配置

SystemProperty用于配置系统服务的各种参数：

- **调试开关**：debug.log.tags、debug.trace.enable
- **性能参数**：ro.config.nocheckin、ro.kernel.qemu
- **功能开关**：ro.telephony.call_ring.multiple、ro.config.alarm_alert
- **网络配置**：ro.ril.hsxpa、ro.ril.gprsclass

```c++
// 系统服务配置示例
static void init_service_properties() {
    // 调试配置
    property_set("debug.log.tags", "*:v");
    property_set("debug.trace.enable", "false");
    
    // 性能配置
    property_set("ro.config.nocheckin", "1");
    property_set("ro.kernel.qemu", "0");
    
    // 功能开关
    property_set("ro.telephony.call_ring.multiple", "false");
    property_set("ro.config.alarm_alert", "Alarm_Classic.ogg");
    
    // 网络配置
    property_set("ro.ril.hsxpa", "2");
    property_set("ro.ril.gprsclass", "10");
}
```

### 1.2 运行时状态管理

#### 1.2.1 系统状态跟踪

SystemProperty用于跟踪系统运行时的各种状态：

- **启动状态**：sys.boot_completed、init.svc.*
- **USB状态**：sys.usb.state、sys.usb.config
- **网络状态**：net.dns1、net.dns2、net.gprs.local-ip
- **电池状态**：battery.present、battery.level

```c++
// 系统状态跟踪示例
static void update_system_state(const char* service, const char* state) {
    char prop_name[PROP_NAME_MAX];
    
    // 更新服务状态
    snprintf(prop_name, sizeof(prop_name), "init.svc.%s", service);
    property_set(prop_name, state);
    
    // 检查是否所有关键服务已启动
    if (strcmp(state, "running") == 0) {
        check_boot_completion();
    }
}

// 检查启动完成状态
static void check_boot_completion() {
    // 检查关键服务状态
    const char* critical_services[] = {"zygote", "surfaceflinger", "media"};
    bool all_running = true;
    
    for (size_t i = 0; i < arraysize(critical_services); i++) {
        char prop_name[PROP_NAME_MAX];
        char prop_value[PROP_VALUE_MAX];
        
        snprintf(prop_name, sizeof(prop_name), "init.svc.%s", critical_services[i]);
        if (__system_property_get(prop_name, prop_value) == 0 || 
            strcmp(prop_value, "running") != 0) {
            all_running = false;
            break;
        }
    }
    
    // 设置启动完成标志
    if (all_running) {
        property_set("sys.boot_completed", "1");
        ALOGI("Boot completed");
    }
}
```

#### 1.2.2 动态配置调整

SystemProperty支持运行时动态调整系统配置：

- **性能调优**：debug.sf.showfps、debug.performance.tuning
- **功能开关**：persist.sys.ui.daynight、persist.sys.locale
- **调试选项**：debug.layout、debug.hwui.overdraw

```java
// 动态配置调整示例
public class PerformanceTuner {
    // 调整渲染性能
    public static void adjustRenderingPerformance(boolean highPerformance) {
        if (highPerformance) {
            // 启用高性能模式
            SystemProperties.set("debug.performance.tuning", "1");
            SystemProperties.set("debug.sf.showfps", "1");
            SystemProperties.set("debug.hwui.overdraw", "show");
        } else {
            // 恢复默认设置
            SystemProperties.set("debug.performance.tuning", "0");
            SystemProperties.set("debug.sf.showfps", "0");
            SystemProperties.set("debug.hwui.overdraw", "false");
        }
    }
    
    // 调整主题模式
    public static void setDayNightMode(boolean nightMode) {
        SystemProperties.set("persist.sys.ui.daynight", nightMode ? "2" : "1");
    }
    
    // 设置语言
    public static void setLocale(String locale) {
        SystemProperties.set("persist.sys.locale", locale);
    }
}
```

### 1.3 跨进程通信

#### 1.3.1 系统服务通信

SystemProperty是系统服务间通信的重要机制：

- **服务发现**：系统服务通过属性发布自己的状态
- **配置同步**：服务间通过属性同步配置信息
- **事件通知**：通过属性变更实现事件通知机制

```c++
// 系统服务通信示例
// SurfaceFlinger服务发布状态
void surfaceflinger_publish_status() {
    property_set("init.svc.surfaceflinger", "running");
    property_set("surfaceflinger.display_count", "2");
    property_set("surfaceflinger.primary_display_orientation", "0");
}

// WindowManagerService监听SurfaceFlinger状态
void windowmanager_service_init() {
    // 添加属性变更回调
    __system_property_add_callback("init.svc.surfaceflinger", 
                                   surfaceflinger_state_changed, 
                                   nullptr);
}

// SurfaceFlinger状态变更回调
void surfaceflinger_state_changed(void* cookie, const char* name, const char* value) {
    if (strcmp(value, "running") == 0) {
        // SurfaceFlinger已启动，初始化窗口管理
        init_window_manager();
    }
}
```

#### 1.3.2 应用间通信

应用可以通过SystemProperty实现简单的数据共享：

```java
// 应用间通信示例
public class AppCommunication {
    // 发布应用状态
    public static void publishAppState(String appName, String state) {
        String key = "app.state." + appName;
        SystemProperties.set(key, state);
    }
    
    // 获取应用状态
    public static String getAppState(String appName) {
        String key = "app.state." + appName;
        return SystemProperties.get(key, "unknown");
    }
    
    // 监听应用状态变更
    public static void addAppStateListener(String appName, Runnable callback) {
        String key = "app.state." + appName;
        SystemProperties.addChangeCallback(() -> {
            String state = getAppState(appName);
            // 处理状态变更
            callback.run();
        });
    }
}
```

### 1.4 调试与诊断

#### 1.4.1 调试开关控制

SystemProperty提供了丰富的调试开关：

- **日志控制**：log.tag.*、debug.log.tags
- **调试工具**：debug.layout、debug.hwui.profile
- **性能监控**：debug.performance.tuning、debug.sf.showfps

```java
// 调试开关控制示例
public class DebugController {
    // 启用组件调试
    public static void enableComponentDebug(String component, boolean enable) {
        String key = "debug." + component;
        SystemProperties.set(key, enable ? "1" : "0");
    }
    
    // 设置日志级别
    public static void setLogLevel(String tag, String level) {
        String key = "log.tag." + tag;
        SystemProperties.set(key, level);
    }
    
    // 启用性能分析
    public static void enableProfiling(boolean enable) {
        SystemProperties.set("debug.hwui.profile", enable ? "visual_bars" : "false");
        SystemProperties.set("debug.sf.showfps", enable ? "1" : "0");
    }
}
```

#### 1.4.2 系统诊断

SystemProperty用于系统诊断和故障排查：

```c++
// 系统诊断示例
void dump_system_diagnostic() {
    char value[PROP_VALUE_MAX];
    
    // 系统启动时间
    if (__system_property_get("ro.boottime.init", value) > 0) {
        ALOGD("Init boot time: %sms", value);
    }
    
    // 内存配置
    if (__system_property_get("ro.config.low_ram", value) > 0) {
        ALOGD("Low RAM device: %s", value);
    }
    
    // 系统服务状态
    const char* services[] = {"zygote", "surfaceflinger", "media", "netd"};
    for (size_t i = 0; i < arraysize(services); i++) {
        char prop_name[PROP_NAME_MAX];
        snprintf(prop_name, sizeof(prop_name), "init.svc.%s", services[i]);
        if (__system_property_get(prop_name, value) > 0) {
            ALOGD("Service %s: %s", services[i], value);
        }
    }
}
```

## 2. 性能优化

### 2.1 访问性能优化

#### 2.1.1 客户端缓存优化

```java
// 高效的属性缓存实现
public class OptimizedSystemProperties {
    // 分层缓存：热缓存 + 冷缓存
    private static final ArrayMap<String, String> sHotCache = new ArrayMap<>();
    private static final ArrayMap<String, String> sColdCache = new ArrayMap<>();
    
    // 热缓存大小限制
    private static final int HOT_CACHE_SIZE = 50;
    private static final int COLD_CACHE_SIZE = 200;
    
    // 访问统计
    private static final ArrayMap<String, Integer> sAccessCount = new ArrayMap<>();
    
    // 获取属性（带缓存优化）
    public static String get(String key, String def) {
        // 检查热缓存
        synchronized (sHotCache) {
            String value = sHotCache.get(key);
            if (value != null) {
                updateAccessCount(key);
                return value;
            }
        }
        
        // 检查冷缓存
        synchronized (sColdCache) {
            String value = sColdCache.get(key);
            if (value != null) {
                // 提升到热缓存
                promoteToHotCache(key, value);
                return value;
            }
        }
        
        // 从native层获取
        String value = native_get(key);
        if (value != null) {
            // 添加到冷缓存
            addToColdCache(key, value);
        }
        
        return value == null ? def : value;
    }
    
    // 提升到热缓存
    private static void promoteToHotCache(String key, String value) {
        synchronized (sHotCache) {
            synchronized (sColdCache) {
                // 检查热缓存是否已满
                if (sHotCache.size() >= HOT_CACHE_SIZE) {
                    // 移除最少访问的项
                    String leastUsedKey = findLeastUsedKey(sHotCache);
                    String leastUsedValue = sHotCache.remove(leastUsedKey);
                    
                    // 移回冷缓存
                    if (sColdCache.size() < COLD_CACHE_SIZE) {
                        sColdCache.put(leastUsedKey, leastUsedValue);
                    }
                }
                
                // 添加到热缓存
                sHotCache.put(key, value);
                sColdCache.remove(key);
            }
        }
    }
    
    // 更新访问统计
    private static void updateAccessCount(String key) {
        synchronized (sAccessCount) {
            Integer count = sAccessCount.get(key);
            sAccessCount.put(key, count != null ? count + 1 : 1);
        }
    }
    
    // 查找最少访问的键
    private static String findLeastUsedKey(ArrayMap<String, String> cache) {
        String leastUsedKey = null;
        int minCount = Integer.MAX_VALUE;
        
        for (int i = 0; i < cache.size(); i++) {
            String key = cache.keyAt(i);
            Integer count = sAccessCount.get(key);
            if (count == null) count = 0;
            
            if (count < minCount) {
                minCount = count;
                leastUsedKey = key;
            }
        }
        
        return leastUsedKey;
    }
}
```

#### 2.1.2 批量访问优化

```java
// 批量属性访问
public class BatchPropertyAccess {
    // 批量获取属性
    public static Map<String, String> getMultiple(String[] keys) {
        Map<String, String> result = new ArrayMap<>();
        
        // 检查缓存
        List<String> uncachedKeys = new ArrayList<>();
        for (String key : keys) {
            String value = getCachedValue(key);
            if (value != null) {
                result.put(key, value);
            } else {
                uncachedKeys.add(key);
            }
        }
        
        // 批量获取未缓存的属性
        if (!uncachedKeys.isEmpty()) {
            native_get_multiple(uncachedKeys.toArray(new String[0]), result);
            
            // 更新缓存
            for (String key : uncachedKeys) {
                String value = result.get(key);
                if (value != null) {
                    updateCache(key, value);
                }
            }
        }
        
        return result;
    }
    
    // 本地方法：批量获取属性
    private static native void native_get_multiple(String[] keys, Map<String, String> result);
}
```

### 2.2 存储性能优化

#### 2.2.1 属性区域优化

```c++
// 优化的属性区域结构
struct optimized_prop_area {
    // 头部信息
    uint32_t version;
    uint32_t magic;
    uint32_t size;
    uint32_t count;
    
    // 哈希表（提高查找效率）
    uint32_t hash_table_size;
    uint32_t hash_table[0];
    
    // 属性数据区（按哈希值排序）
    char data[0];
};

// 优化的属性查找
const prop_info *__system_property_find_optimized(const char *name) {
    prop_area *pa = __system_property_area__;
    if (!pa) {
        return NULL;
    }
    
    // 计算哈希值
    unsigned hash = property_hash(name);
    unsigned table_size = pa->hash_table_size;
    unsigned index = hash % table_size;
    
    // 在哈希表中查找
    unsigned entry = pa->hash_table[index];
    while (entry) {
        prop_info *pi = TOC_TO_INFO(pa, entry);
        if (strcmp(name, pi->name) == 0) {
            return pi;
        }
        entry = pi->next;
    }
    
    return NULL;
}
```

#### 2.2.2 持久化优化

```c++
// 异步持久化
struct persist_task {
    char *name;
    char *value;
    struct listnode list;
};

static pthread_mutex_t persist_queue_lock = PTHREAD_MUTEX_INITIALIZER;
static pthread_cond_t persist_queue_cond = PTHREAD_COND_INITIALIZER;
static struct listnode persist_queue = LIST_HEAD_INIT(persist_queue);
static pthread_t persist_thread_id;

// 启动持久化线程
void start_persist_thread() {
    pthread_create(&persist_thread_id, NULL, persist_thread_func, NULL);
}

// 异步持久化属性
void async_persist_property(const char *name, const char *value) {
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

// 持久化线程函数
void* persist_thread_func(void *arg) {
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

### 2.3 内存优化

#### 2.3.1 内存池管理

```c++
// 属性内存池
struct prop_memory_pool {
    void *base;
    size_t size;
    size_t used;
    struct listnode free_blocks;
};

struct memory_block {
    size_t size;
    struct listnode list;
};

// 初始化内存池
int init_prop_memory_pool(size_t size) {
    void *base = mmap(NULL, size, PROT_READ | PROT_WRITE, 
                      MAP_PRIVATE | MAP_ANONYMOUS, -1, 0);
    if (base == MAP_FAILED) {
        return -1;
    }
    
    g_prop_pool.base = base;
    g_prop_pool.size = size;
    g_prop_pool.used = 0;
    
    // 初始化空闲块列表
    struct memory_block *block = (struct memory_block *)base;
    block->size = size;
    list_init(&g_prop_pool.free_blocks);
    list_add_tail(&g_prop_pool.free_blocks, &block->list);
    
    return 0;
}

// 从内存池分配内存
void* alloc_from_prop_pool(size_t size) {
    // 查找合适的空闲块
    struct memory_block *block = NULL;
    list_for_every_entry(&g_prop_pool.free_blocks, block, memory_block, list) {
        if (block->size >= size) {
            break;
        }
    }
    
    if (!block) {
        return NULL;
    }
    
    // 分割块（如果需要）
    if (block->size > size + sizeof(struct memory_block)) {
        struct memory_block *new_block = (struct memory_block *)
            ((char*)block + sizeof(struct memory_block) + size);
        new_block->size = block->size - size - sizeof(struct memory_block);
        list_add_after(&block->list, &new_block->list);
        block->size = size;
    }
    
    // 从空闲列表中移除
    list_delete(&block->list);
    
    // 返回内存地址
    return (char*)block + sizeof(struct memory_block);
}
```

#### 2.3.2 内存压缩

```c++
// 属性值压缩
size_t compress_property_value(const char *value, char *compressed, size_t max_size) {
    size_t len = strlen(value);
    if (len < 16) {
        // 短值不压缩
        if (len < max_size) {
            strcpy(compressed, value);
            return len;
        }
        return 0;
    }
    
    // 简单的RLE压缩
    size_t compressed_len = 0;
    char current = value[0];
    int count = 1;
    
    for (size_t i = 1; i < len; i++) {
        if (value[i] == current && count < 255) {
            count++;
        } else {
            // 写入压缩数据
            if (compressed_len + 2 < max_size) {
                compressed[compressed_len++] = count;
                compressed[compressed_len++] = current;
            } else {
                return 0; // 压缩后超出限制
            }
            
            current = value[i];
            count = 1;
        }
    }
    
    // 写入最后一个字符
    if (compressed_len + 2 < max_size) {
        compressed[compressed_len++] = count;
        compressed[compressed_len++] = current;
    } else {
        return 0;
    }
    
    return compressed_len;
}

// 属性值解压缩
size_t decompress_property_value(const char *compressed, size_t compressed_len, 
                                char *value, size_t max_size) {
    size_t value_len = 0;
    
    for (size_t i = 0; i < compressed_len; i += 2) {
        int count = compressed[i];
        char current = compressed[i + 1];
        
        for (int j = 0; j < count; j++) {
            if (value_len >= max_size) {
                return 0;
            }
            value[value_len++] = current;
        }
    }
    
    value[value_len] = '\0';
    return value_len;
}
```

## 3. 安全优化

### 3.1 权限控制优化

#### 3.1.1 细粒度权限控制

```c++
// 细粒度权限控制结构
struct property_permission {
    const char *prefix;
    const char *context;
    unsigned int length;
    bool read_only;
};

// 属性权限表
static const struct property_permission property_permissions[] = {
    {"ro.", "u:object_r:system_prop:s0", 3, true},
    {"persist.", "u:object_r:system_prop:s0", 8, false},
    {"debug.", "u:object_r:debug_prop:s0", 6, false},
    {"sys.", "u:object_r:system_prop:s0", 4, false},
    {NULL, NULL, 0, false}
};

// 检查属性权限
static bool check_property_permission(const char *name, const char *context, bool is_write) {
    // 查找匹配的权限规则
    const struct property_permission *perm = property_permissions;
    while (perm->prefix) {
        if (strncmp(name, perm->prefix, perm->length) == 0) {
            // 检查只读属性
            if (is_write && perm->read_only) {
                return false;
            }
            
            // 检查SeLinux权限
            return check_selinux_permission(context, perm->context, is_write);
        }
        perm++;
    }
    
    // 默认权限检查
    return check_selinux_permission(context, "u:object_r:default_prop:s0", is_write);
}
```

#### 3.1.2 动态权限调整

```c++
// 动态权限调整
struct dynamic_permission {
    char *name_pattern;
    char *allowed_context;
    bool is_temporary;
    time_t expire_time;
};

static struct listnode dynamic_permissions = LIST_HEAD_INIT(dynamic_permissions);

// 添加临时权限
int add_temporary_permission(const char *name_pattern, const char *context, int duration_seconds) {
    struct dynamic_permission *perm = malloc(sizeof(struct dynamic_permission));
    if (!perm) {
        return -1;
    }
    
    perm->name_pattern = strdup(name_pattern);
    perm->allowed_context = strdup(context);
    perm->is_temporary = true;
    perm->expire_time = time(NULL) + duration_seconds;
    
    pthread_mutex_lock(&dynamic_perm_lock);
    list_add_tail(&dynamic_permissions, &perm->list);
    pthread_mutex_unlock(&dynamic_perm_lock);
    
    return 0;
}

// 检查动态权限
static bool check_dynamic_permission(const char *name, const char *context) {
    time_t now = time(NULL);
    bool allowed = false;
    
    pthread_mutex_lock(&dynamic_perm_lock);
    struct dynamic_permission *perm, *temp;
    list_for_every_entry_safe(&dynamic_permissions, perm, temp, dynamic_permission, list) {
        // 检查是否过期
        if (perm->is_temporary && perm->expire_time < now) {
            list_delete(&perm->list);
            free(perm->name_pattern);
            free(perm->allowed_context);
            free(perm);
            continue;
        }
        
        // 检查名称匹配
        if (fnmatch(perm->name_pattern, name, 0) == 0) {
            if (strcmp(context, perm->allowed_context) == 0) {
                allowed = true;
                break;
            }
        }
    }
    pthread_mutex_unlock(&dynamic_perm_lock);
    
    return allowed;
}
```

### 3.2 数据安全优化

#### 3.2.1 敏感数据加密

```c++
// 敏感属性加密
#define ENCRYPTED_PREFIX "encrypted."
#define ENCRYPTION_KEY_SIZE 32

static unsigned char encryption_key[ENCRYPTION_KEY_SIZE];

// 初始化加密密钥
void init_property_encryption() {
    // 从安全存储中获取密钥
    if (!get_encryption_key(encryption_key, sizeof(encryption_key))) {
        // 如果没有密钥，生成一个随机密钥
        generate_random_key(encryption_key, sizeof(encryption_key));
        save_encryption_key(encryption_key, sizeof(encryption_key));
    }
}

// 加密属性值
int encrypt_property_value(const char *value, char *encrypted, size_t max_size) {
    // 使用AES-256-GCM加密
    size_t value_len = strlen(value);
    if (value_len + 16 > max_size) { // 16是GCM的tag大小
        return -1;
    }
    
    unsigned char iv[12]; // GCM推荐的IV大小
    generate_random_iv(iv, sizeof(iv));
    
    // 加密
    size_t encrypted_len;
    if (!aes_gcm_encrypt((unsigned char*)value, value_len, 
                        encryption_key, iv, 
                        (unsigned char*)encrypted, &encrypted_len)) {
        return -1;
    }
    
    // 将IV添加到加密数据前
    memmove(encrypted + 12, encrypted, encrypted_len);
    memcpy(encrypted, iv, 12);
    
    return encrypted_len + 12;
}

// 解密属性值
int decrypt_property_value(const char *encrypted, size_t encrypted_len, 
                          char *value, size_t max_size) {
    if (encrypted_len < 12) {
        return -1;
    }
    
    // 提取IV
    unsigned char iv[12];
    memcpy(iv, encrypted, 12);
    
    // 解密
    size_t value_len;
    if (!aes_gcm_decrypt((unsigned char*)encrypted + 12, encrypted_len - 12,
                        encryption_key, iv,
                        (unsigned char*)value, &value_len)) {
        return -1;
    }
    
    if (value_len >= max_size) {
        return -1;
    }
    
    value[value_len] = '\0';
    return value_len;
}
```

#### 3.2.2 安全审计

```c++
// 属性访问审计
struct property_audit_entry {
    time_t timestamp;
    pid_t pid;
    uid_t uid;
    char process_name[256];
    char property_name[PROP_NAME_MAX];
    char operation; // 'R' for read, 'W' for write
    bool success;
};

static struct listnode audit_log = LIST_HEAD_INIT(audit_log);
static pthread_mutex_t audit_lock = PTHREAD_MUTEX_INITIALIZER;
static size_t max_audit_entries = 1000;

// 记录审计日志
void audit_property_access(pid_t pid, uid_t uid, const char *process_name,
                          const char *property_name, char operation, bool success) {
    struct property_audit_entry *entry = malloc(sizeof(struct property_audit_entry));
    if (!entry) {
        return;
    }
    
    entry->timestamp = time(NULL);
    entry->pid = pid;
    entry->uid = uid;
    strlcpy(entry->process_name, process_name, sizeof(entry->process_name));
    strlcpy(entry->property_name, property_name, sizeof(entry->property_name));
    entry->operation = operation;
    entry->success = success;
    
    pthread_mutex_lock(&audit_lock);
    
    // 检查审计日志大小
    if (list_length(&audit_log) >= max_audit_entries) {
        // 移除最旧的条目
        struct property_audit_entry *old_entry = 
            list_first_entry(&audit_log, struct property_audit_entry, list);
        list_delete(&old_entry->list);
        free(old_entry);
    }
    
    // 添加新条目
    list_add_tail(&audit_log, &entry->list);
    
    pthread_mutex_unlock(&audit_lock);
}

// 检测可疑活动
void detect_suspicious_activity() {
    pthread_mutex_lock(&audit_lock);
    
    // 统计每个进程的访问次数
    struct process_access_stats {
        pid_t pid;
        char process_name[256];
        int read_count;
        int write_count;
        int failure_count;
    };
    
    struct listnode stats_list = LIST_HEAD_INIT(stats_list);
    
    struct property_audit_entry *entry;
    list_for_every_entry(&audit_log, entry, property_audit_entry, list) {
        // 查找或创建进程统计
        struct process_access_stats *stats = NULL;
        struct process_access_stats *s;
        list_for_every_entry(&stats_list, s, process_access_stats, list) {
            if (s->pid == entry->pid) {
                stats = s;
                break;
            }
        }
        
        if (!stats) {
            stats = malloc(sizeof(struct process_access_stats));
            stats->pid = entry->pid;
            strlcpy(stats->process_name, entry->process_name, sizeof(stats->process_name));
            stats->read_count = 0;
            stats->write_count = 0;
            stats->failure_count = 0;
            list_add_tail(&stats_list, &stats->list);
        }
        
        // 更新统计
        if (entry->operation == 'R') {
            stats->read_count++;
        } else if (entry->operation == 'W') {
            stats->write_count++;
        }
        
        if (!entry->success) {
            stats->failure_count++;
        }
    }
    
    // 检测异常模式
    struct process_access_stats *stats;
    list_for_every_entry(&stats_list, stats, process_access_stats, list) {
        // 检测频繁访问
        if (stats->read_count > 100 || stats->write_count > 50) {
            ALOGW("Suspicious activity: process %s (pid %d) accessed properties %d times (read: %d, write: %d)",
                  stats->process_name, stats->pid, 
                  stats->read_count + stats->write_count,
                  stats->read_count, stats->write_count);
        }
        
        // 检测大量失败
        if (stats->failure_count > 10) {
            ALOGW("Suspicious activity: process %s (pid %d) failed to access properties %d times",
                  stats->process_name, stats->pid, stats->failure_count);
        }
        
        free(stats);
    }
    
    pthread_mutex_unlock(&audit_lock);
}
```

## 4. 可靠性优化

### 4.1 错误处理优化

#### 4.1.1 自动恢复机制

```c++
// 属性服务健康监控
struct health_monitor {
    time_t last_check;
    int error_count;
    int max_errors;
    int check_interval;
};

static struct health_monitor g_health_monitor = {
    .last_check = 0,
    .error_count = 0,
    .max_errors = 10,
    .check_interval = 60 // 60秒
};

// 属性服务健康检查
int check_property_service_health() {
    time_t now = time(NULL);
    
    // 检查是否需要执行健康检查
    if (now - g_health_monitor.last_check < g_health_monitor.check_interval) {
        return 0;
    }
    
    g_health_monitor.last_check = now;
    
    // 测试属性设置和获取
    const char *test_key = "debug.health.check";
    const char *test_value = "ok";
    char read_value[PROP_VALUE_MAX];
    
    // 设置测试属性
    if (__system_property_set(test_key, test_value) != 0) {
        g_health_monitor.error_count++;
        ALOGE("Property service health check: failed to set test property");
        goto check_result;
    }
    
    // 获取测试属性
    if (__system_property_get(test_key, read_value) == 0) {
        g_health_monitor.error_count++;
        ALOGE("Property service health check: failed to get test property");
        goto check_result;
    }
    
    // 验证值
    if (strcmp(read_value, test_value) != 0) {
        g_health_monitor.error_count++;
        ALOGE("Property service health check: value mismatch (expected: %s, actual: %s)",
              test_value, read_value);
        goto check_result;
    }
    
    // 重置错误计数
    g_health_monitor.error_count = 0;
    ALOGD("Property service health check: OK");
    return 0;

check_result:
    // 检查是否需要恢复
    if (g_health_monitor.error_count >= g_health_monitor.max_errors) {
        ALOGE("Property service health check: too many errors, attempting recovery");
        recover_property_service();
        g_health_monitor.error_count = 0;
    }
    
    return -1;
}

// 属性服务恢复
int recover_property_service() {
    ALOGI("Attempting to recover property service");
    
    // 重新初始化属性区域
    if (__system_property_area_init() != 0) {
        ALOGE("Failed to reinitialize property area");
        return -1;
    }
    
    // 重新加载属性
    load_default_properties();
    load_persistent_properties();
    
    // 重启属性服务
    restart_property_service();
    
    ALOGI("Property service recovery completed");
    return 0;
}
```

#### 4.1.2 降级策略

```c++
// 属性服务降级策略
enum property_service_mode {
    MODE_NORMAL,    // 正常模式
    MODE_DEGRADED,  // 降级模式
    MODE_MINIMAL    // 最小模式
};

static enum property_service_mode g_service_mode = MODE_NORMAL;

// 属性服务降级
void degrade_property_service() {
    if (g_service_mode == MODE_MINIMAL) {
        ALOGE("Property service already in minimal mode");
        return;
    }
    
    if (g_service_mode == MODE_NORMAL) {
        g_service_mode = MODE_DEGRADED;
        ALOGW("Property service entering degraded mode");
        
        // 禁用非关键功能
        disable_property_callbacks();
        reduce_cache_size();
    } else {
        g_service_mode = MODE_MINIMAL;
        ALOGW("Property service entering minimal mode");
        
        // 只保留基本功能
        disable_all_non_critical_operations();
    }
}

// 检查是否应该降级
bool should_degrade_service() {
    // 检查内存使用情况
    if (get_memory_usage() > MEMORY_THRESHOLD) {
        return true;
    }
    
    // 检查错误率
    if (g_health_monitor.error_count > g_health_monitor.max_errors / 2) {
        return true;
    }
    
    // 检查系统负载
    if (get_system_load() > LOAD_THRESHOLD) {
        return true;
    }
    
    return false;
}
```

### 4.2 数据一致性优化

#### 4.2.1 事务支持

```c++
// 属性事务
struct property_transaction {
    int id;
    time_t start_time;
    struct listnode operations;
    bool committed;
};

struct property_operation {
    enum {
        OP_SET,
        OP_DELETE
    } type;
    char name[PROP_NAME_MAX];
    char value[PROP_VALUE_MAX];
    char old_value[PROP_VALUE_MAX];
    bool has_old_value;
    struct listnode list;
};

static struct listnode active_transactions = LIST_HEAD_INIT(active_transactions);
static int next_transaction_id = 1;
static pthread_mutex_t transaction_lock = PTHREAD_MUTEX_INITIALIZER;

// 开始事务
int begin_property_transaction() {
    struct property_transaction *txn = malloc(sizeof(struct property_transaction));
    if (!txn) {
        return -1;
    }
    
    pthread_mutex_lock(&transaction_lock);
    txn->id = next_transaction_id++;
    txn->start_time = time(NULL);
    list_init(&txn->operations);
    txn->committed = false;
    list_add_tail(&active_transactions, &txn->list);
    pthread_mutex_unlock(&transaction_lock);
    
    return txn->id;
}

// 在事务中设置属性
int set_property_in_transaction(int txn_id, const char *name, const char *value) {
    pthread_mutex_lock(&transaction_lock);
    
    // 查找事务
    struct property_transaction *txn = NULL;
    struct property_transaction *t;
    list_for_every_entry(&active_transactions, t, property_transaction, list) {
        if (t->id == txn_id) {
            txn = t;
            break;
        }
    }
    
    if (!txn || txn->committed) {
        pthread_mutex_unlock(&transaction_lock);
        return -1;
    }
    
    // 创建操作
    struct property_operation *op = malloc(sizeof(struct property_operation));
    op->type = OP_SET;
    strlcpy(op->name, name, sizeof(op->name));
    strlcpy(op->value, value, sizeof(op->value));
    
    // 保存旧值
    if (__system_property_get(name, op->old_value) > 0) {
        op->has_old_value = true;
    } else {
        op->has_old_value = false;
    }
    
    // 执行操作
    int result = __system_property_set(name, value);
    if (result == 0) {
        list_add_tail(&txn->operations, &op->list);
    } else {
        free(op);
    }
    
    pthread_mutex_unlock(&transaction_lock);
    return result;
}

// 提交事务
int commit_property_transaction(int txn_id) {
    pthread_mutex_lock(&transaction_lock);
    
    // 查找事务
    struct property_transaction *txn = NULL;
    struct property_transaction *t;
    list_for_every_entry(&active_transactions, t, property_transaction, list) {
        if (t->id == txn_id) {
            txn = t;
            break;
        }
    }
    
    if (!txn || txn->committed) {
        pthread_mutex_unlock(&transaction_lock);
        return -1;
    }
    
    // 标记为已提交
    txn->committed = true;
    
    // 持久化所有操作
    struct property_operation *op;
    list_for_every_entry(&txn->operations, op, property_operation, list) {
        if (op->type == OP_SET && strncmp(op->name, "persist.", 8) == 0) {
            persist_property(op->name, op->value);
        }
    }
    
    // 释放事务
    free_transaction(txn);
    
    pthread_mutex_unlock(&transaction_lock);
    return 0;
}

// 回滚事务
int rollback_property_transaction(int txn_id) {
    pthread_mutex_lock(&transaction_lock);
    
    // 查找事务
    struct property_transaction *txn = NULL;
    struct property_transaction *t;
    list_for_every_entry(&active_transactions, t, property_transaction, list) {
        if (t->id == txn_id) {
            txn = t;
            break;
        }
    }
    
    if (!txn || txn->committed) {
        pthread_mutex_unlock(&transaction_lock);
        return -1;
    }
    
    // 回滚所有操作（逆序）
    struct property_operation *op, *temp;
    list_for_every_entry_safe_reverse(&txn->operations, op, temp, property_operation, list) {
        if (op->type == OP_SET) {
            if (op->has_old_value) {
                // 恢复旧值
                __system_property_set(op->name, op->old_value);
            } else {
                // 删除属性
                delete_property(op->name);
            }
        }
    }
    
    // 释放事务
    free_transaction(txn);
    
    pthread_mutex_unlock(&transaction_lock);
    return 0;
}
```

## 5. 监控与诊断优化

### 5.1 性能监控

#### 5.1.1 实时性能指标

```c++
// 性能统计
struct property_performance_stats {
    uint64_t total_get_calls;
    uint64_t total_set_calls;
    uint64_t total_get_time_us;
    uint64_t total_set_time_us;
    uint64_t cache_hits;
    uint64_t cache_misses;
    uint64_t permission_denied;
    uint64_t errors;
};

static struct property_performance_stats g_perf_stats = {0};

// 性能监控宏
#define PERF_START_GET() uint64_t get_start_time = get_time_us()
#define PERF_END_GET(name) do { \
    uint64_t get_end_time = get_time_us(); \
    uint64_t get_elapsed = get_end_time - get_start_time; \
    __sync_fetch_and_add(&g_perf_stats.total_get_calls, 1); \
    __sync_fetch_and_add(&g_perf_stats.total_get_time_us, get_elapsed); \
    if (get_elapsed > 1000) { /* 超过1ms */ \
        ALOGW("Slow property get: %s took %llu us", name, get_elapsed); \
    } \
} while(0)

#define PERF_START_SET() uint64_t set_start_time = get_time_us()
#define PERF_END_SET(name) do { \
    uint64_t set_end_time = get_time_us(); \
    uint64_t set_elapsed = set_end_time - set_start_time; \
    __sync_fetch_and_add(&g_perf_stats.total_set_calls, 1); \
    __sync_fetch_and_add(&g_perf_stats.total_set_time_us, set_elapsed); \
    if (set_elapsed > 5000) { /* 超过5ms */ \
        ALOGW("Slow property set: %s took %llu us", name, set_elapsed); \
    } \
} while(0)

// 获取性能统计
void get_property_performance_stats(struct property_performance_stats *stats) {
    memcpy(stats, &g_perf_stats, sizeof(struct property_performance_stats));
}

// 打印性能报告
void print_property_performance_report() {
    struct property_performance_stats stats;
    get_property_performance_stats(&stats);
    
    ALOGI("Property Performance Report:");
    ALOGI("  Total gets: %llu, avg time: %llu us",
          stats.total_get_calls,
          stats.total_get_calls > 0 ? stats.total_get_time_us / stats.total_get_calls : 0);
    ALOGI("  Total sets: %llu, avg time: %llu us",
          stats.total_set_calls,
          stats.total_set_calls > 0 ? stats.total_set_time_us / stats.total_set_calls : 0);
    ALOGI("  Cache hit rate: %llu%%",
          stats.cache_hits + stats.cache_misses > 0 ?
          stats.cache_hits * 100 / (stats.cache_hits + stats.cache_misses) : 0);
    ALOGI("  Permission denied: %llu, Errors: %llu",
          stats.permission_denied, stats.errors);
}
```

#### 5.1.2 性能分析工具

```c++
// 性能分析命令
void handle_property_perf_command(int argc, char **argv) {
    if (argc < 2) {
        ALOGE("Usage: property_perf <command> [args]");
        return;
    }
    
    if (strcmp(argv[1], "report") == 0) {
        print_property_performance_report();
    } else if (strcmp(argv[1], "reset") == 0) {
        memset(&g_perf_stats, 0, sizeof(g_perf_stats));
        ALOGI("Property performance stats reset");
    } else if (strcmp(argv[1], "monitor") == 0) {
        int duration = 10; // 默认10秒
        if (argc >= 3) {
            duration = atoi(argv[2]);
        }
        
        ALOGI("Monitoring property performance for %d seconds...", duration);
        
        struct property_performance_stats start_stats;
        get_property_performance_stats(&start_stats);
        
        sleep(duration);
        
        struct property_performance_stats end_stats;
        get_property_performance_stats(&end_stats);
        
        // 计算增量
        uint64_t delta_gets = end_stats.total_get_calls - start_stats.total_get_calls;
        uint64_t delta_sets = end_stats.total_set_calls - start_stats.total_set_calls;
        uint64_t delta_get_time = end_stats.total_get_time_us - start_stats.total_get_time_us;
        uint64_t delta_set_time = end_stats.total_set_time_us - start_stats.total_set_time_us;
        
        ALOGI("Property Performance Monitor Results (%d seconds):", duration);
        ALOGI("  Gets: %llu, avg time: %llu us",
              delta_gets,
              delta_gets > 0 ? delta_get_time / delta_gets : 0);
        ALOGI("  Sets: %llu, avg time: %llu us",
              delta_sets,
              delta_sets > 0 ? delta_set_time / delta_sets : 0);
    } else {
        ALOGE("Unknown command: %s", argv[1]);
    }
}
```

### 5.2 诊断工具

#### 5.2.1 属性状态诊断

```c++
// 属性状态诊断
void diagnose_property_system() {
    ALOGI("=== Property System Diagnosis ===");
    
    // 检查属性区域
    prop_area *pa = __system_property_area__;
    if (!pa) {
        ALOGE("Property area not initialized");
        return;
    }
    
    ALOGI("Property area: version=%u, magic=0x%x, size=%u, count=%u",
          pa->version, pa->magic, pa->size, pa->count);
    
    // 检查属性服务
    int service_fd = socket(AF_LOCAL, SOCK_STREAM | SOCK_CLOEXEC, 0);
    if (service_fd < 0) {
        ALOGE("Failed to create socket for property service check");
        return;
    }
    
    struct sockaddr_un addr;
    memset(&addr, 0, sizeof(addr));
    strlcpy(addr.sun_path, property_service_socket, sizeof(addr.sun_path));
    addr.sun_family = AF_LOCAL;
    
    if (connect(service_fd, (struct sockaddr*)&addr, sizeof(addr)) < 0) {
        ALOGE("Property service not responding");
        close(service_fd);
        return;
    }
    
    close(service_fd);
    ALOGI("Property service: OK");
    
    // 检查权限
    char *current_ctx = NULL;
    if (getcon(&current_ctx) < 0) {
        ALOGE("Failed to get current security context");
        return;
    }
    
    ALOGI("Current security context: %s", current_ctx);
    
    // 测试权限
    const char *test_props[] = {
        "ro.product.model",    // 只读属性
        "debug.test",          // 调试属性
        "persist.test",        // 持久化属性
        "sys.test"             // 系统属性
    };
    
    for (size_t i = 0; i < arraysize(test_props); i++) {
        char value[PROP_VALUE_MAX];
        if (__system_property_get(test_props[i], value) > 0) {
            ALOGI("Permission check: %s = %s (OK)", test_props[i], value);
        } else {
            ALOGW("Permission check: %s (FAILED)", test_props[i]);
        }
    }
    
    freecon(current_ctx);
    ALOGI("=== End Diagnosis ===");
}
```

#### 5.2.2 属性冲突检测

```c++
// 属性冲突检测
void detect_property_conflicts() {
    ALOGI("=== Property Conflict Detection ===");
    
    // 检查重复属性
    struct prop_info *pi;
    unsigned hash;
    unsigned *table = __system_property_area__->toc;
    
    for (hash = 0; hash < PROP_AREA_HASH_TABLE_SIZE; hash++) {
        unsigned entry = table[hash];
        while (entry) {
            pi = TOC_TO_INFO(__system_property_area__, entry);
            
            // 检查是否有重复的属性名
            unsigned check_hash = hash;
            unsigned check_entry = table[check_hash];
            while (check_entry) {
                if (check_entry != entry) {
                    struct prop_info *check_pi = TOC_TO_INFO(__system_property_area__, check_entry);
                    if (strcmp(pi->name, check_pi->name) == 0) {
                        ALOGW("Duplicate property found: %s", pi->name);
                    }
                }
                check_entry = check_pi->next;
            }
            
            entry = pi->next;
        }
    }
    
    // 检查属性值冲突
    const char *conflict_props[] = {
        "ro.product.model",
        "ro.product.brand",
        "ro.build.version.release",
        "ro.build.version.sdk"
    };
    
    for (size_t i = 0; i < arraysize(conflict_props); i++) {
        char value1[PROP_VALUE_MAX];
        char value2[PROP_VALUE_MAX];
        
        // 从不同来源获取属性值
        if (__system_property_get(conflict_props[i], value1) > 0) {
            // 从build.prop获取
            char build_prop_path[PATH_MAX];
            snprintf(build_prop_path, sizeof(build_prop_path), "/system/build.prop");
            
            FILE *fp = fopen(build_prop_path, "r");
            if (fp) {
                char line[256];
                bool found = false;
                
                while (fgets(line, sizeof(line), fp)) {
                    if (strncmp(line, conflict_props[i], strlen(conflict_props[i])) == 0) {
                        char *equals = strchr(line, '=');
                        if (equals) {
                            strlcpy(value2, equals + 1, sizeof(value2));
                            // 移除换行符
                            char *newline = strchr(value2, '\n');
                            if (newline) *newline = '\0';
                            
                            found = true;
                            break;
                        }
                    }
                }
                
                fclose(fp);
                
                if (found && strcmp(value1, value2) != 0) {
                    ALOGW("Property value conflict: %s", conflict_props[i]);
                    ALOGW("  Runtime value: %s", value1);
                    ALOGW("  build.prop value: %s", value2);
                }
            }
        }
    }
    
    ALOGI("=== End Conflict Detection ===");
}
```