# SystemProperty核心知识 - 接口与运转流程

## 1. 接口体系

### 1.1 Java层接口

#### 1.1.1 SystemProperties类

```java
// android.os.SystemProperties
public class SystemProperties {
    // 私有构造函数，防止实例化
    private SystemProperties() {}
    
    // 获取字符串属性
    public static String get(String key) {
        if (TRACK_KEYS) trackKey(key);
        return native_get(key);
    }
    
    public static String get(String key, String def) {
        if (TRACK_KEYS) trackKey(key);
        return native_get(key, def);
    }
    
    // 获取整型属性
    public static int getInt(String key, int def) {
        try {
            return Integer.parseInt(get(key));
        } catch (NumberFormatException e) {
            return def;
        }
    }
    
    // 获取长整型属性
    public static long getLong(String key, long def) {
        try {
            return Long.parseLong(get(key));
        } catch (NumberFormatException e) {
            return def;
        }
    }
    
    // 获取布尔型属性
    public static boolean getBoolean(String key, boolean def) {
        String val = get(key);
        if (val == null) return def;
        return "1".equals(val) || !"0".equals(val);
    }
    
    // 设置属性值
    public static void set(String key, String val) {
        if (val == null) {
            val = "";
        }
        native_set(key, val);
    }
    
    // 添加属性变更回调
    public static void addChangeCallback(Runnable callback) {
        synchronized (sChangeCallbacks) {
            if (sChangeCallbacks == null) {
                sChangeCallbacks = new ArrayList<Runnable>();
            }
            sChangeCallbacks.add(callback);
        }
    }
    
    // 本地方法
    private static native String native_get(String key);
    private static native String native_get(String key, String def);
    private static native void native_set(String key, String val);
    private static native void native_add_change_callback();
    
    // 缓存和回调相关
    private static final Object sCacheLock = new Object();
    private static final ArrayMap<String, String> sCache = new ArrayMap<>();
    private static final ArrayList<Runnable> sChangeCallbacks;
    
    // 缓存大小限制
    private static final int MAX_CACHE_ENTRIES = 1000;
    
    // 清除缓存
    private static void clearCache(String key) {
        synchronized (sCacheLock) {
            sCache.remove(key);
        }
    }
    
    // 执行变更回调
    private static void callChangeCallbacks() {
        synchronized (sChangeCallbacks) {
            if (sChangeCallbacks != null) {
                final int N = sChangeCallbacks.size();
                for (int i = 0; i < N; i++) {
                    sChangeCallbacks.get(i).run();
                }
            }
        }
    }
}
```

#### 1.1.2 JNI层实现

```c++
// android_os_SystemProperties.cpp
static JNINativeMethod gMethods[] = {
    /* name, signature, funcPtr */
    { "native_get", "(Ljava/lang/String;)Ljava/lang/String;",
      (void*) android_os_SystemProperties_getSS },
    { "native_get", "(Ljava/lang/String;Ljava/lang/String;)Ljava/lang/String;",
      (void*) android_os_SystemProperties_getSSS },
    { "native_set", "(Ljava/lang/String;Ljava/lang/String;)V",
      (void*) android_os_SystemProperties_setSS },
    { "native_add_change_callback", "()V",
      (void*) android_os_SystemProperties_add_change_callback },
};

// 注册JNI方法
int register_android_os_SystemProperties(JNIEnv* env) {
    return RegisterMethodsOrDie(env, "android/os/SystemProperties", gMethods, NELEM(gMethods));
}

// 获取属性实现
static jstring android_os_SystemProperties_getSSS(JNIEnv* env, jclass clazz,
                                                   jstring keyJ, jstring defJ) {
    // 转换Java字符串为C字符串
    ScopedUtfChars key(env, keyJ);
    if (key.c_str() == NULL) {
        jniThrowException(env, "java/lang/NullPointerException", NULL);
        return NULL;
    }
    
    ScopedUtfChars def(env, defJ);
    if (def.c_str() == NULL) {
        jniThrowException(env, "java/lang/NullPointerException", NULL);
        return NULL;
    }
    
    // 调用系统属性获取函数
    char buf[PROP_VALUE_MAX];
    char* rv = __system_property_get(key.c_str(), buf);
    
    // 返回结果
    jstring result = env->NewStringUTF(rv ? buf : def.c_str());
    return result;
}

// 设置属性实现
static void android_os_SystemProperties_setSS(JNIEnv* env, jclass clazz,
                                              jstring keyJ, jstring valJ) {
    // 转换Java字符串为C字符串
    ScopedUtfChars key(env, keyJ);
    if (key.c_str() == NULL) {
        jniThrowException(env, "java/lang/NullPointerException", NULL);
        return;
    }
    
    ScopedUtfChars val(env, valJ);
    if (val.c_str() == NULL) {
        jniThrowException(env, "java/lang/NullPointerException", NULL);
        return;
    }
    
    // 调用系统属性设置函数
    int err = __system_property_set(key.c_str(), val.c_str());
    if (err < 0) {
        ALOGE("Failed to set property '%s' to '%s'", key.c_str(), val.c_str());
        jniThrowException(env, "java/lang/RuntimeException", "Failed to set system property");
    }
}
```

### 1.2 Native层接口

#### 1.2.1 属性获取接口

```c++
// system_properties.h
// 获取属性值
int __system_property_get(const char *name, char *value);

// 获取属性信息
const prop_info *__system_property_find(const char *name);

// 读取属性信息
int __system_property_read(const prop_info *pi, char *name, char *value);

// 获取属性序列号
unsigned __system_property_serial(const prop_info *pi);

// 等待属性变更
uint32_t __system_property_wait_any(uint32_t old_serial);
```

#### 1.2.2 属性设置接口

```c++
// system_properties.h
// 设置属性值
int __system_property_set(const char *key, const char *value);

// 添加属性变更回调
int __system_property_add_callback(const char *name, 
                                   void (*callback)(void *cookie, const char *name, const char *value),
                                   void *cookie);
```

#### 1.2.3 属性列表接口

```c++
// system_properties.h
// 遍历所有属性
int __system_property_foreach(void (*propfn)(const prop_info *pi, void *cookie), void *cookie);

// 遍历指定前缀的属性
int __system_property_foreach_compat(const char *prefix,
                                     void (*propfn)(const prop_info *pi, void *cookie),
                                     void *cookie);
```

### 1.3 命令行工具

#### 1.3.1 getprop工具

```c++
// getprop.c
int main(int argc, char *argv[]) {
    if (argc == 1) {
        // 显示所有属性
        (void) __system_property_foreach(print_property, NULL);
    } else {
        // 显示指定属性
        const char *name = argv[1];
        char value[PROP_VALUE_MAX];
        if (__system_property_get(name, value)) {
            printf("%s: %s\n", name, value);
        } else {
            printf("%s: not set\n", name);
        }
    }
    return 0;
}

// 打印属性回调函数
static void print_property(const prop_info *pi, void *cookie) {
    char name[PROP_NAME_MAX];
    char value[PROP_VALUE_MAX];
    __system_property_read(pi, name, value);
    printf("[%s]: [%s]\n", name, value);
}
```

#### 1.3.2 setprop工具

```c++
// setprop.c
int main(int argc, char *argv[]) {
    if (argc != 3) {
        fprintf(stderr, "usage: setprop <key> <value>\n");
        return 1;
    }
    
    const char *key = argv[1];
    const char *value = argv[2];
    
    // 设置属性
    int rc = __system_property_set(key, value);
    if (rc < 0) {
        fprintf(stderr, "failed to set property\n");
        return 1;
    }
    
    return 0;
}
```

## 2. 运转流程

### 2.1 系统启动流程

#### 2.1.1 Init进程启动

```
1. 内核启动
2. 启动init进程
3. init进程初始化
4. 创建属性区域
5. 启动属性服务
6. 加载默认属性
7. 处理属性设置请求
```

#### 2.1.2 属性服务初始化

```c++
// init.cpp
int main(int argc, char** argv) {
    // ...
    
    // 初始化属性系统
    property_init();
    
    // 创建属性服务
    start_property_service();
    
    // 加载默认属性
    load_default_properties();
    
    // 加载持久化属性
    load_persistent_properties();
    
    // 进入主循环
    while (true) {
        // 处理事件
        // ...
    }
}

// 属性系统初始化
void property_init() {
    // 初始化属性区域
    if (__system_property_area_init()) {
        LOG(ERROR) << "Failed to initialize property area";
        exit(1);
    }
}

// 启动属性服务
void start_property_service() {
    // 创建socket
    property_set_fd = create_socket(PROP_SERVICE_NAME,
                                   SOCK_STREAM | SOCK_CLOEXEC | SOCK_NONBLOCK,
                                   0666, 0, 0, NULL);
    
    if (property_set_fd == -1) {
        PLOG(ERROR) << "start_property_service socket creation failed";
        exit(1);
    }
    
    // 监听连接
    listen(property_set_fd, 8);
    
    // 注册事件处理器
    register_epoll_handler(property_set_fd, handle_property_set_fd);
}
```

### 2.2 属性加载流程

#### 2.2.1 默认属性加载

```c++
// 加载默认属性
void load_default_properties() {
    // 加载/system/build.prop
    load_properties_from_file("/system/build.prop", NULL);
    
    // 加载/system/product/build.prop
    load_properties_from_file("/system/product/build.prop", NULL);
    
    // 加载/system/system_ext/build.prop
    load_properties_from_file("/system/system_ext/build.prop", NULL);
    
    // 加载/vendor/build.prop
    load_properties_from_file("/vendor/build.prop", NULL);
    
    // 加载/odm/build.prop
    load_properties_from_file("/odm/build.prop", NULL);
}

// 从文件加载属性
void load_properties_from_file(const char* filename, const char* filter) {
    FILE* file = fopen(filename, "re");
    if (!file) {
        return;
    }
    
    char* line = NULL;
    size_t len = 0;
    ssize_t read;
    
    while ((read = getline(&line, &len, file)) != -1) {
        // 跳过空行和注释
        if (line[0] == '#' || line[0] == '\n') {
            continue;
        }
        
        // 解析键值对
        char* key = line;
        char* value = strchr(line, '=');
        if (!value) {
            continue;
        }
        
        *value++ = '\0';
        
        // 移除换行符
        char* end = value + strlen(value) - 1;
        if (*end == '\n') {
            *end = '\0';
        }
        
        // 应用过滤器
        if (filter && strncmp(key, filter, strlen(filter)) != 0) {
            continue;
        }
        
        // 设置属性
        property_set(key, value);
    }
    
    free(line);
    fclose(file);
}
```

#### 2.2.2 持久化属性加载

```c++
// 加载持久化属性
void load_persistent_properties() {
    // 打开属性目录
    DIR* dir = opendir("/data/property");
    if (!dir) {
        return;
    }
    
    struct dirent* entry;
    while ((entry = readdir(dir)) != NULL) {
        // 跳过.和..
        if (entry->d_type != DT_REG) {
            continue;
        }
        
        // 构建文件路径
        char path[PATH_MAX];
        snprintf(path, sizeof(path), "/data/property/%s", entry->d_name);
        
        // 读取属性值
        char value[PROP_VALUE_MAX];
        int fd = open(path, O_RDONLY | O_NOFOLLOW | O_CLOEXEC);
        if (fd < 0) {
            continue;
        }
        
        ssize_t len = read(fd, value, sizeof(value) - 1);
        close(fd);
        
        if (len <= 0) {
            continue;
        }
        
        value[len] = '\0';
        
        // 设置属性
        property_set(entry->d_name, value);
    }
    
    closedir(dir);
}
```

### 2.3 属性获取流程

#### 2.3.1 Java层获取流程

```
1. 应用调用SystemProperties.get()
2. 检查本地缓存
3. 缓存命中：直接返回
4. 缓存未命中：调用native方法
5. JNI层调用__system_property_get()
6. 查找属性信息
7. 读取属性值
8. 返回给Java层
9. 更新本地缓存
```

#### 2.3.2 Native层获取流程

```c++
// 属性获取实现
int __system_property_get(const char *name, char *value) {
    // 查找属性
    const prop_info *pi = __system_property_find(name);
    if (pi == 0) {
        return 0;
    }
    
    // 读取属性值
    return __system_property_read(pi, 0, value);
}

// 查找属性
const prop_info *__system_property_find(const char *name) {
    // 获取属性区域
    prop_area *pa = __system_property_area__;
    if (!pa) {
        return NULL;
    }
    
    // 计算哈希值
    unsigned hash = property_hash(name);
    unsigned *table = pa->toc;
    unsigned entry = table[hash];
    
    // 查找属性
    while (entry) {
        prop_info *pi = TOC_TO_INFO(pa, entry);
        if (strcmp(name, pi->name) == 0) {
            return pi;
        }
        entry = pi->next;
    }
    
    return NULL;
}

// 读取属性值
int __system_property_read(const prop_info *pi, char *name, char *value) {
    if (!pi) {
        return 0;
    }
    
    // 获取属性区域
    prop_area *pa = __system_property_area__;
    if (!pa) {
        return 0;
    }
    
    // 读取属性值（原子操作）
    uint32_t serial = pi->serial;
    while (serial != pi->serial) {
        serial = pi->serial;
    }
    
    // 复制属性值
    if (name) {
        strcpy(name, pi->name);
    }
    if (value) {
        strcpy(value, pi->value);
    }
    
    return strlen(pi->value);
}
```

### 2.4 属性设置流程

#### 2.4.1 Java层设置流程

```
1. 应用调用SystemProperties.set()
2. 调用native方法
3. JNI层调用__system_property_set()
4. 建立socket连接
5. 发送设置请求
6. 服务端权限检查
7. 服务端设置属性
8. 服务端返回结果
9. 客户端接收结果
10. 清除本地缓存
11. 通知属性变更
```

#### 2.4.2 Native层设置流程

```c++
// 属性设置实现
int __system_property_set(const char *key, const char *value) {
    // 建立socket连接
    PropertyServiceConnection connection;
    if (!connection.IsValid()) {
        return -1;
    }
    
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

// 属性服务连接
class PropertyServiceConnection {
public:
    PropertyServiceConnection() : socket_(-1), last_error_(0) {
        // 创建socket
        socket_ = socket(AF_LOCAL, SOCK_STREAM | SOCK_CLOEXEC, 0);
        if (socket_ == -1) {
            last_error_ = errno;
            return;
        }
        
        // 连接属性服务
        struct sockaddr_un addr;
        memset(&addr, 0, sizeof(addr));
        strlcpy(addr.sun_path, property_service_socket, sizeof(addr.sun_path));
        addr.sun_family = AF_LOCAL;
        
        socklen_t alen = strlen(property_service_socket) + offsetof(sockaddr_un, sun_path) + 1;
        if (connect(socket_, reinterpret_cast<struct sockaddr*>(&addr), alen) == -1) {
            close(socket_);
            socket_ = -1;
            last_error_ = errno;
            return;
        }
    }
    
    ~PropertyServiceConnection() {
        if (socket_ != -1) {
            close(socket_);
        }
    }
    
    bool IsValid() const {
        return socket_ != -1;
    }
    
    bool SendUint32(uint32_t value) {
        int result = TEMP_FAILURE_RETRY(send(socket_, &value, sizeof(value), MSG_NOSIGNAL));
        return result == sizeof(value);
    }
    
    bool SendString(const char* value) {
        uint32_t len = strlen(value);
        if (len > PROP_VALUE_MAX) {
            len = PROP_VALUE_MAX;
        }
        
        return SendUint32(len) &&
               TEMP_FAILURE_RETRY(send(socket_, value, len, MSG_NOSIGNAL)) == static_cast<ssize_t>(len);
    }
    
    bool RecvInt32(int32_t* value) {
        int result = TEMP_FAILURE_RETRY(recv(socket_, value, sizeof(*value), MSG_WAITALL));
        return result == sizeof(*value);
    }
    
private:
    int socket_;
    int last_error_;
};
```

### 2.5 服务端处理流程

#### 2.5.1 属性设置请求处理

```c++
// 属性设置请求处理
static void handle_property_set_fd() {
    // 接受连接
    unique_fd s(accept4(property_set_fd, nullptr, nullptr, SOCK_CLOEXEC));
    if (s < 0) {
        return;
    }
    
    // 处理请求
    SocketConnection socket(std::move(s));
    uint32_t cmd = 0;
    if (!socket.RecvUint32(&cmd)) {
        return;
    }
    
    switch (cmd) {
        case PROP_MSG_SETPROP:
        case PROP_MSG_SETPROP2:
            handle_property_set(socket, cmd == PROP_MSG_SETPROP);
            break;
        default:
            // 未知命令
            break;
    }
}

// 处理属性设置
static void handle_property_set(SocketConnection& socket, bool legacy_protocol) {
    // 读取属性名和值
    char name[PROP_NAME_MAX];
    char value[PROP_VALUE_MAX];
    
    if (!socket.RecvChars(name, sizeof(name)) ||
        !socket.RecvChars(value, sizeof(value))) {
        return;
    }
    
    // 确保字符串以null结尾
    name[PROP_NAME_MAX - 1] = 0;
    value[PROP_VALUE_MAX - 1] = 0;
    
    // 处理控制属性
    if (android::base::StartsWith(name, "ctl.")) {
        handle_control_message(name + 4, value);
        if (!legacy_protocol) {
            socket.SendUint32(PROP_SUCCESS);
        }
        return;
    }
    
    // 权限检查
    char* source_ctx = nullptr;
    if (getpeercon(socket.socket(), &source_ctx) < 0) {
        socket.SendUint32(PROP_ERROR_PERMISSION_DENIED);
        return;
    }
    
    // SeLinux权限检查
    if (!check_mac_perms(name, source_ctx)) {
        socket.SendUint32(PROP_ERROR_PERMISSION_DENIED);
        freecon(source_ctx);
        return;
    }
    
    freecon(source_ctx);
    
    // 设置属性
    uint32_t result = property_set(name, value);
    
    // 返回结果
    if (!legacy_protocol) {
        socket.SendUint32(result);
    }
}
```

#### 2.5.2 属性设置实现

```c++
// 属性设置实现
uint32_t property_set(const char *name, const char *value) {
    // 检查属性名长度
    size_t namelen = strlen(name);
    if (namelen >= PROP_NAME_MAX) {
        return PROP_ERROR_INVALID_NAME;
    }
    
    // 检查属性值长度
    size_t valuelen = strlen(value);
    if (valuelen >= PROP_VALUE_MAX) {
        return PROP_ERROR_INVALID_VALUE;
    }
    
    // 检查只读属性
    if (strncmp(name, "ro.", 3) == 0) {
        return PROP_ERROR_READ_ONLY_PROPERTY;
    }
    
    // 查找属性
    prop_info *pi = find_property(name);
    
    if (pi != 0) {
        // 更新现有属性
        if (!strcmp(pi->value, value)) {
            // 值未改变
            return PROP_SUCCESS;
        }
        
        // 更新属性值
        update_prop_info(pi, name, value);
    } else {
        // 创建新属性
        pi = alloc_prop_info(name, value);
        if (pi == 0) {
            return PROP_ERROR_SET_FAILED;
        }
    }
    
    // 持久化处理
    if (strncmp(name, "persist.", 8) == 0) {
        persist_property(name, value);
    }
    
    // 通知属性变更
    property_changed(name, value);
    
    return PROP_SUCCESS;
}
```

### 2.6 属性变更通知流程

#### 2.6.1 变更通知机制

```c++
// 属性变更通知
void property_changed(const char *name, const char *value) {
    // 通知所有监听者
    if (g_property_change_callback) {
        g_property_change_callback(name, value);
    }
    
    // 通知Java层
    if (g_java_vm) {
        JNIEnv* env;
        if (g_java_vm->GetEnv(reinterpret_cast<void**>(&env), JNI_VERSION_1_4) == JNI_OK) {
            // 调用Java回调
            ScopedLocalRef<jclass> systemPropertiesClass(env, 
                env->FindClass("android/os/SystemProperties"));
            jmethodID method = env->GetStaticMethodID(systemPropertiesClass.get(), 
                                                      "property_changed_callback", 
                                                      "(Ljava/lang/String;Ljava/lang/String;)V");
            if (method) {
                ScopedLocalRef<jstring> nameJ(env, env->NewStringUTF(name));
                ScopedLocalRef<jstring> valueJ(env, env->NewStringUTF(value));
                env->CallStaticVoidMethod(systemPropertiesClass.get(), method, 
                                          nameJ.get(), valueJ.get());
            }
        }
    }
}
```

#### 2.6.2 Java层回调处理

```java
// SystemProperties.java中的回调处理
private static void callChangeCallbacks() {
    synchronized (sChangeCallbacks) {
        if (sChangeCallbacks != null) {
            final int N = sChangeCallbacks.size();
            for (int i = 0; i < N; i++) {
                sChangeCallbacks.get(i).run();
            }
        }
    }
}

// 属性变更回调
private static void property_changed_callback(String name, String value) {
    // 清除缓存
    clearCache(name);
    
    // 执行变更回调
    callChangeCallbacks();
}
```

## 3. 权限检查流程

### 3.1 SeLinux权限检查

```c++
// SeLinux权限检查
static bool check_mac_perms(const char *name, char *sctx) {
    // 获取属性上下文
    char* tctx = nullptr;
    if (!get_property_context(name, &tctx)) {
        return false;
    }
    
    // 检查权限
    bool has_access = (selinux_check_access(sctx, tctx, "property_service", "set", nullptr) == 0);
    
    freecon(tctx);
    return has_access;
}

// 获取属性上下文
static bool get_property_context(const char* name, char** tctx) {
    // 查找属性上下文
    const char* remaining_ctx = nullptr;
    if (selabel_lookup(property_sehandle, &remaining_ctx, name, 1) != 0) {
        return false;
    }
    
    *tctx = strdup(remaining_ctx);
    return true;
}
```

### 3.2 权限配置

#### 3.2.1 属性类型定义

```policy
// property.te
type system_prop, property_type;
type default_prop, property_type;
type radio_prop, property_type;
type debug_prop, property_type;
type log_prop, property_type;
```

#### 3.2.2 属性上下文映射

```policy
// property_contexts
system.                u:object_r:system_prop:s0
default.               u:object_r:default_prop:s0
radio.                 u:object_r:radio_prop:s0
debug.                 u:object_r:debug_prop:s0
log.                   u:object_r:log_prop:s0
```

#### 3.2.3 权限授予

```policy
// system_app.te
allow system_app system_prop:property_service set;
allow system_app default_prop:property_service set;
allow system_app radio_prop:property_service set;
```

## 4. 持久化流程

### 4.1 持久化属性写入

```c++
// 持久化属性
static void persist_property(const char *name, const char *value) {
    // 构建文件路径
    char path[PATH_MAX];
    snprintf(path, sizeof(path), "/data/property/%s", name);
    
    // 写入属性值
    int fd = open(path, O_CREAT | O_WRONLY | O_TRUNC | O_NOFOLLOW | O_CLOEXEC, 0600);
    if (fd < 0) {
        ALOGE("Failed to open persistent property file '%s': %s", path, strerror(errno));
        return;
    }
    
    ssize_t len = strlen(value);
    if (write(fd, value, len) != len) {
        ALOGE("Failed to write persistent property '%s': %s", path, strerror(errno));
    }
    
    close(fd);
}
```

### 4.2 持久化属性读取

```c++
// 读取持久化属性
static bool read_persistent_property(const char *name, char *value) {
    // 构建文件路径
    char path[PATH_MAX];
    snprintf(path, sizeof(path), "/data/property/%s", name);
    
    // 读取属性值
    int fd = open(path, O_RDONLY | O_NOFOLLOW | O_CLOEXEC);
    if (fd < 0) {
        return false;
    }
    
    ssize_t len = read(fd, value, PROP_VALUE_MAX - 1);
    close(fd);
    
    if (len <= 0) {
        return false;
    }
    
    value[len] = '\0';
    return true;
}
```

## 5. 性能优化流程

### 5.1 缓存机制

```java
// SystemProperties.java中的缓存实现
public static String get(String key, String def) {
    if (TRACK_KEYS) trackKey(key);
    
    synchronized (sCacheLock) {
        // 检查缓存
        String value = sCache.get(key);
        if (value != null) {
            return value;
        }
        
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
```

### 5.2 批量操作

```c++
// 批量属性获取
int __system_property_get_multiple(const char **names, char **values, int count) {
    int found = 0;
    
    for (int i = 0; i < count; i++) {
        const prop_info *pi = __system_property_find(names[i]);
        if (pi != 0) {
            __system_property_read(pi, NULL, values[i]);
            found++;
        } else {
            values[i][0] = '\0';
        }
    }
    
    return found;
}
```

## 6. 错误处理流程

### 6.1 错误码处理

```c++
// 错误码处理
static void handle_property_set_error(SocketConnection& socket, uint32_t error_code) {
    switch (error_code) {
        case PROP_ERROR_READ_ONLY_PROPERTY:
            ALOGW("Attempt to set read-only property");
            break;
        case PROP_ERROR_INVALID_NAME:
            ALOGW("Invalid property name");
            break;
        case PROP_ERROR_INVALID_VALUE:
            ALOGW("Invalid property value");
            break;
        case PROP_ERROR_PERMISSION_DENIED:
            ALOGW("Permission denied");
            break;
        case PROP_ERROR_SET_FAILED:
            ALOGW("Failed to set property");
            break;
        default:
            ALOGW("Unknown error code: 0x%x", error_code);
            break;
    }
    
    // 返回错误码
    socket.SendUint32(error_code);
}
```

### 6.2 异常恢复

```c++
// 异常恢复
static void recover_property_area() {
    // 关闭属性区域
    if (__system_property_area__) {
        munmap(__system_property_area__, pa_size);
        __system_property_area__ = NULL;
    }
    
    // 重新初始化属性区域
    if (__system_property_area_init()) {
        ALOGE("Failed to recover property area");
        return;
    }
    
    // 重新加载属性
    load_default_properties();
    load_persistent_properties();
}
```