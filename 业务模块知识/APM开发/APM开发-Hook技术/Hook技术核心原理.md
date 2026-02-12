# Hook技术核心原理

## 1. Hook技术概述

### 1.1 Hook技术定义与分类

**Hook定义**：Hook（钩子）技术是一种通过拦截和修改程序执行流程的技术，用于监控、修改或扩展程序行为。

**技术分类**：
```
Hook技术
├── Java层Hook
│   ├── 静态代理
│   ├── 动态代理
│   ├── 反射Hook
│   ├── ASM字节码操作
│   └── ClassLoader动态加载
├── Native层Hook
│   ├── PLT/GOT Hook
│   ├── Inline Hook
│   ├── Trap Hook
│   └── LD_PRELOAD Hook
└── 系统层Hook
    ├── 系统调用Hook
    ├── 内核模块Hook
    └── 调试器Hook
```

### 1.2 Hook技术应用场景

#### 1.2.1 APM监控场景
```java
// 性能监控Hook示例
public class PerformanceHook {
    // Hook关键方法，记录执行时间
    public static void hookMethod(String className, String methodName) {
        // 在方法入口插入计时开始
        // 在方法出口插入计时结束
        // 计算并记录方法执行时间
    }
    
    // Hook系统调用，监控IO性能
    public static void hookSystemCalls() {
        // Hook open/read/write等系统调用
        // 记录调用次数、数据量、耗时
    }
}
```

#### 1.2.2 安全检测场景
```java
// 安全检测Hook示例
public class SecurityHook {
    // Hook加密算法调用
    public static void hookCryptoMethods() {
        // 监控密钥使用情况
        // 检测弱加密算法
        // 记录敏感数据访问
    }
    
    // Hook网络请求
    public static void hookNetworkRequests() {
        // 监控HTTP/HTTPS请求
        // 检测敏感信息传输
        // 拦截恶意请求
    }
}
```

## 2. Java层Hook技术

### 2.1 反射Hook技术

#### 2.1.1 基础反射Hook
```java
public class ReflectionHook {
    
    // Hook实例方法
    public static void hookInstanceMethod(Object target, String methodName, 
                                         Class<?>[] parameterTypes, MethodHook callback) {
        try {
            Method originalMethod = target.getClass().getDeclaredMethod(methodName, parameterTypes);
            originalMethod.setAccessible(true);
            
            // 创建代理方法
            Method hookedMethod = createHookedMethod(originalMethod, callback);
            
            // 替换原方法
            replaceMethod(target, originalMethod, hookedMethod);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
    
    private static Method createHookedMethod(Method original, MethodHook callback) {
        // 使用动态代理或字节码技术创建Hook方法
        return ...;
    }
}

// Hook回调接口
public interface MethodHook {
    Object beforeHook(Object obj, Object[] args);
    Object afterHook(Object obj, Object[] args, Object result);
}
```

#### 2.1.2 实战案例：监控Activity生命周期
```java
public class ActivityLifecycleHook {
    
    public static void hookActivityLifecycle() {
        try {
            // 获取ActivityThread实例
            Class<?> activityThreadClass = Class.forName("android.app.ActivityThread");
            Method currentActivityThreadMethod = activityThreadClass.getDeclaredMethod("currentActivityThread");
            Object activityThread = currentActivityThreadMethod.invoke(null);
            
            // 获取mH Handler
            Field mHField = activityThreadClass.getDeclaredField("mH");
            mHField.setAccessible(true);
            Handler mH = (Handler) mHField.get(activityThread);
            
            // Hook Handler的dispatchMessage方法
            hookHandlerDispatchMessage(mH);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
    
    private static void hookHandlerDispatchMessage(Handler handler) {
        try {
            Field callbackField = Handler.class.getDeclaredField("mCallback");
            callbackField.setAccessible(true);
            
            // 设置自定义Callback
            Handler.Callback originalCallback = (Handler.Callback) callbackField.get(handler);
            Handler.Callback hookedCallback = new HookedCallback(originalCallback);
            callbackField.set(handler, hookedCallback);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
    
    static class HookedCallback implements Handler.Callback {
        private final Handler.Callback original;
        
        public HookedCallback(Handler.Callback original) {
            this.original = original;
        }
        
        @Override
        public boolean handleMessage(Message msg) {
            // 监控Activity生命周期消息
            if (msg.what == 100 || msg.what == 107 || msg.what == 109) { // LAUNCH_ACTIVITY等
                logActivityLifecycle(msg);
            }
            
            // 调用原始处理逻辑
            return original != null && original.handleMessage(msg);
        }
        
        private void logActivityLifecycle(Message msg) {
            // 记录Activity生命周期事件
            Log.d("ActivityHook", "Activity lifecycle event: " + msg.what);
        }
    }
}
```

### 2.2 ASM字节码Hook技术

#### 2.2.1 ASM基础使用
```java
public class ASMHook {
    
    // 使用ASM修改字节码
    public static byte[] hookMethod(byte[] originalClassBytes, String methodName, 
                                   String methodDesc) {
        ClassReader classReader = new ClassReader(originalClassBytes);
        ClassWriter classWriter = new ClassWriter(ClassWriter.COMPUTE_MAXS);
        
        ClassVisitor classVisitor = new ClassVisitor(Opcodes.ASM7, classWriter) {
            @Override
            public MethodVisitor visitMethod(int access, String name, String descriptor, 
                                           String signature, String[] exceptions) {
                MethodVisitor mv = super.visitMethod(access, name, descriptor, signature, exceptions);
                
                if (name.equals(methodName) && descriptor.equals(methodDesc)) {
                    // 对目标方法进行Hook
                    return new MethodHookVisitor(mv, access, name, descriptor);
                }
                
                return mv;
            }
        };
        
        classReader.accept(classVisitor, ClassReader.EXPAND_FRAMES);
        return classWriter.toByteArray();
    }
}

// 方法Hook访问器
class MethodHookVisitor extends MethodVisitor {
    private final String methodName;
    
    public MethodHookVisitor(MethodVisitor mv, int access, String name, String desc) {
        super(Opcodes.ASM7, mv);
        this.methodName = name;
    }
    
    @Override
    public void visitCode() {
        // 在方法开始处插入Hook代码
        mv.visitMethodInsn(Opcodes.INVOKESTATIC, "com/example/HookManager", 
                          "onMethodEnter", "(Ljava/lang/String;)V", false);
        mv.visitLdcInsn(methodName);
        
        super.visitCode();
    }
    
    @Override
    public void visitInsn(int opcode) {
        // 在RETURN指令前插入Hook代码
        if (opcode >= Opcodes.IRETURN && opcode <= Opcodes.RETURN) {
            mv.visitMethodInsn(Opcodes.INVOKESTATIC, "com/example/HookManager", 
                              "onMethodExit", "(Ljava/lang/String;)V", false);
            mv.visitLdcInsn(methodName);
        }
        
        super.visitInsn(opcode);
    }
}
```

#### 2.2.2 实战案例：性能监控Hook
```java
public class PerformanceASMHook {
    
    // Hook所有耗时方法
    public static byte[] hookPerformanceMethods(byte[] classBytes) {
        ClassReader cr = new ClassReader(classBytes);
        ClassWriter cw = new ClassWriter(ClassWriter.COMPUTE_MAXS);
        
        ClassVisitor cv = new ClassVisitor(Opcodes.ASM7, cw) {
            @Override
            public MethodVisitor visitMethod(int access, String name, String desc, 
                                           String signature, String[] exceptions) {
                MethodVisitor mv = super.visitMethod(access, name, desc, signature, exceptions);
                
                // 只Hook非native、非抽象方法
                if ((access & Opcodes.ACC_NATIVE) == 0 && 
                    (access & Opcodes.ACC_ABSTRACT) == 0) {
                    return new PerformanceMethodVisitor(mv, access, name, desc);
                }
                
                return mv;
            }
        };
        
        cr.accept(cv, 0);
        return cw.toByteArray();
    }
}

class PerformanceMethodVisitor extends MethodVisitor {
    private final String methodName;
    private final Label startLabel = new Label();
    private final Label endLabel = new Label();
    
    public PerformanceMethodVisitor(MethodVisitor mv, int access, String name, String desc) {
        super(Opcodes.ASM7, mv);
        this.methodName = name;
    }
    
    @Override
    public void visitCode() {
        // 方法开始：记录开始时间
        mv.visitLabel(startLabel);
        mv.visitMethodInsn(Opcodes.INVOKESTATIC, "java/lang/System", "nanoTime", "()J", false);
        mv.visitVarInsn(Opcodes.LSTORE, 0); // 存储到局部变量0
        
        super.visitCode();
    }
    
    @Override
    public void visitInsn(int opcode) {
        if (opcode >= Opcodes.IRETURN && opcode <= Opcodes.RETURN) {
            // 方法结束：计算耗时并记录
            mv.visitLabel(endLabel);
            mv.visitMethodInsn(Opcodes.INVOKESTATIC, "java/lang/System", "nanoTime", "()J", false);
            mv.visitVarInsn(Opcodes.LLOAD, 0); // 加载开始时间
            mv.visitInsn(Opcodes.LSUB); // 计算耗时
            mv.visitVarInsn(Opcodes.LSTORE, 2); // 存储耗时
            
            // 调用性能记录方法
            mv.visitVarInsn(Opcodes.LLOAD, 2);
            mv.visitLdcInsn(methodName);
            mv.visitMethodInsn(Opcodes.INVOKESTATIC, "com/example/PerformanceRecorder", 
                              "recordMethodTime", "(JLjava/lang/String;)V", false);
        }
        
        super.visitInsn(opcode);
    }
    
    @Override
    public void visitMaxs(int maxStack, int maxLocals) {
        // 调整局部变量数量
        super.visitMaxs(maxStack + 4, maxLocals + 3);
    }
}
```

### 2.3 ClassLoader动态加载Hook

#### 2.3.1 自定义ClassLoader实现
```java
public class HookClassLoader extends ClassLoader {
    private final Map<String, byte[]> hookedClasses = new HashMap<>();
    
    public HookClassLoader(ClassLoader parent) {
        super(parent);
    }
    
    public void hookClass(String className, byte[] hookedClassBytes) {
        hookedClasses.put(className, hookedClassBytes);
    }
    
    @Override
    protected Class<?> findClass(String name) throws ClassNotFoundException {
        // 检查是否有Hook的类
        byte[] hookedBytes = hookedClasses.get(name);
        if (hookedBytes != null) {
            return defineClass(name, hookedBytes, 0, hookedBytes.length);
        }
        
        return super.findClass(name);
    }
    
    @Override
    public Class<?> loadClass(String name) throws ClassNotFoundException {
        // 优先使用Hook的类
        if (hookedClasses.containsKey(name)) {
            return findClass(name);
        }
        
        return super.loadClass(name);
    }
}
```

#### 2.3.2 实战案例：插件化Hook
```java
public class PluginHookManager {
    
    // 替换应用的ClassLoader
    public static void hookApplicationClassLoader(Context context) {
        try {
            // 获取当前ClassLoader
            ClassLoader originalClassLoader = context.getClassLoader();
            
            // 创建自定义ClassLoader
            HookClassLoader hookClassLoader = new HookClassLoader(originalClassLoader);
            
            // 替换ClassLoader
            replaceClassLoader(context, hookClassLoader);
            
            // 预加载Hook类
            preloadHookedClasses(hookClassLoader);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
    
    private static void replaceClassLoader(Context context, ClassLoader newClassLoader) {
        try {
            // 通过反射替换BaseDexClassLoader的pathList
            Field pathListField = findField(context.getClassLoader(), "pathList");
            Object pathList = pathListField.get(context.getClassLoader());
            
            // 创建新的PathList
            Object newPathList = createNewPathList(pathList, newClassLoader);
            pathListField.set(context.getClassLoader(), newPathList);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
    
    private static void preloadHookedClasses(HookClassLoader classLoader) {
        // 预加载需要Hook的类
        Map<String, byte[]> hookedClasses = loadHookedClasses();
        
        for (Map.Entry<String, byte[]> entry : hookedClasses.entrySet()) {
            classLoader.hookClass(entry.getKey(), entry.getValue());
        }
    }
}
```

## 3. Native层Hook技术

### 3.1 PLT/GOT Hook技术

#### 3.1.1 PLT/GOT原理
```c
// PLT（Procedure Linkage Table）和GOT（Global Offset Table）关系
// 函数调用流程：call printf@plt → PLT → GOT → 真实函数地址

// PLT表项示例
printf@plt:
    jmp *GOT[printf_index]  ; 跳转到GOT中存储的地址
    push printf_index        ; 重定位索引
    jmp .plt0               ; 跳转到动态链接器

// GOT表示例
GOT[printf_index] = address_of_printf
```

#### 3.1.2 PLT Hook实现
```c
#include <stdio.h>
#include <dlfcn.h>
#include <sys/mman.h>
#include <unistd.h>

// 原始函数指针
typedef int (*original_printf_t)(const char *format, ...);
original_printf_t original_printf = NULL;

// Hook函数
int hooked_printf(const char *format, ...) {
    // 在调用原始函数前执行自定义逻辑
    printf("[HOOK] printf called with format: %s\n", format);
    
    // 调用原始函数
    va_list args;
    va_start(args, format);
    int result = original_printf(format, args);
    va_end(args);
    
    return result;
}

// PLT Hook函数
void hook_plt(const char *lib_name, const char *symbol_name, void *hook_func, void **original_func) {
    // 1. 获取目标库的句柄
    void *handle = dlopen(lib_name, RTLD_LAZY);
    if (!handle) {
        printf("Failed to open library: %s\n", dlerror());
        return;
    }
    
    // 2. 获取原始函数地址
    *original_func = dlsym(handle, symbol_name);
    if (!*original_func) {
        printf("Failed to find symbol: %s\n", dlerror());
        return;
    }
    
    // 3. 获取GOT表地址
    ElfW(Addr) got_addr = find_got_address(lib_name, symbol_name);
    if (got_addr == 0) {
        printf("Failed to find GOT address\n");
        return;
    }
    
    // 4. 修改内存页权限
    size_t page_size = sysconf(_SC_PAGESIZE);
    ElfW(Addr) page_start = got_addr & ~(page_size - 1);
    
    if (mprotect((void*)page_start, page_size, PROT_READ | PROT_WRITE | PROT_EXEC) == -1) {
        printf("Failed to change memory protection\n");
        return;
    }
    
    // 5. 修改GOT表项
    *(void **)got_addr = hook_func;
    
    // 6. 恢复内存页权限
    mprotect((void*)page_start, page_size, PROT_READ | PROT_EXEC);
    
    printf("Successfully hooked %s\n", symbol_name);
}

// 查找GOT地址（简化版）
ElfW(Addr) find_got_address(const char *lib_name, const char *symbol_name) {
    // 实际实现需要解析ELF文件，这里返回简化值
    return 0x12345678; // 示例地址
}

int main() {
    // Hook printf函数
    hook_plt("libc.so", "printf", (void*)hooked_printf, (void**)&original_printf);
    
    // 测试Hook效果
    printf("Hello, World!\n");
    
    return 0;
}
```

### 3.2 Inline Hook技术

#### 3.2.1 Inline Hook原理
```c
// Inline Hook原理：直接修改函数开头的指令
// 原始函数：
original_function:
    push ebp
    mov ebp, esp
    sub esp, 0x10
    ...

// Hook后：
original_function:
    jmp hooked_function  ; 修改为跳转到Hook函数
    nop                 ; 填充指令（如果需要）
    nop
hooked_function:
    // 执行Hook逻辑
    // 调用原始函数（跳过被修改的指令）
    call original_function + 5  ; 跳过被修改的5字节
    // 后续处理
    ret
```

#### 3.2.2 Inline Hook实现
```c
#include <stdio.h>
#include <string.h>
#include <sys/mman.h>
#include <unistd.h>

// 跳转指令模板（x86）
unsigned char jmp_code[] = {
    0xE9, 0x00, 0x00, 0x00, 0x00  // jmp relative_offset
};

// 原始函数备份
unsigned char original_code[16];

// Hook函数
void hooked_function() {
    printf("[HOOK] Function hooked!\n");
    
    // 执行原始代码
    void (*original)() = (void(*)())original_code;
    original();
}

// Inline Hook函数
int inline_hook(void *target_func, void *hook_func) {
    // 1. 备份原始指令
    memcpy(original_code, target_func, sizeof(jmp_code));
    
    // 2. 计算跳转偏移
    uintptr_t relative_offset = (uintptr_t)hook_func - (uintptr_t)target_func - 5;
    
    // 3. 构造跳转指令
    unsigned char hook_code[sizeof(jmp_code)];
    memcpy(hook_code, jmp_code, sizeof(jmp_code));
    memcpy(hook_code + 1, &relative_offset, 4);
    
    // 4. 修改内存权限
    size_t page_size = sysconf(_SC_PAGESIZE);
    uintptr_t page_start = (uintptr_t)target_func & ~(page_size - 1);
    
    if (mprotect((void*)page_start, page_size, PROT_READ | PROT_WRITE | PROT_EXEC) == -1) {
        return -1;
    }
    
    // 5. 写入跳转指令
    memcpy(target_func, hook_code, sizeof(hook_code));
    
    // 6. 恢复内存权限
    mprotect((void*)page_start, page_size, PROT_READ | PROT_EXEC);
    
    return 0;
}

// 测试函数
void test_function() {
    printf("This is the original function.\n");
}

int main() {
    // Hook测试函数
    if (inline_hook(test_function, hooked_function) == 0) {
        printf("Inline hook successful!\n");
    } else {
        printf("Inline hook failed!\n");
    }
    
    // 调用被Hook的函数
    test_function();
    
    return 0;
}
```

### 3.3 实战案例：性能监控Native Hook

#### 3.3.1 监控malloc/free调用
```c
#include <malloc.h>
#include <dlfcn.h>
#include <stdio.h>

// 原始函数指针
typedef void* (*malloc_t)(size_t size);
typedef void (*free_t)(void* ptr);

malloc_t original_malloc = NULL;
free_t original_free = NULL;

// 内存分配统计
size_t total_allocated = 0;
size_t total_freed = 0;

// Hook的malloc函数
void* hooked_malloc(size_t size) {
    // 记录分配信息
    total_allocated += size;
    
    // 调用原始malloc
    void* ptr = original_malloc(size);
    
    printf("[MALLOC] Allocated %zu bytes, total: %zu\n", size, total_allocated);
    
    return ptr;
}

// Hook的free函数
void hooked_free(void* ptr) {
    if (ptr != NULL) {
        // 获取要释放的内存大小（需要特殊处理）
        size_t size = malloc_usable_size(ptr);
        total_freed += size;
        
        printf("[FREE] Freed %zu bytes, total freed: %zu\n", size, total_freed);
    }
    
    // 调用原始free
    original_free(ptr);
}

// 初始化Hook
void init_memory_hook() {
    // 获取原始函数地址
    original_malloc = (malloc_t)dlsym(RTLD_NEXT, "malloc");
    original_free = (free_t)dlsym(RTLD_NEXT, "free");
    
    // 使用LD_PRELOAD或PLT Hook替换函数
    // 这里简化处理，实际需要更复杂的Hook机制
}

// 获取内存使用统计
void print_memory_stats() {
    printf("Memory Statistics:\n");
    printf("Total allocated: %zu bytes\n", total_allocated);
    printf("Total freed: %zu bytes\n", total_freed);
    printf("Current usage: %zu bytes\n", total_allocated - total_freed);
}
```

#### 3.3.2 监控系统调用
```c
#include <sys/syscall.h>
#include <unistd.h>
#include <stdio.h>

// 系统调用统计
unsigned long syscall_count[__NR_syscall_max] = {0};

// Hook的系统调用入口
long hooked_syscall(long number, ...) {
    // 记录系统调用
    if (number < __NR_syscall_max) {
        syscall_count[number]++;
    }
    
    // 获取系统调用参数（简化处理）
    va_list args;
    va_start(args, number);
    
    // 根据系统调用号处理不同的参数
    switch (number) {
        case SYS_open:
            {
                const char* pathname = va_arg(args, const char*);
                int flags = va_arg(args, int);
                printf("[SYSCALL] open: %s, flags: %d\n", pathname, flags);
            }
            break;
            
        case SYS_read:
            {
                int fd = va_arg(args, int);
                void* buf = va_arg(args, void*);
                size_t count = va_arg(args, size_t);
                printf("[SYSCALL] read: fd=%d, size=%zu\n", fd, count);
            }
            break;
            
        default:
            printf("[SYSCALL] number: %ld\n", number);
            break;
    }
    
    va_end(args);
    
    // 调用原始系统调用
    // 实际实现需要更复杂的参数传递
    return 0; // 简化返回
}

// 安装系统调用Hook
void install_syscall_hook() {
    // 使用Inline Hook或PLT Hook替换syscall函数
    // 这里展示概念，实际实现更复杂
}

// 打印系统调用统计
void print_syscall_stats() {
    printf("System Call Statistics:\n");
    for (int i = 0; i < __NR_syscall_max; i++) {
        if (syscall_count[i] > 0) {
            printf("syscall[%d]: %lu calls\n", i, syscall_count[i]);
        }
    }
}
```

## 4. Hook技术实战应用

### 4.1 APM性能监控系统

#### 4.1.1 完整的Hook监控框架
```java
public class APMHookFramework {
    
    private static APMHookFramework instance;
    private final Map<String, MethodHook> methodHooks = new ConcurrentHashMap<>();
    private final Map<String, NativeHook> nativeHooks = new ConcurrentHashMap<>();
    
    public static APMHookFramework getInstance() {
        if (instance == null) {
            synchronized (APMHookFramework.class) {
                if (instance == null) {
                    instance = new APMHookFramework();
                }
            }
        }
        return instance;
    }
    
    // 初始化Hook框架
    public void initialize() {
        // 初始化Java层Hook
        initJavaHooks();
        
        // 初始化Native层Hook
        initNativeHooks();
        
        // 启动监控线程
        startMonitoringThread();
    }
    
    private void initJavaHooks() {
        // Hook关键系统方法
        hookSystemMethods();
        
        // Hook应用自定义方法
        hookApplicationMethods();
        
        // Hook第三方库方法
        hookThirdPartyMethods();
    }
    
    private void initNativeHooks() {
        // 加载Native Hook库
        System.loadLibrary("apm_native_hook");
        
        // 初始化Native Hook
        nativeInitHooks();
    }
    
    // 添加方法Hook
    public void addMethodHook(String className, String methodName, MethodHookCallback callback) {
        String key = className + "." + methodName;
        methodHooks.put(key, new MethodHook(className, methodName, callback));
        
        // 实际安装Hook
        installMethodHook(className, methodName);
    }
    
    // 添加Native Hook
    public void addNativeHook(String libraryName, String symbolName, NativeHookCallback callback) {
        String key = libraryName + "." + symbolName;
        nativeHooks.put(key, new NativeHook(libraryName, symbolName, callback));
        
        // 实际安装Native Hook
        installNativeHook(libraryName, symbolName);
    }
    
    // 性能数据收集
    public PerformanceData collectPerformanceData() {
        PerformanceData data = new PerformanceData();
        
        // 收集Java层性能数据
        data.setJavaMetrics(collectJavaMetrics());
        
        // 收集Native层性能数据
        data.setNativeMetrics(collectNativeMetrics());
        
        // 收集系统层性能数据
        data.setSystemMetrics(collectSystemMetrics());
        
        return data;
    }
}

// 性能数据结构
public class PerformanceData {
    private JavaMetrics javaMetrics;
    private NativeMetrics nativeMetrics;
    private SystemMetrics systemMetrics;
    
    // getter和setter方法
}

// Java层性能指标
public class JavaMetrics {
    private long totalMethodCalls;
    private long totalMethodTime;
    private Map<String, MethodStats> methodStats;
    private MemoryUsage memoryUsage;
    
    // getter和setter方法
}

// Native层性能指标
public class NativeMetrics {
    private long totalNativeCalls;
    private long totalNativeTime;
    private Map<String, NativeCallStats> nativeStats;
    private SystemCallStats systemCallStats;
    
    // getter和setter方法
}
```

### 4.2 安全检测系统

#### 4.2.1 敏感操作监控
```java
public class SecurityHookManager {
    
    // Hook加密操作
    public void hookCryptoOperations() {
        // Hook KeyGenerator
        hookMethod("javax.crypto.KeyGenerator", "generateKey", new MethodHookCallback() {
            @Override
            public void onMethodEnter(Object obj, Object[] args) {
                logCryptoOperation("KeyGenerator.generateKey", args);
            }
        });
        
        // Hook Cipher
        hookMethod("javax.crypto.Cipher", "doFinal", new MethodHookCallback() {
            @Override
            public void onMethodEnter(Object obj, Object[] args) {
                logCryptoOperation("Cipher.doFinal", args);
            }
        });
    }
    
    // Hook文件操作
    public void hookFileOperations() {
        // Hook FileInputStream
        hookMethod("java.io.FileInputStream", "read", new MethodHookCallback() {
            @Override
            public void onMethodEnter(Object obj, Object[] args) {
                logFileAccess("FileInputStream.read", obj, args);
            }
        });
        
        // Hook FileOutputStream
        hookMethod("java.io.FileOutputStream", "write", new MethodHookCallback() {
            @Override
            public void onMethodEnter(Object obj, Object[] args) {
                logFileAccess("FileOutputStream.write", obj, args);
            }
        });
    }
    
    // Hook网络操作
    public void hookNetworkOperations() {
        // Hook URLConnection
        hookMethod("java.net.URLConnection", "connect", new MethodHookCallback() {
            @Override
            public void onMethodEnter(Object obj, Object[] args) {
                logNetworkConnection((URLConnection) obj);
            }
        });
        
        // Hook HttpsURLConnection（SSL相关）
        hookMethod("javax.net.ssl.HttpsURLConnection", "getInputStream", new MethodHookCallback() {
            @Override
            public void onMethodEnter(Object obj, Object[] args) {
                checkSSLSecurity((HttpsURLConnection) obj);
            }
        });
    }
    
    private void logCryptoOperation(String operation, Object[] args) {
        SecurityLog.log("Crypto operation: " + operation);
        
        // 记录关键参数（注意脱敏）
        if (args != null && args.length > 0) {
            for (int i = 0; i < args.length; i++) {
                if (args[i] instanceof byte[]) {
                    byte[] data = (byte[]) args[i];
                    SecurityLog.log("Argument[" + i + "]: " + bytesToHex(data));
                }
            }
        }
    }
    
    private void checkSSLSecurity(HttpsURLConnection connection) {
        try {
            // 检查证书
            Certificate[] certificates = connection.getServerCertificates();
            if (certificates != null) {
                for (Certificate cert : certificates) {
                    checkCertificateValidity(cert);
                }
            }
            
            // 检查SSL协议版本
            String cipherSuite = connection.getCipherSuite();
            checkCipherSuiteSecurity(cipherSuite);
            
        } catch (Exception e) {
            SecurityLog.log("SSL security check failed: " + e.getMessage());
        }
    }
}
```

通过这套完整的Hook技术知识体系，您可以深入理解Java和Native层的Hook原理，并应用于实际的APM监控、安全检测等场景。