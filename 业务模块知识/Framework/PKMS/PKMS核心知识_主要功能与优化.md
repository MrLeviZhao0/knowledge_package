# PKMS核心知识_主要功能与优化

## 主要功能

### 1.1 包管理功能

PKMS负责系统中所有应用包的完整生命周期管理，包括安装、卸载、更新等操作。

#### 包安装管理
```java
// 包安装管理功能
public class PackageManagerService {
    
    // 安装包的核心逻辑
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
    
    // 包验证逻辑
    private boolean verifyPackage(String codePath) {
        // 检查文件完整性
        if (!checkFileIntegrity(codePath)) {
            return false;
        }
        
        // 检查文件格式
        if (!checkFileFormat(codePath)) {
            return false;
        }
        
        // 检查文件大小
        if (!checkFileSize(codePath)) {
            return false;
        }
        
        return true;
    }
    
    // 签名验证逻辑
    private boolean verifySignatures(PackageParser.Package pkg) {
        // 检查签名是否存在
        if (pkg.mSigningDetails == null) {
            return false;
        }
        
        // 验证签名证书
        if (!verifyCertificates(pkg.mSigningDetails)) {
            return false;
        }
        
        // 检查签名策略
        if (!checkSigningPolicy(pkg)) {
            return false;
        }
        
        return true;
    }
}
```

#### 包卸载管理
```java
// 包卸载管理功能
public class PackageManagerService {
    
    // 卸载包的核心逻辑
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
    
    // 依赖包检查
    private boolean hasDependentPackages(String packageName) {
        // 检查是否有其他包依赖此包
        for (PackageParser.Package pkg : mPackages.values()) {
            if (pkg.usesLibraries != null) {
                for (String library : pkg.usesLibraries) {
                    if (library.equals(packageName)) {
                        return true;
                    }
                }
            }
            
            if (pkg.usesOptionalLibraries != null) {
                for (String library : pkg.usesOptionalLibraries) {
                    if (library.equals(packageName)) {
                        return true;
                    }
                }
            }
        }
        
        return false;
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
}
```

### 1.2 组件解析功能

PKMS负责解析应用中的四大组件，为系统其他服务提供组件信息。

#### 组件解析管理
```java
// 组件解析功能
public class PackageParser {
    
    // 解析包中的组件
    public Package parsePackage(File packageFile, int flags) {
        // 阶段1：解析清单文件
        Resources resources = getResourcesForApplication(packageFile);
        XmlResourceParser parser = resources.getXml(com.android.internal.R.xml.android_manifest);
        
        // 阶段2：解析包基本信息
        Package pkg = new Package();
        parsePackageInfo(pkg, parser, flags);
        
        // 阶段3：解析权限
        parsePermissions(pkg, parser, flags);
        
        // 阶段4：解析组件
        parseComponents(pkg, parser, flags);
        
        // 阶段5：解析应用信息
        parseApplication(pkg, parser, flags);
        
        return pkg;
    }
    
    // 解析Activity组件
    private void parseActivity(Package pkg, XmlResourceParser parser, int flags) {
        Activity activity = new Activity();
        
        // 解析Activity属性
        activity.name = parser.getAttributeValue(null, "name");
        activity.theme = parser.getAttributeResourceValue(null, "theme", 0);
        activity.launchMode = parser.getAttributeIntValue(null, "launchMode", 0);
        activity.configChanges = parser.getAttributeIntValue(null, "configChanges", 0);
        
        // 解析意图过滤器
        parseIntentFilters(activity, parser);
        
        // 添加到包中
        pkg.activities.add(activity);
    }
    
    // 解析Service组件
    private void parseService(Package pkg, XmlResourceParser parser, int flags) {
        Service service = new Service();
        
        // 解析Service属性
        service.name = parser.getAttributeValue(null, "name");
        service.permission = parser.getAttributeValue(null, "permission");
        service.exported = parser.getAttributeBooleanValue(null, "exported", false);
        
        // 解析意图过滤器
        parseIntentFilters(service, parser);
        
        // 添加到包中
        pkg.services.add(service);
    }
    
    // 解析意图过滤器
    private void parseIntentFilters(Component component, XmlResourceParser parser) {
        while (parser.next() != XmlPullParser.END_DOCUMENT) {
            if (parser.getEventType() == XmlPullParser.START_TAG) {
                if (parser.getName().equals("intent-filter")) {
                    IntentFilter filter = new IntentFilter();
                    parseIntentFilter(filter, parser);
                    component.intentFilters.add(filter);
                }
            }
        }
    }
}
```

### 1.3 权限管理功能

PKMS负责管理应用的权限授予、撤销和验证，确保系统安全性。

#### 权限管理逻辑
```java
// 权限管理功能
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
        switch (permInfo.protectionLevel & PermissionInfo.PROTECTION_MASK_BASE) {
            case PermissionInfo.PROTECTION_NORMAL:
                // 普通权限，可直接授予
                break;
                
            case PermissionInfo.PROTECTION_DANGEROUS:
                // 危险权限，需要用户确认
                if (!isUserConfirmed(pkg.packageName, permInfo.name)) {
                    return false;
                }
                break;
                
            case PermissionInfo.PROTECTION_SIGNATURE:
                // 签名权限，需要验证签名
                if (!checkSignatures(pkg, permInfo)) {
                    return false;
                }
                break;
                
            case PermissionInfo.PROTECTION_SIGNATURE_OR_SYSTEM:
                // 签名或系统权限
                if (!pkg.isSystemApp() && !checkSignatures(pkg, permInfo)) {
                    return false;
                }
                break;
        }
        
        // 检查权限是否在清单中声明
        if (!pkg.requestedPermissions.contains(permInfo.name)) {
            return false;
        }
        
        return true;
    }
    
    // 权限验证逻辑
    public int checkPermission(String permName, String pkgName, int userId) {
        // 阶段1：权限查找
        PermissionInfo permInfo = getPermissionInfo(permName);
        if (permInfo == null) {
            return PackageManager.PERMISSION_DENIED;
        }
        
        // 阶段2：包查找
        PackageParser.Package pkg = mPackages.get(pkgName);
        if (pkg == null) {
            return PackageManager.PERMISSION_DENIED;
        }
        
        // 阶段3：权限检查
        if (!isPermissionGranted(pkg, permInfo, userId)) {
            return PackageManager.PERMISSION_DENIED;
        }
        
        return PackageManager.PERMISSION_GRANTED;
    }
}
```

### 1.4 多用户支持功能

PKMS支持多用户环境下的包管理，确保不同用户间的应用隔离。

#### 多用户管理逻辑
```java
// 多用户支持功能
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
    
    // 用户移除时的处理
    private void onUserRemovedLI(int userId) {
        // 阶段1：停止用户相关进程
        stopUserProcesses(userId);
        
        // 阶段2：清理用户数据
        cleanupUserData(userId);
        
        // 阶段3：清理用户设置
        cleanupUserSettings(userId);
        
        // 阶段4：通知其他服务
        notifyUserRemoved(userId);
    }
    
    // 用户切换时的处理
    private void onUserSwitchedLI(int userId) {
        // 阶段1：更新当前用户
        mCurrentUserId = userId;
        
        // 阶段2：更新包可见性
        updatePackageVisibility(userId);
        
        // 阶段3：更新权限状态
        updatePermissionStateForUser(userId);
        
        // 阶段4：通知其他服务
        notifyUserSwitched(userId);
    }
}
```

## 性能优化

### 2.1 包扫描优化

优化包扫描性能，减少系统启动时间和资源占用。

#### 并行扫描优化
```java
// 包扫描性能优化
public class ParallelPackageScanner {
    
    // 并行扫描系统应用
    public void scanSystemAppsInParallel() {
        // 获取系统应用目录
        File[] systemDirs = getSystemAppDirectories();
        
        // 创建并行扫描任务
        List<CompletableFuture<PackageParser.Package>> futures = new ArrayList<>();
        
        for (File dir : systemDirs) {
            CompletableFuture<PackageParser.Package> future = CompletableFuture.supplyAsync(() -> {
                return scanDirectory(dir, SCAN_SYSTEM);
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
    
    // 增量扫描优化
    public void incrementalScan() {
        // 只扫描有变化的包
        List<File> changedPackages = detectChangedPackages();
        
        for (File pkg : changedPackages) {
            scanPackage(pkg, SCAN_UPDATE);
        }
    }
    
    // 检测变化的包
    private List<File> detectChangedPackages() {
        List<File> changedPackages = new ArrayList<>();
        
        // 获取所有包目录
        File[] packageDirs = getAllPackageDirectories();
        
        for (File dir : packageDirs) {
            // 检查包是否发生变化
            if (isPackageChanged(dir)) {
                changedPackages.add(dir);
            }
        }
        
        return changedPackages;
    }
}
```

### 2.2 内存使用优化

优化PKMS的内存使用，减少内存碎片和泄漏。

#### 内存缓存优化
```java
// 内存使用优化
public class PackageCacheOptimizer {
    
    // 包信息缓存
    private final LruCache<String, PackageParser.Package> mPackageCache;
    
    // 应用信息缓存
    private final LruCache<String, ApplicationInfo> mAppInfoCache;
    
    // 组件信息缓存
    private final LruCache<ComponentName, ComponentInfo> mComponentCache;
    
    public PackageCacheOptimizer() {
        // 初始化缓存大小
        mPackageCache = new LruCache<>(MAX_PACKAGE_CACHE_SIZE);
        mAppInfoCache = new LruCache<>(MAX_APPINFO_CACHE_SIZE);
        mComponentCache = new LruCache<>(MAX_COMPONENT_CACHE_SIZE);
    }
    
    // 缓存管理
    public void optimizeCache() {
        // 清理过期缓存
        cleanExpiredCache();
        
        // 压缩缓存大小
        compressCache();
        
        // 预加载常用缓存
        preloadFrequentCache();
    }
    
    // 清理过期缓存
    private void cleanExpiredCache() {
        long currentTime = System.currentTimeMillis();
        
        // 清理包缓存
        for (String packageName : mPackageCache.snapshot().keySet()) {
            PackageParser.Package pkg = mPackageCache.get(packageName);
            if (pkg != null && currentTime - pkg.lastAccessTime > CACHE_EXPIRY_TIME) {
                mPackageCache.remove(packageName);
            }
        }
        
        // 清理应用信息缓存
        for (String packageName : mAppInfoCache.snapshot().keySet()) {
            ApplicationInfo appInfo = mAppInfoCache.get(packageName);
            if (appInfo != null && currentTime - appInfo.lastAccessTime > CACHE_EXPIRY_TIME) {
                mAppInfoCache.remove(packageName);
            }
        }
    }
    
    // 预加载常用缓存
    private void preloadFrequentCache() {
        // 获取常用应用列表
        List<String> frequentApps = getFrequentApps();
        
        for (String packageName : frequentApps) {
            // 预加载包信息
            PackageParser.Package pkg = getPackageInfo(packageName);
            if (pkg != null) {
                mPackageCache.put(packageName, pkg);
            }
            
            // 预加载应用信息
            ApplicationInfo appInfo = getApplicationInfo(packageName);
            if (appInfo != null) {
                mAppInfoCache.put(packageName, appInfo);
            }
        }
    }
}
```

### 2.3 安装性能优化

优化包安装性能，提升用户体验。

#### 安装流程优化
```java
// 安装性能优化
public class InstallationOptimizer {
    
    // 优化安装流程
    public void installPackageOptimized(InstallArgs args) {
        // 阶段1：并行验证
        CompletableFuture<Boolean> verification = CompletableFuture.supplyAsync(() -> {
            return verifyPackage(args.getCodePath());
        });
        
        CompletableFuture<PackageParser.Package> parsing = CompletableFuture.supplyAsync(() -> {
            return parsePackage(args.getCodePath(), args.getFlags());
        });
        
        // 等待验证和解析完成
        try {
            if (!verification.get()) {
                return;
            }
            
            PackageParser.Package pkg = parsing.get();
            if (pkg == null) {
                return;
            }
            
            // 阶段2：快速安装
            installPackageQuick(pkg, args);
            
        } catch (Exception e) {
            Log.e(TAG, "Failed to install package", e);
        }
    }
    
    // 快速安装
    private void installPackageQuick(PackageParser.Package pkg, InstallArgs args) {
        // 预计算安装位置
        int installLocation = preCalculateInstallLocation(pkg, args.getFlags());
        
        // 异步文件复制
        CompletableFuture<Boolean> copying = CompletableFuture.supplyAsync(() -> {
            return copyPackage(pkg, installLocation);
        });
        
        // 并行包扫描
        CompletableFuture<Void> scanning = CompletableFuture.runAsync(() -> {
            scanPackageQuick(pkg, args.getFlags(), installLocation);
        });
        
        // 等待所有任务完成
        try {
            if (!copying.get()) {
                return;
            }
            
            scanning.get();
            
            // 安装完成
            notifyInstallCompleted(pkg.packageName);
            
        } catch (Exception e) {
            Log.e(TAG, "Failed to install package quickly", e);
        }
    }
    
    // 快速包扫描
    private void scanPackageQuick(PackageParser.Package pkg, int flags, int installLocation) {
        // 只扫描必要的组件
        scanEssentialComponents(pkg);
        
        // 延迟扫描非必要组件
        deferNonEssentialScanning(pkg);
        
        // 快速更新包列表
        updatePackageListQuick(pkg);
    }
}
```

### 2.4 权限管理优化

优化权限管理性能，减少权限检查的开销。

#### 权限缓存优化
```java
// 权限管理优化
public class PermissionCacheOptimizer {
    
    // 权限检查缓存
    private final LruCache<PermissionKey, Boolean> mPermissionCache;
    
    // 权限键值
    private static class PermissionKey {
        final String packageName;
        final String permissionName;
        final int userId;
        
        PermissionKey(String packageName, String permissionName, int userId) {
            this.packageName = packageName;
            this.permissionName = permissionName;
            this.userId = userId;
        }
        
        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (o == null || getClass() != o.getClass()) return false;
            PermissionKey that = (PermissionKey) o;
            return userId == that.userId &&
                   Objects.equals(packageName, that.packageName) &&
                   Objects.equals(permissionName, that.permissionName);
        }
        
        @Override
        public int hashCode() {
            return Objects.hash(packageName, permissionName, userId);
        }
    }
    
    public PermissionCacheOptimizer() {
        mPermissionCache = new LruCache<>(MAX_PERMISSION_CACHE_SIZE);
    }
    
    // 缓存权限检查结果
    public int checkPermissionCached(String packageName, String permissionName, int userId) {
        PermissionKey key = new PermissionKey(packageName, permissionName, userId);
        
        // 检查缓存
        Boolean cachedResult = mPermissionCache.get(key);
        if (cachedResult != null) {
            return cachedResult ? PackageManager.PERMISSION_GRANTED : PackageManager.PERMISSION_DENIED;
        }
        
        // 执行实际检查
        int result = checkPermissionActual(packageName, permissionName, userId);
        
        // 缓存结果
        mPermissionCache.put(key, result == PackageManager.PERMISSION_GRANTED);
        
        return result;
    }
    
    // 清理权限缓存
    public void cleanPermissionCache() {
        // 清理过期缓存
        long currentTime = System.currentTimeMillis();
        
        for (PermissionKey key : mPermissionCache.snapshot().keySet()) {
            // 检查缓存是否过期
            if (currentTime - getCacheTime(key) > PERMISSION_CACHE_EXPIRY_TIME) {
                mPermissionCache.remove(key);
            }
        }
    }
}
```

### 2.5 多用户优化

优化多用户环境下的性能，减少用户切换的开销。

#### 用户数据优化
```java
// 多用户优化
public class UserDataOptimizer {
    
    // 优化用户数据加载
    public void optimizeUserDataLoading(int userId) {
        // 阶段1：预加载用户数据
        preloadUserData(userId);
        
        // 阶段2：延迟加载非关键数据
        deferNonCriticalDataLoading(userId);
        
        // 阶段3：压缩用户数据
        compressUserData(userId);
    }
    
    // 预加载用户数据
    private void preloadUserData(int userId) {
        // 预加载常用应用数据
        List<String> frequentApps = getFrequentAppsForUser(userId);
        
        for (String packageName : frequentApps) {
            // 预加载应用数据
            preloadAppData(packageName, userId);
        }
    }
    
    // 延迟加载非关键数据
    private void deferNonCriticalDataLoading(int userId) {
        // 获取非关键应用列表
        List<String> nonCriticalApps = getNonCriticalAppsForUser(userId);
        
        for (String packageName : nonCriticalApps) {
            // 延迟加载应用数据
            deferAppDataLoading(packageName, userId);
        }
    }
    
    // 压缩用户数据
    private void compressUserData(int userId) {
        // 压缩用户包数据
        compressPackageData(userId);
        
        // 压缩用户设置数据
        compressSettingsData(userId);
        
        // 压缩用户权限数据
        compressPermissionData(userId);
    }
}
```

通过深入理解PKMS的主要功能和优化策略，开发者可以更好地进行系统定制、性能优化和安全性增强。