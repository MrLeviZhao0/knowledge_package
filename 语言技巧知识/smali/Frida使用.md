# Frida使用指南

## 概述
Frida是一款动态代码插桩工具，支持在运行时对Android应用进行Hook和修改。相比静态分析，Frida能够动态监控应用行为，绕过保护机制，是移动安全分析的强大工具。

## 安装配置

### 安装Frida
```bash
# 安装Frida客户端
pip install frida-tools

# 验证安装
frida --version

# 安装Frida-server（需要root设备）
# 下载对应架构的frida-server
wget https://github.com/frida/frida/releases/download/16.0.8/frida-server-16.0.8-android-arm64.xz
unxz frida-server-16.0.8-android-arm64.xz

# 推送到设备并启动
adb push frida-server-16.0.8-android-arm64 /data/local/tmp/
adb shell chmod +x /data/local/tmp/frida-server-16.0.8-android-arm64
adb shell /data/local/tmp/frida-server-16.0.8-android-arm64 &
```

### 环境验证
```bash
# 检查设备连接
frida-ps -U

# 列出运行中的进程
frida-ps -Uai

# 检查Frida-server是否运行
adb shell "ps | grep frida"
```

## 基础使用

### 附加到运行中的应用
```bash
# 附加到指定包名的应用
frida -U -f com.example.app -l script.js

# 附加到进程ID
frida -U -p 1234 -l script.js

# 不自动恢复进程（用于调试）
frida -U -f com.example.app --no-pause -l script.js
```

### 生成Hook脚本模板
```bash
# 生成基础Hook脚本
frida -U -f com.example.app --dump-js > template.js

# 交互式模式
frida -U -f com.example.app
```

## JavaScript Hook语法

### 基本Hook模式
```javascript
// Hook Java方法
Java.perform(function() {
    // 获取目标类
    var TargetClass = Java.use("com.example.app.TargetClass");
    
    // Hook方法
    TargetClass.targetMethod.implementation = function(param1, param2) {
        // 打印调用信息
        console.log("[*] targetMethod called with:", param1, param2);
        
        // 调用原始方法
        var result = this.targetMethod(param1, param2);
        
        // 打印返回值
        console.log("[*] targetMethod returned:", result);
        
        return result;
    };
});
```

### 方法重载处理
```javascript
// 处理重载方法
Java.perform(function() {
    var StringClass = Java.use("java.lang.String");
    
    // Hook所有String构造函数
    StringClass.$init.overload("java.lang.String").implementation = function(str) {
        console.log("[*] String constructor called with:", str);
        return this.$init(str);
    };
    
    StringClass.$init.overload("[C").implementation = function(chars) {
        console.log("[*] String constructor called with char array");
        return this.$init(chars);
    };
});
```

## 常用Hook场景

### Hook加密函数
```javascript
// Hook常见的加密方法
Java.perform(function() {
    // Hook MessageDigest
    var MessageDigest = Java.use("java.security.MessageDigest");
    
    MessageDigest.digest.overload("[B").implementation = function(input) {
        console.log("[*] MessageDigest.digest called");
        console.log("[*] Input (hex):", byteArrayToHex(input));
        
        var result = this.digest(input);
        console.log("[*] Result (hex):", byteArrayToHex(result));
        
        return result;
    };
    
    // Hook Cipher
    var Cipher = Java.use("javax.crypto.Cipher");
    
    Cipher.doFinal.overload("[B").implementation = function(input) {
        console.log("[*] Cipher.doFinal called");
        
        var result = this.doFinal(input);
        
        // 记录加密/解密数据
        send({
            type: 'cipher_data',
            input: byteArrayToHex(input),
            output: byteArrayToHex(result)
        });
        
        return result;
    };
});

// 工具函数：字节数组转十六进制
function byteArrayToHex(bytes) {
    return Array.from(bytes, function(byte) {
        return ('0' + (byte & 0xFF).toString(16)).slice(-2);
    }).join('');
}
```

### Hook网络请求
```javascript
// Hook OkHttp
Java.perform(function() {
    var OkHttpClient = Java.use("okhttp3.OkHttpClient