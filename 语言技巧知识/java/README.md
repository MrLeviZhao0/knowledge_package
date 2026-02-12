# Java语言知识库

## 概述
Java是一种面向对象的编程语言，具有"一次编写，到处运行"的特性，广泛应用于企业级开发、Android应用、大数据处理等领域。本知识库详细介绍了Java的核心特性、JVM原理、并发编程、框架使用以及面试常见问题。

## 文档结构

### 基础篇
- [语法基础](语法基础.md) - Java基础语法和核心概念
- [面向对象](面向对象.md) - 类、对象、继承、多态、封装
- [集合框架](集合框架.md) - List、Set、Map等集合类的使用
- [异常处理](异常处理.md) - 异常体系和最佳实践

### 进阶篇  
- [JVM原理](JVM原理.md) - 内存模型、垃圾回收、类加载机制
- [并发编程](并发编程.md) - 线程、锁、并发工具类
- [IO与NIO](IO与NIO.md) - 输入输出流和NIO编程
- [反射机制](反射机制.md) - 反射原理和动态代理

### 框架篇
- [Spring框架](Spring框架.md) - IOC、AOP、Spring Boot
- [MyBatis框架](MyBatis框架.md) - ORM映射和SQL优化
- [Spring MVC](SpringMVC.md) - Web开发框架
- [微服务架构](微服务架构.md) - Spring Cloud和分布式系统

### 面试篇
- [常见问题](常见问题.md) - 面试中常见的Java问题
- [代码练习](代码练习.md) - 实战编程题目
- [设计模式](设计模式.md) - 常用设计模式实现
- [性能优化](性能优化.md) - JVM调优和性能优化

## 快速开始

### 安装Java
```bash
# 下载JDK
wget https://download.java.net/java/GA/jdk17.0.2/dfd4a8d0985749f896bed50d7138ee7f/8/GPL/openjdk-17.0.2_linux-x64_bin.tar.gz

# 解压并配置环境变量
tar -xzf openjdk-17.0.2_linux-x64_bin.tar.gz
sudo mv jdk-17.0.2 /usr/local/

export JAVA_HOME=/usr/local/jdk-17.0.2
export PATH=$JAVA_HOME/bin:$PATH
```

### 第一个Java程序
```java
public class HelloWorld {
    public static void main(String[] args) {
        System.out.println("Hello, Java!");
    }
}

// 编译和运行
// javac HelloWorld.java
// java HelloWorld
```

## 核心优势

### 跨平台性
- 基于JVM实现"一次编写，到处运行"
- 强大的字节码优化和即时编译

### 丰富的生态
- 庞大的第三方库和框架支持
- 成熟的开发工具和IDE

### 企业级特性
- 强大的并发支持
- 完善的安全机制
- 稳定的性能表现