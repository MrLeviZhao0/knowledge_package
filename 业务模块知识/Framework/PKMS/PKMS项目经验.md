# PKMS项目经验

## 1. 功能定制

### 1.1 应用安装优化 - 智能安装位置选择

**需求描述**：
- 优化应用安装位置选择策略，提高存储空间利用率
- 基于应用特性和用户习惯智能选择安装位置
- 支持动态调整安装位置，适应存储空间变化

**实现方案**：
1. **应用特性分析**：分析应用大小、使用频率、更新频率等特性
2. **存储状态监控**：实时监控内部存储和外部存储的使用情况
3. **智能决策算法**：基于多因素决策模型选择最优安装位置
4. **动态调整机制**：支持安装后动态调整应用位置

**核心代码**：
```java
// 智能安装位置选择器
public class SmartInstallLocationSelector {
    // 应用特性分析器
    private final AppCharacteristicAnalyzer mAppAnalyzer;
    // 存储状态监控器
    private final StorageStatusMonitor mStorageMonitor;
    // 决策模型
    private final DecisionModel mDecisionModel;
    
    // 选择安装位置
    public int selectInstallLocation(PackageParser.Package pkg, int flags) {
        // 分析应用特性
        AppCharacteristics characteristics = mAppAnalyzer.analyze(pkg);
        
        // 获取存储状态
        StorageStatus storageStatus = mStorageMonitor.getCurrentStatus();
        
        // 基于决策模型选择位置
        return mDecisionModel.decide(characteristics, storageStatus, flags);
    }
    
    // 应用特性分析
    private static class AppCharacteristicAnalyzer {
        public AppCharacteristics analyze(PackageParser.Package pkg) {
            AppCharacteristics chars = new AppCharacteristics();
            
            // 分析应用大小
            chars.size = calculatePackageSize(pkg);
            
            // 分析使用频率（基于历史数据）
            chars.usageFrequency = analyzeUsageFrequency(pkg.packageName);
            
            // 分析更新频率
            chars.updateFrequency = analyzeUpdateFrequency(pkg.packageName);
            
            // 分析重要性
            chars.importance = analyzeImportance(pkg);
            
            return chars;
        }
        
        // 计算包大小
        private long calculatePackageSize(PackageParser.Package pkg) {
            File apkFile = new File(pkg.baseCodePath);
            return apkFile.length();
        }
    }
    
    // 决策模型
    private static class DecisionModel {
        public int decide(AppCharacteristics chars, StorageStatus status, int flags) {
            int scoreInternal = 0;
            int scoreExternal = 0;
            
            // 基于应用大小评分
            if (chars.size > 100 * 1024 * 1024) { // 大于100MB
                scoreExternal += 30;
            } else {
                scoreInternal += 20;
            }
            
            // 基于使用频率评分
            if (chars.usageFrequency == UsageFrequency.HIGH) {
                scoreInternal += 40;
            } else if (chars.usageFrequency == UsageFrequency.LOW) {
                scoreExternal += 30;
            }
            
            // 基于存储状态评分
            if (status.internalFreeSpace < status.internalTotalSpace * 0.1) {
                scoreExternal += 50; // 内部存储空间不足
            }
            
            if (status.externalFreeSpace < status.externalTotalSpace * 0.2) {
                scoreInternal += 30; // 外部存储空间不足
            }
            
            // 基于用户设置
            if ((flags & PackageManager.INSTALL_INTERNAL) != 0) {
                scoreInternal += 100;
            }
            
            if ((flags & PackageManager.INSTALL_EXTERNAL) != 0) {
                scoreExternal += 100;
            }
            
            return scoreInternal >= scoreExternal ? 
                PackageInfo.INSTALL_LOCATION_INTERNAL_ONLY : 
                PackageInfo.INSTALL_LOCATION_PREFER_EXTERNAL;
        }
    }
}
```

**遇到的困难与解决方案**：
- **决策准确性**：通过机器学习算法训练决策模型，提高决策准确性
- **存储兼容性**：处理不同设备的存储特性差异，确保兼容性
- **用户体验**：在存储优化和用户体验之间找到平衡点

### 1.2 权限管理优化 - 智能权限授予策略

**需求描述**：
- 优化权限授予策略，提高安全性和用户体验
- 基于应用类型和使用场景智能授予权限
- 提供权限使用监控和异常检测功能

**实现方案**：
1. **权限风险评估**：评估不同权限的安全风险级别
2. **应用信任度评估**：基于应用来源、签名等评估信任度
3. **场景感知授权**：基于使用场景动态调整授权策略
4. **异常行为检测**：监控权限使用情况，检测异常行为

**核心代码**：
```java
// 智能权限管理器
public class SmartPermissionManager {
    // 权限风险评估器
    private final PermissionRiskAssessor mRiskAssessor;
    // 应用信任度评估器
    private final AppTrustEvaluator mTrustEvaluator;
    // 异常行为检测器
    private final AnomalyDetector mAnomalyDetector;
    
    // 智能权限授予
    public boolean shouldGrantPermission(String packageName, String permission, int userId) {
        // 评估权限风险
        RiskLevel riskLevel = mRiskAssessor.assessRisk(permission);
        
        // 评估应用信任度
        TrustLevel trustLevel = mTrustEvaluator.evaluateTrust(packageName);
        
        // 检测当前场景
        UsageScene scene = detectCurrentScene();
        
        // 基于风险评估和信任度决定是否授予
        return decidePermissionGrant(riskLevel, trustLevel, scene);
    }
    
    // 权限风险评估
    private static class PermissionRiskAssessor {
        public RiskLevel assessRisk(String permission) {
            // 危险权限
            if (isDangerousPermission(permission)) {
                return RiskLevel.HIGH;
            }
            
            // 签名权限
            if (isSignaturePermission(permission)) {
                return RiskLevel.MEDIUM;
            }
            
            // 普通权限
            return RiskLevel.LOW;
        }
        
        private boolean isDangerousPermission(String permission) {
            return permission.startsWith("android.permission.") &&
                   (permission.contains("LOCATION") ||
                    permission.contains("CONTACTS") ||
                    permission.contains("PHONE") ||
                    permission.contains("SMS") ||
                    permission.contains("STORAGE"));
        }
    }
    
    // 应用信任度评估
    private static class AppTrustEvaluator {
        public TrustLevel evaluateTrust(String packageName) {
            PackageParser.Package pkg = getPackage(packageName);
            if (pkg == null) {
                return TrustLevel.UNKNOWN;
            }
            
            // 系统应用高度信任
            if (pkg.isSystemApp()) {
                return TrustLevel.HIGH;
            }
            
            // 检查签名证书
            if (isSignedByTrustedCertificate(pkg)) {
                return TrustLevel.HIGH;
            }
            
            // 检查安装来源
            if (isInstalledFromTrustedSource(pkg)) {
                return TrustLevel.MEDIUM;
            }
            
            return TrustLevel.LOW;
        }
    }
    
    // 权限授予决策
    private boolean decidePermissionGrant(RiskLevel risk, TrustLevel trust, UsageScene scene) {
        // 低风险权限通常授予
        if (risk == RiskLevel.LOW) {
            return true;
        }
        
        // 高风险权限需要高信任度
        if (risk == RiskLevel.HIGH && trust == TrustLevel.HIGH) {
            return true;
        }
        
        // 中等风险权限需要中等以上信任度
        if (risk == RiskLevel.MEDIUM && trust.ordinal() >= TrustLevel.MEDIUM.ordinal()) {
            return true;
        }
        
        // 特殊场景下的授权策略
        if (scene == UsageScene.EMERGENCY) {
            // 紧急场景下放宽权限限制
            return true;
        }
        
        return false;
    }
}
```

**遇到的困难与解决方案**：
- **风险评估准确性**：建立完善的风险评估体系，提高评估准确性
- **信任度评估**：处理不同来源应用的信任度评估问题
- **场景识别**：准确识别用户使用场景，避免误判

## 2. 性能优化

### 2.1 包扫描优化 - 增量扫描与并行处理

**需求描述**：
- 优化系统启动时的包扫描性能，减少启动时间
- 支持增量扫描，只扫描发生变化的包
- 实现并行扫描，充分利用多核CPU性能

**实现方案**：
1. **增量扫描机制**：基于文件修改时间戳识别变化的包
2. **并行扫描架构**：将扫描任务分发到多个线程并行处理
3. **缓存优化**：优化包信息缓存，减少重复解析
4. **优先级调度**：基于包重要性设置扫描优先级

**核心代码**：
```java
// 高性能包扫描器
public class HighPerformancePackageScanner {
    // 并行执行器
    private final ExecutorService mParallelExecutor;
    // 增量扫描器
    private final IncrementalScanner mIncrementalScanner;
    // 缓存管理器
    private final CacheManager mCacheManager;
    
    // 执行包扫描
    public void scanPackages(File scanDir, int flags) {
        // 检测变化的包
        List<File> changedPackages = mIncrementalScanner.detectChanges(scanDir);
        
        if (changedPackages.isEmpty()) {
            // 没有变化，使用缓存
            loadFromCache();
            return;
        }
        
        // 并行扫描变化的包
        scanChangedPackagesInParallel(changedPackages, flags);
        
        // 更新缓存
        updateCache();
    }
    
    // 增量扫描器
    private static class IncrementalScanner {
        // 最后扫描时间
        private long mLastScanTime = 0;
        
        public List<File> detectChanges(File scanDir) {
            List<File> changedPackages = new ArrayList<>();
            File[] files = scanDir.listFiles();
            
            if (files == null) {
                return changedPackages;
            }
            
            for (File file : files) {
                // 只扫描APK文件
                if (!file.isFile() || !file.getName().endsWith(".apk")) {
                    continue;
                }
                
                // 检查文件是否发生变化
                if (hasFileChanged(file)) {
                    changedPackages.add(file);
                }
            }
            
            // 更新最后扫描时间
            mLastScanTime = System.currentTimeMillis();
            
            return changedPackages;
        }
        
        private boolean hasFileChanged(File file) {
            // 基于修改时间判断文件是否发生变化
            return file.lastModified() > mLastScanTime;
        }
    }
    
    // 并行扫描变化的包
    private void scanChangedPackagesInParallel(List<File> packages, int flags) {
        List<CompletableFuture<PackageParser.Package>> futures = new ArrayList<>();
        
        for (File pkgFile : packages) {
            CompletableFuture<PackageParser.Package> future = CompletableFuture.supplyAsync(() -> {
                return scanSinglePackage(pkgFile, flags);
            }, mParallelExecutor);
            
            futures.add(future);
        }
        
        // 等待所有扫描任务完成
        for (CompletableFuture<PackageParser.Package> future : futures) {
            try {
                PackageParser.Package pkg = future.get();
                if (pkg != null) {
                    // 添加到包列表
                    addPackageToSystem(pkg);
                }
            } catch (Exception e) {
                Log.e(TAG, "Failed to scan package", e);
            }
        }
    }
    
    // 扫描单个包
    private PackageParser.Package scanSinglePackage(File pkgFile, int flags) {
        try {
            PackageParser parser = new PackageParser();
            
            // 设置解析标志
            parser.setParseFlags(flags);
            
            // 解析包
            PackageParser.Package pkg = parser.parsePackage(pkgFile, 0);
            
            if (pkg != null) {
                // 收集证书
                parser.collectCertificates(pkg, 0);
                
                return pkg;
            }
        } catch (Exception e) {
            Log.e(TAG, "Error scanning package: " + pkgFile.getName(), e);
        }
        
        return null;
    }
}
```

**遇到的困难与解决方案**：
- **变化检测准确性**：使用多种检测机制（时间戳、文件哈希）提高准确性
- **并行同步问题**：处理多线程环境下的数据同步问题
- **资源占用控制**：控制并行扫描的资源占用，避免影响系统性能

### 2.2 安装性能优化 - 快速安装流程

**需求描述**：
- 优化应用安装速度，提升用户体验
- 减少安装过程中的等待时间
- 支持后台静默安装

**实现方案**：
1. **并行处理优化**：将安装流程中的串行操作改为并行处理
2. **预验证机制**：在安装前预验证包完整性
3. **增量安装支持**：支持增量安装，减少数据传输量
4. **安装队列优化**：优化安装队列管理，提高安装效率

**核心代码**：
```java
// 快速安装管理器
public class FastInstallManager {
    // 并行安装器
    private final ParallelInstaller mParallelInstaller;
    // 预验证器
    private final PreValidator mPreValidator;
    // 安装队列优化器
    private final InstallQueueOptimizer mQueueOptimizer;
    
    // 快速安装
    public int installPackageFast(String packagePath, int flags) {
        // 阶段1：并行预验证
        CompletableFuture<Boolean> verification = CompletableFuture.supplyAsync(() -> {
            return mPreValidator.preValidate(packagePath);
        });
        
        CompletableFuture<PackageParser.Package> parsing = CompletableFuture.supplyAsync(() -> {
            return parsePackage(packagePath, flags);
        });
        
        // 等待预验证和解析完成
        try {
            if (!verification.get()) {
                return PackageManager.INSTALL_FAILED_VERIFICATION_FAILURE;
            }
            
            PackageParser.Package pkg = parsing.get();
            if (pkg == null) {
                return PackageManager.INSTALL_FAILED_INVALID_APK;
            }
            
            // 阶段2：快速安装
            return mParallelInstaller.installFast(pkg, flags);
            
        } catch (Exception e) {
            Log.e(TAG, "Fast installation failed", e);
            return PackageManager.INSTALL_FAILED_INTERNAL_ERROR;
        }
    }
    
    // 并行安装器
    private static class ParallelInstaller {
        public int installFast(PackageParser.Package pkg, int flags) {
            // 创建安装任务列表
            List<CompletableFuture<Boolean>> tasks = new ArrayList<>();
            
            // 任务1：文件复制
            tasks.add(CompletableFuture.supplyAsync(() -> {
                return copyPackageFiles(pkg, flags);
            }));
            
            // 任务2：权限处理
            tasks.add(CompletableFuture.supplyAsync(() -> {
                return processPermissions(pkg);
            }));
            
            // 任务3：组件注册
            tasks.add(CompletableFuture.supplyAsync(() -> {
                return registerComponents(pkg);
            }));
            
            // 等待所有任务完成
            try {
                for (CompletableFuture<Boolean> task : tasks) {
                    if (!task.get()) {
                        return PackageManager.INSTALL_FAILED_INSUFFICIENT_STORAGE;
                    }
                }
                
                // 安装完成
                return PackageManager.INSTALL_SUCCEEDED;
                
            } catch (Exception e) {
                Log.e(TAG, "Parallel installation failed", e);
                return PackageManager.INSTALL_FAILED_INTERNAL_ERROR;
            }
        }
    }
    
    // 安装队列优化器
    private static class InstallQueueOptimizer {
        // 安装队列
        private final PriorityQueue<InstallTask> mInstallQueue;
        
        public void optimizeQueue() {
            // 基于优先级重新排序
            mInstallQueue.sort((t1, t2) -> {
                return Integer.compare(calculatePriority(t1), calculatePriority(t2));
            });
            
            // 合并相似任务
            mergeSimilarTasks();
            
            // 预加载资源
            preloadResources();
        }
        
        // 计算安装任务优先级
        private int calculatePriority(InstallTask task) {
            int priority = 0;
            
            // 系统应用高优先级
            if (task.pkg.isSystemApp()) {
                priority += 100;
            }
            
            // 用户请求的安装高优先级
            if (task.isUserRequested()) {
                priority += 50;
            }
            
            // 小包优先安装
            if (task.pkgSize < 10 * 1024 * 1024) {
                priority += 30;
            }
            
            return priority;
        }
    }
}
```

**遇到的困难与解决方案**：
- **并行同步问题**：使用合适的同步机制确保数据一致性
- **资源竞争**：优化资源分配策略，避免资源竞争
- **错误处理**：完善错误处理机制，确保安装稳定性

## 3. 安全性优化

### 3.1 签名验证优化 - 强化应用签名验证

**需求描述**：
- 强化应用签名验证机制，防止应用被篡改
- 支持多种签名验证算法
- 提供签名证书链验证功能

**实现方案**：
1. **多重签名验证**：支持多种签名算法的验证
2. **证书链验证**：验证签名证书的完整性和可信度
3. **时间戳验证**：验证签名时间戳，防止重放攻击
4. **完整性检查**：检查应用包的完整性，防止篡改

**核心代码**：
```java
// 强化签名验证器
public class EnhancedSignatureVerifier {
    // 签名验证器列表
    private final List<SignatureVerifier> mVerifiers;
    // 证书链验证器
    private final CertificateChainVerifier mChainVerifier;
    
    // 验证应用签名
    public boolean verifySignatures(PackageParser.Package pkg) {
        if (pkg.mSigningDetails == null) {
            return false;
        }
        
        // 验证证书链
        if (!mChainVerifier.verifyCertificateChain(pkg.mSigningDetails)) {
            return false;
        }
        
        // 多重签名验证
        for (SignatureVerifier verifier : mVerifiers) {
            if (!verifier.verify(pkg)) {
                return false;
            }
        }
        
        // 时间戳验证
        if (!verifyTimestamp(pkg.mSigningDetails)) {
            return false;
        }
        
        // 完整性检查
        return verifyIntegrity(pkg);
    }
    
    // 证书链验证器
    private static class CertificateChainVerifier {
        public boolean verifyCertificateChain(SigningDetails signingDetails) {
            Certificate[] certificates = signingDetails.signatures;
            
            // 检查证书链长度
            if (certificates.length == 0) {
                return false;
            }
            
            // 验证证书链
            try {
                CertificateFactory factory = CertificateFactory.getInstance("X.509");
                
                // 构建证书链
                CertPath certPath = factory.generateCertPath(Arrays.asList(certificates));
                
                // 验证证书链
                CertPathValidator validator = CertPathValidator.getInstance("PKIX");
                PKIXParameters params = new PKIXParameters(getTrustAnchors());
                params.setRevocationEnabled(false); // 在线吊销检查可能影响性能
                
                validator.validate(certPath, params);
                
                return true;
                
            } catch (Exception e) {
                Log.e(TAG, "Certificate chain verification failed", e);
                return false;
            }
        }
    }
    
    // 时间戳验证
    private boolean verifyTimestamp(SigningDetails signingDetails) {
        // 检查签名时间戳
        long signatureTime = signingDetails.getSigningTime();
        long currentTime = System.currentTimeMillis();
        
        // 签名时间不能在未来
        if (signatureTime > currentTime) {
            return false;
        }
        
        // 签名时间不能太早（避免重放攻击）
        if (currentTime - signatureTime > MAX_SIGNATURE_AGE) {
            return false;
        }
        
        return true;
    }
    
    // 完整性检查
    private boolean verifyIntegrity(PackageParser.Package pkg) {
        // 计算APK文件的哈希值
        String actualHash = calculateFileHash(new File(pkg.baseCodePath));
        
        // 与签名中的哈希值比较
        String expectedHash = pkg.mSigningDetails.getContentHash();
        
        return actualHash.equals(expectedHash);
    }
}
```

**遇到的困难与解决方案**：
- **性能影响**：优化验证算法，减少对安装性能的影响
- **证书管理**：建立完善的证书管理机制，确保证书可信度
- **兼容性问题**：处理不同签名算法的兼容性问题

## 4. 总结

通过以上PKMS相关的项目案例，我们可以看到：

1. **功能定制**：需要深入理解PKMS的包管理、权限管理等核心机制，结合实际需求进行合理的功能扩展和定制。

2. **性能优化**：需要分析PKMS的性能瓶颈，优化关键流程（如包扫描、安装流程等），提升系统整体性能。

3. **安全性优化**：需要完善安全验证机制（如签名验证），提高系统的安全性和可靠性。

在实际项目开发中，PKMS的定制和优化需要综合考虑功能需求、用户体验、系统性能和安全性的因素，通过深入理解PKMS的内部机制和工作流程，结合实际需求进行合理的定制和优化，才能开发出高质量的Android系统。