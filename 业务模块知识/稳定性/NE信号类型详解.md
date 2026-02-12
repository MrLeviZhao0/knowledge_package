# Native Exception (NE) 信号类型详解

## 1. NE信号分类与处理

### 1.1 主要信号类型

#### 1.1.1 SIGSEGV (11) - 段错误
**产生原因**：
- 访问无效内存地址
- 内存权限违规
- 栈溢出
- 野指针解引用

**典型场景**：
```cpp
// 案例1：空指针解引用
void processData(int* data) {
    if (data == nullptr) {
        // 缺少空指针检查
        *data = 42;  // SIGSEGV发生点
    }
}

// 案例2：内存越界
void arrayAccess(int* arr, int size) {
    for (int i = 0; i <= size; i++) {  // 错误：应该是 i < size
        arr[i] = i;  // 当i==size时越界
    }
}

// 案例3：栈溢出
void recursiveFunction(int depth) {
    char buffer[1024];  // 大栈变量
    if (depth > 1000) {
        return;
    }
    recursiveFunction(depth + 1);  // 深度递归导致栈溢出
}
```

**调试方法**：
```bash
# 使用GDB分析SIGSEGV
gdb ./program core.<pid>
(gdb) bt                    # 查看调用栈
(gdb) info registers        # 查看寄存器
(gdb) x/i $pc               # 查看当前指令
(gdb) p *(void**)$sp        # 查看栈顶内容

# 使用addr2line定位代码
addr2line -e program -f -C <crash_address>
```

#### 1.1.2 SIGABRT (6) - 程序异常终止
**产生原因**：
- assert断言失败
- malloc/free错误
- 双重释放
- 堆损坏

**典型场景**：
```cpp
// 案例1：断言失败
void validateInput(int value) {
    assert(value > 0);  // 如果value<=0，触发SIGABRT
    // 处理逻辑
}

// 案例2：双重释放
void doubleFree() {
    int* ptr = (int*)malloc(sizeof(int));
    free(ptr);
    free(ptr);  // 第二次释放，触发SIGABRT
}

// 案例3：堆损坏
void heapCorruption() {
    char* buffer = (char*)malloc(10);
    strcpy(buffer, "这是一个很长的字符串，会导致缓冲区溢出");  // 堆损坏
    free(buffer);  // 释放时检测到堆损坏，触发SIGABRT
}
```

**调试方法**：
```bash
# 检查malloc调试信息
export MALLOC_CHECK_=3  # 启用malloc检查

# 使用Valgrind检测内存问题
valgrind --tool=memcheck ./program

# 使用AddressSanitizer
gcc -fsanitize=address -g -o program program.c
```

#### 1.1.3 SIGBUS (7) - 总线错误
**产生原因**：
- 未对齐的内存访问
- 访问不存在的物理地址
- 内存映射文件访问错误

**典型场景**：
```cpp
// 案例1：未对齐访问
void unalignedAccess() {
    char data[10];
    int* intPtr = (int*)(data + 1);  // 未对齐的int指针
    *intPtr = 42;  // 在某些架构上触发SIGBUS
}

// 案例2：内存映射文件访问
void mmapAccess() {
    int fd = open("file.dat", O_RDONLY);
    void* addr = mmap(NULL, 4096, PROT_READ, MAP_PRIVATE, fd, 0);
    
    // 如果文件被截断或删除
    int value = *(int*)addr;  // 可能触发SIGBUS
    
    munmap(addr, 4096);
    close(fd);
}
```

#### 1.1.4 SIGILL (4) - 非法指令
**产生原因**：
- 执行无效的机器指令
- 特权指令在用户模式执行
- 指令编码错误

**典型场景**：
```cpp
// 案例：内联汇编错误
void illegalInstruction() {
    __asm__ volatile (
        ".word 0x00000000\n"  // 无效指令
        : 
        : 
        : "memory"
    );
}
```

#### 1.1.5 SIGFPE (8) - 算术异常
**产生原因**：
- 除以零
- 整数溢出
- 浮点异常

**典型场景**：
```cpp
// 案例1：除以零
void divideByZero() {
    int a = 10;
    int b = 0;
    int result = a / b;  // SIGFPE
}

// 案例2：整数溢出
void integerOverflow() {
    int max = INT_MAX;
    int result = max + 1;  // 有符号整数溢出，未定义行为
}
```

## 2. NE信号处理机制

### 2.1 信号处理函数

#### 2.1.1 基本信号处理
```cpp
#include <signal.h>
#include <execinfo.h>
#include <unistd.h>

class SignalHandler {
private:
    static const int MAX_STACK_FRAMES = 64;
    
public:
    static void setupSignalHandlers() {
        // 设置段错误处理
        signal(SIGSEGV, signalHandler);
        
        // 设置程序异常终止处理
        signal(SIGABRT, signalHandler);
        
        // 设置总线错误处理
        signal(SIGBUS, signalHandler);
        
        // 设置非法指令处理
        signal(SIGILL, signalHandler);
        
        // 设置算术异常处理
        signal(SIGFPE, signalHandler);
    }
    
    static void signalHandler(int sig) {
        // 获取信号名称
        const char* sigName = getSignalName(sig);
        
        // 记录崩溃信息
        logCrashInfo(sig, sigName);
        
        // 生成堆栈跟踪
        printStackTrace();
        
        // 执行清理操作
        performCleanup();
        
        // 恢复默认处理并重新触发信号
        signal(sig, SIG_DFL);
        raise(sig);
    }
    
    static void printStackTrace() {
        void* array[MAX_STACK_FRAMES];
        size_t size;
        
        // 获取堆栈帧
        size = backtrace(array, MAX_STACK_FRAMES);
        
        // 打印堆栈跟踪
        fprintf(stderr, "Stack trace (most recent call first):\n");
        backtrace_symbols_fd(array, size, STDERR_FILENO);
        
        // 也可以保存到文件
        FILE* fp = fopen("/sdcard/stack_trace.txt", "w");
        if (fp) {
            backtrace_symbols_fd(array, size, fileno(fp));
            fclose(fp);
        }
    }
    
    static const char* getSignalName(int sig) {
        switch (sig) {
            case SIGSEGV: return "SIGSEGV";
            case SIGABRT: return "SIGABRT";
            case SIGBUS: return "SIGBUS";
            case SIGILL: return "SIGILL";
            case SIGFPE: return "SIGFPE";
            default: return "UNKNOWN";
        }
    }
    
    static void logCrashInfo(int sig, const char* sigName) {
        fprintf(stderr, "=== CRASH DETECTED ===\n");
        fprintf(stderr, "Signal: %d (%s)\n", sig, sigName);
        fprintf(stderr, "PID: %d\n", getpid());
        fprintf(stderr, "Time: %ld\n", time(NULL));
    }
};
```

#### 2.1.2 Android特定信号处理
```cpp
// Android系统的信号处理增强
class AndroidSignalHandler {
public:
    static void setupAndroidHandlers() {
        // 设置备用栈，防止栈溢出时无法处理信号
        stack_t ss;
        ss.ss_sp = malloc(SIGSTKSZ);
        ss.ss_size = SIGSTKSZ;
        ss.ss_flags = 0;
        sigaltstack(&ss, NULL);
        
        // 设置信号处理结构
        struct sigaction sa;
        sa.sa_sigaction = androidSignalHandler;
        sigemptyset(&sa.sa_mask);
        sa.sa_flags = SA_SIGINFO | SA_ONSTACK;
        
        sigaction(SIGSEGV, &sa, NULL);
        sigaction(SIGABRT, &sa, NULL);
        sigaction(SIGBUS, &sa, NULL);
    }
    
    static void androidSignalHandler(int sig, siginfo_t* info, void* context) {
        // 获取更详细的信息
        ucontext_t* ucontext = (ucontext_t*)context;
        
        // 记录崩溃详细信息
        logDetailedCrashInfo(sig, info, ucontext);
        
        // 生成tombstone文件（Android特有）
        generateTombstone(sig, info, ucontext);
        
        // 调用默认处理
        SignalHandler::signalHandler(sig);
    }
    
    static void generateTombstone(int sig, siginfo_t* info, ucontext_t* ucontext) {
        // Android的tombstone文件生成逻辑
        // 包含寄存器状态、内存映射、堆栈跟踪等详细信息
        
        char tombstone_path[256];
        snprintf(tombstone_path, sizeof(tombstone_path), 
                "/data/tombstones/tombstone_%d", getpid());
        
        FILE* fp = fopen(tombstone_path, "w");
        if (fp) {
            // 写入崩溃信息
            fprintf(fp, "*** *** *** *** *** *** *** *** *** *** *** *** *** *** *** ***\n");
            fprintf(fp, "pid: %d, tid: %d, name: %s >>> %s <<<\n", 
                   getpid(), gettid(), "native_process", "native_process");
            
            // 写入信号信息
            fprintf(fp, "signal %d (%s), code %d (%s)\n", 
                   sig, SignalHandler::getSignalName(sig),
                   info->si_code, getSignalCodeName(sig, info->si_code));
            
            fclose(fp);
        }
    }
};
```

## 3. NE调试技巧与实践

### 3.1 GDB高级调试

#### 3.1.1 核心转储分析
```bash
# 生成core dump
ulimit -c unlimited
gcore <pid>

# 分析core dump
gdb program core.<pid>

# 常用命令
(gdb) bt full              # 完整堆栈信息
(gdb) info registers       # 寄存器状态
(gdb) x/10i $pc-0x20       # 查看崩溃点附近指令
(gdb) info frame           # 当前帧信息
(gdb) info locals          # 局部变量
(gdb) info args            # 函数参数
(gdb) p variable           # 打印变量值
(gdb) x/20wx address       # 查看内存内容
```

#### 3.1.2 条件断点和观察点
```bash
# 条件断点
(gdb) break file.c:123 if variable == expected_value

# 观察点（监控变量变化）
(gdb) watch variable
(gdb) watch *(int*)0x12345678

# 捕获点（监控系统调用）
(gdb) catch syscall open
(gdb) catch syscall close

# 命令自动化
(gdb) define analyze_crash
>bt
>info registers
>x/10i $pc
>info frame
>end

(gdb) analyze_crash
```

### 3.2 内存调试工具

#### 3.2.1 AddressSanitizer
```bash
# 编译时启用AddressSanitizer
gcc -fsanitize=address -g -o program program.c

# 运行时检测内存问题
./program

# 典型输出示例
==12345==ERROR: AddressSanitizer: heap-buffer-overflow on address 0x60200000eff0
# 详细信息包括：
# - 错误类型（堆缓冲区溢出、使用释放后内存等）
# - 访问地址和大小
# - 分配和释放堆栈
# - 内存映射信息
```

#### 3.2.2 Valgrind内存检查
```bash
# 基本内存检查
valgrind --tool=memcheck --leak-check=full ./program

# 详细选项
valgrind --tool=memcheck \
    --leak-check=full \
    --show-leak-kinds=all \
    --track-origins=yes \
    --verbose \
    ./program

# 输出示例
==12345== Invalid write of size 4
==12345==    at 0x400123: function_name (file.c:123)
==12345==    by 0x400456: main (main.c:45)
==12345==  Address 0x5201048 is 0 bytes after a block of size 40 alloc'd
```

### 3.3 系统级调试

#### 3.3.1 /proc文件系统分析
```bash
# 查看进程内存映射
cat /proc/<pid>/maps

# 查看进程状态
cat /proc/<pid>/status

# 查看内存统计
cat /proc/<pid>/statm

# 查看打开的文件描述符
ls -la /proc/<pid>/fd/

# 查看环境变量
cat /proc/<pid>/environ | tr '\0' '\n'
```

#### 3.3.2 strace系统调用跟踪
```bash
# 跟踪系统调用
strace -f -o trace.txt ./program

# 过滤特定系统调用
strace -e trace=open,close,read,write ./program

# 统计系统调用
strace -c ./program

# 输出示例
open("file.txt", O_RDONLY) = 3
read(3, "hello world", 11) = 11
close(3) = 0
```

## 4. NE预防与最佳实践

### 4.1 防御性编程

#### 4.1.1 指针安全
```cpp
class SafePointer {
public:
    // 安全的指针解引用
    template<typename T>
    static T* safeDereference(T* ptr) {
        if (ptr == nullptr) {
            logError("Attempt to dereference null pointer");
            return nullptr;
        }
        return ptr;
    }
    
    // 安全的数组访问
    template<typename T>
    static T& safeArrayAccess(T* array, int index, int size) {
        if (array == nullptr) {
            throw std::invalid_argument("Array is null");
        }
        
        if (index < 0 || index >= size) {
            throw std::out_of_range("Array index out of range");
        }
        
        return array[index];
    }
    
    // 智能指针包装
    template<typename T>
    class SmartPointer {
    private:
        T* mPtr;
        
    public:
        explicit SmartPointer(T* ptr) : mPtr(ptr) {}
        ~SmartPointer() { delete mPtr; }
        
        T* operator->() const { 
            if (mPtr == nullptr) {
                throw std::runtime_error("Null pointer access");
            }
            return mPtr; 
        }
        
        T& operator*() const {
            if (mPtr == nullptr) {
                throw std::runtime_error("Null pointer dereference");
            }
            return *mPtr;
        }
    };
};
```

#### 4.1.2 内存管理安全
```cpp
class SafeMemory {
public:
    // 安全的内存分配
    template<typename T>
    static T* safeMalloc(size_t count) {
        if (count == 0 || count > MAX_ALLOC_SIZE) {
            throw std::invalid_argument("Invalid allocation size");
        }
        
        T* ptr = static_cast<T*>(malloc(count * sizeof(T)));
        if (ptr == nullptr) {
            throw std::bad_alloc();
        }
        
        // 初始化内存
        memset(ptr, 0, count * sizeof(T));
        return ptr;
    }
    
    // 安全的内存释放
    template<typename T>
    static void safeFree(T*& ptr) {
        if (ptr != nullptr) {
            free(ptr);
            ptr = nullptr;  // 避免悬空指针
        }
    }
    
    // 边界检查的memcpy
    static void safeMemcpy(void* dest, const void* src, size_t n, 
                          size_t destSize, size_t srcSize) {
        if (dest == nullptr || src == nullptr) {
            throw std::invalid_argument("Null pointer in memcpy");
        }
        
        if (n > destSize || n > srcSize) {
            throw std::out_of_range("Memcpy size exceeds buffer size");
        }
        
        memcpy(dest, src, n);
    }
};
```

### 4.2 测试与验证

#### 4.2.1 单元测试覆盖
```cpp
#include <gtest/gtest.h>

class MemorySafetyTest : public ::testing::Test {
protected:
    void SetUp() override {
        // 测试前准备
    }
    
    void TearDown() override {
        // 测试后清理
    }
};

TEST_F(MemorySafetyTest, NullPointerDereference) {
    int* ptr = nullptr;
    
    // 应该抛出异常而不是崩溃
    EXPECT_THROW(SafePointer::safeDereference(ptr)->value, std::runtime_error);
}

TEST_F(MemorySafetyTest, ArrayBoundsCheck) {
    int array[10] = {0};
    
    // 有效访问
    EXPECT_NO_THROW(SafePointer::safeArrayAccess(array, 0, 10));
    
    // 越界访问
    EXPECT_THROW(SafePointer::safeArrayAccess(array, 10, 10), std::out_of_range);
    EXPECT_THROW(SafePointer::safeArrayAccess(array, -1, 10), std::out_of_range);
}

TEST_F(MemorySafetyTest, MemoryAllocation) {
    // 正常分配
    int* ptr = SafeMemory::safeMalloc<int>(100);
    EXPECT_NE(ptr, nullptr);
    
    // 超大分配
    EXPECT_THROW(SafeMemory::safeMalloc<int>(SIZE_MAX), std::bad_alloc);
    
    SafeMemory::safeFree(ptr);
}
```

#### 4.2.2 模糊测试
```cpp
class FuzzTester {
public:
    static void fuzzTestMemory(void* data, size_t size) {
        // 随机修改内存，测试健壮性
        for (size_t i = 0; i < size; i++) {
            uint8_t* byte = static_cast<uint8_t*>(data) + i;
            uint8_t original = *byte;
            
            // 尝试各种边界值
            *byte = 0x00; testFunction(data, size);
            *byte = 0xFF; testFunction(data, size);
            *byte = 0x7F; testFunction(data, size);
            *byte = 0x80; testFunction(data, size);
            
            // 恢复原始值
            *byte = original;
        }
    }
    
    static void testFunction(void* data, size_t size) {
        try {
            // 调用被测试的函数
            processData(data, size);
        } catch (const std::exception& e) {
            // 预期内的异常，记录日志
            logWarning("Expected exception during fuzz testing: %s", e.what());
        } catch (...) {
            // 未预期的异常，可能是bug
            logError("Unexpected exception during fuzz testing");
        }
    }
};
```

通过深入理解NE信号类型和相应的调试技术，可以有效地定位和解决Native层的稳定性问题。