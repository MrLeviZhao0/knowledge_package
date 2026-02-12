# JNI核心知识

## 概述

JNI（Java Native Interface）是Java平台提供的本地编程接口，允许Java代码与本地代码（C/C++）相互调用。在Android开发中，JNI是实现高性能计算、复用现有C/C++库、访问系统底层功能的关键技术。

### JNI的主要作用
1. **性能优化**：执行计算密集型任务
2. **代码复用**：复用现有的C/C++库
3. **系统访问**：访问操作系统底层功能
4. **硬件控制**：直接控制硬件设备

## 核心架构

### JNI接口架构
```
Java层 (Java/Kotlin) ←→ JNI接口层 ←→ Native层 (C/C++)
        ↓                    ↓              ↓
    Java虚拟机           JNIEnv指针      本地库
```

### JNI数据类型映射

#### 基本类型映射
| Java类型 | JNI类型 | C/C++类型 | 描述 |
|---------|---------|-----------|------|
| boolean | jboolean | unsigned char | 8位布尔值 |
| byte    | jbyte   | signed char | 8位有符号整数 |
| char    | jchar   | unsigned short | 16位无符号整数 |
| short   | jshort  | short | 16位有符号整数 |
| int     | jint    | int | 32位有符号整数 |
| long    | jlong   | long long | 64位有符号整数 |
| float   | jfloat  | float | 32位浮点数 |
| double  | jdouble | double | 64位浮点数 |
| void    | void    | void | 无类型 |

#### 引用类型映射
| Java类型 | JNI类型 | 描述 |
|---------|---------|------|
| Object  | jobject | 任意Java对象 |
| String  | jstring | Java字符串对象 |
| Class   | jclass  | Java类对象 |
| Throwable | jthrowable | Java异常对象 |
| Object[] | jobjectArray | Java对象数组 |
| boolean[] | jbooleanArray | 布尔数组 |
| byte[]  | jbyteArray | 字节数组 |

## JNIEnv详解

### JNIEnv结构体
JNIEnv是JNI接口的核心，它提供了访问Java虚拟机功能的所有方法。

```c
// JNIEnv的定义（简化版）
struct JNIEnv_ {
    // 版本信息
    const struct JNINativeInterface_ *functions;
    
    // 方法表指针
    void *reserved0;
    void *reserved1;
    void *reserved2;
};

// 实际的方法接口
struct JNINativeInterface_ {
    // 版本和异常处理
    jint (JNICALL *GetVersion)(JNIEnv *env);
    jthrowable (JNICALL *ExceptionOccurred)(JNIEnv *env);
    void (JNICALL *ExceptionClear)(JNIEnv *env);
    
    // 对象操作
    jobject (JNICALL *NewGlobalRef)(JNIEnv *env, jobject obj);
    void (JNICALL *DeleteGlobalRef)(JNIEnv *env, jobject globalRef);
    jobject (JNICALL *NewLocalRef)(JNIEnv *env, jobject ref);
    void (JNICALL *DeleteLocalRef)(JNIEnv *env, jobject localRef);
    
    // 字符串操作
    jstring (JNICALL *NewStringUTF)(JNIEnv *env, const char *bytes);
    const char* (JNICALL *GetStringUTFChars)(JNIEnv *env, jstring string, jboolean *isCopy);
    void (JNICALL *ReleaseStringUTFChars)(JNIEnv *env, jstring string, const char *utf);
    
    // 数组操作
    jsize (JNICALL *GetArrayLength)(JNIEnv *env, jarray array);
    jbyteArray (JNICALL *NewByteArray)(JNIEnv *env, jsize len);
    jbyte* (JNICALL *GetByteArrayElements)(JNIEnv *env, jbyteArray array, jboolean *isCopy);
    void (JNICALL *ReleaseByteArrayElements)(JNIEnv *env, jbyteArray array, jbyte *elems, jint mode);
    
    // 字段和方法操作
    jfieldID (JNICALL *GetFieldID)(JNIEnv *env, jclass clazz, const char *name, const char *sig);
    jmethodID (JNICALL *GetMethodID)(JNIEnv *env, jclass clazz, const char *name, const char *sig);
    
    // 调用方法
    jobject (JNICALL *CallObjectMethod)(JNIEnv *env, jobject obj, jmethodID methodID, ...);
    jint (JNICALL *CallIntMethod)(JNIEnv *env, jobject obj, jmethodID methodID, ...);
    void (JNICALL *CallVoidMethod)(JNIEnv *env, jobject obj, jmethodID methodID, ...);
    
    // 静态方法调用
    jobject (JNICALL *CallStaticObjectMethod)(JNIEnv *env, jclass clazz, jmethodID methodID, ...);
    jint (JNICALL *CallStaticIntMethod)(JNIEnv *env, jclass clazz, jmethodID methodID, ...);
};
```

### JNIEnv关键方法详解

#### 1. 异常处理相关
```c
// 检查是否有异常发生
jthrowable exception = (*env)->ExceptionOccurred(env);
if (exception) {
    // 清除异常
    (*env)->ExceptionClear(env);
    // 或者抛出新的异常
    (*env)->ThrowNew(env, (*env)->FindClass(env, "java/lang/Exception"), "JNI error");
}

// 检查异常并返回
if ((*env)->ExceptionCheck(env)) {
    return; // 直接返回，让Java层处理异常
}
```

#### 2. 引用管理相关
```c
// 创建全局引用（跨多个JNI调用）
jobject globalRef = (*env)->NewGlobalRef(env, localObject);

// 创建局部引用（在当前JNI调用有效）
jobject localRef = (*env)->NewLocalRef(env, existingObject);

// 释放引用
(*env)->DeleteGlobalRef(env, globalRef);
(*env)->DeleteLocalRef(env, localRef);

// 弱全局引用（不阻止GC）
jobject weakRef = (*env)->NewWeakGlobalRef(env, object);
(*env)->DeleteWeakGlobalRef(env, weakRef);
```

#### 3. 字符串操作相关
```c
// 创建Java字符串
jstring javaString = (*env)->NewStringUTF(env, "Hello from JNI");

// 获取C字符串（需要释放）
const char* cString = (*env)->GetStringUTFChars(env, javaString, NULL);
if (cString != NULL) {
    printf("String: %s\n", cString);
    // 必须释放
    (*env)->ReleaseStringUTFChars(env, javaString, cString);
}

// 获取字符串长度
jsize length = (*env)->GetStringLength(env, javaString);
jsize utfLength = (*env)->GetStringUTFLength(env, javaString);
```

#### 4. 数组操作相关
```c
// 创建数组
jintArray intArray = (*env)->NewIntArray(env, 10);

// 获取数组元素指针
jint* elements = (*env)->GetIntArrayElements(env, intArray, NULL);
if (elements != NULL) {
    for (int i = 0; i < 10; i++) {
        elements[i] = i * 2;
    }
    // 释放数组元素
    (*env)->ReleaseIntArrayElements(env, intArray, elements, 0);
}

// 直接设置数组区域
jint buffer[10] = {0, 1, 2, 3, 4, 5, 6, 7, 8, 9};
(*env)->SetIntArrayRegion(env, intArray, 0, 10, buffer);
```

#### 5. 字段和方法操作
```c
// 获取类引用
jclass clazz = (*env)->GetObjectClass(env, obj);

// 获取字段ID
jfieldID fieldId = (*env)->GetFieldID(env, clazz, "fieldName", "I"); // I表示int类型

// 获取方法ID
jmethodID methodId = (*env)->GetMethodID(env, clazz, "methodName", "(I)V"); // (I)V表示参数int，返回void

// 调用方法
(*env)->CallVoidMethod(env, obj, methodId, 123);

// 获取/设置字段值
jint value = (*env)->GetIntField(env, obj, fieldId);
(*env)->SetIntField(env, obj, fieldId, 456);
```

## JNI方法签名

### 基本类型签名
| 类型 | 签名 | 示例 |
|-----|------|------|
| boolean | Z | (Z)V → void method(boolean) |
| byte | B | (B)I → int method(byte) |
| char | C | (C)Z → boolean method(char) |
| short | S | (S)V → void method(short) |
| int | I | (I)I → int method(int) |
| long | J | (J)J → long method(long) |
| float | F | (F)F → float method(float) |
| double | D | (D)D → double method(double) |
| void | V | ()V → void method() |

### 引用类型签名
| 类型 | 签名 | 示例 |
|-----|------|------|
| 类 | L包名/类名; | Ljava/lang/String; |
| 数组 | [类型 | [I → int[] |
| 方法 | (参数类型)返回类型 | (ILjava/lang/String;)V |

### 复杂签名示例
```java
// Java方法签名示例
String method(int a, String b, boolean c);
// JNI签名: (ILjava/lang/String;Z)Ljava/lang/String;

void method(int[] array, Object obj);
// JNI签名: ([ILjava/lang/Object;)V

static native long[] processData(byte[] data, int offset, int length);
// JNI签名: ([BII)[J
```

## JNI开发流程

### 1. Java层声明
```java
public class NativeLib {
    // 加载本地库
    static {
        System.loadLibrary("native-lib");
    }
    
    // 声明native方法
    public static native String stringFromJNI();
    public native int processData(byte[] data);
    public static native void callbackToJava(String message);
}
```

### 2. 生成头文件
```bash
# 使用javac生成头文件
javac -h . NativeLib.java
```

### 3. C/C++实现
```c
#include <jni.h>
#include "NativeLib.h"

JNIEXPORT jstring JNICALL
Java_com_example_NativeLib_stringFromJNI(JNIEnv *env, jclass clazz) {
    return (*env)->NewStringUTF(env, "Hello from JNI!");
}

JNIEXPORT jint JNICALL
Java_com_example_NativeLib_processData(JNIEnv *env, jobject thiz, jbyteArray data) {
    jsize length = (*env)->GetArrayLength(env, data);
    jbyte* buffer = (*env)->GetByteArrayElements(env, data, NULL);
    
    if (buffer == NULL) {
        return -1; // 内存不足
    }
    
    // 处理数据
    int result = process_buffer(buffer, length);
    
    // 释放数组元素
    (*env)->ReleaseByteArrayElements(env, data, buffer, JNI_ABORT);
    
    return result;
}
```

### 4. 构建配置（Android.mk）
```makefile
LOCAL_PATH := $(call my-dir)

include $(CLEAR_VARS)

LOCAL_MODULE := native-lib
LOCAL_SRC_FILES := native-lib.cpp
LOCAL_LDLIBS := -llog

include $(BUILD_SHARED_LIBRARY)
```

## 性能优化

### 1. 减少JNI调用开销
```c
// 不好的做法：频繁调用JNI方法
for (int i = 0; i < 1000; i++) {
    jint element = (*env)->GetIntArrayElements(env, array, NULL);
    // 处理单个元素
    (*env)->ReleaseIntArrayElements(env, array, element, 0);
}

// 好的做法：批量处理
jint* elements = (*env)->GetIntArrayElements(env, array, NULL);
for (int i = 0; i < 1000; i++) {
    // 处理所有元素
    process_element(&elements[i]);
}
(*env)->ReleaseIntArrayElements(env, array, elements, 0);
```

### 2. 缓存字段和方法ID
```c
// 全局缓存字段和方法ID
static jfieldID g_fieldId = NULL;
static jmethodID g_methodId = NULL;

JNIEXPORT void JNICALL
Java_com_example_NativeLib_init(JNIEnv *env, jclass clazz) {
    // 初始化时缓存ID
    if (g_fieldId == NULL) {
        g_fieldId = (*env)->GetFieldID(env, clazz, "mData", "I");
    }
    if (g_methodId == NULL) {
        g_methodId = (*env)->GetMethodID(env, clazz, "onDataProcessed", "(I)V");
    }
}
```

### 3. 使用直接缓冲区
```c
// 使用NIO直接缓冲区，避免拷贝
jobject directBuffer = (*env)->NewDirectByteBuffer(env, data, size);

// 获取直接缓冲区地址
void* bufferAddress = (*env)->GetDirectBufferAddress(env, directBuffer);
jsize bufferSize = (*env)->GetDirectBufferCapacity(env, directBuffer);
```

## 内存管理

### 1. 引用类型管理
```c
// 局部引用：自动管理，但过多会导致问题
for (int i = 0; i < 1000; i++) {
    jobject obj = (*env)->NewObject(env, clazz, constructorId);
    // 需要手动删除局部引用
    (*env)->DeleteLocalRef(env, obj);
}

// 全局引用：需要手动管理
jobject globalObj = (*env)->NewGlobalRef(env, localObj);
// 使用完毕后必须删除
(*env)->DeleteGlobalRef(env, globalObj);
```

### 2. 内存泄漏检测
```c
// 检查JNI内存使用
void check_memory_usage(JNIEnv* env) {
    // 实现内存使用统计和泄漏检测
}
```

## 调试技巧

### 1. 日志输出
```c
#include <android/log.h>

#define LOG_TAG "NativeLib"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)

JNIEXPORT void JNICALL
Java_com_example_NativeLib_debugMethod(JNIEnv *env, jobject thiz) {
    LOGI("Debug method called");
    
    // 检查JNIEnv是否有效
    if (env == NULL) {
        LOGE("JNIEnv is NULL!");
        return;
    }
}
```

### 2. 异常调试
```c
JNIEXPORT void JNICALL
Java_com_example_NativeLib_safeMethod(JNIEnv *env, jobject thiz) {
    // 检查异常
    if ((*env)->ExceptionCheck(env)) {
        jthrowable exception = (*env)->ExceptionOccurred(env);
        (*env)->ExceptionClear(env);
        
        // 记录异常信息
        jclass exceptionClass = (*env)->GetObjectClass(env, exception);
        jmethodID getMessage = (*env)->GetMethodID(env, exceptionClass, "getMessage", "()Ljava/lang/String;");
        jstring message = (*env)->CallObjectMethod(env, exception, getMessage);
        
        const char* msg = (*env)->GetStringUTFChars(env, message, NULL);
        LOGE("JNI Exception: %s", msg);
        (*env)->ReleaseStringUTFChars(env, message, msg);
    }
}
```

通过深入理解JNI的核心概念、JNIEnv的使用方法以及性能优化技巧，开发者可以编写出高效、稳定的本地代码，充分发挥Android平台的性能优势。