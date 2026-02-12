# Jadx使用指南

## 概述
Jadx是一款强大的Android反编译工具，能够将DEX文件直接转换为Java源代码，提供图形化界面和命令行工具。相比Smali分析，Jadx生成的Java代码更易读，适合快速理解应用逻辑。

## 安装配置

### 下载安装
```bash
# 从GitHub Releases下载最新版本
wget https://github.com/skylot/jadx/releases/download/v1.4.7/jadx-1.4.7.zip
unzip jadx-1.4.7.zip -d jadx
cd jadx/bin

# 添加执行权限
chmod +x jadx jadx-gui

# 添加到PATH（可选）
sudo ln -s $(pwd)/jadx /usr/local/bin/jadx
sudo ln -s $(pwd)/jadx-gui /usr/local/bin/jadx-gui
```

### 验证安装
```bash
jadx --version
# 输出: jadx version 1.4.7

jadx-gui --version
# 输出: jadx-gui version 1.4.7
```

## 命令行使用

### 基础反编译
```bash
# 反编译APK到目录
jadx app.apk -d output_dir

# 反编译DEX文件
jadx classes.dex -d output_dir

# 反编译多个DEX文件
jadx classes.dex classes2.dex -d output_dir
```

### 输出控制
```bash
# 只输出Java源码（不输出资源）
jadx app.apk -d output_dir --no-res

# 输出Smali代码（替代Java）
jadx app.apk -d output_dir --export-source-code false

# 输出为单个JAR文件
jadx app.apk -d app.jar --output-format jar

# 输出为Gradle项目
jadx app.apk -d output_dir --output-format gradle
```

### 反编译优化
```bash
# 启用代码反混淆（尝试恢复原始名称）
jadx app.apk -d output_dir --deobf

# 显示反编译进度
jadx app.apk -d output_dir --verbose

# 线程数控制（加速反编译）
jadx app.apk -d output_dir --threads-count 4

# 跳过无效代码
jadx app.apk -d output_dir --skip-res
```

## 图形界面使用

### 启动GUI
```bash
# 直接启动
jadx-gui

# 启动并加载APK
jadx-gui app.apk

# 指定工作目录
jadx-gui --work-dir /path/to/workspace
```

### GUI界面功能

**主界面布局**
```
左侧面板:
- 文件树: 按包结构显示类文件
- 资源树: 显示资源文件
- 搜索栏: 快速搜索类和方法

中间面板:
- 代码编辑器: 显示反编译的Java代码
- 标签页: 支持打开多个文件

右侧面板:
- 大纲视图: 显示当前类的结构
- 问题视图: 显示反编译警告和错误
```

### 常用操作

**导航功能**
- `Ctrl + Click`: 跳转到定义
- `Ctrl + B`: 返回上一个位置
- `Ctrl + F`: 在当前文件搜索
- `Ctrl + Shift + F`: 全局搜索

**代码分析**
- `Ctrl + H`: 查看类层次结构
- `Ctrl + Alt + H`: 查看方法调用层次
- `F4`: 查看类声明

## 高级功能

### 自定义反编译配置
创建配置文件 `jadx-config.json`:
```json
{
  "useImports": true,
  "debugInfo": true,
  "skipResources": false,
  "skipSources": false,
  "deobfuscationOn": true,
  "deobfuscationMinLength": 3,
  "deobfuscationMaxLength": 64,
  "escapeUnicode": false,
  "respectBytecodeAccModifiers": false,
  "exportAsGradleProject": false,
  "showInconsistentCode": true,
  "useDx": false,
  "threadsCount": 4,
  "cfgOutput": false,
  "rawCfgOutput": false
}
```

使用配置文件:
```bash
jadx app.apk -d output_dir --config jadx-config.json
```

### 批量处理脚本
```bash
#!/bin/bash
# batch_jadx.sh

for apk in *.apk; do
    echo "处理: $apk"
    
    # 创建输出目录
    output_dir="jadx_${apk%.apk}"
    
    # 反编译
    jadx "$apk" -d "$output_dir" --threads-count 4 --deobf
    
    if [ $? -eq 0 ]; then
        echo "✓ $apk 反编译成功"
        
        # 统计反编译结果
        java_files=$(find "$output_dir" -name "*.java" | wc -l)
        echo "生成 $java_files 个Java文件"
    else
        echo "✗ $apk 反编译失败"
    fi
done
```

## 实战案例

### 案例1：快速分析应用结构
```bash
# 反编译并查看主要Activity
jadx myapp.apk -d myapp_output

# 查看主Activity代码
cat myapp_output/sources/com/example/myapp/MainActivity.java | head -50

# 搜索特定功能
cd myapp_output/sources
grep -r "getLocation" . --include="*.java"
```

### 案例2：对比不同版本
```bash
# 反编译旧版本
jadx app_v1.apk -d v1_output

# 反编译新版本
jadx app_v2.apk -d v2_output

# 使用diff对比变化
diff -r v1_output/sources v2_output/sources | grep "^Only in"
```

### 案例3：提取资源文件
```bash
# 反编译并提取资源
jadx game.apk -d game_output

# 查看资源文件
ls -la game_output/resources/

# 提取图片资源
cp -r game_output/resources/res/drawable* ./extracted_images/
```

## 代码分析技巧

### 识别关键代码
```java
// 1. 查找入口点
public class MainActivity extends AppCompatActivity {
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        // 初始化代码在这里
    }
}

// 2. 识别权限使用
if (checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PERMISSION_GRANTED) {
    // 位置相关代码
}

// 3. 网络请求识别
OkHttpClient client = new OkHttpClient();
Request request = new Request.Builder().url("http://api.example.com").build();
```

### 反混淆技巧
```java
// 混淆前
public class UserManager {
    public String getUserName() { ... }
}

// 混淆后（Jadx尝试恢复）
public class a {
    public String b() { ... }
}

// 使用--deobf参数后
public class UserManager_deobf {
    public String getUserName_deobf() { ... }
}
```

## 常见问题解决

### 反编译失败
```bash
# 错误：ERROR - jadx.core.utils.exceptions.JadxRuntimeException
# 解决方案：跳过错误继续
jadx app.apk -d output_dir --skip-res --show-bad-code

# 或者使用更宽松的模式
jadx app.apk -d output_dir --no-debug-info --no-imports
```

### 内存不足
```bash
# 增加JVM内存
jadx -J-Xmx4G app.apk -d output_dir

# 或者使用更小的线程数
jadx app.apk -d output_dir --threads-count 2 -J-Xmx2G
```

### 代码质量差
```bash
# 启用更多优化选项
jadx app.apk -d output_dir --deobf --show-inconsistent-code

# 或者输出Smali代码进行手动分析
jadx app.apk -d output_dir --export-source-code false
```

## 与其他工具集成

### 与Apktool结合使用
```bash
# 先用Apktool提取资源
apktool d app.apk -o apktool_output

# 再用Jadx反编译代码
jadx app.apk -d jadx_output --no-res

# 结合使用：资源用Apktool，代码用Jadx
cp -r apktool_output/res jadx_output/resources/
```

### 与Frida结合
```bash
# 使用Jadx分析目标方法
jadx target.apk -d analysis_output

# 在分析结果中找到目标方法
# 然后使用Frida进行动态分析
frida -U -f com.example.app -l hook.js
```

## 性能优化

### 加速反编译
```bash
# 使用SSD存储
jadx app.apk -d /ssd/output_dir

# 限制输出文件数量（针对大型应用）
jadx app.apk -d output_dir --max-depth 5

# 跳过资源处理（如果只关注代码）
jadx app.apk -d output_dir --no-res
```

### 内存优化
```bash
# 调整JVM参数
jadx -J-Xms512m -J-Xmx2g app.apk -d output_dir

# 分批处理大型APK
# 先提取DEX文件，再分别反编译
unzip app.apk classes.dex
jadx classes.dex -d output_part1
unzip app.apk classes2.dex
jadx classes2.dex -d output_part2
```

## 安全注意事项

### 合法性检查
- 确保拥有反编译应用的合法权限
- 遵守软件许可协议
- 不得用于恶意目的

### 技术限制
- 加固的应用可能需要先脱壳
- 高度混淆的代码可能难以理解
- 某些保护机制可能阻止反编译

## 总结
Jadx是Android逆向工程中不可或缺的工具，它提供了从APK到可读Java代码的高质量转换。通过命令行和图形界面的灵活使用，结合其他工具，可以高效地进行应用分析和安全评估。