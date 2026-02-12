# AArch64语言知识库索引

## 📚 文档导航

本索引文件指向AArch64语言知识库的详细文档。所有详细内容已迁移到`aarch64/`目录下，请点击下方链接查看具体内容。

## 🚀 快速导航

### 基础篇
- [💾 寄存器系统](aarch64/寄存器系统.md) - 通用寄存器、特殊寄存器、浮点寄存器
- [⚡ 指令集基础](aarch64/指令集基础.md) - 数据处理、加载存储、控制流指令
- [🧠 内存模型](aarch64/内存模型.md) - 内存访问模式和地址计算

### 进阶篇
- [🤝 函数调用约定](aarch64/函数调用约定.md) - AAPCS64标准和栈帧管理
- [🌀 SIMD编程](aarch64/SIMD编程.md) - NEON指令集和向量运算
- [⚠️ 异常处理](aarch64/异常处理.md) - 异常向量表和中断处理

### 逆向篇
- [🔍 反汇编分析](aarch64/反汇编分析.md) - 反汇编代码阅读技巧
- [🔧 系统调用分析](aarch64/系统调用分析.md) - 系统调用识别和分析
- [🔐 加密算法识别](aarch64/加密算法识别.md) - 常见加密算法模式识别

### 优化篇
- [🚀 性能优化](aarch64/性能优化.md) - 指令选择和流水线优化
- [💾 内存优化](aarch64/内存优化.md) - 缓存优化和预取技术
- [🔄 循环优化](aarch64/循环优化.md) - 循环展开和向量化

### 调试篇
- [🐛 GDB调试](aarch64/GDB调试.md) - AArch64环境下的调试技巧
- [📊 动态分析](aarch64/动态分析.md) - 运行时分析和性能剖析
- [🖥️ QEMU模拟](aarch64/QEMU模拟.md) - 架构模拟和环境搭建

### 实战篇
- [🤖 Android Native分析](aarch64/AndroidNative分析.md) - JNI代码和Native库分析
- [🐧 内核代码分析](aarch64/内核代码分析.md) - Linux内核系统调用处理
- [💥 漏洞分析](aarch64/漏洞分析.md) - 安全漏洞识别和分析

## 📋 知识库概览

### AArch64核心特性
- **精简指令集**：指令数量较少但功能强大
- **加载存储架构**：内存访问通过专用指令
- **条件执行**：大多数指令支持条件执行
- **SIMD支持**：强大的向量运算能力

### 寄存器系统详解
- **31个通用寄存器**：X0-X30（64位），W0-W30（32位）
- **特殊寄存器**：SP（栈指针）、PC（程序计数器）、XZR（零寄存器）
- **浮点寄存器**：V0-V31（128位SIMD/浮点）

### 应用场景
- **移动设备开发**：Android Native、iOS底层优化
- **服务器开发**：ARM服务器应用优化、云计算
- **逆向工程**：移动应用安全分析、漏洞挖掘
- **系统编程**：操作系统内核、驱动开发

## 🎯 学习路径建议

### 基础入门
1. 学习[寄存器系统](aarch64/寄存器系统.md)和[指令集基础](aarch64/指令集基础.md)
2. 掌握[函数调用约定](aarch64/函数调用约定.md)和栈帧管理
3. 实践[反汇编分析](aarch64/反汇编分析.md)技巧

### 进阶提升
1. 学习[SIMD编程](aarch64/SIMD编程.md)和向量运算
2. 掌握[性能优化](aarch64/性能优化.md)和[内存优化](aarch64/内存优化.md)
3. 使用[调试工具](aarch64/GDB调试.md)进行分析

### 实战应用
1. 分析[Android Native代码](aarch64/AndroidNative分析.md)
2. 研究[内核代码](aarch64/内核代码分析.md)
3. 挖掘[安全漏洞](aarch64/漏洞分析.md)

## 🔗 相关资源

- [ARM Architecture Reference Manual](https://developer.arm.com/documentation/ddi0487/latest)
- [Procedure Call Standard for ARM 64-bit Architecture](https://github.com/ARM-software/abi-aa/blob/main/aapcs64/aapcs64.rst)
- [ARM指令集速查表](https://developer.arm.com/architectures/learn-the-architecture)
- [AArch64逆向工程教程](https://github.com/0xdea/arm-exploits)

## 🛠️ 工具推荐

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

---
**注意**：本文件为索引文件，详细内容请点击上方链接查看对应文档。