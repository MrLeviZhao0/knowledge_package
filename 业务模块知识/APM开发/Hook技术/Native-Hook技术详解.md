# Native Hook技术详解

## 1. Native Hook技术概述

### 1.1 Native Hook技术分类

**Native层Hook技术主要分为以下几种：**

```
Native Hook技术
├── PLT/GOT Hook
│   ├── 函数地址替换
│   ├── 延迟绑定拦截
│   └── 动态链接库Hook
├── Inline Hook
│   ├── 指令替换
│   ├── 跳转指令插入
│   └── 函数头修改
├── Trap Hook
│   ├── 断点Hook
│   ├── 信号处理Hook
│   └── 调试器Hook
└── LD_PRELOAD Hook
    ├── 动态库预加载
    ├── 符号覆盖
    └── 函数拦截
```

### 1.2 Native Hook技术应用场景

#### 1.2.1 系统性能监控
- **系统调用监控**：Hook系统调用，监控系统资源使用
- **内存分配跟踪**：Hook malloc/free等内存函数，检测内存泄漏
- **文件IO监控**：Hook文件操作函数，监控IO性能

#### 1.2.2 安全检测
- **API调用监控**：监控敏感API调用，检测恶意行为
- **代码注入检测**：检测动态代码注入行为
- **完整性校验**：验证关键函数是否被篡改

## 2. PLT/GOT Hook技术

### 2.1 PLT/GOT Hook原理

PLT（Procedure Linkage Table）和GOT（Global Offset Table）是ELF文件动态链接的关键数据结构。PLT/GOT Hook通过修改GOT表中的函数指针实现Hook。

#### 2.1.1 PLT/GOT结构

```c
// PLT表项结构
void plt_entry() {
    // 跳转到GOT表对应的地址
    jmp *got_entry
    push index
    jmp resolver
}

// GOT表结构
struct got_table {
    void* dynamic_linker_resolver;  // 动态链接器解析函数
    void* function_pointers[];      // 函数指针数组
};
```

### 2.2 PLT/GOT Hook实现

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <dlfcn.h>
#include <link.h>
#include <sys/mman.h>

// 原始函数指针类型定义
typedef int (*open_func_t)(const char*, int, ...);
typedef ssize_t (*read_func_t)(int, void*, size_t);
typedef ssize_t (*write_func_t)(int, const void*, size_t);

// 保存原始函数指针
static open_func_t original_open = NULL;
static read_func_t original_read = NULL;
static write_func_t original_write = NULL;

// Hook函数实现
int hooked_open(const char* pathname, int flags, ...) {
    va_list args;
    va_start(args, flags);
    mode_t mode = 0;
    if (flags & O_CREAT) {
        mode = va_arg(args, mode_t);
    }
    va_end(args);
    
    // 记录打开操作
    printf("[PLT Hook] open called: %s, flags: 0x%x\n", pathname, flags);
    
    long start_time = get_current_time_ns();
    int result = original_open(pathname, flags, mode);
    long end_time = get_current_time_ns();
    
    printf("[PLT Hook] open completed: fd=%d, time=%ld ns\n", 
           result, end_time - start_time);
    
    return result;
}

ssize_t hooked_read(int fd, void* buf, size_t count) {
    printf("[PLT Hook] read called: fd=%d, count=%zu\n", fd, count);
    
    long start_time = get_current_time_ns();
    ssize_t result = original_read(fd, buf, count);
    long end_time = get_current_time_ns();
    
    printf("[PLT Hook] read completed: result=%zd, time=%ld ns\n", 
           result, end_time - start_time);
    
    return result;
}

ssize_t hooked_write(int fd, const void* buf, size_t count) {
    printf("[PLT Hook] write called: fd=%d, count=%zu\n", fd, count);
    
    long start_time = get_current_time_ns();
    ssize_t result = original_write(fd, buf, count);
    long end_time = get_current_time_ns();
    
    printf("[PLT Hook] write completed: result=%zd, time=%ld ns\n", 
           result, end_time - start_time);
    
    return result;
}

// 获取GOT表项地址
void* get_got_address(const char* symbol_name) {
    // 通过dlopen获取模块信息
    void* handle = dlopen(NULL, RTLD_LAZY);
    if (!handle) {
        return NULL;
    }
    
    // 获取链接映射信息
    struct link_map* lm = NULL;
    if (dlinfo(handle, RTLD_DI_LINKMAP, &lm) != 0) {
        dlclose(handle);
        return NULL;
    }
    
    // 遍历动态段查找GOT表
    ElfW(Dyn)* dynamic = lm->l_ld;
    ElfW(Addr) got_addr = 0;
    
    for (; dynamic->d_tag != DT_NULL; dynamic++) {
        if (dynamic->d_tag == DT_PLTGOT) {
            got_addr = dynamic->d_un.d_ptr;
            break;
        }
    }
    
    dlclose(handle);
    return (void*)got_addr;
}

// 修改内存页权限
int make_memory_writable(void* addr, size_t length) {
    long page_size = sysconf(_SC_PAGESIZE);
    void* page_start = (void*)((long)addr & ~(page_size - 1));
    
    if (mprotect(page_start, page_size, PROT_READ | PROT_WRITE | PROT_EXEC) == -1) {
        perror("mprotect");
        return -1;
    }
    
    return 0;
}

// 应用PLT Hook
int apply_plt_hook(const char* symbol_name, void* hook_func, void** original_func) {
    // 获取符号地址
    void* symbol_addr = dlsym(RTLD_NEXT, symbol_name);
    if (!symbol_addr) {
        printf("Symbol not found: %s\n", symbol_name);
        return -1;
    }
    
    // 获取GOT表地址（简化版，实际需要更复杂的查找）
    void* got_entry = get_got_address(symbol_name);
    if (!got_entry) {
        printf("GOT entry not found for: %s\n", symbol_name);
        return -1;
    }
    
    // 保存原始函数指针
    *original_func = *(void**)got_entry;
    
    // 修改内存权限
    if (make_memory_writable(got_entry, sizeof(void*)) != 0) {
        return -1;
    }
    
    // 替换GOT表项
    *(void**)got_entry = hook_func;
    
    printf("PLT Hook applied: %s -> %p (original: %p)\n", 
           symbol_name, hook_func, *original_func);
    
    return 0;
}

// 初始化Hook
void init_plt_hooks() {
    printf("Initializing PLT/GOT Hooks...\n");
    
    // Hook系统调用
    apply_plt_hook("open", (void*)hooked_open, (void**)&original_open);
    apply_plt_hook("read", (void*)hooked_read, (void**)&original_read);
    apply_plt_hook("write", (void*)hooked_write, (void**)&original_write);
    
    printf("PLT/GOT Hooks initialized successfully\n");
}

// 工具函数
long get_current_time_ns() {
    struct timespec ts;
    clock_gettime(CLOCK_MONOTONIC, &ts);
    return ts.tv_sec * 1000000000L + ts.tv_nsec;
}
```

### 2.3 实战案例：文件IO性能监控

```c
// 文件IO监控Hook
#include "plt_hook.h"

// IO统计数据结构
typedef struct {
    long total_read_bytes;
    long total_write_bytes;
    long read_operations;
    long write_operations;
    long total_read_time;
    long total_write_time;
} io_stats_t;

static io_stats_t global_io_stats = {0};

// 增强的Hook函数
int hooked_open_enhanced(const char* pathname, int flags, ...) {
    va_list args;
    va_start(args, flags);
    mode_t mode = 0;
    if (flags & O_CREAT) {
        mode = va_arg(args, mode_t);
    }
    va_end(args);
    
    long start_time = get_current_time_ns();
    int result = original_open(pathname, flags, mode);
    long end_time = get_current_time_ns();
    
    // 记录到APM系统
    record_file_open(pathname, flags, result, end_time - start_time);
    
    return result;
}

ssize_t hooked_read_enhanced(int fd, void* buf, size_t count) {
    long start_time = get_current_time_ns();
    ssize_t result = original_read(fd, buf, count);
    long end_time = get_current_time_ns();
    
    // 更新统计信息
    __sync_fetch_and_add(&global_io_stats.total_read_bytes, result);
    __sync_fetch_and_add(&global_io_stats.read_operations, 1);
    __sync_fetch_and_add(&global_io_stats.total_read_time, end_time - start_time);
    
    // 记录到APM系统
    record_file_read(fd, count, result, end_time - start_time);
    
    return result;
}

ssize_t hooked_write_enhanced(int fd, const void* buf, size_t count) {
    long start_time = get_current_time_ns();
    ssize_t result = original_write(fd, buf, count);
    long end_time = get_current_time_ns();
    
    // 更新统计信息
    __sync_fetch_and_add(&global_io_stats.total_write_bytes, result);
    __sync_fetch_and_add(&global_io_stats.write_operations, 1);
    __sync_fetch_and_add(&global_io_stats.total_write_time, end_time - start_time);
    
    // 记录到APM系统
    record_file_write(fd, count, result, end_time - start_time);
    
    return result;
}

// APM记录函数
void record_file_open(const char* pathname, int flags, int fd, long duration) {
    // 发送到APM后端系统
    printf("[APM] File Open: path=%s, fd=%d, flags=0x%x, time=%ld ns\n", 
           pathname, fd, flags, duration);
}

void record_file_read(int fd, size_t requested, ssize_t actual, long duration) {
    printf("[APM] File Read: fd=%d, requested=%zu, actual=%zd, time=%ld ns\n", 
           fd, requested, actual, duration);
}

void record_file_write(int fd, size_t size, ssize_t actual, long duration) {
    printf("[APM] File Write: fd=%d, size=%zu, actual=%zd, time=%ld ns\n", 
           fd, size, actual, duration);
}

// 获取IO统计信息
void get_io_stats(io_stats_t* stats) {
    memcpy(stats, &global_io_stats, sizeof(io_stats_t));
}
```

## 3. Inline Hook技术

### 3.1 Inline Hook原理

Inline Hook通过直接修改目标函数的机器指令，在函数开头插入跳转指令，跳转到Hook函数。

#### 3.1.1 Inline Hook步骤

1. **备份原始指令**：保存被修改的指令
2. **构造跳转指令**：创建跳转到Hook函数的指令
3. **修改目标函数**：用跳转指令替换目标函数开头
4. **执行原始逻辑**：在Hook函数中调用备份的指令

### 3.2 Inline Hook实现

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/mman.h>
#include <unistd.h>

// 跳转指令结构
#pragma pack(push, 1)
typedef struct {
    unsigned char opcode;      // 跳转操作码
    unsigned int offset;       // 偏移量
} jmp_instruction_t;
#pragma pack(pop)

// Hook信息结构
typedef struct {
    void* target_func;         // 目标函数地址
    void* hook_func;           // Hook函数地址
    void* trampoline;          // 蹦床函数地址
    unsigned char original_code[16]; // 原始指令备份
    size_t patch_size;         // 需要patch的指令大小
} inline_hook_t;

// 获取需要patch的指令长度
size_t get_patch_size(void* func_addr) {
    // 简化实现，实际需要反汇编分析
    // 这里返回一个固定值，实际应该根据指令分析
    return 8; // 通常需要覆盖至少5字节的指令
}

// 创建蹦床函数（用于执行原始指令）
void* create_trampoline(void* original_func, const unsigned char* saved_code, size_t code_size) {
    // 分配可执行内存
    void* trampoline = mmap(NULL, code_size + sizeof(jmp_instruction_t),
                           PROT_READ | PROT_WRITE | PROT_EXEC,
                           MAP_PRIVATE | MAP_ANONYMOUS, -1, 0);
    if (trampoline == MAP_FAILED) {
        return NULL;
    }
    
    // 复制原始指令
    memcpy(trampoline, saved_code, code_size);
    
    // 添加跳转回原函数的指令
    jmp_instruction_t* jmp = (jmp_instruction_t*)((char*)trampoline + code_size);
    jmp->opcode = 0xE9; // JMP指令
    jmp->offset = (char*)original_func + code_size - (char*)jmp - 5;
    
    return trampoline;
}

// 构造跳转指令
void build_jump_instruction(void* from, void* to, unsigned char* buffer) {
    jmp_instruction_t* jmp = (jmp_instruction_t*)buffer;
    jmp->opcode = 0xE9; // JMP相对跳转
    jmp->offset = (unsigned int)((char*)to - (char*)from - 5);
}

// 应用Inline Hook
int apply_inline_hook(inline_hook_t* hook) {
    // 获取需要patch的指令长度
    hook->patch_size = get_patch_size(hook->target_func);
    
    // 备份原始指令
    memcpy(hook->original_code, hook->target_func, hook->patch_size);
    
    // 创建蹦床函数
    hook->trampoline = create_trampoline(
        (char*)hook->target_func + hook->patch_size,
        hook->original_code, hook->patch_size);
    
    if (!hook->trampoline) {
        return -1;
    }
    
    // 修改内存权限
    long page_size = sysconf(_SC_PAGESIZE);
    void* page_start = (void*)((long)hook->target_func & ~(page_size - 1));
    
    if (mprotect(page_start, page_size, PROT_READ | PROT_WRITE | PROT_EXEC) == -1) {
        munmap(hook->trampoline, hook->patch_size + sizeof(jmp_instruction_t));
        return -1;
    }
    
    // 构造跳转指令
    unsigned char jump_code[16] = {0};
    build_jump_instruction(hook->target_func, hook->hook_func, jump_code);
    
    // 应用Hook
    memcpy(hook->target_func, jump_code, hook->patch_size);
    
    // 恢复内存权限（可选）
    mprotect(page_start, page_size, PROT_READ | PROT_EXEC);
    
    return 0;
}

// 移除Inline Hook
int remove_inline_hook(inline_hook_t* hook) {
    if (!hook->trampoline) {
        return -1;
    }
    
    // 修改内存权限
    long page_size = sysconf(_SC_PAGESIZE);
    void* page_start = (void*)((long)hook->target_func & ~(page_size - 1));
    
    if (mprotect(page_start, page_size, PROT_READ | PROT_WRITE | PROT_EXEC) == -1) {
        return -1;
    }
    
    // 恢复原始指令
    memcpy(hook->target_func, hook->original_code, hook->patch_size);
    
    // 恢复内存权限
    mprotect(page_start, page_size, PROT_READ | PROT_EXEC);
    
    // 释放蹦床函数内存
    munmap(hook->trampoline, hook->patch_size + sizeof(jmp_instruction_t));
    hook->trampoline = NULL;
    
    return 0;
}
```

### 3.3 实战案例：malloc/free内存监控

```c
// 内存分配监控Hook
#include "inline_hook.h"
#include <pthread.h>

// 内存统计数据结构
typedef struct {
    size_t total_allocated;
    size_t total_freed;
    size_t current_usage;
    size_t peak_usage;
    size_t allocation_count;
    size_t free_count;
    pthread_mutex_t mutex;
} memory_stats_t;

static memory_stats_t global_memory_stats = {0};

// 原始函数声明
typedef void* (*malloc_func_t)(size_t);
typedef void (*free_func_t)(void*);

static malloc_func_t original_malloc = NULL;
static free_func_t original_free = NULL;

// Hook的malloc函数
void* hooked_malloc(size_t size) {
    void* result = original_malloc(size);
    
    pthread_mutex_lock(&global_memory_stats.mutex);
    
    global_memory_stats.total_allocated += size;
    global_memory_stats.current_usage += size;
    global_memory_stats.allocation_count++;
    
    if (global_memory_stats.current_usage > global_memory_stats.peak_usage) {
        global_memory_stats.peak_usage = global_memory_stats.current_usage;
    }
    
    pthread_mutex_unlock(&global_memory_stats.mutex);
    
    // 记录到APM系统
    record_malloc_event(size, result, pthread_self());
    
    return result;
}

// Hook的free函数
void hooked_free(void* ptr) {
    if (!ptr) return;
    
    // 获取要释放的内存大小（简化实现）
    size_t size = get_allocated_size(ptr);
    
    pthread_mutex_lock(&global_memory_stats.mutex);
    
    global_memory_stats.total_freed += size;
    global_memory_stats.current_usage -= size;
    global_memory_stats.free_count++;
    
    pthread_mutex_unlock(&global_memory_stats.mutex);
    
    // 记录到APM系统
    record_free_event(size, ptr, pthread_self());
    
    original_free(ptr);
}

// 初始化内存Hook
void init_memory_hooks() {
    pthread_mutex_init(&global_memory_stats.mutex, NULL);
    
    // 获取原始函数地址
    original_malloc = (malloc_func_t)dlsym(RTLD_NEXT, "malloc");
    original_free = (free_func_t)dlsym(RTLD_NEXT, "free");
    
    if (!original_malloc || !original_free) {
        printf("Failed to get original function addresses\n");
        return;
    }
    
    // 应用Inline Hook
    inline_hook_t malloc_hook = {
        .target_func = original_malloc,
        .hook_func = hooked_malloc,
        .trampoline = NULL
    };
    
    inline_hook_t free_hook = {
        .target_func = original_free,
        .hook_func = hooked_free,
        .trampoline = NULL
    };
    
    if (apply_inline_hook(&malloc_hook) == 0) {
        printf("malloc Hook applied successfully\n");
        original_malloc = (malloc_func_t)malloc_hook.trampoline;
    }
    
    if (apply_inline_hook(&free_hook) == 0) {
        printf("free Hook applied successfully\n");
        original_free = (free_func_t)free_hook.trampoline;
    }
}

// APM记录函数
void record_malloc_event(size_t size, void* ptr, pthread_t thread_id) {
    printf("[APM] Memory Allocated: size=%zu, ptr=%p, thread=%lu\n", 
           size, ptr, (unsigned long)thread_id);
}

void record_free_event(size_t size, void* ptr, pthread_t thread_id) {
    printf("[APM] Memory Freed: size=%zu, ptr=%p, thread=%lu\n", 
           size, ptr, (unsigned long)thread_id);
}

// 简化实现：获取分配的内存大小
size_t get_allocated_size(void* ptr) {
    // 实际实现需要根据内存分配器来获取
    // 这里返回一个固定值用于演示
    return 16; // 简化实现
}
```

## 4. LD_PRELOAD Hook技术

### 4.1 LD_PRELOAD原理

LD_PRELOAD是Linux系统的环境变量，用于在程序启动前预加载指定的共享库。通过LD_PRELOAD可以实现符号覆盖，拦截函数调用。

### 4.2 LD_PRELOAD Hook实现

```c
// preload_hook.c
#define _GNU_SOURCE
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <dlfcn.h>
#include <time.h>

// 原始函数指针
typedef FILE* (*fopen_func_t)(const char*, const char*);
typedef int (*fclose_func_t)(FILE*);

typedef void* (*malloc_func_t)(size_t);
typedef void (*free_func_t)(void*);

static fopen_func_t original_fopen = NULL;
static fclose_func_t original_fclose = NULL;

// Hook的fopen函数
FILE* fopen(const char* pathname, const char* mode) {
    if (!original_fopen) {
        original_fopen = (fopen_func_t)dlsym(RTLD_NEXT, "fopen");
    }
    
    printf("[LD_PRELOAD] fopen called: %s, mode: %s\n", pathname, mode);
    
    struct timespec start, end;
    clock_gettime(CLOCK_MONOTONIC, &start);
    
    FILE* result = original_fopen(pathname, mode);
    
    clock_gettime(CLOCK_MONOTONIC, &end);
    long duration = (end.tv_sec - start.tv_sec) * 1000000000 + 
                   (end.tv_nsec - start.tv_nsec);
    
    printf("[LD_PRELOAD] fopen completed: result=%p, time=%ld ns\n", 
           result, duration);
    
    return result;
}

// Hook的fclose函数
int fclose(FILE* stream) {
    if (!original_fclose) {
        original_fclose = (fclose_func_t)dlsym(RTLD_NEXT, "fclose");
    }
    
    printf("[LD_PRELOAD] fclose called: stream=%p\n", stream);
    
    struct timespec start, end;
    clock_gettime(CLOCK_MONOTONIC, &start);
    
    int result = original_fclose(stream);
    
    clock_gettime(CLOCK_MONOTONIC, &end);
    long duration = (end.tv_sec - start.tv_sec) * 1000000000 + 
                   (end.tv_nsec - start.tv_nsec);
    
    printf("[LD_PRELOAD] fclose completed: result=%d, time=%ld ns\n", 
           result, duration);
    
    return result;
}

// 构造函数，在库加载时执行
__attribute__((constructor)) void init_hooks() {
    printf("LD_PRELOAD Hook library loaded\n");
    
    // 初始化原始函数指针
    original_fopen = (fopen_func_t)dlsym(RTLD_NEXT, "fopen");
    original_fclose = (fclose_func_t)dlsym(RTLD_NEXT, "fclose");
    
    printf("Original fopen: %p\n", original_fopen);
    printf("Original fclose: %p\n", original_fclose);
}
```

### 4.3 编译和使用

```bash
# 编译为共享库
gcc -shared -fPIC -o libapmhook.so preload_hook.c -ldl

# 使用LD_PRELOAD运行程序
LD_PRELOAD=./libapmhook.so ./your_program
```

## 5. Native Hook技术最佳实践

### 5.1 性能优化建议

1. **选择性Hook**：只Hook关键函数，避免过度Hook影响性能
2. **异步记录**：将监控数据异步发送到APM后端，减少对主流程的影响
3. **批量处理**：批量收集数据后再发送，减少系统调用次数

### 5.2 稳定性考虑

1. **错误处理**：完善的错误处理机制，避免Hook失败导致程序崩溃
2. **线程安全**：确保Hook代码在多线程环境下的安全性
3. **信号安全**：处理信号中断时的资源清理

### 5.3 兼容性处理

1. **架构兼容**：处理不同CPU架构（x86, x64, ARM, ARM64）的差异
2. **系统版本兼容**：适配不同Linux内核版本和glibc版本
3. **编译器兼容**：处理不同编译器的优化策略

通过以上Native Hook技术的详细介绍和实战案例，您可以在APM开发中实现对系统底层行为的监控和分析。