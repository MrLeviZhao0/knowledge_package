# PKMS核心知识_接口与运转流程

## 对外提供的接口

### 1.1 Binder接口定义

PKMS通过Binder机制提供系统服务接口，允许其他进程调用PKMS的功能。

#### 核心Binder接口
```java
// IPackageManager.aidl 接口定义
interface IPackageManager {
    // 包管理接口
    void installPackage(String packagePath, IPackageInstallObserver observer, int flags, String installerPackageName);
    void deletePackage(String packageName, IPackageDeleteObserver observer, int flags);
    void clearApplicationUserData(String packageName, IPackageDataObserver observer, int userId);
    
    // 包查询接口
    PackageInfo getPackageInfo(String packageName, int flags, int userId);
    ApplicationInfo getApplicationInfo(String packageName, int flags, int userId);
    ActivityInfo getActivityInfo(ComponentName component, int flags, int userId);
    ServiceInfo getServiceInfo(ComponentName component, int flags, int userId);
    ProviderInfo getProviderInfo(ComponentName component, int flags, int userId);
    
    // 组件查询接口
    List<PackageInfo> getInstalledPackages(int flags, int userId);
    List<ApplicationInfo> getInstalledApplications(int flags, int userId);
    List<PermissionInfo> queryPermissionsByGroup(String group, int flags);
    
    // 权限管理接口
    int checkPermission(String permName, String pkgName, int userId);
    int checkUidPermission(String permName, int uid);
    void grantRuntimePermission(String packageName, String permission, int userId);
    void revokeRuntimePermission(String packageName, String permission, int userId);
    
    // 用户管理接口
    int[] getPackageGids(String packageName, int userId);
    int getPackageUid(String packageName, int flags, int userId);
    void onNewUserCreated(int userId);
    void onUserRemoved(int userId);
    
    // 系统状态接口
    void systemReady();
    void onBootPhase(int phase);
    void performBootDexOpt();
    
    // 安装位置接口
    int getInstallLocation();
    void setInstallLocation(int loc);
    
    // 调试接口
    void setApplicationEnabledSetting(String packageName, int newState, int flags, int userId);
    void setComponentEnabledSetting(ComponentName componentName, int newState, int flags, int userId);
}
```

#### 接口调用示例
```java
// 包安装接口调用示例
public class PackageInstaller {
    private final IPackageManager mPm;
    
    public PackageInstaller() {
        // 获取PKMS Binder接口
        mPm = AppGlobals.getPackageManager();
    }
    
    public void installPackage(Context context, String packagePath) {
        try {
            // 准备安装参数
            int flags = PackageManager.INSTALL_REPLACE_EXISTING;
            String installerPackageName = context.getPackageName();
            
            // 创建安装观察者
            IPackageInstallObserver observer = new IPackageInstallObserver.Stub() {
                @Override
                public void packageInstalled(String packageName, int returnCode) {
                    handleInstallResult(packageName, returnCode);
                }
            };
            
            // 调用PKMS接口
            mPm.installPackage(packagePath, observer, flags, installerPackageName);
            
        } catch (RemoteException e) {
            Log.e(TAG, "Failed to install package", e);
        }
    }
    
    private void handleInstallResult(String packageName, int returnCode) {
        if (returnCode == PackageManager.INSTALL_SUCCEEDED) {
            Log.i(TAG, "Package installed successfully: " + packageName);
        } else {
            Log.e(TAG, "Package installation failed: " + returnCode);
        }
    }
}
```

### 1.2 内部接口定义

PKMS还提供内部接口供系统其他组件使用。

#### PackageManagerInternal接口
```java
// 系统内部使用的PKMS接口
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

### 1.3 回调接口定义

PKMS定义回调接口用于接收包管理操作的结果通知。

#### 包安装回调接口
```java
// 包安装回调接口
public interface IPackageInstallObserver extends IInterface {
    void packageInstalled(String packageName, int returnCode);
}

// 包删除回调接口
public interface IPackageDeleteObserver extends IInterface {
    void packageDeleted(String packageName, int returnCode);
}

// 包数据清理回调接口
public interface IPackageDataObserver extends IInterface {
    void onRemoveCompleted(String packageName, boolean succeeded);
}

// 包移动回调接口
public interface IPackageMoveObserver extends IInterface {
    void packageMoved(String packageName, int returnCode);
}
```

## 核心运转流程

### 2.1 包安装流程

包安装是PKMS最核心的流程之一，涉及多个步骤的验证和处理。

#### 安装流程详细步骤
```java
// 包安装流程（简化版）
public class PackageManagerService {
    
    // 安装包的完整流程
    private void installPackageLI(InstallArgs args, PackageInstalledInfo res) {
        // 阶段1：包验证
        if (!verifyPackage(args.getCodePath())) {
            res.returnCode = PackageManager.INSTALL_FAILED_VERIFICATION_FAILURE;
            return;
        }
        
        // 阶段2：包解析
        PackageParser.Package pkg = parsePackage(args.getCodePath(), args.getFlags());
        if (pkg == null) {
            res.returnCode = PackageManager.INSTALL_FAILED_INVALID_APK;
            return;
        }
        
        // 阶段3：签名验证
        if (!verifySignatures(pkg)) {
            res.returnCode = PackageManager.INSTALL_FAILED_INVALID_SIGNATURE;
            return;
        }
        
        // 阶段4：权限检查
        if (!checkPermissions(pkg)) {
            res.returnCode = PackageManager.INSTALL_FAILED_PERMISSION_MODEL_DOWNGRADE;
            return;
        }
        
        // 阶段5：版本检查
        if (!checkVersion(pkg)) {
            res.returnCode = PackageManager.INSTALL_FAILED_VERSION_DOWNGRADE;
            return;
        }
        
        // 阶段6：安装位置选择
        int installLocation = chooseInstallLocation(pkg, args.getFlags());
        
        // 阶段7：文件复制
        if (!copyPackage(pkg, installLocation)) {
            res.returnCode = PackageManager.INSTALL_FAILED_INSUFFICIENT_STORAGE;
            return;
        }
        
        // 阶段8：包扫描
        scanPackageLI(pkg, args.getFlags(), installLocation);
        
        // 阶段9：权限授予
        grantRequestedPermissions(pkg);
        
        // 阶段10：安装完成
        res.returnCode = PackageManager.INSTALL_SUCCEEDED;
        res.pkg = pkg;
        res.uid = pkg.applicationInfo.uid;
    }
    
    // 包解析流程
    private PackageParser.Package parsePackage(String codePath, int flags) {
        PackageParser parser = new PackageParser();
        
        // 设置解析参数
        parser.setParseFlags(flags);
        
        // 解析包
        PackageParser.Package pkg = parser.parsePackage(new File(codePath), 0);
        
        if (pkg == null) {
            return null;
        }
        
        // 收集证书
        parser.collectCertificates(pkg, 0);
        
        return pkg;
    }
    
    // 包扫描流程
    private void scanPackageLI(PackageParser.Package pkg, int flags, int installLocation) {
        // 创建包设置
        PackageSetting ps = new PackageSetting(pkg, installLocation);
        
        // 添加到包列表
        mPackages.put(pkg.packageName, pkg);
        mSettings.mPackages.put(pkg.packageName, ps);
        
        // 更新组件信息
        updateComponents(pkg);
        
        // 更新权限信息
        updatePermissions(pkg);
        
        // 通知其他服务
        notifyPackageAdded(pkg.packageName);
    }
}
```

#### 安装流程时序图
```
安装器 → PKMS → 包验证 → 包解析 → 签名验证 → 权限检查
    ↓      ↓        ↓        ↓         ↓          ↓
等待结果 ← 返回结果 ← 安装完成 ← 包扫描 ← 文件复制 ← 位置选择
```

### 2.2 包卸载流程

包卸载流程相对简单，但需要确保资源的正确清理。

#### 卸载流程详细步骤
```java
// 包卸载流程
public class PackageManagerService {
    
    // 卸载包的完整流程
    private void deletePackageLI(String packageName, int flags) {
        // 阶段1：包查找
        PackageParser.Package pkg = mPackages.get(packageName);
        if (pkg == null) {
            return;
        }
        
        // 阶段2：依赖检查
        if (hasDependentPackages(packageName)) {
            // 有依赖包，不能卸载
            return;
        }
        
        // 阶段3：停止相关进程
        stopPackageProcesses(packageName);
        
        // 阶段4：清理组件信息
        removeComponents(pkg);
        
        // 阶段5：清理权限信息
        removePermissions(pkg);
        
        // 阶段6：删除文件
        deletePackageFiles(pkg);
        
        // 阶段7：更新包列表
        mPackages.remove(packageName);
        mSettings.mPackages.remove(packageName);
        
        // 阶段8：通知其他服务
        notifyPackageRemoved(packageName);
    }
    
    // 停止包相关进程
    private void stopPackageProcesses(String packageName) {
        // 获取包的所有进程
        List<ProcessRecord> processes = getPackageProcesses(packageName);
        
        for (ProcessRecord proc : processes) {
            // 停止进程
            killProcess(proc.pid);
        }
    }
    
    // 删除包文件
    private void deletePackageFiles(PackageParser.Package pkg) {
        // 删除代码目录
        deleteDirectory(pkg.codePath);
        
        // 删除数据目录
        deleteDirectory(pkg.applicationInfo.dataDir);
        
        // 删除原生库目录
        deleteDirectory(pkg.applicationInfo.nativeLibraryDir);
    }
}
```

### 2.3 包扫描流程

系统启动时，PKMS需要扫描所有已安装的包，构建包管理数据库。

#### 扫描流程详细步骤
```java
// 包扫描流程
public class PackageManagerService {
    
    // 系统启动时的包扫描
    private void scanDirLI(File dir, int flags, int scanMode) {
        // 获取目录中的所有文件
        File[] files = dir.listFiles();
        if (files == null) {
            return;
        }
        
        // 并行扫描包文件
        List<CompletableFuture<PackageParser.Package>> futures = new ArrayList<>();
        
        for (File file : files) {
            // 只扫描APK文件
            if (!file.isFile() || !file.getName().endsWith(".apk")) {
                continue;
            }
            
            // 提交扫描任务
            CompletableFuture<PackageParser.Package> future = CompletableFuture.supplyAsync(() -> {
                return scanPackageLI(file, flags, scanMode);
            }, mExecutor);
            
            futures.add(future);
        }
        
        // 等待所有扫描任务完成
        for (CompletableFuture<PackageParser.Package> future : futures) {
            try {
                PackageParser.Package pkg = future.get();
                if (pkg != null) {
                    // 添加到包列表
                    mPackages.put(pkg.packageName, pkg);
                }
            } catch (Exception e) {
                Log.e(TAG, "Failed to scan package", e);
            }
        }
    }
    
    // 扫描单个包
    private PackageParser.Package scanPackageLI(File scanFile, int flags, int scanMode) {
        // 解析包
        PackageParser.Package pkg = parsePackage(scanFile, flags);
        if (pkg == null) {
            return null;
        }
        
        // 验证签名
        if (!verifySignatures(pkg)) {
            return null;
        }
        
        // 检查包是否已存在
        PackageParser.Package existingPkg = mPackages.get(pkg.packageName);
        if (existingPkg != null) {
            // 包已存在，检查版本
            if (pkg.versionCode <= existingPkg.versionCode) {
                // 版本较低，跳过
                return null;
            }
            
            // 版本较高，替换现有包
            replacePackage(existingPkg, pkg);
        }
        
        return pkg;
    }
}
```

### 2.4 权限管理流程

PKMS负责管理应用的权限授予和验证。

#### 权限授予流程
```java
// 权限管理流程
public class PackageManagerService {
    
    // 授予运行时权限
    private void grantRuntimePermissionLI(String packageName, String permissionName, int userId) {
        // 阶段1：权限查找
        PermissionInfo permInfo = getPermissionInfo(permissionName);
        if (permInfo == null) {
            return;
        }
        
        // 阶段2：包查找
        PackageParser.Package pkg = mPackages.get(packageName);
        if (pkg == null) {
            return;
        }
        
        // 阶段3：权限检查
        if (!checkPermissionGrantable(pkg, permInfo)) {
            return;
        }
        
        // 阶段4：授予权限
        grantPermission(pkg, permInfo, userId);
        
        // 阶段5：更新权限状态
        updatePermissionState(pkg, permInfo, userId, true);
        
        // 阶段6：通知应用
        notifyPermissionChanged(packageName, permissionName, userId, true);
    }
    
    // 检查权限是否可授予
    private boolean checkPermissionGrantable(PackageParser.Package pkg, PermissionInfo permInfo) {
        // 检查权限保护级别
        if (permInfo.protectionLevel == PermissionInfo.PROTECTION_SIGNATURE) {
            // 签名权限，需要验证签名
            if (!checkSignatures(pkg, permInfo)) {
                return false;
            }
        }
        
        // 检查权限是否在清单中声明
        if (!pkg.requestedPermissions.contains(permInfo.name)) {
            return false;
        }
        
        return true;
    }
}
```

### 2.5 多用户支持流程

PKMS支持多用户环境下的包管理，确保不同用户间的应用隔离。

#### 用户创建流程
```java
// 多用户支持流程
public class PackageManagerService {
    
    // 用户创建时的处理
    private void onNewUserCreatedLI(int userId) {
        // 阶段1：创建用户目录
        createUserDirs(userId);
        
        // 阶段2：复制系统应用
        copySystemAppsToUser(userId);
        
        // 阶段3：初始化用户设置
        initializeUserSettings(userId);
        
        // 阶段4：授予默认权限
        grantDefaultPermissions(userId);
        
        // 阶段5：通知其他服务
        notifyUserCreated(userId);
    }
    
    // 创建用户目录
    private void createUserDirs(int userId) {
        // 创建用户数据目录
        File userDataDir = Environment.getUserSystemDirectory(userId);
        userDataDir.mkdirs();
        
        // 创建用户包目录
        File userPackageDir = Environment.getUserPackageDirectory(userId);
        userPackageDir.mkdirs();
        
        // 创建用户原生库目录
        File userLibDir = new File(userDataDir, "lib");
        userLibDir.mkdirs();
    }
    
    // 复制系统应用到用户空间
    private void copySystemAppsToUser(int userId) {
        // 获取系统应用列表
        List<PackageParser.Package> systemApps = getSystemApps();
        
        for (PackageParser.Package pkg : systemApps) {
            // 检查应用是否支持多用户
            if (pkg.applicationInfo.flags & ApplicationInfo.FLAG_SYSTEM) != 0 &&
                pkg.applicationInfo.flags & ApplicationInfo.FLAG_ALLOW_MULTIPLE_USERS) != 0) {
                
                // 复制应用到用户空间
                copyAppToUser(pkg, userId);
            }
        }
    }
}
```

### 2.6 系统启动流程

PKMS在系统启动过程中需要完成多个阶段的初始化。

#### 启动流程详细步骤
```java
// 系统启动流程
public class PackageManagerService {
    
    // 系统启动时的初始化
    public void systemReady() {
        // 阶段1：扫描系统应用
        scanSystemApps();
        
        // 阶段2：扫描用户应用
        scanUserApps();
        
        // 阶段3：初始化权限管理
        initializePermissions();
        
        // 阶段4：优化应用性能
        performBootDexOpt();
        
        // 阶段5：通知其他服务
        notifySystemReady();
    }
    
    // 扫描系统应用
    private void scanSystemApps() {
        // 获取系统应用目录
        File[] systemDirs = getSystemAppDirectories();
        
        for (File dir : systemDirs) {
            // 扫描系统目录
            scanDirLI(dir, PackageParser.PARSE_IS_SYSTEM, SCAN_SYSTEM);
        }
    }
    
    // 执行Dex优化
    private void performBootDexOpt() {
        // 获取需要优化的应用
        List<PackageParser.Package> packages = getPackagesToOptimize();
        
        for (PackageParser.Package pkg : packages) {
            // 执行Dex优化
            dexOptPackage(pkg);
        }
    }
}
```

通过深入理解PKMS的接口定义和核心运转流程，开发者可以更好地进行系统定制、性能优化和安全性增强。