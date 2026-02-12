# PKMS核心知识_设计思路与线程进程模型

## 设计思路

### 1.1 分层架构设计

PKMS采用分层架构设计，将复杂的包管理功能分解为多个层次，每个层次负责特定的功能模块。

#### 架构层次划分
```java
// PKMS分层架构（伪代码）
public class PackageManagerService {
    // 1. 接口层（对外接口）
    public class PackageManagerInternal {
        // 系统内部使用的接口
    }
    
    public class PackageManagerNative {
        // Binder接口实现
    }
    
    // 2. 业务逻辑层（核心管理）
    public class PackageHandler {
        // 包处理逻辑
    }
    
    public class Installer {
        // 安装管理逻辑
    }
    
    public class Settings {
        // 设置管理逻辑
    }
    
    // 3. 数据层（状态管理）
    public class PackageParser {
        // 包解析逻辑
    }
    
    public class PackageSetting {
        // 包设置管理
    }
    
    public class PermissionsState {
        // 权限状态管理
    }
    
    // 4. 基础层（系统集成）
    public class UserManagerService {
        // 用户管理集成
    }
    
    public class StorageManagerService {
        // 存储管理集成
    }
    
    public class AppOpsService {
        // 应用操作集成
    }
}
```

#### 设计原则
- **单一职责原则**：每个类只负责一个明确的功能模块
- **开闭原则**：支持扩展新的包格式和安装方式
- **接口隔离原则**：为不同客户端提供专门的接口
- **依赖倒置原则**：高层模块通过抽象接口依赖低层模块

### 1.2 事件驱动模型

PKMS采用事件驱动模型处理各种包管理操作，确保系统的响应性和可靠性。

#### 事件类型
```java
// PKMS处理的主要事件类型
public enum PkmsEventType {
    PACKAGE_INSTALL,      // 包安装事件
    PACKAGE_UNINSTALL,    // 包卸载事件
    PACKAGE_UPDATE,       // 包更新事件
    PACKAGE_SCAN,         // 包扫描事件
    PERMISSION_GRANT,     // 权限授予事件
    PERMISSION_REVOKE,    // 权限撤销事件
    USER_ADD,             // 用户添加事件
    USER_REMOVE,          // 用户移除事件
    STORAGE_CHANGE,       // 存储变更事件
}
```

#### 事件处理流程
```java
// 事件处理机制
public class PkmsEventDispatcher {
    private final Map<PkmsEventType, List<PkmsEventListener>> mEventListeners;
    
    public void registerEventListener(PkmsEventType type, PkmsEventListener listener) {
        List<PkmsEventListener> listeners = mEventListeners.get(type);
        if (listeners == null) {
            listeners = new ArrayList<>();
            mEventListeners.put(type, listeners);
        }
        listeners.add(listener);
    }
    
    public void dispatchEvent(PkmsEvent event) {
        List<PkmsEventListener> listeners = mEventListeners.get(event.getType());
        if (listeners != null) {
            for (PkmsEventListener listener : listeners) {
                listener.onEvent(event);
            }
        }
    }
    
    // 异步事件处理
    public void dispatchEventAsync(PkmsEvent event) {
        mHandler.post(() -> dispatchEvent(event));
    }
}
```

### 1.3 状态机设计

PKMS使用状态机模型管理包的生命周期状态，确保状态转换的正确性。

#### 包安装状态机
```java
// 包安装状态机
public class PackageStateMachine {
    // 包安装状态定义
    public enum PackageState {
        NOT_INSTALLED,      // 未安装
        SCANNING,           // 扫描中
        PARSING,            // 解析中
        VERIFYING,          // 验证中
        INSTALLING,         // 安装中
        INSTALLED,          // 已安装
        UPDATING,           // 更新中
        UNINSTALLING,       // 卸载中
        BROKEN,             // 损坏
        DISABLED            // 禁用
    }
    
    // 状态转换规则
    private final Map<PackageState, Set<PackageState>> mTransitionRules;
    
    public PackageStateMachine() {
        mTransitionRules = new EnumMap<>(PackageState.class);
        
        // 定义合法的状态转换
        mTransitionRules.put(PackageState.NOT_INSTALLED, 
            EnumSet.of(PackageState.SCANNING));
        mTransitionRules.put(PackageState.SCANNING, 
            EnumSet.of(PackageState.PARSING, PackageState.NOT_INSTALLED));
        mTransitionRules.put(PackageState.PARSING, 
            EnumSet.of(PackageState.VERIFYING, PackageState.BROKEN));
        mTransitionRules.put(PackageState.VERIFYING, 
            EnumSet.of(PackageState.INSTALLING, PackageState.BROKEN));
        mTransitionRules.put(PackageState.INSTALLING, 
            EnumSet.of(PackageState.INSTALLED, PackageState.BROKEN));
        // ... 其他状态转换规则
    }
    
    public boolean canTransition(PackageState from, PackageState to) {
        Set<PackageState> allowedTransitions = mTransitionRules.get(from);
        return allowedTransitions != null && allowedTransitions.contains(to);
    }
}
```

### 1.4 策略模式应用

PKMS使用策略模式实现可配置的管理策略，支持不同场景下的策略切换。

#### 安装策略
```java
// 安装策略接口
public interface InstallationStrategy {
    boolean shouldInstall(PackageParser.Package pkg, int flags);
    int getInstallLocation(PackageParser.Package pkg);
    void preInstall(PackageParser.Package pkg);
    void postInstall(PackageParser.Package pkg);
}

// 默认安装策略
public class DefaultInstallationStrategy implements InstallationStrategy {
    @Override
    public boolean shouldInstall(PackageParser.Package pkg, int flags) {
        // 检查包是否满足安装条件
        return checkPackageValidity(pkg) && 
               checkSignature(pkg) && 
               checkPermissions(pkg);
    }
    
    @Override
    public int getInstallLocation(PackageParser.Package pkg) {
        // 基于包特性和系统状态选择安装位置
        if (pkg.installLocation == PackageInfo.INSTALL_LOCATION_INTERNAL_ONLY) {
            return PackageInfo.INSTALL_LOCATION_INTERNAL_ONLY;
        }
        
        if (isExternalStorageAvailable() && 
            pkg.installLocation == PackageInfo.INSTALL_LOCATION_PREFER_EXTERNAL) {
            return PackageInfo.INSTALL_LOCATION_PREFER_EXTERNAL;
        }
        
        return PackageInfo.INSTALL_LOCATION_AUTO;
    }
}

// 安全安装策略
public class SecureInstallationStrategy implements InstallationStrategy {
    @Override
    public boolean shouldInstall(PackageParser.Package pkg, int flags) {
        // 更严格的安全检查
        return checkPackageValidity(pkg) && 
               verifySignature(pkg) && 
               checkPermissions(pkg) && 
               checkSecurityPolicy(pkg);
    }
    
    @Override
    public int getInstallLocation(PackageParser.Package pkg) {
        // 强制安装到内部存储
        return PackageInfo.INSTALL_LOCATION_INTERNAL_ONLY;
    }
}
```

## 线程进程模型

### 2.1 主线程模型

PKMS运行在system_server进程的主线程中，负责处理系统级的包管理任务。

#### 主线程职责
```java
// PKMS主线程处理逻辑
public void systemReady() {
    // 1. 系统准备阶段
    synchronized (mPackages) {
        // 初始化包管理服务
        initializePackageManager();
        
        // 扫描系统应用
        scanSystemApps();
        
        // 扫描用户应用
        scanUserApps();
        
        // 准备包管理
        mSystemReady = true;
    }
    
    // 2. 进入主循环
    Looper.loop();
}

// 处理Binder调用
public int onTransact(int code, Parcel data, Parcel reply, int flags) {
    try {
        switch (code) {
            case INSTALL_PACKAGE_TRANSACTION:
                data.enforceInterface(IPackageManager.descriptor);
                // 处理包安装请求
                int result = installPackage(...);
                reply.writeNoException();
                reply.writeInt(result);
                return true;
            
            case DELETE_PACKAGE_TRANSACTION:
                // 处理包删除请求
                // ...
                
            // 其他Binder调用处理
        }
    } catch (RemoteException e) {
        // 异常处理
    }
    return super.onTransact(code, data, reply, flags);
}
```

### 2.2 工作线程模型

PKMS使用多个工作线程处理不同类型的任务，避免阻塞主线程。

#### 工作线程分类
```java
// PKMS工作线程管理器
public class PkmsWorkerThreadManager {
    // 包扫描线程
    private final HandlerThread mScanThread;
    private final Handler mScanHandler;
    
    // 包安装线程
    private final HandlerThread mInstallThread;
    private final Handler mInstallHandler;
    
    // 权限管理线程
    private final HandlerThread mPermissionThread;
    private final Handler mPermissionHandler;
    
    // 用户管理线程
    private final HandlerThread mUserThread;
    private final Handler mUserHandler;
    
    public PkmsWorkerThreadManager() {
        // 初始化包扫描线程
        mScanThread = new HandlerThread("PKMS-Scan");
        mScanThread.start();
        mScanHandler = new Handler(mScanThread.getLooper());
        
        // 初始化包安装线程
        mInstallThread = new HandlerThread("PKMS-Install");
        mInstallThread.start();
        mInstallHandler = new Handler(mInstallThread.getLooper());
        
        // 初始化权限管理线程
        mPermissionThread = new HandlerThread("PKMS-Permission");
        mPermissionThread.start();
        mPermissionHandler = new Handler(mPermissionThread.getLooper());
        
        // 初始化用户管理线程
        mUserThread = new HandlerThread("PKMS-User");
        mUserThread.start();
        mUserHandler = new Handler(mUserThread.getLooper());
    }
    
    // 提交包扫描任务
    public void submitScanTask(Runnable task) {
        mScanHandler.post(task);
    }
    
    // 提交包安装任务
    public void submitInstallTask(Runnable task) {
        mInstallHandler.post(task);
    }
    
    // 提交权限管理任务
    public void submitPermissionTask(Runnable task) {
        mPermissionHandler.post(task);
    }
    
    // 提交用户管理任务
    public void submitUserTask(Runnable task) {
        mUserHandler.post(task);
    }
}
```

### 2.3 进程间通信模型

PKMS通过Binder机制与其他进程进行通信，实现跨进程的包管理。

#### Binder通信架构
```java
// PKMS Binder接口定义
public interface IPackageManager extends IInterface {
    // 包管理接口
    void installPackage(String packagePath, IPackageInstallObserver observer, int flags, String installerPackageName);
    void deletePackage(String packageName, IPackageDeleteObserver observer, int flags);
    
    // 包查询接口
    PackageInfo getPackageInfo(String packageName, int flags, int userId);
    ApplicationInfo getApplicationInfo(String packageName, int flags, int userId);
    ActivityInfo getActivityInfo(ComponentName component, int flags, int userId);
    
    // 权限管理接口
    int checkPermission(String permName, String pkgName, int userId);
    void grantRuntimePermission(String packageName, String permission, int userId);
    void revokeRuntimePermission(String packageName, String permission, int userId);
    
    // 用户管理接口
    int[] getInstalledPackages(int flags, int userId);
    void onNewUserCreated(int userId);
    void onUserRemoved(int userId);
    
    // 系统状态接口
    void systemReady();
    void onBootPhase(int phase);
}

// Binder通信流程
public class PackageManagerProxy implements IPackageManager {
    private final IBinder mRemote;
    
    @Override
    public void installPackage(String packagePath, IPackageInstallObserver observer, int flags, String installerPackageName) {
        Parcel data = Parcel.obtain();
        Parcel reply = Parcel.obtain();
        
        try {
            data.writeInterfaceToken(IPackageManager.descriptor);
            // 写入参数
            data.writeString(packagePath);
            data.writeStrongInterface(observer);
            data.writeInt(flags);
            data.writeString(installerPackageName);
            
            // 发起Binder调用
            mRemote.transact(INSTALL_PACKAGE_TRANSACTION, data, reply, 0);
            
            // 读取结果
            reply.readException();
        } finally {
            data.recycle();
            reply.recycle();
        }
    }
}
```

### 2.4 线程同步机制

PKMS使用多种同步机制确保多线程环境下的数据一致性。

#### 同步机制实现
```java
// PKMS同步管理器
public class PkmsSynchronizer {
    // 全局锁（用于保护核心数据结构）
    private final Object mPackagesLock = new Object();
    
    // 包锁（按包粒度加锁）
    private final Map<String, Object> mPackageLocks = new ConcurrentHashMap<>();
    
    // 用户锁（按用户粒度加锁）
    private final Map<Integer, Object> mUserLocks = new ConcurrentHashMap<>();
    
    // 获取全局锁
    public void acquirePackagesLock() {
        synchronized (mPackagesLock) {
            // 执行需要全局同步的操作
        }
    }
    
    // 获取包锁
    public void acquirePackageLock(String packageName) {
        Object lock = mPackageLocks.computeIfAbsent(packageName, k -> new Object());
        synchronized (lock) {
            // 执行包相关的操作
        }
    }
    
    // 获取用户锁
    public void acquireUserLock(int userId) {
        Object lock = mUserLocks.computeIfAbsent(userId, k -> new Object());
        synchronized (lock) {
            // 执行用户相关的操作
        }
    }
}
```

### 2.5 多用户支持模型

PKMS支持多用户环境下的包管理，确保不同用户间的应用隔离。

#### 用户状态管理
```java
// 多用户支持
public class UserManager {
    // 用户状态定义
    public static final int USER_SYSTEM = 0;            // 系统用户
    public static final int USER_OWNER = 0;             // 所有者用户
    public static final int USER_ALL = -1;              // 所有用户
    public static final int USER_CURRENT = -2;          // 当前用户
    public static final int USER_NULL = -10000;         // 空用户
    
    // 用户状态管理
    public void onUserCreated(int userId) {
        // 创建用户相关的包数据
        createUserPackages(userId);
        
        // 初始化用户权限
        initializeUserPermissions(userId);
        
        // 通知其他服务
        notifyUserCreated(userId);
    }
    
    public void onUserRemoved(int userId) {
        // 清理用户相关的包数据
        cleanupUserPackages(userId);
        
        // 清理用户权限
        cleanupUserPermissions(userId);
        
        // 通知其他服务
        notifyUserRemoved(userId);
    }
    
    // 用户包数据管理
    private void createUserPackages(int userId) {
        // 创建用户包目录
        createUserPackageDir(userId);
        
        // 复制系统应用到用户空间
        copySystemAppsToUser(userId);
        
        // 初始化用户包设置
        initializeUserPackageSettings(userId);
    }
}
```

## 性能优化设计

### 3.1 包扫描优化

优化包扫描性能，减少系统启动时间。

#### 并行扫描策略
```java
// 并行包扫描优化
public class ParallelPackageScanner {
    // 并行扫描系统应用
    public void scanSystemAppsInParallel() {
        // 获取系统应用目录
        File[] systemDirs = getSystemAppDirectories();
        
        // 创建并行扫描任务
        List<CompletableFuture<Void>> futures = new ArrayList<>();
        
        for (File dir : systemDirs) {
            CompletableFuture<Void> future = CompletableFuture.runAsync(() -> {
                scanDirectory(dir, SCAN_SYSTEM);
            }, mExecutor);
            
            futures.add(future);
        }
        
        // 等待所有扫描任务完成
        CompletableFuture.allOf(futures.toArray(new CompletableFuture[0])).join();
    }
    
    // 增量扫描优化
    public void incrementalScan() {
        // 只扫描有变化的包
        List<File> changedPackages = detectChangedPackages();
        
        for (File pkg : changedPackages) {
            scanPackage(pkg, SCAN_UPDATE);
        }
    }
}
```

### 3.2 内存使用优化

优化PKMS的内存使用，减少内存碎片和泄漏。

#### 内存缓存优化
```java
// 内存缓存优化
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
}
```

通过深入理解PKMS的设计思路和线程进程模型，开发者可以更好地进行系统定制、性能优化和安全性增强。