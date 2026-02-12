# Android集成

## 概述
Rust在Android开发中主要用于高性能计算、加密算法、音视频处理等Native层开发。通过JNI（Java Native Interface）与Java/Kotlin代码交互，Rust可以为Android应用提供安全、高性能的底层支持。

## Rust与Android架构

### Android Native开发架构

```
Android应用架构：
┌─────────────────┐
│   Java/Kotlin   │  ← 应用层（UI、业务逻辑）
├─────────────────┤
│      JNI        │  ← Java Native Interface桥接
├─────────────────┤
│   Rust/C/C++    │  ← Native层（高性能计算）
└─────────────────┘
```

### Rust在Android中的优势

1. **内存安全**：编译时防止内存错误
2. **无GC暂停**：不影响UI线程性能
3. **高性能**：接近C/C++的性能
4. **线程安全**：编译时防止数据竞争
5. **跨平台**：一套代码支持多个架构

## 环境配置

### 安装Rust Android工具链

```bash
# 安装Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 添加Android目标
rustup target add aarch64-linux-android
rustup target add armv7-linux-androideabi
rustup target add i686-linux-android
rustup target add x86_64-linux-android

# 安装Android NDK（需要Android Studio）
# 或者手动下载NDK
wget https://dl.google.com/android/repository/android-ndk-r25b-linux.zip
unzip android-ndk-r25b-linux.zip

# 配置环境变量
export ANDROID_NDK_HOME=/path/to/android-ndk-r25b
export PATH=$ANDROID_NDK_HOME/toolchains/llvm/prebuilt/linux-x86_64/bin:$PATH
```

### Cargo配置

在项目根目录创建 `.cargo/config.toml`：

```toml
[target.aarch64-linux-android]
ar = "aarch64-linux-android-ar"
linker = "aarch64-linux-android30-clang"

[target.armv7-linux-androideabi]
ar = "arm-linux-androideabi-ar"
linker = "armv7a-linux-androideabi30-clang"

[target.i686-linux-android]
ar = "i686-linux-android-ar"
linker = "i686-linux-android30-clang"

[target.x86_64-linux-android]
ar = "x86_64-linux-android-ar"
linker = "x86_64-linux-android30-clang"
```

## JNI集成

### 基本JNI项目结构

```
android-rust-demo/
├── android/                 # Android项目
│   ├── app/
│   │   └── src/main/
│   │       ├── java/
│   │       └── jniLibs/    # 生成的.so文件
│   └── build.gradle
├── rust/                    # Rust库
│   ├── src/
│   │   └── lib.rs
│   ├── Cargo.toml
│   └── build.rs
└── build.sh                 # 构建脚本
```

### Rust JNI库实现

**Cargo.toml配置：**
```toml
[package]
name = "android-rust"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib"]

[dependencies]
jni = "0.21"

[build-dependencies]
cc = "1.0"
```

**Rust JNI代码：**
```rust
// src/lib.rs
use jni::JNIEnv;
use jni::objects::{JClass, JString};
use jni::sys::jstring;

// 导出JNI函数（遵循JNI命名规范）
#[no_mangle]
pub extern "system" fn Java_com_example_androidrust_MainActivity_helloFromRust(
    env: JNIEnv,
    _class: JClass,
    input: JString,
) -> jstring {
    // 将Java字符串转换为Rust字符串
    let input: String = env.get_string(input)
        .expect("Couldn't get java string!")
        .into();
    
    // 处理逻辑
    let output = format!("Hello from Rust: {}", input);
    
    // 将Rust字符串转换为Java字符串并返回
    env.new_string(output)
        .expect("Couldn't create java string!")
        .into_inner()
}

// 数学计算示例
#[no_mangle]
pub extern "system" fn Java_com_example_androidrust_MathUtils_calculateFibonacci(
    _env: JNIEnv,
    _class: JClass,
    n: i32,
) -> i64 {
    fibonacci(n as u64)
}

fn fibonacci(n: u64) -> i64 {
    match n {
        0 => 0,
        1 => 1,
        _ => fibonacci(n - 1) + fibonacci(n - 2),
    }
}

// 图像处理示例
#[no_mangle]
pub extern "system" fn Java_com_example_androidrust_ImageProcessor_processImage(
    env: JNIEnv,
    _class: JClass,
    input_array: jni::sys::jintArray,
    width: i32,
    height: i32,
) -> jni::sys::jintArray {
    // 获取输入数组
    let input = env.get_int_array_elements(input_array, jni::objects::ReleaseMode::NoCopyBack)
        .expect("Couldn't get input array");
    
    // 处理图像（示例：灰度化）
    let mut output = vec![0i32; (width * height) as usize];
    
    for i in 0..(width * height) as usize {
        let pixel = input[i] as u32;
        let r = (pixel >> 16) & 0xFF;
        let g = (pixel >> 8) & 0xFF;
        let b = pixel & 0xFF;
        let gray = (0.299 * r as f32 + 0.587 * g as f32 + 0.114 * b as f32) as u32;
        output[i] = ((gray << 16) | (gray << 8) | gray) as i32;
    }
    
    // 创建返回数组
    let result = env.new_int_array((width * height) as i32)
        .expect("Couldn't create result array");
    
    env.set_int_array_region(result, 0, &output)
        .expect("Couldn't set array region");
    
    result.into_inner()
}
```

### Android Java代码

**MainActivity.java：**
```java
package com.example.androidrust;

import android.os.Bundle;
import android.widget.TextView;
import androidx.appcompat.app.AppCompatActivity;

public class MainActivity extends AppCompatActivity {
    
    static {
        System.loadLibrary("androidrust"); // 加载Rust库
    }
    
    // 声明Native方法
    public native String helloFromRust(String input);
    public native long calculateFibonacci(int n);
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        
        TextView textView = findViewById(R.id.text_view);
        
        // 调用Rust函数
        String result = helloFromRust("Android");
        long fib = calculateFibonacci(10);
        
        textView.setText(result + "\nFibonacci(10) = " + fib);
    }
}
```

**MathUtils.java：**
```java
package com.example.androidrust;

public class MathUtils {
    public native static long calculateFibonacci(int n);
}
```

## 构建系统集成

### 自动化构建脚本

**build.sh：**
```bash
#!/bin/bash

# 设置变量
PROJECT_ROOT=$(pwd)
RUST_DIR="$PROJECT_ROOT/rust"
ANDROID_DIR="$PROJECT_ROOT/android"
TARGETS=("aarch64-linux-android" "armv7-linux-androideabi" "x86_64-linux-android" "i686-linux-android")

# 清理之前的构建
rm -rf $ANDROID_DIR/app/src/main/jniLibs

# 为每个目标架构构建
for target in "${TARGETS[@]}"; do
    echo "Building for $target..."
    
    cd $RUST_DIR
    cargo build --target $target --release
    
    # 复制.so文件到Android项目
    mkdir -p $ANDROID_DIR/app/src/main/jniLibs/$(echo $target | sed 's/-linux-android//' | sed 's/armv7/arm/')/
    cp $RUST_DIR/target/$target/release/libandroidrust.so \
       $ANDROID_DIR/app/src/main/jniLibs/$(echo $target | sed 's/-linux-android//' | sed 's/armv7/arm/')/
       
    echo "Built for $target"
done

echo "Build completed!"
```

### Gradle集成

**app/build.gradle：**
```gradle
android {
    // ... 其他配置
    
    sourceSets {
        main {
            jniLibs.srcDirs = ['src/main/jniLibs']
        }
    }
    
    externalNativeBuild {
        cmake {
            path "src/main/cpp/CMakeLists.txt"
        }
    }
}

// 添加构建任务
task buildRust(type: Exec) {
    workingDir '../rust'
    commandLine './build.sh'
}

preBuild.dependsOn buildRust
```

## 高级集成模式

### 使用cargo-ndk

**安装cargo-ndk：**
```bash
cargo install cargo-ndk
```

**简化构建：**
```bash
# 自动构建所有Android目标
cargo ndk -t arm64-v8a -t armeabi-v7a -t x86 -t x86_64 build --release

# 复制到Android项目
cp target/arm64-v8a/release/lib*.so android/app/src/main/jniLibs/arm64-v8a/
cp target/armeabi-v7a/release/lib*.so android/app/src/main/jniLibs/armeabi-v7a/
```

### 使用Rust Android Gradle插件

**build.gradle配置：**
```gradle
plugins {
    id 'org.mozilla.rust-android-gradle.rust-android' version '0.9.3'
}

android {
    // ... Android配置
}

cargo {
    module = "../rust"  // Rust库目录
    libname = "androidrust"
    targets = ["arm", "arm64", "x86", "x86_64"]
    profile = "release"
    
    // 依赖库配置
    dependencies {
        implementation 'org.jetbrains.kotlin:kotlin-stdlib:1.8.0'
    }
}

// 将Rust构建任务添加到构建流程
preBuild.dependsOn cargoBuild
```

## 性能优化

### 减少JNI调用开销

```rust
// 不好的做法：频繁JNI调用
#[no_mangle]
pub extern "system" fn processSingleItem(
    env: JNIEnv,
    _class: JClass,
    item: i32,
) -> i32 {
    item * 2
}

// 好的做法：批量处理
#[no_mangle]
pub extern "system" fn processBatch(
    env: JNIEnv,
    _class: JClass,
    items: jni::sys::jintArray,
    count: i32,
) -> jni::sys::jintArray {
    let input = env.get_int_array_elements(items, jni::objects::ReleaseMode::NoCopyBack)
        .expect("Couldn't get input array");
    
    let mut output = vec![0i32; count as usize];
    
    for i in 0..count as usize {
        output[i] = input[i] * 2;
    }
    
    let result = env.new_int_array(count).expect("Couldn't create result array");
    env.set_int_array_region(result, 0, &output).expect("Couldn't set array region");
    result.into_inner()
}
```

### 内存管理优化

```rust
// 使用Arena分配器减少内存分配
use std::alloc::{GlobalAlloc, System};

#[global_allocator]
static ALLOCATOR: System = System;

// 预分配内存
struct ImageBuffer {
    data: Vec<u8>,
    width: usize,
    height: usize,
}

impl ImageBuffer {
    fn new(width: usize, height: usize) -> Self {
        let capacity = width * height * 4; // RGBA
        Self {
            data: vec![0u8; capacity],
            width,
            height,
        }
    }
    
    fn process(&mut self) {
        // 重用已分配的内存
        for pixel in self.data.chunks_exact_mut(4) {
            // 处理每个像素
            pixel[0] = pixel[0].saturating_add(10); // R
            pixel[1] = pixel[1].saturating_add(10); // G
            pixel[2] = pixel[2].saturating_add(10); // B
            // A保持不变
        }
    }
}
```

## 安全考虑

### 异常处理

```rust
#[no_mangle]
pub extern "system" fn safeNativeCall(
    env: JNIEnv,
    _class: JClass,
    input: JString,
) -> jstring {
    // 使用Result处理错误
    let result: Result<jstring, jni::errors::Error> = (|| {
        let input_str: String = env.get_string(input)?.into();
        
        if input_str.is_empty() {
            return Err(jni::errors::Error::JavaException);
        }
        
        let output = format!("Processed: {}", input_str);
        Ok(env.new_string(output)?.into_inner())
    })();
    
    match result {
        Ok(s) => s,
        Err(e) => {
            // 抛出Java异常
            env.throw_new("java/lang/IllegalArgumentException", "Invalid input")
                .expect("Couldn't throw exception");
            std::ptr::null_mut()
        }
    }
}
```

### 资源清理

```rust
// 实现Drop trait确保资源释放
struct NativeResource {
    data: *mut libc::c_void,
}

impl NativeResource {
    fn new() -> Result<Self, &'static str> {
        unsafe {
            let data = libc::malloc(1024);
            if data.is_null() {
                return Err("Memory allocation failed");
            }
            Ok(Self { data })
        }
    }
}

impl Drop for NativeResource {
    fn drop(&mut self) {
        unsafe {
            libc::free(self.data);
        }
    }
}

// 在JNI函数中使用
#[no_mangle]
pub extern "system" fn createResource(_env: JNIEnv, _class: JClass) -> jlong {
    match NativeResource::new() {
        Ok(resource) => Box::into_raw(Box::new(resource)) as jlong,
        Err(_) => 0,
    }
}

#[no_mangle]
pub extern "system" fn releaseResource(_env: JNIEnv, _class: JClass, ptr: jlong) {
    if ptr != 0 {
        unsafe {
            let _ = Box::from_raw(ptr as *mut NativeResource);
        }
    }
}
```

## 实际应用案例

### Android模块中使用Rust

**加密模块示例：**
```rust
use ring::{aead, rand};

#[no_mangle]
pub extern "system" fn Java_com_example_crypto_CryptoModule_encryptData(
    env: JNIEnv,
    _class: JClass,
    data: jni::sys::jbyteArray,
    key: jni::sys::jbyteArray,
) -> jni::sys::jbyteArray {
    let data_bytes = env.convert_byte_array(data).expect("Invalid data array");
    let key_bytes = env.convert_byte_array(key).expect("Invalid key array");
    
    let sealing_key = aead::SealingKey::new(&aead::AES_256_GCM, &key_bytes)
        .expect("Invalid key");
    
    let mut in_out = data_bytes.to_vec();
    let rng = rand::SystemRandom::new();
    let nonce = aead::Nonce::assume_unique_for_key([0u8; aead::NONCE_LEN]);
    
    aead::seal_in_place(&sealing_key, nonce, aead::Aad::empty(), &mut in_out, aead::TAG_LEN)
        .expect("Encryption failed");
    
    env.byte_array_from_slice(&in_out).expect("Couldn't create result array")
}
```

### 性能对比测试

**Java vs Rust性能测试：**
```java
// Java实现
public long javaFibonacci(int n) {
    if (n <= 1) return n;
    return javaFibonacci(n - 1) + javaFibonacci(n - 2);
}

// 调用Rust实现
public native long rustFibonacci(int n);

// 测试代码
long start = System.nanoTime();
long result1 = javaFibonacci(40);
long javaTime = System.nanoTime() - start;

start = System.nanoTime();
long result2 = rustFibonacci(40);
long rustTime = System.nanoTime() - start;

Log.d("Performance", "Java: " + javaTime + " ns, Rust: " + rustTime + " ns");
```

## 总结

Rust在Android集成中提供了：

1. **高性能Native代码**：接近C/C++的性能
2. **内存安全保证**：编译时防止内存错误
3. **线程安全**：无数据竞争的并发编程
4. **现代化工具链**：完善的构建和部署工具
5. **与现有生态集成**：通过JNI与Java/Kotlin无缝交互

通过合理使用Rust，可以在保持Android应用架构的同时，显著提升关键模块的性能和安全性。