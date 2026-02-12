# AArch64语言知识库

## 概述
AArch64是ARMv8-A架构的64位指令集，用于现代ARM处理器，是移动设备和服务器的主流架构。本知识库详细介绍了AArch64寄存器系统、指令集、调用约定以及逆向分析技巧。

## 文档结构

### 基础篇
- [寄存器系统](寄存器系统.md) - 通用寄存器、特殊寄存器、浮点寄存器
- [指令集基础](指令集基础.md) - 数据处理、加载存储、控制流指令
- [内存模型](内存模型.md) - 内存访问模式和地址计算

### 进阶篇
- [函数调用约定](函数调用约定.md) - AAPCS64标准和栈帧管理
- [SIMD编程](SIMD编程.md) - NEON指令集和向量运算
- [异常处理](异常处理.md) - 异常向量表和中断处理

### 逆向篇
- [反汇编分析](反汇编分析.md) - 反汇编代码阅读技巧
- [系统调用分析](系统调用分析.md) - 系统调用识别和分析
- [加密算法识别](加密算法识别.md) - 常见加密算法模式识别

### 优化篇
- [性能优化](性能优化.md) - 指令选择和流水线优化
- [内存优化](内存优化.md) - 缓存优化和预取技术
- [循环优化](循环优化.md) - 循环展开和向量化

### 调试篇
- [GDB调试](GDB调试.md) - AArch64环境下的调试技巧
- [动态分析](动态分析.md) - 运行时分析和性能剖析
- [QEMU模拟](QEMU模拟.md) - 架构模拟和环境搭建

### 实战篇
- [Android Native分析](AndroidNative分析.md) - JNI代码和Native库分析
- [内核代码分析](内核代码分析.md) - Linux内核系统调用处理
- [漏洞分析](漏洞分析.md) - 安全漏洞识别和分析

## 快速开始

### 环境准备
```bash
# 安装交叉编译工具链
sudo apt install gcc-aarch64-linux-gnu binutils-aarch64-linux-gnu

# 安装QEMU模拟器
sudo apt install qemu-system-aarch64 qemu-user-static
```

### 第一个AArch64程序
```assembly
// hello.s
.text
.global _start

_start:
    // 系统调用: write(1, message, length)
    mov x0, #1          // stdout文件描述符
    ldr x1, =message    // 消息地址
    ldr x2, =len        // 消息长度
    mov x8, #64         // write系统调用号
    svc #0              // 执行系统调用
    
    // 系统调用: exit(0)
    mov x0, #0          // 退出码
    mov x8, #93         // exit系统调用号
    svc #0              // 执行系统调用

.data
message:
    .asciz "Hello, AArch64!\n"
len = . - message
```

编译和运行：
```bash
# 编译
as -o hello.o hello.s
ld -o hello hello.o

# 在QEMU中运行
qemu-aarch64 hello
```

## 核心概念

### 寄存器系统
- **31个通用寄存器**：X0-X30（64位），W0-W30（32位）
- **特殊寄存器**：SP（栈指针）、PC（程序计数器）、XZR（零寄存器）
- **浮点寄存器**：V0-V31（128位SIMD/浮点）

### 指令集特点
- **精简指令集**：指令数量较少但功能强大
- **加载存储架构**：内存访问通过专用指令
- **条件执行**：大多数指令支持条件执行
- **SIMD支持**：强大的向量运算能力

### 调用约定（AAPCS64）
- **参数传递**：X0-X7用于参数，X0用于返回值
- **寄存器保存**：X19-X28被调用者保存，其他调用者保存
- **栈对齐**：SP必须16字节对齐

## 应用场景

### 移动设备开发
- Android Native代码开发
- iOS应用底层优化
- 移动游戏引擎开发

### 服务器开发
- ARM服务器应用优化
- 云计算和边缘计算
- 高性能计算

### 逆向工程
- 移动应用安全分析
- 恶意代码分析
- 漏洞挖掘和利用

### 系统编程
- 操作系统内核开发
- 驱动开发
- 嵌入式系统开发

## 学习路径

1. **基础阶段**：掌握寄存器系统和基础指令集
2. **进阶阶段**：学习函数调用约定和SIMD编程
3. **分析阶段**：掌握反汇编代码阅读技巧
4. **实战阶段**：参与实际的逆向工程和优化工作

## 资源推荐

- [ARM Architecture Reference Manual](https://developer.arm.com/documentation/ddi0487/latest)
- [Procedure Call Standard for ARM 64-bit Architecture](https://github.com/ARM-software/abi-aa/blob/main/aapcs64/aapcs64.rst)
- [ARM指令集速查表](https://developer.arm.com/architectures/learn-the-architecture)
- [AArch64逆向工程教程](https://github.com/0xdea/arm-exploits)

## 工具推荐

### 开发工具
- **GCC AArch64工具链**：交叉编译
- **LLVM/Clang**：现代编译器
- **Android NDK**：移动开发

### 分析工具
- **GDB**：调试和分析
- **objdump**：反汇编
- **radare2**：逆向工程框架
- **IDA Pro**：商业逆向工具

### 模拟工具
- **QEMU**：架构模拟
- **ARM Fast Models**：官方模拟器
- **Gem5**：学术研究模拟器

## 实战技巧

### 代码阅读技巧
```assembly
; 识别函数边界
stp x29, x30, [sp, #-16]!  ; 函数开始（保存帧指针和返回地址）
ldp x29, x30, [sp], #16     ; 函数结束（恢复帧指针和返回地址）

; 识别系统调用
mov x8, #93                 ; exit系统调用号
svc #0                      ; 执行系统调用
```

### 性能分析技巧
```assembly
; 识别性能瓶颈
loop:
    ldr x0, [x1], #8        ; 加载并自动递增
    add x2, x2, x0          ; 累加
    subs x3, x3, #1         ; 计数器减1
    b.ne loop               ; 循环控制
```

通过本知识库，您将能够系统性地掌握AArch64架构的各个方面，从基础语法到高级优化技巧，为移动开发、系统编程和逆向工程打下坚实基础。