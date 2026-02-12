# PKMS核心知识_概述与数据结构

## 概述

PackageManagerService（PKMS）是Android系统中负责应用包管理的核心服务，负责应用的安装、卸载、更新、权限管理、组件解析等关键功能。PKMS是Android安全架构的基础，确保只有经过验证的应用才能在系统中运行。

### PKMS的主要职责
1. **应用包管理**：管理APK包的安装、卸载、更新操作
2. **组件解析**：解析应用中的Activity、Service、BroadcastReceiver、ContentProvider
3. **权限管理**：管理应用权限的授予、撤销和验证
4. **签名验证**：验证应用签名，确保应用来源可信
5. **资源管理**：管理应用资源访问和资源重叠（overlay）
6. **多用户支持**：支持多用户环境下的应用隔离和管理

## 核心数据结构

### 1. PackageParser.Package
PackageParser.Package代表一个已解析的应用包，包含应用的所有元数据信息。

```java
// PackageParser.Package 核心数据结构
public static class Package {
    // 包基本信息
    public String packageName;              // 包名
    public String baseCodePath;             // 基础代码路径
    public String codePath;                 // 代码路径
    public String resourcePath;             // 资源路径
    public String nativeLibraryPath;        // 原生库路径
    public String primaryCpuAbi;           // 主CPU ABI
    public String secondaryCpuAbi;          // 次CPU ABI
    
    // 版本信息
    public int versionCode;                 // 版本代码
    public String versionName;              // 版本名称
    public int minSdkVersion;               // 最小SDK版本
    public int targetSdkVersion;            // 目标SDK版本
    
    // 应用信息
    public ApplicationInfo applicationInfo; // 应用信息
    public String[] splitNames;             // 分包名称
    public String[] splitCodePaths;         // 分包路径
    
    // 组件信息
    public ArrayList<Activity> activities;           // Activity列表
    public ArrayList<Activity> receivers;           // BroadcastReceiver列表
    public ArrayList<Provider> providers;           // ContentProvider列表
    public ArrayList<Service> services;              // Service列表
    public ArrayList<Instrumentation> instrumentation; // Instrumentation列表
    public ArrayList<PermissionGroup> permissionGroups; // 权限组列表
    public ArrayList<Permission> permissions;        // 权限列表
    
    // 权限信息
    public ArrayList<String> requestedPermissions;    // 请求的权限
    public int[] requestedPermissionsFlags;          // 权限标志
    
    // 配置信息
    public ArrayList<ConfigurationInfo> configPreferences; // 配置偏好
    public ArrayList<FeatureInfo> reqFeatures;      // 需求特性
    
    // 签名信息
    public SigningDetails signingDetails;           // 签名详情
    public KeySetManagerService.KeySet keySet;      // 密钥集
    
    // 安装信息
    public long firstInstallTime;           // 首次安装时间
    public long lastUpdateTime;             // 最后更新时间
    public int installLocation;             // 安装位置
    public boolean coreApp;                 // 是否为核心应用
    
    // 用户信息
    public int[] gids;                      // 组ID
    public int mExtras;                     // 扩展信息
    
    // 方法定义
    public boolean isSystemApp();           // 是否是系统应用
    public boolean isUpdatedSystemApp();    // 是否是更新的系统应用
    public boolean isPrivilegedApp();      // 是否是特权应用
    public boolean isOemApp();              // 是否是OEM应用
    public boolean isVendorApp();           // 是否是厂商应用
    public boolean isProductApp();          // 是否是产品应用
}
```

### 2. PackageSetting
PackageSetting存储应用的安装设置和状态信息。

```java
// PackageSetting 核心数据结构
public class PackageSetting extends PackageSettingBase {
    // 包基本信息
    public PackageParser.Package pkg;       // 对应的包信息
    public String realName;                 // 真实包名
    
    // 安装状态
    public int installStatus;              // 安装状态
    public boolean installed;              // 是否已安装
    public boolean stopped;                // 是否已停止
    public boolean notLaunched;             // 是否未启动
    public boolean hidden;                 // 是否隐藏
    
    // 权限状态
    public PermissionsState permissionsState; // 权限状态
    public ArrayMap<String, Integer> grantedPermissions; // 已授予权限
    
    // 用户状态
    public int[] currentEnabledState;       // 当前启用状态
    public int enabled;                    // 启用状态
    public int enabledSetting;             // 启用设置
    public String disabledComponents[];    // 禁用组件
    public String enabledComponents[];     // 启用组件
    
    // 安装信息
    public long timeStamp;                 // 时间戳
    public long firstInstallTime;          // 首次安装时间
    public long lastUpdateTime;            // 最后更新时间
    public String installerPackageName;    // 安装器包名
    public String volumeUuid;              // 存储卷UUID
    
    // 资源信息
    public String resourcePath;            // 资源路径
    public String legacyNativeLibraryPath; // 传统原生库路径
    public String primaryCpuAbi;           // 主CPU ABI
    public String secondaryCpuAbi;         // 次CPU ABI
    
    // 方法定义
    public boolean isSystemApp();          // 是否是系统应用
    public boolean isUpdatedSystemApp();   // 是否是更新的系统应用
    public boolean isPrivileged();        // 是否是特权应用
    public boolean isOem();                // 是否是OEM应用
    public boolean isVendor();             // 是否是厂商应用
    public boolean isProduct();            // 是否是产品应用
    public boolean isExternal();           // 是否是外部应用
    public boolean isInternal();           // 是否是内部应用
}
```

### 3. ApplicationInfo
ApplicationInfo包含应用的运行时信息，用于进程创建和资源访问。

```java
// ApplicationInfo 核心数据结构
public class ApplicationInfo extends PackageItemInfo implements Parcelable {
    // 包信息
    public String packageName;              // 包名
    public String className;               // 类名
    public String[] splitNames;            // 分包名称
    
    // 版本信息
    public int versionCode;                // 版本代码
    public String versionName;             // 版本名称
    public int minSdkVersion;              // 最小SDK版本
    public int targetSdkVersion;           // 目标SDK版本
    
    // 路径信息
    public String sourceDir;               // 源目录
    public String publicSourceDir;         // 公共源目录
    public String[] splitSourceDirs;       // 分包源目录
    public String dataDir;                 // 数据目录
    public String nativeLibraryDir;        // 原生库目录
    public String secondaryNativeLibraryDir; // 次原生库目录
    
    // 资源信息
    public String resourceDirs[];          // 资源目录
    public String seInfo;                  // SELinux信息
    public String seInfoUser;              // 用户SELinux信息
    
    // 权限信息
    public String[] requestedPermissions;  // 请求的权限
    public int[] requestedPermissionsFlags; // 权限标志
    public int uid;                        // 用户ID
    public int targetSandboxVersion;       // 目标沙盒版本
    
    // 标志信息
    public int flags;                      // 标志位
    public int privateFlags;               // 私有标志位
    public int theme;                      // 主题
    
    // 安装信息
    public String manageSpaceActivityName; // 管理空间Activity
    public String backupAgentName;         // 备份代理名称
    public int descriptionRes;             // 描述资源
    public int fullBackupContent;          // 完全备份内容
    public int category;                   // 分类
    
    // 方法定义
    public boolean isSystemApp();          // 是否是系统应用
    public boolean isUpdatedSystemApp();   // 是否是更新的系统应用
    public boolean isPrivilegedApp();      // 是否是特权应用
    public boolean isExternalStorage();    // 是否在外部存储
    public boolean isInternalStorage();    // 是否在内部存储
    public boolean hasCode();              // 是否有代码
    public boolean isEnabled();            // 是否启用
}
```

### 4. ComponentInfo
ComponentInfo是Activity、Service、Receiver、Provider等组件的基类。

```java
// ComponentInfo 核心数据结构
public class ComponentInfo extends PackageItemInfo implements Parcelable {
    // 应用信息
    public ApplicationInfo applicationInfo; // 所属应用信息
    public String processName;             // 进程名
    public int descriptionRes;             // 描述资源
    public boolean enabled;                // 是否启用
    public boolean exported;               // 是否导出
    public String permission;              // 所需权限
    
    // 方法定义
    public boolean isEnabled();            // 是否启用
    public final int getIconResource();    // 获取图标资源
    public final int getLogoResource();    // 获取Logo资源
    public final int getBannerResource();  // 获取横幅资源
}

// ActivityInfo 扩展
public class ActivityInfo extends ComponentInfo {
    public int theme;                      // 主题
    public int uiOptions;                  // UI选项
    public int screenOrientation;          // 屏幕方向
    public int configChanges;              // 配置变更
    public int softInputMode;              // 软输入模式
    public int launchMode;                 // 启动模式
    public int documentLaunchMode;         // 文档启动模式
    public int maxRecents;                 // 最大最近任务数
    public int lockTaskLaunchMode;         // 锁定任务启动模式
    public float maxAspectRatio;           // 最大宽高比
    public boolean supportsPictureInPicture; // 支持画中画
    public boolean directBootAware;        // 直接启动感知
    public boolean supportsRtl;            // 支持RTL
}

// ServiceInfo 扩展
public class ServiceInfo extends ComponentInfo {
    public int flags;                      // 标志位
    public String permission;              // 权限
    public boolean exported;               // 是否导出
    public boolean directBootAware;        // 直接启动感知
    public boolean stopWithTask;           // 随任务停止
}

// ProviderInfo 扩展
public class ProviderInfo extends ComponentInfo {
    public String authority;               // 授权
    public boolean grantUriPermissions;     // 授予URI权限
    public int initOrder;                  // 初始化顺序
    public boolean multiprocess;            // 多进程
    public PathPermission[] pathPermissions; // 路径权限
    public UriPermission[] uriPermissionPatterns; // URI权限模式
    public boolean forceUriPermissions;    // 强制URI权限
    public boolean syncable;               // 可同步
}

// ReceiverInfo 扩展
public class ActivityInfo extends ComponentInfo {
    public int priority;                   // 优先级
    public IntentFilter[] intentFilters;   // 意图过滤器
}
```

### 5. PermissionInfo
PermissionInfo包含权限的详细信息。

```java
// PermissionInfo 核心数据结构
public class PermissionInfo extends PackageItemInfo implements Parcelable {
    // 权限基本信息
    public String group;                   // 权限组
    public int descriptionRes;             // 描述资源
    public int flags;                      // 标志位
    public int protectionLevel;            // 保护级别
    
    // 权限类型
    public static final int PROTECTION_NORMAL = 0;           // 普通权限
    public static final int PROTECTION_DANGEROUS = 1;       // 危险权限
    public static final int PROTECTION_SIGNATURE = 2;       // 签名权限
    public static final int PROTECTION_SIGNATURE_OR_SYSTEM = 3; // 签名或系统权限
    public static final int PROTECTION_MASK_BASE = 0xf;     // 基础保护掩码
    public static final int PROTECTION_MASK_FLAGS = 0xff0; // 标志保护掩码
    
    // 权限标志
    public static final int FLAG_COSTS_MONEY = 1 << 0;       // 收费标志
    public static final int FLAG_REMOVED = 1 << 1;          // 已移除标志
    public static final int FLAG_INSTALLED = 1 << 2;        // 已安装标志
    
    // 方法定义
    public boolean isRuntime();            // 是否是运行时权限
    public boolean isDevelopment();        // 是否是开发权限
    public boolean isAppOp();              // 是否是AppOp权限
    public boolean isRemoved();            // 是否已移除
    public boolean isInstalled();          // 是否已安装
}
```

### 6. PackageManagerInternal
PackageManagerInternal是PKMS的内部接口，供系统其他组件使用。

```java
// PackageManagerInternal 接口定义
public abstract class PackageManagerInternal {
    // 包查询接口
    public abstract PackageParser.Package getPackage(String packageName);
    public abstract ApplicationInfo getApplicationInfo(String packageName, int flags, int userId);
    public abstract ActivityInfo getActivityInfo(ComponentName component, int flags, int userId);
    public abstract ServiceInfo getServiceInfo(ComponentName component, int flags, int userId);
    public abstract ProviderInfo getProviderInfo(ComponentName component, int flags, int userId);
    
    // 权限管理接口
    public abstract boolean checkPermission(String permName, String pkgName, int userId);
    public abstract int checkUidPermission(int uid, String permName);
    public abstract void grantRuntimePermission(String packageName, String permission, int userId);
    public abstract void revokeRuntimePermission(String packageName, String permission, int userId);
    
    // 安装管理接口
    public abstract void installPackage(String packagePath, IPackageInstallObserver observer, int flags, String installerPackageName);
    public abstract void deletePackage(String packageName, IPackageDeleteObserver observer, int flags);
    
    // 用户管理接口
    public abstract void onNewUserCreated(int userId);
    public abstract void onUserRemoved(int userId);
    
    // 系统状态接口
    public abstract void systemReady();
    public abstract void onBootPhase(int phase);
}
```

## 数据结构关系图

### 核心对象关系
```
PackageManagerService
    ↓
PackageParser.Package (包解析结果)
    ↓
PackageSetting (包设置信息)
    ↓
ApplicationInfo (应用信息)
    ↓
ComponentInfo (组件信息)
    ├── ActivityInfo
    ├── ServiceInfo
    ├── ProviderInfo
    └── ReceiverInfo
    ↓
PermissionInfo (权限信息)
```

### 包管理状态转换
```
包安装状态转换:
PACKAGE_INSTALLED → PACKAGE_UPDATED → PACKAGE_REMOVED
    ↓                  ↓                 ↓
应用可用 ←── 版本更新 ──→ 应用卸载

权限状态转换:
PERMISSION_GRANTED → PERMISSION_REVOKED → PERMISSION_DENIED
    ↓                   ↓                   ↓
权限可用 ←── 用户撤销 ──→ 权限拒绝
```

## 关键配置参数

### 安装位置参数
```java
// 应用安装位置
public static final int INSTALL_LOCATION_UNSPECIFIED = -1;  // 未指定
public static final int INSTALL_LOCATION_AUTO = 0;          // 自动选择
public static final int INSTALL_LOCATION_INTERNAL_ONLY = 1; // 仅内部存储
public static final int INSTALL_LOCATION_PREFER_EXTERNAL = 2; // 优先外部存储
```

### 权限保护级别
```java
// 权限保护级别
public static final int PROTECTION_NORMAL = 0;           // 普通权限
public static final int PROTECTION_DANGEROUS = 1;        // 危险权限
public static final int PROTECTION_SIGNATURE = 2;        // 签名权限
public static final int PROTECTION_SIGNATURE_OR_SYSTEM = 3; // 签名或系统权限
public static final int PROTECTION_INTERNAL = 4;         // 内部权限
```

### 应用标志位
```java
// 应用标志位
public static final int FLAG_SYSTEM = 1 << 0;            // 系统应用
public static final int FLAG_DEBUGGABLE = 1 << 1;        // 可调试
public static final int FLAG_HAS_CODE = 1 << 2;          // 有代码
public static final int FLAG_PERSISTENT = 1 << 3;        // 持久应用
public static final int FLAG_FACTORY_TEST = 1 << 4;     // 工厂测试
public static final int FLAG_ALLOW_TASK_REPARENTING = 1 << 5; // 允许任务重定父级
public static final int FLAG_ALLOW_CLEAR_USER_DATA = 1 << 6; // 允许清除用户数据
```

通过深入理解PKMS的核心数据结构，开发者可以更好地进行系统定制、权限管理优化和安全性增强。