# 与C++对比

## 概述
Rust和C++都是系统级编程语言，但它们在设计哲学、内存管理、并发模型等方面存在显著差异。本章详细对比两种语言的核心特性，帮助开发者理解各自的优势和适用场景。

## 设计哲学对比

### Rust的设计原则

**核心原则：**
- **内存安全**：编译时保证内存安全，无悬垂指针、缓冲区溢出
- **零成本抽象**：高级抽象不带来运行时开销
- **无畏并发**：编译时防止数据竞争
- **明确性**：代码行为可预测，无未定义行为

### C++的设计原则

**核心原则：**
- **零开销原则**：不用的不付费，要用的用最好的
- **RAII**：资源获取即初始化
- **模板元编程**：编译时多态和代码生成
- **向后兼容**：保持与旧代码的兼容性

## 内存管理对比

### 所有权系统 vs 手动管理

**Rust的所有权系统：**
```rust
fn main() {
    let s1 = String::from("hello");
    let s2 = s1; // 所有权转移，s1不再有效
    // println!("{}", s1); // 编译错误：s1已移动
    
    let s3 = s2.clone(); // 显式克隆
    println!("s2: {}, s3: {}", s2, s3);
    
    takes_ownership(s3); // 所有权转移给函数
    // println!("{}", s3); // 编译错误：s3已移动
}

fn takes_ownership(s: String) {
    println!("函数内: {}", s);
} // s离开作用域，内存自动释放
```

**C++的手动内存管理：**
```cpp
#include <iostream>
#include <string>
#include <memory>

void takes_ownership(std::string s) {
    std::cout << "函数内: " << s << std::endl;
} // s离开作用域，自动调用析构函数

int main() {
    std::string s1("hello");
    std::string s2 = s1; // 拷贝构造
    std::cout << "s1: " << s1 << ", s2: " << s2 << std::endl;
    
    takes_ownership(s2); // 值传递，拷贝构造
    std::cout << "s2: " << s2 << std::endl; // 仍然有效
    
    // 手动内存管理示例
    int* arr = new int[100]; // 手动分配
    // ... 使用数组
    delete[] arr; // 必须手动释放
    
    // 使用智能指针（现代C++）
    auto ptr = std::make_unique<int[]>(100);
    // 自动管理内存
}
```

### 借用检查器 vs 原始指针

**Rust的借用检查：**
```rust
fn main() {
    let mut v = vec![1, 2, 3];
    
    let first = &v[0]; // 不可变借用
    v.push(4); // 编译错误：可变借用与不可变借用冲突
    // println!("第一个元素: {}", first);
    
    // 正确做法
    let first = v[0]; // 拷贝值
    v.push(4);
    println!("第一个元素: {}", first);
}

// 编译时检查数据竞争
fn data_race_example() {
    let mut data = vec![1, 2, 3];
    
    // 无法同时创建可变和不可变引用
    // let reference = &data[0];
    // data.push(4); // 编译错误
}
```

**C++的指针自由：**
```cpp
#include <vector>
#include <iostream>

void data_race_example() {
    std::vector<int> data = {1, 2, 3};
    
    int& reference = data[0]; // 引用第一个元素
    data.push_back(4); // 可能导致重新分配，引用失效
    
    std::cout << reference << std::endl; // 未定义行为
}

// 多线程数据竞争
#include <thread>

void unsafe_increment(int& counter) {
    for (int i = 0; i < 1000000; ++i) {
        ++counter; // 数据竞争
    }
}

int main() {
    int counter = 0;
    
    std::thread t1(unsafe_increment, std::ref(counter));
    std::thread t2(unsafe_increment, std::ref(counter));
    
    t1.join();
    t2.join();
    
    std::cout << "Counter: " << counter << std::endl; // 结果不确定
}
```

## 类型系统对比

### 泛型实现

**Rust的trait系统：**
```rust
// 定义trait（类似接口）
pub trait Summary {
    fn summarize(&self) -> String;
    
    // 默认实现
    fn summarize_default(&self) -> String {
        String::from("(阅读更多...)")
    }
}

// 为类型实现trait
pub struct NewsArticle {
    pub headline: String,
    pub location: String,
    pub author: String,
    pub content: String,
}

impl Summary for NewsArticle {
    fn summarize(&self) -> String {
        format!("{}, 作者 {} ({})", self.headline, self.author, self.location)
    }
}

// 使用trait约束的泛型函数
pub fn notify<T: Summary>(item: &T) {
    println!("突发新闻! {}", item.summarize());
}

// 关联类型
pub trait Iterator {
    type Item; // 关联类型
    
    fn next(&mut self) -> Option<Self::Item>;
}

// 为Vec实现Iterator
impl<T> Iterator for Vec<T> {
    type Item = T;
    
    fn next(&mut self) -> Option<Self::Item> {
        if self.is_empty() {
            None
        } else {
            Some(self.remove(0))
        }
    }
}

**C++的模板系统：**
```cpp
#include <iostream>
#include <vector>
#include <concepts> // C++20概念

// 模板函数
template<typename T>
T max(T a, T b) {
    return (a > b) ? a : b;
}

// 概念约束（C++20）
template<typename T>
concept Summarizable = requires(T t) {
    { t.summarize() } -> std::convertible_to<std::string>;
};

// 使用概念约束
template<Summarizable T>
void notify(const T& item) {
    std::cout << "突发新闻! " << item.summarize() << std::endl;
}

// 类模板
template<typename T>
class Container {
private:
    T* data;
    size_t size;
    
public:
    Container(size_t s) : size(s), data(new T[s]) {}
    ~Container() { delete[] data; }
    
    T& operator[](size_t index) { return data[index]; }
};

// 特化
template<>
class Container<bool> {
    // 位向量特化实现
};
```

## 并发编程对比

### Rust的无畏并发

**基于所有权的并发安全：**
```rust
use std::thread;
use std::sync::{Arc, Mutex};

fn main() {
    // 原子引用计数 + 互斥锁
    let counter = Arc::new(Mutex::new(0));
    let mut handles = vec![];
    
    for _ in 0..10 {
        let counter = Arc::clone(&counter);
        let handle = thread::spawn(move || {
            let mut num = counter.lock().unwrap();
            *num += 1;
        });
        handles.push(handle);
    }
    
    for handle in handles {
        handle.join().unwrap();
    }
    
    println!("最终计数: {}", *counter.lock().unwrap());
}

// 消息传递并发
use std::sync::mpsc;

fn message_passing() {
    let (tx, rx) = mpsc::channel();
    
    thread::spawn(move || {
        let val = String::from("hello");
        tx.send(val).unwrap();
        // val的所有权已转移，不能再使用
    });
    
    let received = rx.recv().unwrap();
    println!("收到: {}", received);
}

// 无数据竞争的异步编程
use tokio::sync::Mutex;

async fn async_counter() {
    let counter = Arc::new(Mutex::new(0));
    
    let mut tasks = vec![];
    for _ in 0..10 {
        let counter = Arc::clone(&counter);
        tasks.push(tokio::spawn(async move {
            let mut lock = counter.lock().await;
            *lock += 1;
        }));
    }
    
    for task in tasks {
        task.await.unwrap();
    }
    
    println!("异步计数: {}", *counter.lock().await);
}
```

### C++的并发模型

**标准库并发支持：**
```cpp
#include <iostream>
#include <thread>
#include <mutex>
#include <atomic>
#include <future>

// 互斥锁保护
void mutex_example() {
    std::mutex mtx;
    int counter = 0;
    
    auto increment = [&]() {
        for (int i = 0; i < 1000000; ++i) {
            std::lock_guard<std::mutex> lock(mtx);
            ++counter;
        }
    };
    
    std::thread t1(increment);
    std::thread t2(increment);
    
    t1.join();
    t2.join();
    
    std::cout << "Counter: " << counter << std::endl;
}

// 原子操作
void atomic_example() {
    std::atomic<int> counter{0};
    
    auto increment = [&]() {
        for (int i = 0; i < 1000000; ++i) {
            counter.fetch_add(1, std::memory_order_relaxed);
        }
    };
    
    std::thread t1(increment);
    std::thread t2(increment);
    
    t1.join();
    t2.join();
    
    std::cout << "Atomic counter: " << counter.load() << std::endl;
}

// 异步编程
void async_example() {
    auto future = std::async(std::launch::async, []() {
        std::this_thread::sleep_for(std::chrono::seconds(1));
        return 42;
    });
    
    int result = future.get();
    std::cout << "异步结果: " << result << std::endl;
}

// 可能的数据竞争（编译通过，运行时错误）
void data_race() {
    int shared_data = 0;
    
    std::thread t1([&]() { shared_data = 1; });
    std::thread t2([&]() { shared_data = 2; });
    
    t1.join();
    t2.join();
    
    std::cout << "共享数据: " << shared_data << std::endl; // 结果不确定
}
```

## 错误处理对比

### Rust的Result类型

**编译时错误处理：**
```rust
use std::fs::File;
use std::io::{self, Read};

fn read_file(path: &str) -> Result<String, io::Error> {
    let mut file = File::open(path)?; // ?操作符自动传播错误
    let mut contents = String::new();
    file.read_to_string(&mut contents)?;
    Ok(contents)
}

fn main() {
    match read_file("example.txt") {
        Ok(contents) => println!("文件内容: {}", contents),
        Err(e) => println!("读取文件失败: {}", e),
    }
    
    // 使用组合子
    let result = read_file("config.txt")
        .map(|s| s.to_uppercase())
        .unwrap_or_else(|_| "默认配置".to_string());
    
    println!("配置: {}", result);
}

// 自定义错误类型
#[derive(Debug)]
enum AppError {
    Io(io::Error),
    Parse(String),
    Validation(&'static str),
}

impl From<io::Error> for AppError {
    fn from(error: io::Error) -> Self {
        AppError::Io(error)
    }
}

fn process_data() -> Result<(), AppError> {
    let data = read_file("data.txt")?;
    // 处理逻辑
    Ok(())
}
```

### C++的异常处理

**运行时异常机制：**
```cpp
#include <iostream>
#include <fstream>
#include <string>
#include <stdexcept>

std::string read_file(const std::string& path) {
    std::ifstream file(path);
    if (!file.is_open()) {
        throw std::runtime_error("无法打开文件: " + path);
    }
    
    std::string contents;
    file.seekg(0, std::ios::end);
    contents.resize(file.tellg());
    file.seekg(0, std::ios::beg);
    file.read(&contents[0], contents.size());
    
    return contents;
}

int main() {
    try {
        std::string contents = read_file("example.txt");
        std::cout << "文件内容: " << contents << std::endl;
    } catch (const std::exception& e) {
        std::cout << "读取文件失败: " << e.what() << std::endl;
    }
    
    // 无异常保证
    try {
        // 可能抛出异常的操作
        int* arr = new int[1000000000000]; // 可能抛出bad_alloc
    } catch (const std::bad_alloc& e) {
        std::cout << "内存分配失败" << std::endl;
    }
}

// 自定义异常
class AppException : public std::exception {
private:
    std::string message;
    
public:
    AppException(const std::string& msg) : message(msg) {}
    
    const char* what() const noexcept override {
        return message.c_str();
    }
};

void process_data() {
    try {
        std::string data = read_file("data.txt");
        // 处理逻辑
    } catch (const std::exception& e) {
        throw AppException("数据处理失败: " + std::string(e.what()));
    }
}
```

## 构建系统和包管理

### Cargo vs CMake/Make

**Rust的Cargo：**
```toml
# Cargo.toml
[package]
name = "my-project"
version = "0.1.0"
edition = "2021"

[dependencies]
serde = { version = "1.0", features = ["derive"] }
tokio = { version = "1.0", features = ["full"] }
reqwest = "0.11"

[dev-dependencies]
assert_eq = "0.1"

[build-dependencies]
cc = "1.0"

# 构建命令
# cargo build        # 调试构建
# cargo build --release  # 发布构建
# cargo test         # 运行测试
# cargo run          # 运行程序
# cargo doc          # 生成文档
```

**C++的构建系统：**
```cmake
# CMakeLists.txt
cmake_minimum_required(VERSION 3.10)
project(MyProject)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# 查找依赖
find_package(Boost REQUIRED COMPONENTS system filesystem)

# 添加可执行文件
add_executable(my_app main.cpp)

# 链接库
target_link_libraries(my_app PRIVATE Boost::system Boost::filesystem)

# 编译选项
target_compile_options(my_app PRIVATE -Wall -Wextra -Werror)

# 构建命令
# mkdir build && cd build
# cmake ..
# make
```

## 性能对比

### 基准测试示例

**Rust性能测试：**
```rust
use std::time::Instant;

fn fibonacci(n: u64) -> u64 {
    match n {
        0 => 0,
        1 => 1,
        _ => fibonacci(n - 1) + fibonacci(n - 2),
    }
}

fn main() {
    let start = Instant::now();
    let result = fibonacci(40);
    let duration = start.elapsed();
    
    println!("Rust Fibonacci(40) = {}, 耗时: {:?}", result, duration);
}

// 发布构建优化
// cargo build --release
```

**C++性能测试：**
```cpp
#include <iostream>
#include <chrono>

long long fibonacci(int n) {
    if (n <= 1) return n;
    return fibonacci(n - 1) + fibonacci(n - 2);
}

int main() {
    auto start = std::chrono::high_resolution_clock::now();
    long long result = fibonacci(40);
    auto end = std::chrono::high_resolution_clock::now();
    
    auto duration = std::chrono::duration_cast<std::chrono::milliseconds>(end - start);
    
    std::cout << "C++ Fibonacci(40) = " << result 
              << ", 耗时: " << duration.count() << "ms" << std::endl;
    
    return 0;
}

// 编译优化
// g++ -O3 -o fib fib.cpp
```

## 适用场景对比

### 推荐使用Rust的场景

1. **系统编程**：操作系统、设备驱动、嵌入式系统
2. **网络服务**：高性能Web服务器、网络协议栈
3. **安全关键应用**：加密算法、区块链、金融系统
4. **并发密集型应用**：实时系统、游戏引擎
5. **WebAssembly**：浏览器端高性能计算

### 推荐使用C++的场景

1. **遗留系统维护**：现有C++代码库的维护和扩展
2. **游戏开发**：Unreal Engine等游戏引擎
3. **高性能计算**：科学计算、数值模拟
4. **嵌入式系统**：资源受限的微控制器
5. **跨平台GUI**：Qt等桌面应用框架

## 迁移策略

### 从C++迁移到Rust

**渐进式迁移：**
1. **使用Rust编写新模块**：在现有C++项目中添加Rust组件
2. **FFI接口集成**：通过C接口连接Rust和C++代码
3. **逐步替换**：将性能关键或安全敏感模块重写为Rust
4. **工具支持**：使用bindgen自动生成FFI绑定

**示例迁移：**
```rust
// Rust安全模块
#[no_mangle]
pub extern "C" fn process_data_safe(data: *const u8, len: usize) -> bool {
    // 安全的Rust实现
    true
}
```

```cpp
// C++调用Rust
extern "C" bool process_data_safe(const uint8_t* data, size_t len);

class DataProcessor {
public:
    bool process(const std::vector<uint8_t>& data) {
        return process_data_safe(data.data(), data.size());
    }
};
```

## 总结

### Rust的优势
- **内存安全**：编译时保证，无运行时开销
- **并发安全**：编译时防止数据竞争
- **现代化工具链**：Cargo包管理，优秀的错误信息
- **渐进式采用**：可与现有C/C++代码集成

### C++的优势
- **成熟生态**：丰富的库和框架支持
- **性能优化**：多年的编译器优化积累
- **向后兼容**：保持与旧代码的兼容性
- **模板元编程**：强大的编译时计算能力

### 选择建议
- **新项目**：优先考虑Rust，特别是安全性和并发性要求高的场景
- **现有项目**：根据团队技能和项目需求决定是否迁移
- **混合开发**：在C++项目中使用Rust编写安全关键模块

Rust和C++都是优秀的系统编程语言，选择哪个取决于具体的项目需求、团队技能和长期维护考虑。