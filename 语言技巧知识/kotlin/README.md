# Kotlin语言知识库

## 概述
Kotlin是一种现代、简洁、安全的JVM语言，被Google官方宣布为Android开发的首选语言。本知识库详细介绍了Kotlin的核心特性、与Java的差异、与Compose的结合使用以及实战技巧。

## 文档结构

### 基础篇
- [语法基础](语法基础.md) - Kotlin基础语法和核心概念
- [空安全机制](空安全机制.md) - 可空类型和安全调用操作符
- [函数式编程](函数式编程.md) - Lambda、高阶函数、集合操作

### 进阶篇  
- [协程编程](协程编程.md) - 异步编程和结构化并发
- [扩展函数](扩展函数.md) - 为现有类添加新功能
- [委托属性](委托属性.md) - 属性委托和延迟初始化

### Compose篇
- [Compose基础](Compose基础.md) - 声明式UI和组合函数
- [状态管理](状态管理.md) - 状态提升和状态管理
- [主题和动画](主题和动画.md) - Material Design和动画效果
- [导航和架构](导航和架构.md) - 应用导航和MVVM架构

### 实战篇
- [与Java对比](与Java对比.md) - Kotlin与Java的核心差异分析
- [Android开发](Android开发.md) - Android应用开发最佳实践
- [性能优化](性能优化.md) - Kotlin代码性能优化技巧

### 面试篇
- [常见问题](常见问题.md) - 面试中常见的Kotlin问题
- [代码练习](代码练习.md) - 实战编程题目

## 快速开始

### 安装Kotlin
```bash
# 使用SDKMAN安装
sdk install kotlin

# 或者下载编译器
curl -s https://get.sdkman.io | bash
source "$HOME/.sdkman/bin/sdkman-init.sh"
sdk install kotlin
```

### 第一个Kotlin程序
```kotlin
fun main() {
    println("Hello, Kotlin!")
}
```

### 在Android Studio中使用
1. 创建新项目时选择Kotlin
2. 或将现有Java项目转换为Kotlin
3. 使用Kotlin Android Extensions

## 核心优势

### 空安全
- 编译时空安全检查
- 可空类型和非空类型区分
- 安全调用操作符（?.）和Elvis操作符（?:）

### 简洁性
- 数据类自动生成equals/hashCode/toString
- 类型推断减少样板代码
- 扩展函数增强现有类

### 互操作性
- 100%与Java互操作
- 可以直接调用Java库
- 支持混合编程

### 现代特性
- 协程支持异步编程
- 函数式编程特性
- 委托属性和类委托

## 与Compose结合

### 声明式UI
```kotlin
@Composable
fun Greeting(name: String) {
    Text(text = "Hello $name!")
}
```

### 状态驱动
```kotlin
@Composable
fun Counter() {
    var count by remember { mutableStateOf(0) }
    Button(onClick = { count++ }) {
        Text("Clicked $count times")
    }
}
```

## 学习路径

1. **入门阶段**：掌握基础语法和空安全机制
2. **进阶阶段**：学习协程、扩展函数、函数式编程
3. **Compose阶段**：掌握声明式UI开发
4. **架构阶段**：学习MVVM、依赖注入等架构模式

## 资源推荐

- [Kotlin官方文档](https://kotlinlang.org/docs/home.html)
- [Kotlin Koans](https://play.kotlinlang.org/koans) - 交互式练习
- [Android开发者指南](https://developer.android.com/kotlin)
- [Jetpack Compose](https://developer.android.com/jetpack/compose)