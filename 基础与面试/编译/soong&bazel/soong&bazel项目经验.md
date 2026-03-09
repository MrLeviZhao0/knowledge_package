# Soong & Bazel 项目经验

## 项目一：大型Android系统模块化构建优化

### 项目背景
某Android系统厂商需要构建一个高度定制化的Android系统，包含数百个系统模块和第三方组件。原有的Make构建系统构建时间超过2小时，严重影响开发效率。需要迁移到Soong并优化构建性能。

### 技术实现

#### 1. 构建系统迁移策略
```python
# 迁移计划分阶段实施
# 阶段1：核心系统模块迁移
# Android.bp 文件示例
cc_library {
    name: "libsystemcore",
    srcs: [
        "base/SystemCore.cpp",
        "utils/SystemUtils.cpp",
        "debug/DebugUtils.cpp",
    ],
    shared_libs: ["liblog", "libcutils"],
    cflags: [
        "-Wall",
        "-Werror",
        "-DLOG_TAG=\"SystemCore\"",
    ],
    export_include_dirs: ["include"],
    product_variables: {
        eng: {
            cflags: ["-DDEBUG"],
        },
    },
}

# 阶段2：服务模块迁移
android_app {
    name: "SystemService",
    srcs: ["src/**/*.java"],
    resource_dirs: ["res"],
    manifest: "AndroidManifest.xml",
    static_libs: [
        "androidx.core_core",
        "androidx.appcompat_appcompat",
    ],
    privileged: true,
    platform_apis: true,
}

# 阶段3：硬件抽象层迁移
cc_library {
    name: "libhardware_legacy",
    srcs: ["hardware/**/*.cpp"],
    shared_libs: [
        "libutils",
        "liblog",
        "libhardware",
    ],
    header_libs: ["libhardware_headers"],
    export_include_dirs: ["include"],
}
```

#### 2. 构建性能监控系统
```java
public class BuildPerformanceMonitor {
    private static final String TAG = "BuildMonitor";
    
    // 构建阶段时间记录
    private static long sParseStartTime;
    private static long sDependencyStartTime;
    private static long sNinjaGenStartTime;
    private static long sBuildStartTime;
    
    // 性能数据存储
    private static final Map<String, BuildStats> sBuildStats = new ConcurrentHashMap<>();
    
    public static void onParseStart() {
        sParseStartTime = System.currentTimeMillis();
        logEvent("Parse_Start");
    }
    
    public static void onParseEnd() {
        long duration = System.currentTimeMillis() - sParseStartTime;
        recordStageDuration("Parse", duration);
        logEvent("Parse_End", duration);
    }
    
    public static void onDependencyAnalysisStart() {
        sDependencyStartTime = System.currentTimeMillis();
        logEvent("Dependency_Analysis_Start");
    }
    
    public static void onDependencyAnalysisEnd() {
        long duration = System.currentTimeMillis() - sDependencyStartTime;
        recordStageDuration("DependencyAnalysis", duration);
        logEvent("Dependency_Analysis_End", duration);
    }
    
    public static void onNinjaGenerationStart() {
        sNinjaGenStartTime = System.currentTimeMillis();
        logEvent("Ninja_Generation_Start");
    }
    
    public static void onNinjaGenerationEnd() {
        long duration = System.currentTimeMillis() - sNinjaGenStartTime;
        recordStageDuration("NinjaGeneration", duration);
        logEvent("Ninja_Generation_End", duration);
    }
    
    public static void onBuildStart() {
        sBuildStartTime = System.currentTimeMillis();
        logEvent("Build_Start");
    }
    
    public static void onBuildEnd(boolean success) {
        long duration = System.currentTimeMillis() - sBuildStartTime;
        recordStageDuration("Build", duration);
        
        BuildStats stats = new BuildStats(duration, success);
        sBuildStats.put(generateBuildId(), stats);
        
        logEvent("Build_End", duration);
        generatePerformanceReport();
    }
    
    private static void generatePerformanceReport() {
        StringBuilder report = new StringBuilder();
        report.append("=== 构建性能报告 ===\n");
        
        for (Map.Entry<String, Long> entry : getStageDurations().entrySet()) {
            report.append(entry.getKey()).append(": ").append(entry.getValue()).append("ms\n");
        }
        
        // 上报到监控平台
        uploadToMonitoringSystem(report.toString());
    }
    
    private static class BuildStats {
        final long duration;
        final boolean success;
        
        BuildStats(long duration, boolean success) {
            this.duration = duration;
            this.success = success;
        }
    }
}
```

#### 3. 增量构建优化
```bash
#!/bin/bash
# 增量构建优化脚本

# 环境检测
detect_environment() {
    CPU_CORES=$(nproc)
    RAM_GB=$(free -g | awk 'NR==2{print $2}')
    CCACHE_SIZE="10G"
    
    if [ $RAM_GB -lt 16 ]; then
        CCACHE_SIZE="5G"
        BUILD_JOBS=$((CPU_CORES / 2))
    else
        BUILD_JOBS=$CPU_CORES
    fi
}

# 配置ccache
setup_ccache() {
    export USE_CCACHE=1
    export CCACHE_DIR="/tmp/ccache"
    ccache -M $CCACHE_SIZE
    
    # 预热常用编译结果
    ccache --zero-stats
    prewarm_cache
}

# 预热缓存
prewarm_cache() {
    # 预编译常用模块
    common_modules=("libcutils" "libutils" "liblog" "libc")
    for module in "${common_modules[@]}"; do
        make -j1 $module 2>/dev/null || true
    done
}

# 智能构建
do_build() {
    local target=$1
    local incremental=$2
    
    if [ "$incremental" = "true" ]; then
        # 增量构建
        changed_files=$(git diff --name-only HEAD~1)
        if [ -z "$changed_files" ]; then
            echo "没有文件变更，跳过构建"
            return 0
        fi
        
        # 分析变更影响
        affected_modules=$(analyze_changes "$changed_files")
        if [ -n "$affected_modules" ]; then
            echo "构建受影响模块: $affected_modules"
            make -j$BUILD_JOBS $affected_modules
        fi
    else
        # 全量构建
        echo "开始全量构建..."
        make -j$BUILD_JOBS $target
    fi
}

# 执行构建
main() {
    detect_environment
    setup_ccache
    
    local target=${1:-"all"}
    local incremental=${2:-"false"}
    
    BuildPerformanceMonitor.onBuildStart
    
    if do_build "$target" "$incremental"; then
        BuildPerformanceMonitor.onBuildEnd true
        echo "构建成功"
    else
        BuildPerformanceMonitor.onBuildEnd false
        echo "构建失败"
        exit 1
    fi
}

main "$@"
```

### 技术难点与解决方案

#### 难点1：模块依赖关系复杂
**问题**：系统模块间存在复杂的循环依赖和隐式依赖
**解决方案**：
- 使用soong-built工具分析依赖关系
- 重构模块结构，消除循环依赖
- 建立明确的导出依赖规范

#### 难点2：构建配置多样性
**问题**：不同产品版本需要不同的构建配置
**解决方案**：
- 使用product_variables支持多版本构建
- 实现配置模板和继承机制
- 建立产品配置管理系统

#### 优化效果
- **构建时间**：从2小时优化到25分钟（减少79%）
- **增量构建**：从30分钟优化到3分钟（减少90%）
- **开发效率**：每日构建次数从2次提升到10次

## 项目二：跨平台应用Bazel构建系统

### 项目背景
某互联网公司需要开发支持Android、iOS、Web的多平台应用，原有各平台独立的构建系统难以维护。需要统一使用Bazel进行跨平台构建。

### 技术实现

#### 1. 跨平台构建配置
```python
# WORKSPACE 文件配置
workspace(name = "multiplatform_app")

load("@bazel_tools//tools/build_defs/repo:http.bzl", "http_archive")

# Android SDK
android_sdk_repository(
    name = "androidsdk",
    api_level = 30,
)

# iOS工具链
http_archive(
    name = "build_bazel_rules_apple",
    sha256 = "...",
    url = "https://github.com/bazelbuild/rules_apple/releases/download/0.31.3/rules_apple.0.31.3.tar.gz",
)

# Web工具链
http_archive(
    name = "build_bazel_rules_web",
    sha256 = "...", 
    url = "https://github.com/bazelbuild/rules_web/archive/v0.3.0.tar.gz",
)

load("@build_bazel_rules_apple//apple:repositories.bzl", "apple_rules_dependencies")
apple_rules_dependencies()

load("@build_bazel_rules_web//web:repositories.bzl", "web_rules_dependencies")
web_rules_dependencies()
```

#### 2. 通用业务逻辑模块
```python
# common/BUILD 通用业务逻辑
load("@rules_java//java:defs.bzl", "java_library")

# 通用数据模型
java_library(
    name = "models",
    srcs = glob(["models/**/*.java"]),
    visibility = ["//visibility:public"],
)

# 通用工具类
java_library(
    name = "utils",
    srcs = glob(["utils/**/*.java"]),
    deps = [":models"],
    visibility = ["//visibility:public"],
)

# 业务逻辑核心
java_library(
    name = "business",
    srcs = glob(["business/**/*.java"]),
    deps = [
        ":models",
        ":utils",
        "@maven//:com_google_guava_guava",
    ],
    visibility = ["//visibility:public"],
)
```

#### 3. 平台特定实现
```python
# android/BUILD Android平台实现
load("@rules_android//android:rules.bzl", "android_library")

# Android UI组件
android_library(
    name = "ui",
    srcs = glob(["ui/**/*.java"]),
    manifest = "AndroidManifest.xml",
    resource_files = glob(["res/**"]),
    deps = [
        "//common:business",
        "@androidsdk//:appcompat",
    ],
)

# Android应用
android_binary(
    name = "app",
    manifest = "app/AndroidManifest.xml",
    deps = [":ui"],
)

# iOS/BUILD iOS平台实现
load("@build_bazel_rules_apple//apple:ios.bzl", "ios_application")

objc_library(
    name = "ios_ui",
    srcs = glob(["**/*.m"]),
    hdrs = glob(["**/*.h"]),
    deps = ["//common:business"],
)

ios_application(
    name = "app",
    bundle_id = "com.example.ios",
    families = ["iphone", "ipad"],
    infoplists = ["Info.plist"],
    deps = [":ios_ui"],
)
```

#### 4. 构建流水线配置
```python
# .bazelrc 构建配置
# 通用配置
build --disk_cache=/tmp/bazel-disk-cache
build --remote_cache=grpc://build-cache.example.com:9090
build --jobs=8

# Android特定配置
build:android --define=platform=android
build:android --copt=-DANDROID
build:android --android_cpu=arm64-v8a

# iOS特定配置
build:ios --define=platform=ios
build:ios --objc_enable_binary_stripping=true
build:ios --ios_multi_cpus=arm64

# 测试配置
build:test --config=android
build:test --test_tag_filters=android

test:ios --config=ios
test:ios --test_tag_filters=ios
```

### 技术难点与解决方案

#### 难点1：平台差异处理
**问题**：不同平台的API和构建方式差异很大
**解决方案**：
- 使用条件编译和平台宏定义
- 实现平台抽象层，隔离平台差异
- 建立统一的构建接口规范

#### 难点2：依赖管理复杂
**问题**：跨平台依赖管理复杂，容易冲突
**解决方案**：
- 使用Bazel的外部依赖管理
- 建立统一的版本管理策略
- 实现依赖冲突检测和解决机制

#### 优化效果
- **构建统一**：从3个独立构建系统统一为1个
- **代码复用**：业务逻辑代码复用率达到85%
- **构建时间**：并行构建时间减少60%
- **维护成本**：构建系统维护成本减少70%

## 项目三：持续集成环境构建优化

### 项目背景
某大型互联网公司的持续集成环境构建性能瓶颈明显，需要优化Bazel在CI环境中的构建性能。

### 技术实现

#### 1. 分布式缓存配置
```python
# CI环境Bazel配置
# .bazelrc.ci
build --remote_cache=grpc://ci-cache-01.example.com:9090
build --remote_cache=grpc://ci-cache-02.example.com:9090
build --remote_cache=grpc://ci-cache-03.example.com:9090

# 缓存策略
build --remote_upload_local_results=true
build --remote_accept_cached=true
build --remote_max_connections=100

# 重试策略
build --remote_retries=3
build --remote_timeout=300

# 性能优化
build --experimental_inmemory_dotd_files
build --experimental_inmemory_jdeps_files
build --experimental_ui_max_stdouterr_bytes=10485760

# 监控配置
build --experimental_build_event_upload_strategy=local
build --build_event_json_file=bazel-build-events.json
```

#### 2. 构建资源优化
```python
# 资源感知的构建配置
def optimize_resources_for_ci():
    """根据CI环境资源情况优化构建配置"""
    
    # 检测可用资源
    cpu_count = os.cpu_count()
    memory_gb = psutil.virtual_memory().total // (1024**3)
    
    # 动态调整构建参数
    if memory_gb < 8:
        # 低内存配置
        bazel_args = ["--jobs={}".format(min(4, cpu_count))]
        bazel_args.append("--local_ram_resources=2048")
    elif memory_gb < 16:
        # 中等内存配置
        bazel_args = ["--jobs={}".format(cpu_count)]
        bazel_args.append("--local_ram_resources=4096")
    else:
        # 高内存配置
        bazel_args = ["--jobs={}".format(cpu_count * 2)]
        bazel_args.append("--local_ram_resources=8192")
    
    return bazel_args

# 构建脚本优化
class CIBuildOptimizer:
    def __init__(self):
        self.cache_hit_ratio = 0.0
        self.build_times = []
        
    def prewarm_cache(self, common_targets):
        """预热常用构建目标"""
        for target in common_targets:
            try:
                subprocess.run([
                    "bazel", "build", "--remote_upload_local_results=false",
                    target
                ], check=False)
            except subprocess.CalledProcessError:
                # 忽略预热失败
                pass
    
    def analyze_build_performance(self, build_event_file):
        """分析构建性能"""
        with open(build_event_file, 'r') as f:
            events = json.load(f)
        
        cache_stats = self.extract_cache_stats(events)
        timing_stats = self.extract_timing_stats(events)
        
        return {
            'cache_hit_ratio': cache_stats['hit_ratio'],
            'total_duration': timing_stats['total_duration'],
            'critical_path': timing_stats['critical_path']
        }
    
    def generate_optimization_report(self):
        """生成优化报告"""
        report = {
            'cache_effectiveness': self.cache_hit_ratio,
            'average_build_time': statistics.mean(self.build_times),
            'suggestions': self.generate_suggestions()
        }
        
        return json.dumps(report, indent=2)
```

#### 3. 智能构建调度
```python
# 构建调度器
class BuildScheduler:
    def __init__(self, cache_servers):
        self.cache_servers = cache_servers
        self.server_loads = {server: 0 for server in cache_servers}
        
    def schedule_build(self, targets, priority='normal'):
        """调度构建任务"""
        
        # 选择最优缓存服务器
        best_server = self.select_best_cache_server()
        
        # 根据优先级调整构建参数
        bazel_args = self.get_bazel_args_for_priority(priority)
        bazel_args.extend(["--remote_cache=grpc://{}".format(best_server)])
        
        # 执行构建
        build_result = self.execute_build(targets, bazel_args)
        
        # 更新服务器负载
        self.update_server_load(best_server, build_result.duration)
        
        return build_result
    
    def select_best_cache_server(self):
        """选择负载最低的缓存服务器"""
        return min(self.server_loads.items(), key=lambda x: x[1])[0]
    
    def get_bazel_args_for_priority(self, priority):
        """根据优先级获取构建参数"""
        if priority == 'high':
            return ["--jobs=16", "--local_ram_resources=16384"]
        elif priority == 'normal':
            return ["--jobs=8", "--local_ram_resources=8192"]
        else:  # low
            return ["--jobs=4", "--local_ram_resources=4096"]
```

### 技术难点与解决方案

#### 难点1：缓存一致性
**问题**：分布式缓存可能出现一致性问题
**解决方案**：
- 实现缓存失效和更新机制
- 使用内容寻址存储（CAS）
- 建立缓存验证和修复流程

#### 难点2：资源竞争
**问题**：多个构建任务竞争有限资源
**解决方案**：
- 实现智能任务调度算法
- 建立资源配额和限制机制
- 监控资源使用，动态调整策略

#### 优化效果
- **构建速度**：平均构建时间减少75%
- **缓存命中率**：从40%提升到85%
- **资源利用率**：CPU和内存利用率提升60%
- **构建稳定性**：构建失败率从15%降低到2%

## 经验总结

### 成功经验
1. **渐进式迁移**：分阶段迁移构建系统，降低风险
2. **数据驱动优化**：基于性能数据指导优化方向
3. **自动化工具链**：建立完整的构建自动化工具链

### 教训总结
1. **依赖管理**：复杂的依赖关系需要提前规划
2. **团队培训**：构建系统变更需要充分的团队培训
3. **回滚机制**：重要的构建系统变更需要有回滚方案

### 最佳实践
1. **监控先行**：在优化前建立完善的监控体系
2. **小步快跑**：采用迭代式优化策略
3. **文档完善**：保持构建系统文档的及时更新
4. **社区参与**：积极参与开源社区，借鉴最佳实践