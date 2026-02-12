# Rust语言知识库

## 概述
Rust是一种系统级编程语言，专注于内存安全、并发性和性能。本知识库详细介绍了Rust的核心特性、与C++的差异、在Android中的应用以及实战技巧。

## 文档结构

### 基础篇
- [语法基础](语法基础.md) - Rust基础语法和核心概念
- [所有权系统](所有权系统.md) - 所有权、借用、生命周期的深入解析
- [类型系统](类型系统.md) - 强类型系统和类型推断

### 进阶篇  
- [并发编程](并发编程.md) - 线程安全、消息传递、异步编程
- [高级特性](高级特性.md) - 宏系统、泛型、trait系统
- [性能优化](性能优化.md) - 内存管理和性能调优

### 实战篇
- [Android集成](Android集成.md) - Rust在Android模块中的应用
- [与C++对比](与C++对比.md) - Rust与C++的核心差异分析
- [项目实战](项目实战.md) - 实际项目开发经验

### 面试篇
- [常见问题](常见问题.md) - 面试中常见的Rust问题
- [代码练习](代码练习.md) - 实战编程题目

## 快速开始

### 安装Rust
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
```

### 第一个Rust程序
```rust
fn main() {
    println!("Hello, Rust!");
}
```

## 核心优势

### 内存安全
- 编译时防止内存错误
- 无数据竞争的并发安全
- 零成本抽象

### 高性能
- 无运行时开销
- 接近C++的性能
- 现代编译器优化

### 开发效率
- 强大的工具链（Cargo、rustfmt、clippy）
- 丰富的生态系统
- 优秀的错误信息

## 学习路径

1. **入门阶段**：掌握基础语法和所有权概念
2. **进阶阶段**：学习并发编程和高级特性  
3. **实战阶段**：参与实际项目开发
4. **精通阶段**：深入理解编译器原理和系统编程

## 资源推荐

- [The Rust Programming Language（官方书籍）](https://doc.rust-lang.org/book/)
- [Rust by Example（实例教程）](https://doc.rust-lang.org/rust-by-example/)
- [Rustlings（小练习）](https://github.com/rust-lang/rustlings)
- [Rust标准库文档](https://doc.rust-lang.org/std/)