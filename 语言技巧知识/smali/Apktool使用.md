# Apktool使用指南

## 概述
Apktool是Android应用反编译和重新打包的核心工具，能够将APK文件解码为Smali代码和资源文件，并支持修改后重新打包。本指南详细介绍Apktool的使用方法和技巧。

## 安装配置

### 系统安装
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install apktool

# 或者手动安装最新版本
wget https://bitbucket.org/iBotPeaches/apktool/downloads/apktool_2.7.0.jar
sudo mv apktool_2.7.0.jar /usr/local/bin/apktool.jar
sudo chmod +x /usr/local/bin/apktool.jar

# 创建启动脚本
echo '#!/bin/bash
java -jar /usr/local/bin/apktool.jar "$@"' | sudo tee /usr/local/bin/apktool
sudo chmod +x /usr/local/bin/apktool
```

### 验证安装
```bash
apktool --version
# 输出: Apktool v2.7.0 - a tool for reengineering Android apk files
```

## 基础使用

### 反编译APK
```bash
# 基本反编译
apktool d app.apk

# 指定输出目录
apktool d app.apk -o output_dir

# 保留原始资源文件名（避免资源ID重命名）
apktool d app.apk -o output_dir --keep-broken-res

# 不反编译资源（只获取Smali代码）
apktool d app.apk -o output_dir -r

# 不反编译代码（只获取资源）
apktool d app.apk -o output_dir -s
```

### 重新打包APK
```bash
# 基本重新打包
apktool b output_dir -o new_app.apk

# 使用框架文件（解决资源引用问题）
apktool b output_dir -o new_app.apk -f

# 强制重新打包（即使有错误）
apktool b output_dir -o new_app.apk --force-all
```

## 目录结构分析

### 反编译后的目录结构
```
output_dir/
├── AndroidManifest.xml     # 应用清单文件
├── apktool.yml             # Apktool配置文件
├── original/               # 原始文件备份
├── res/                    # 资源文件
│   ├── layout/             # 布局文件
│   ├── values/             # 字符串、颜色等资源
│   ├── drawable/           # 图片资源
│   └── ...
├── smali/                  # 主代码目录
│   └── com/example/app/    # 包路径对应的Smali文件
├── smali_classes2/         # 额外的classes.dex
├── assets/                 # 原始资源文件
└── lib/                    # 原生库文件
```

### 重要文件说明

**apktool.yml** - 配置文件
```yaml
!!brut.androlib.meta.MetaInfo
apkFileName: app.apk
compressionType: false
doNotCompress:
- resources.arsc
- png
isFrameworkApk: false
packageInfo:
  forcedPackageId: '127'
  renameManifestPackage: null
sdkInfo:
  minSdkVersion: '21'
  targetSdkVersion: '30'
sharedLibrary: false
sparseResources: false
unknownFiles:
  classes3.dex: '8'
usesFramework:
  ids:
  - 1
  tag: null
version: 2.7.0
versionInfo:
  versionCode: '1'
  versionName: 1.0
```

## 高级功能

### 框架文件管理
```bash
# 安装框架文件（解决系统资源引用）
apktool if framework-res.apk

# 列出已安装的框架文件
apktool if -l

# 使用特定框架文件
apktool d app.apk -p /path/to/framework
```

### 资源处理技巧
```bash
# 保留原始资源ID
apktool d app.apk --keep-broken-res

# 禁用资源优化
apktool d app.apk --no-res

# 禁用代码优化
apktool d app.apk --no-src
```

## 实战案例

### 案例1：修改应用名称
```bash
# 1. 反编译APK
apktool d myapp.apk -o myapp_decoded

# 2. 修改strings.xml中的应用名称
# 编辑 myapp_decoded/res/values/strings.xml
# 将 <string name="app_name">原名称</string> 改为新名称

# 3. 重新打包
apktool b myapp_decoded -o myapp_modified.apk

# 4. 签名APK
jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 -keystore mykey.keystore myapp_modified.apk alias_name
```

### 案例2：Smali代码插桩
```bash
# 1. 反编译APK
apktool d target.apk -o target_decoded

# 2. 在Smali代码中插入日志代码
# 编辑 target_decoded/smali/com/example/MainActivity.smali
# 在onCreate方法开始处添加日志代码

# 3. 重新打包
apktool b target_decoded -o target_instrumented.apk

# 4. 签名并安装测试
```

### 案例3：资源替换
```bash
# 1. 反编译APK
apktool d game.apk -o game_decoded

# 2. 替换图标资源
cp new_icon.png game_decoded/res/drawable-hdpi/ic_launcher.png
cp new_icon.png game_decoded/res/drawable-mdpi/ic_launcher.png
# ... 替换所有尺寸的图标

# 3. 重新打包
apktool b game_decoded -o game_modified.apk
```

## 常见问题解决

### 资源引用错误
```bash
# 错误：No resource found that matches the given name
# 解决方案：安装对应的框架文件
apktool if framework-res.apk
apktool d app.apk -p ~/.local/share/apktool/framework
```

### 重新打包失败
```bash
# 错误：brut.androlib.AndrolibException
# 解决方案：使用强制模式
apktool b output_dir -o new.apk --force-all

# 或者检查资源文件完整性
apktool b output_dir -o new.apk --keep-broken-res
```

### 多DEX文件处理
```bash
# 处理包含多个classes.dex的APK
apktool d large_app.apk -o output_dir
# Apktool会自动处理smali_classes2, smali_classes3等目录
```

## 脚本自动化

### 批量处理脚本
```bash
#!/bin/bash
# batch_apktool.sh

for apk in *.apk; do
    echo "处理: $apk"
    
    # 创建输出目录
    output_dir="decoded_${apk%.apk}"
    
    # 反编译
    apktool d "$apk" -o "$output_dir"
    
    if [ $? -eq 0 ]; then
        echo "✓ $apk 反编译成功"
    else
        echo "✗ $apk 反编译失败"
    fi
done
```

### 自动化插桩脚本
```bash
#!/bin/bash
# auto_instrument.sh

APK=$1
OUTPUT_DIR="instrumented_${APK%.apk}"

# 反编译
apktool d "$APK" -o "$OUTPUT_DIR"

# 查找所有Activity文件并插入日志
find "$OUTPUT_DIR/smali" -name "*.smali" -type f | while read file; do
    # 检查是否是Activity
    if grep -q "Landroid/app/Activity;" "$file"; then
        echo "插桩: $file"
        
        # 在onCreate方法开始处插入日志
        sed -i '/\.method.*onCreate/,/^\.end method/ { /invoke-super.*onCreate/a\n    const-string v0, "Instrumentation"\n    const-string v1, "Activity created"\n    invoke-static {v0, v1}, Landroid/util/Log;->d(Ljava/lang/String;Ljava/lang/String;)I' }" "$file"
    fi
done

# 重新打包
apktool b "$OUTPUT_DIR" -o "instrumented_$APK"
```

## 安全注意事项

### 合法性检查
- 只对自有应用或授权应用进行反编译
- 遵守软件许可协议和版权法律
- 不得用于恶意目的

### 技术保护
- 某些应用可能使用加固技术，需要先脱壳
- 资源混淆的应用可能需要特殊处理
- 签名验证的应用需要绕过签名检查

## 性能优化技巧

### 加速反编译
```bash
# 禁用资源处理（如果只关注代码）
apktool d app.apk -o output_dir -r

# 使用RAM磁盘（Linux/Mac）
apktool d app.apk -o /dev/shm/output_dir

# 并行处理多个APK（使用GNU Parallel）
ls *.apk | parallel -j 4 "apktool d {} -o decoded_{/.}"
```

### 减少磁盘占用
```bash
# 只提取必要文件
apktool d app.apk -o output_dir --no-assets

# 清理临时文件
find output_dir -name "*.orig" -delete
find output_dir -name "*.keep" -delete
```

## 总结
Apktool是Android逆向工程的基础工具，掌握其使用方法对于安全分析、应用调试和功能修改至关重要。通过本指南的学习，您应该能够熟练使用Apktool进行APK的反编译和重新打包操作。