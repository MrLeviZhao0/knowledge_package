# Soong & Bazel 核心知识

## 概述

Soong和Bazel是Android构建系统的核心组件，它们共同构成了现代Android的构建基础设施。Soong是Android专用的构建系统，而Bazel是Google开源的通用构建工具，两者在Android构建中各有侧重。

### Soong简介
Soong是Android 7.0（Nougat）引入的构建系统，用于替代传统的Make构建系统。它基于Blueprint和Kati，专门为Android的复杂构建需求设计。

### Bazel简介
Bazel是Google开源的构建工具，支持多种编程语言，具有高度的可扩展性和可重现性。在Android开发中，Bazel主要用于大型项目的构建和测试。

## 核心架构

### Soong构建系统架构

#### 1. Blueprint文件
```python
# Android.bp 示例
cc_binary {
    name: "my_binary",
    srcs: ["main.cc", "utils.cc"],
    shared_libs: ["liblog"],
    static_libs: ["libutils"],
    cflags: ["-Wall", "-Werror"],
}

android_app {
    name: "MyApp",
    srcs: ["src/**/*.java"],
    resource_dirs: ["res"],
    manifest: "AndroidManifest.xml",
    static_libs: ["androidx.appcompat_appcompat"],
}
```

#### 2. Soong构建流程
```
Android.bp → Soong → ninja → 构建输出
     ↓
 依赖分析 → 构建图生成 → 并行构建
```

### Bazel构建系统架构

#### 1. BUILD文件
```python
# BUILD 示例
cc_binary(
    name = "my_binary",
    srcs = ["main.cc", "utils.cc"],
    deps = [
        "//base:log",
        "//utils:lib",
    ],
    copts = ["-Wall", "-Werror"],
)

android_binary(
    name = "MyApp",
    srcs = glob(["src/**/*.java"]),
    manifest = "AndroidManifest.xml",
    resource_files = glob(["res/**"]),
    deps = ["@androidsdk//:appcompat"],
)
```

#### 2. Bazel构建流程
```
WORKSPACE + BUILD → Bazel → 构建输出
        ↓
   依赖分析 → 动作图 → 沙箱执行
```

## 核心概念

### Soong核心概念

#### 1. 模块定义
```python
# 不同类型的模块
cc_library {        # C/C++ 库
cc_binary {         # C/C++ 可执行文件
java_library {      # Java 库
android_app {       # Android 应用
android_library {   # Android 库
filegroup {         # 文件组
```

#### 2. 属性系统
```python
cc_library {
    name: "mylib",
    srcs: ["file1.cpp", "file2.cpp"],  # 源文件
    cflags: ["-DDEBUG"],              # 编译标志
    include_dirs: ["include"],         # 头文件目录
    export_include_dirs: ["export"],  # 导出头文件
    shared_libs: ["liblog"],          # 共享库依赖
    static_libs: ["libutils"],        # 静态库依赖
}
```

#### 3. 变体支持
```python
# 多变体构建
cc_library {
    name: "mylib",
    srcs: ["common.cpp"],
    target: {
        android: {
            srcs: ["android_specific.cpp"],
            cflags: ["-DANDROID"],
        },
        host: {
            srcs: ["host_specific.cpp"],
            cflags: ["-DHOST"],
        },
    },
    product_variables: {
        eng: {
            cflags: ["-DENG"],
        },
        userdebug: {
            cflags: ["-DUSERDEBUG"],
        },
    },
}
```

### Bazel核心概念

#### 1. 规则（Rules）
```python
# 内置规则
cc_library(
    name = "mylib",
    srcs = ["file1.cpp", "file2.cpp"],
    hdrs = ["header.h"],
    visibility = ["//visibility:public"],
)

# 自定义规则
def _my_rule_impl(ctx):
    # 规则实现
    output = ctx.actions.declare_file(ctx.label.name + ".out")
    ctx.actions.run(
        inputs = ctx.files.srcs,
        outputs = [output],
        executable = ctx.executable.tool,
        arguments = ["--input"] + [f.path for f in ctx.files.srcs],
    )
    return [DefaultInfo(files = depset([output]))]

my_rule = rule(
    implementation = _my_rule_impl,
    attrs = {
        "srcs": attr.label_list(allow_files = True),
        "tool": attr.label(executable = True, cfg = "exec"),
    },
)
```

#### 2. 动作（Actions）
```python
def _compile_action(ctx):
    # 定义编译动作
    output = ctx.actions.declare_file(ctx.label.name + ".o")
    ctx.actions.run_shell(
        inputs = ctx.files.srcs,
        outputs = [output],
        command = "gcc -c {} -o {}".format(
            " ".join([f.path for f in ctx.files.srcs]),
            output.path
        ),
    )
    return output
```

#### 3. 工作区（Workspace）
```python
# WORKSPACE 文件示例
load("@bazel_tools//tools/build_defs/repo:http.bzl", "http_archive")

http_archive(
    name = "rules_android",
    sha256 = "...",
    url = "https://github.com/bazelbuild/rules_android/archive/v0.1.0.zip",
)

android_sdk_repository(name = "androidsdk")
```

## 构建流程详解

### Soong构建流程

#### 1. 解析阶段
```python
# Soong解析Android.bp文件
# 生成模块依赖图
module_graph = parse_bp_files(bp_files)
dependency_graph = build_dependency_graph(module_graph)
```

#### 2. 生成阶段
```python
# 生成ninja构建文件
ninja_file = generate_ninja_file(dependency_graph)
# 包含构建规则和依赖关系
```

#### 3. 执行阶段
```bash
# 使用ninja执行构建
ninja -f out/soong/build.ninja
```

### Bazel构建流程

#### 1. 加载阶段
```python
# 加载WORKSPACE和BUILD文件
workspace = load_workspace()
build_files = load_build_files()
```

#### 2. 分析阶段
```python
# 分析依赖关系，生成动作图
action_graph = analyze_dependencies(build_files)
# 确定构建顺序和并行策略
```

#### 3. 执行阶段
```python
# 在沙箱中执行构建动作
for action in action_graph:
    execute_in_sandbox(action)
```

## 依赖管理

### Soong依赖管理

#### 1. 模块依赖
```python
# 直接依赖
cc_library {
    name: "libA",
    shared_libs: ["libB"],  # 运行时依赖
    static_libs: ["libC"],  # 编译时依赖
}

# 传递依赖
cc_library {
    name: "libD",
    export_shared_lib_headers: ["libE"],  # 导出头文件
    export_static_libs: ["libF"],        # 导出静态库
}
```

#### 2. 变体依赖
```python
# 条件依赖
cc_library {
    name: "libG",
    target: {
        android: {
            shared_libs: ["android_lib"],
        },
        host: {
            shared_libs: ["host_lib"],
        },
    },
}
```

### Bazel依赖管理

#### 1. 标签系统
```python
# 本地依赖
deps = ["//path/to:target"]

# 外部依赖
deps = ["@external_repo//:target"]

# 文件依赖
deps = [":file.txt"]
```

#### 2. 可见性控制
```python
# 可见性规则
cc_library(
    name = "mylib",
    visibility = [
        "//visibility:public",           # 对所有目标可见
        "//my/team:__pkg__",            # 对指定包可见
        "//specific:target",            # 对特定目标可见
    ],
)
```

## 性能优化

### Soong性能优化

#### 1. 增量构建
```bash
# 只构建变更的部分
mm                    # 构建当前模块
mma                   # 构建当前模块及其依赖
mmma                  # 构建所有模块
```

#### 2. 并行构建
```bash
# 使用多核并行构建
make -j$(nproc)        # 使用所有CPU核心
ninja -j$(nproc)       # ninja原生支持并行
```

#### 3. 缓存优化
```python
# 使用ccache加速编译
cc_binary {
    name: "my_bin",
    srcs: ["*.cpp"],
    cflags: ["-g"],
    # 启用ccache
    use_ccache: true,
}
```

### Bazel性能优化

#### 1. 远程缓存
```python
# 配置远程缓存
build --remote_cache=grpc://cache.example.com:9090
build --remote_upload_local_results=true
```

#### 2. 增量构建
```bash
# 只构建变更的目标
bazel build //path/to:target

# 清理缓存
bazel clean
bazel clean --expunge  # 彻底清理
```

#### 3. 构建分析
```bash
# 分析构建性能
bazel analyze-profile profile.gz
bazel dump --skyframe=summary
```

## 调试和诊断

### Soong调试工具

#### 1. 构建信息查询
```bash
# 查询模块信息
make showcommands mymodule    # 显示构建命令
make bp2build mymodule        # 转换Android.bp
make soong_docs               # 生成文档
```

#### 2. 依赖分析
```bash
# 分析依赖关系
make deps-license mymodule    # 许可证依赖
make deps-json mymodule       # JSON格式依赖
```

### Bazel调试工具

#### 1. 查询系统
```bash
# 查询构建图
bazel query 'deps(//my:target)'          # 依赖查询
bazel query 'somepath(//a, //b)'         # 路径查询
bazel query 'kind(cc_library, //...)'    # 类型查询
```

#### 2. 调试输出
```bash
# 详细输出
bazel build --subcommands //my:target    # 显示子命令
bazel build --verbose_failures //my:target  # 详细错误
bazel build --explain=out.txt //my:target   # 解释构建决策
```

## 扩展和定制

### Soong扩展

#### 1. 自定义模块类型
```python
# 定义新模块类型
def my_module(ctx):
    # 模块实现
    return {
        "name": ctx.name,
        "srcs": ctx.srcs,
        "out": [ctx.name + ".out"],
    }

# 注册模块类型
soong_module_types += ["my_module"]
```

#### 2. 构建钩子
```python
# 构建前后钩子
def pre_build_hook():
    # 构建前执行
    pass

def post_build_hook():
    # 构建后执行
    pass
```

### Bazel扩展

#### 1. 自定义规则
```python
# 定义构建规则
def _my_android_rule_impl(ctx):
    # 规则实现
    output = ctx.actions.declare_file(ctx.label.name + ".apk")
    ctx.actions.run(
        executable = ctx.executable.builder,
        inputs = ctx.files.srcs + ctx.files.resources,
        outputs = [output],
        arguments = [f.path for f in ctx.files.srcs],
    )
    return [DefaultInfo(files = depset([output]))]

my_android_rule = rule(
    implementation = _my_android_rule_impl,
    attrs = {
        "srcs": attr.label_list(allow_files = [".java"]),
        "resources": attr.label_list(allow_files = True),
        "builder": attr.label(executable = True, cfg = "exec"),
    },
)
```

#### 2. 宏扩展
```python
# 定义宏
def my_android_app(name, srcs, resources, **kwargs):
    native.android_binary(
        name = name,
        srcs = srcs,
        resource_files = resources,
        **kwargs
    )
    
    # 额外的构建目标
    native.android_library(
        name = name + "_lib",
        srcs = srcs,
    )
```

## 最佳实践

### Soong最佳实践

#### 1. 模块设计
```python
# 模块拆分要合理
cc_library {
    name: "small_lib",      # 小模块，编译快
    srcs: ["small.cpp"],
}

cc_library {
    name: "feature_lib",    # 功能模块
    srcs: ["feature.cpp"],
    shared_libs: ["small_lib"],
}
```

#### 2. 依赖管理
```python
# 避免循环依赖
cc_library {
    name: "libA",
    # 不要直接或间接依赖自己
    shared_libs: ["libB"],
}

cc_library {
    name: "libB",
    shared_libs: ["libC"],  # 而不是libA
}
```

### Bazel最佳实践

#### 1. 构建文件组织
```python
# 每个目录一个BUILD文件
# 目标粒度适中
cc_library(
    name = "utils",
    srcs = glob(["*.cc"]),
    hdrs = glob(["*.h"]),
    visibility = ["//visibility:public"],
)
```

#### 2. 缓存策略
```python
# 合理使用缓存
config_setting(
    name = "debug",
    values = {"compilation_mode": "dbg"},
)

config_setting(
    name = "release", 
    values = {"compilation_mode": "opt"},
)
```

通过深入理解Soong和Bazel的核心概念、架构和工作原理，开发者可以更高效地进行Android应用和系统的构建、优化和调试。