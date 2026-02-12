# JNI项目经验

## 项目一：高性能图像处理引擎

### 项目背景
某图像处理应用需要实现实时的滤镜和特效处理，原有的Java实现性能无法满足要求。需要开发基于JNI的高性能图像处理引擎，支持多种图像格式和实时处理。

### 技术实现

#### 1. 图像数据传递优化
```c
// 使用直接缓冲区避免数据拷贝
JNIEXPORT void JNICALL
Java_com_example_ImageProcessor_processImageDirect(
    JNIEnv* env, jobject thiz, jobject directBuffer, jint width, jint height) {
    
    // 获取直接缓冲区地址
    void* buffer = (*env)->GetDirectBufferAddress(env, directBuffer);
    jlong capacity = (*env)->GetDirectBufferCapacity(env, directBuffer);
    
    if (buffer == NULL) {
        // 回退到传统数组方式
        jclass exceptionClass = (*env)->FindClass(env, "java/lang/IllegalArgumentException");
        (*env)->ThrowNew(env, exceptionClass, "Direct buffer is not supported");
        return;
    }
    
    // 直接处理图像数据
    process_image_data((uint8_t*)buffer, width, height, capacity);
}

// 传统数组方式（备用方案）
JNIEXPORT void JNICALL
Java_com_example_ImageProcessor_processImageArray(
    JNIEnv* env, jobject thiz, jbyteArray imageData, jint width, jint height) {
    
    jsize length = (*env)->GetArrayLength(env, imageData);
    jbyte* buffer = (*env)->GetByteArrayElements(env, imageData, NULL);
    
    if (buffer == NULL) {
        return; // 内存不足
    }
    
    // 处理图像数据
    process_image_data((uint8_t*)buffer, width, height, length);
    
    // 提交修改（0表示复制回Java层并释放）
    (*env)->ReleaseByteArrayElements(env, imageData, buffer, 0);
}
```

#### 2. 多线程图像处理
```c
// 线程安全的图像处理上下文
typedef struct {
    JNIEnv* env;
    jobject callback;
    jmethodID progressMethod;
    jmethodID completeMethod;
    pthread_mutex_t mutex;
} ImageProcessingContext;

// 图像处理线程函数
void* image_processing_thread(void* arg) {
    ImageProcessingContext* context = (ImageProcessingContext*)arg;
    
    // 附加到JVM
    JavaVM* jvm;
    (*context->env)->GetJavaVM(context->env, &jvm);
    
    JNIEnv* env;
    jint result = (*jvm)->AttachCurrentThread(jvm, &env, NULL);
    if (result != JNI_OK) {
        return NULL;
    }
    
    // 加锁处理
    pthread_mutex_lock(&context->mutex);
    
    // 处理图像
    for (int i = 0; i < 100; i++) {
        // 进度回调
        (*env)->CallVoidMethod(env, context->callback, 
                              context->progressMethod, i);
        
        // 检查是否有异常
        if ((*env)->ExceptionCheck(env)) {
            (*env)->ExceptionClear(env);
            break;
        }
        
        // 模拟处理时间
        usleep(10000); // 10ms
    }
    
    // 完成回调
    (*env)->CallVoidMethod(env, context->callback, 
                          context->completeMethod);
    
    pthread_mutex_unlock(&context->mutex);
    
    // 分离线程
    (*jvm)->DetachCurrentThread(jvm);
    
    return NULL;
}

JNIEXPORT void JNICALL
Java_com_example_ImageProcessor_startAsyncProcessing(
    JNIEnv* env, jobject thiz, jobject callback) {
    
    // 创建处理上下文
    ImageProcessingContext* context = malloc(sizeof(ImageProcessingContext));
    context->env = env;
    
    // 创建全局引用
    context->callback = (*env)->NewGlobalRef(env, callback);
    
    // 获取方法ID
    jclass callbackClass = (*env)->GetObjectClass(env, callback);
    context->progressMethod = (*env)->GetMethodID(env, callbackClass, 
                                                 "onProgress", "(I)V");
    context->completeMethod = (*env)->GetMethodID(env, callbackClass, 
                                                 "onComplete", "()V");
    
    // 初始化互斥锁
    pthread_mutex_init(&context->mutex, NULL);
    
    // 启动处理线程
    pthread_t thread;
    pthread_create(&thread, NULL, image_processing_thread, context);
    pthread_detach(thread); // 分离线程，避免资源泄漏
}
```

#### 3. 内存优化策略
```c
// 图像缓存管理器
typedef struct {
    jobject* imageBuffers;
    int bufferCount;
    int maxBuffers;
    pthread_mutex_t cacheMutex;
} ImageCacheManager;

static ImageCacheManager g_imageCache = {0};

// 初始化图像缓存
JNIEXPORT void JNICALL
Java_com_example_ImageProcessor_initImageCache(JNIEnv* env, jclass clazz, jint maxBuffers) {
    g_imageCache.maxBuffers = maxBuffers;
    g_imageCache.imageBuffers = malloc(sizeof(jobject) * maxBuffers);
    g_imageCache.bufferCount = 0;
    pthread_mutex_init(&g_imageCache.cacheMutex, NULL);
}

// 缓存图像缓冲区
JNIEXPORT jboolean JNICALL
Java_com_example_ImageProcessor_cacheImageBuffer(JNIEnv* env, jobject thiz, jobject buffer) {
    pthread_mutex_lock(&g_imageCache.cacheMutex);
    
    if (g_imageCache.bufferCount >= g_imageCache.maxBuffers) {
        pthread_mutex_unlock(&g_imageCache.cacheMutex);
        return JNI_FALSE;
    }
    
    // 创建全局引用并缓存
    jobject globalBuffer = (*env)->NewGlobalRef(env, buffer);
    g_imageCache.imageBuffers[g_imageCache.bufferCount++] = globalBuffer;
    
    pthread_mutex_unlock(&g_imageCache.cacheMutex);
    return JNI_TRUE;
}

// 清理缓存
JNIEXPORT void JNICALL
Java_com_example_ImageProcessor_clearImageCache(JNIEnv* env, jclass clazz) {
    pthread_mutex_lock(&g_imageCache.cacheMutex);
    
    for (int i = 0; i < g_imageCache.bufferCount; i++) {
        (*env)->DeleteGlobalRef(env, g_imageCache.imageBuffers[i]);
    }
    
    g_imageCache.bufferCount = 0;
    pthread_mutex_unlock(&g_imageCache.cacheMutex);
}
```

### 技术难点与解决方案

#### 难点1：内存管理复杂
**问题**：图像数据量大，频繁的JNI调用导致内存管理复杂
**解决方案**：
- 使用直接缓冲区减少数据拷贝
- 实现智能缓存机制复用内存
- 建立严格的内存释放流程

#### 难点2：多线程同步
**问题**：多线程图像处理需要处理线程安全和回调同步
**解决方案**：
- 使用互斥锁保护共享资源
- 实现线程安全的回调机制
- 正确处理JNIEnv的线程关联

#### 优化效果
- **处理速度**：从Java实现的30fps提升到Native的60fps
- **内存使用**：内存占用减少40%
- **稳定性**：长时间运行无内存泄漏

## 项目二：跨平台音频处理库

### 项目背景
开发一个支持Android和iOS的跨平台音频处理库，需要处理实时音频流、实现音频特效和编码功能。

### 技术实现

#### 1. 音频数据流处理
```c
// 音频回调处理结构体
typedef struct {
    JNIEnv* env;
    jobject audioProcessor;
    jmethodID processAudioMethod;
    jmethodID onErrorMethod;
    int sampleRate;
    int channels;
} AudioCallbackContext;

// 实时音频处理回调
void audio_callback(int16_t* audioData, int frames, void* userData) {
    AudioCallbackContext* context = (AudioCallbackContext*)userData;
    
    // 创建Java数组接收音频数据
    jshortArray javaAudioData = (*context->env)->NewShortArray(context->env, frames * context->channels);
    
    if (javaAudioData == NULL) {
        // 内存不足，通知错误
        (*context->env)->CallVoidMethod(context->env, context->audioProcessor, 
                                       context->onErrorMethod, "Memory allocation failed");
        return;
    }
    
    // 设置音频数据
    (*context->env)->SetShortArrayRegion(context->env, javaAudioData, 0, 
                                        frames * context->channels, audioData);
    
    // 调用Java层处理
    jshortArray processedData = (*context->env)->CallObjectMethod(context->env, 
                                                                context->audioProcessor, 
                                                                context->processAudioMethod, 
                                                                javaAudioData, 
                                                                frames);
    
    // 检查异常
    if ((*context->env)->ExceptionCheck(context->env)) {
        (*context->env)->ExceptionClear(context->env);
        return;
    }
    
    // 获取处理后的数据
    if (processedData != NULL) {
        jshort* processedSamples = (*context->env)->GetShortArrayElements(context->env, 
                                                                         processedData, NULL);
        if (processedSamples != NULL) {
            // 复制回音频缓冲区
            memcpy(audioData, processedSamples, frames * context->channels * sizeof(int16_t));
            (*context->env)->ReleaseShortArrayElements(context->env, processedData, 
                                                      processedSamples, JNI_ABORT);
        }
    }
    
    // 释放局部引用
    (*context->env)->DeleteLocalRef(context->env, javaAudioData);
    if (processedData != NULL) {
        (*context->env)->DeleteLocalRef(context->env, processedData);
    }
}

JNIEXPORT jlong JNICALL
Java_com_example_AudioProcessor_initAudioEngine(JNIEnv* env, jobject thiz, 
                                               jint sampleRate, jint channels) {
    
    AudioCallbackContext* context = malloc(sizeof(AudioCallbackContext));
    context->env = env;
    context->sampleRate = sampleRate;
    context->channels = channels;
    
    // 创建全局引用
    context->audioProcessor = (*env)->NewGlobalRef(env, thiz);
    
    // 缓存方法ID
    jclass processorClass = (*env)->GetObjectClass(env, thiz);
    context->processAudioMethod = (*env)->GetMethodID(env, processorClass, 
                                                     "processAudioFrame", 
                                                     "([SI)[S");
    context->onErrorMethod = (*env)->GetMethodID(env, processorClass, 
                                                "onAudioError", 
                                                "(Ljava/lang/String;)V");
    
    // 初始化音频引擎
    if (init_audio_engine(sampleRate, channels, audio_callback, context) != 0) {
        (*env)->DeleteGlobalRef(env, context->audioProcessor);
        free(context);
        return 0;
    }
    
    return (jlong)context;
}
```

#### 2. 音频特效实现
```c
// 音频特效处理器
typedef struct {
    float* delayBuffer;
    int delayBufferSize;
    int delayWritePos;
    float feedback;
    float wetDryMix;
} AudioEffect;

// 初始化音频特效
JNIEXPORT jlong JNICALL
Java_com_example_AudioEffect_initReverb(JNIEnv* env, jclass clazz, 
                                       jint maxDelayMs, jint sampleRate) {
    
    AudioEffect* effect = malloc(sizeof(AudioEffect));
    
    effect->delayBufferSize = maxDelayMs * sampleRate / 1000;
    effect->delayBuffer = malloc(effect->delayBufferSize * sizeof(float));
    memset(effect->delayBuffer, 0, effect->delayBufferSize * sizeof(float));
    
    effect->delayWritePos = 0;
    effect->feedback = 0.6f;
    effect->wetDryMix = 0.3f;
    
    return (jlong)effect;
}

// 应用混响效果
JNIEXPORT void JNICALL
Java_com_example_AudioEffect_applyReverb(JNIEnv* env, jclass clazz, 
                                        jlong effectPtr, jshortArray audioData, 
                                        jint frames) {
    
    AudioEffect* effect = (AudioEffect*)effectPtr;
    if (effect == NULL || effect->delayBuffer == NULL) {
        return;
    }
    
    jshort* samples = (*env)->GetShortArrayElements(env, audioData, NULL);
    if (samples == NULL) {
        return;
    }
    
    // 应用混响算法
    for (int i = 0; i < frames; i++) {
        float input = samples[i] / 32768.0f; // 转换为浮点数
        
        // 读取延迟线
        int readPos = (effect->delayWritePos + effect->delayBufferSize / 2) % effect->delayBufferSize;
        float delayed = effect->delayBuffer[readPos];
        
        // 混合原始信号和延迟信号
        float output = input * (1.0f - effect->wetDryMix) + delayed * effect->wetDryMix;
        
        // 写入延迟线
        effect->delayBuffer[effect->delayWritePos] = input + delayed * effect->feedback;
        effect->delayWritePos = (effect->delayWritePos + 1) % effect->delayBufferSize;
        
        // 转换回短整型
        samples[i] = (jshort)(output * 32768.0f);
    }
    
    (*env)->ReleaseShortArrayElements(env, audioData, samples, 0);
}
```

### 技术难点与解决方案

#### 难点1：实时性要求高
**问题**：音频处理需要严格的实时性，延迟不能超过20ms
**解决方案**：
- 使用低延迟的音频API
- 优化算法复杂度
- 实现预测性处理

#### 难点2：跨平台兼容性
**问题**：Android和iOS的音频API差异大
**解决方案**：
- 抽象平台相关代码
- 实现统一的音频处理接口
- 使用条件编译处理平台差异

#### 优化效果
- **延迟控制**：音频延迟控制在10ms以内
- **跨平台支持**：Android和iOS代码复用率达到80%
- **音质保证**：支持高保真音频处理

## 项目三：安全加密库

### 项目背景
为金融类应用开发安全加密库，需要实现高性能的加密算法，保护用户敏感数据。

### 技术实现

#### 1. 加密算法实现
```c
// AES加密实现
JNIEXPORT jbyteArray JNICALL
Java_com_example_CryptoLib_aesEncrypt(JNIEnv* env, jclass clazz, 
                                     jbyteArray plaintext, jbyteArray key) {
    
    jsize plaintextLen = (*env)->GetArrayLength(env, plaintext);
    jsize keyLen = (*env)->GetArrayLength(env, key);
    
    if (keyLen != 16 && keyLen != 24 && keyLen != 32) {
        // 密钥长度必须是16, 24或32字节
        jclass exceptionClass = (*env)->FindClass(env, "java/security/InvalidKeyException");
        (*env)->ThrowNew(env, exceptionClass, "Invalid key length");
        return NULL;
    }
    
    jbyte* plaintextBytes = (*env)->GetByteArrayElements(env, plaintext, NULL);
    jbyte* keyBytes = (*env)->GetByteArrayElements(env, key, NULL);
    
    if (plaintextBytes == NULL || keyBytes == NULL) {
        if (plaintextBytes != NULL) {
            (*env)->ReleaseByteArrayElements(env, plaintext, plaintextBytes, JNI_ABORT);
        }
        if (keyBytes != NULL) {
            (*env)->ReleaseByteArrayElements(env, key, keyBytes, JNI_ABORT);
        }
        return NULL;
    }
    
    // 计算加密后数据长度（需要填充）
    int encryptedLen = ((plaintextLen + AES_BLOCK_SIZE - 1) / AES_BLOCK_SIZE) * AES_BLOCK_SIZE;
    
    // 创建输出数组
    jbyteArray encryptedArray = (*env)->NewByteArray(env, encryptedLen);
    if (encryptedArray == NULL) {
        (*env)->ReleaseByteArrayElements(env, plaintext, plaintextBytes, JNI_ABORT);
        (*env)->ReleaseByteArrayElements(env, key, keyBytes, JNI_ABORT);
        return NULL;
    }
    
    jbyte* encryptedBytes = (*env)->GetByteArrayElements(env, encryptedArray, NULL);
    if (encryptedBytes == NULL) {
        (*env)->ReleaseByteArrayElements(env, plaintext, plaintextBytes, JNI_ABORT);
        (*env)->ReleaseByteArrayElements(env, key, keyBytes, JNI_ABORT);
        (*env)->DeleteLocalRef(env, encryptedArray);
        return NULL;
    }
    
    // 执行AES加密
    AES_KEY aesKey;
    if (AES_set_encrypt_key((unsigned char*)keyBytes, keyLen * 8, &aesKey) != 0) {
        (*env)->ReleaseByteArrayElements(env, plaintext, plaintextBytes, JNI_ABORT);
        (*env)->ReleaseByteArrayElements(env, key, keyBytes, JNI_ABORT);
        (*env)->ReleaseByteArrayElements(env, encryptedArray, encryptedBytes, JNI_ABORT);
        (*env)->DeleteLocalRef(env, encryptedArray);
        
        jclass exceptionClass = (*env)->FindClass(env, "java/security/InvalidKeyException");
        (*env)->ThrowNew(env, exceptionClass, "Failed to set AES key");
        return NULL;
    }
    
    // 加密数据（需要实现PKCS7填充）
    encrypt_aes_cbc((unsigned char*)plaintextBytes, plaintextLen, 
                   (unsigned char*)encryptedBytes, &aesKey);
    
    // 释放资源
    (*env)->ReleaseByteArrayElements(env, plaintext, plaintextBytes, JNI_ABORT);
    (*env)->ReleaseByteArrayElements(env, key, keyBytes, JNI_ABORT);
    (*env)->ReleaseByteArrayElements(env, encryptedArray, encryptedBytes, 0);
    
    return encryptedArray;
}
```

#### 2. 安全内存管理
```c
// 安全内存分配器
typedef struct {
    void* secureMemory;
    size_t size;
    int isLocked;
} SecureMemoryBlock;

// 分配安全内存（mlock防止交换到磁盘）
JNIEXPORT jlong JNICALL
Java_com_example_CryptoLib_allocateSecureMemory(JNIEnv* env, jclass clazz, jint size) {
    
    SecureMemoryBlock* block = malloc(sizeof(SecureMemoryBlock));
    if (block == NULL) {
        return 0;
    }
    
    // 分配内存并锁定
    block->secureMemory = malloc(size);
    if (block->secureMemory == NULL) {
        free(block);
        return 0;
    }
    
    block->size = size;
    block->isLocked = (mlock(block->secureMemory, size) == 0);
    
    // 填充随机数据
    if (RAND_bytes(block->secureMemory, size) != 1) {
        free(block->secureMemory);
        free(block);
        return 0;
    }
    
    return (jlong)block;
}

// 安全释放内存
JNIEXPORT void JNICALL
Java_com_example_CryptoLib_freeSecureMemory(JNIEnv* env, jclass clazz, jlong memoryPtr) {
    
    SecureMemoryBlock* block = (SecureMemoryBlock*)memoryPtr;
    if (block == NULL) {
        return;
    }
    
    if (block->secureMemory != NULL) {
        // 安全擦除内存
        memset(block->secureMemory, 0, block->size);
        
        // 解锁内存
        if (block->isLocked) {
            munlock(block->secureMemory, block->size);
        }
        
        free(block->secureMemory);
    }
    
    free(block);
}
```

### 技术难点与解决方案

#### 难点1：安全性要求高
**问题**：加密库需要防止侧信道攻击和内存泄漏
**解决方案**：
- 实现安全的内存管理
- 使用恒定时间算法
- 防止内存交换到磁盘

#### 难点2：性能与安全平衡
**问题**：高强度加密算法性能开销大
**解决方案**：
- 使用硬件加速（AES-NI）
- 实现算法优化
- 支持多种安全级别

#### 优化效果
- **加密速度**：AES加密速度达到1GB/s
- **安全性**：通过第三方安全审计
- **兼容性**：支持多种加密标准和协议

## 经验总结

### 成功经验
1. **性能优化**：JNI在性能敏感场景下效果显著
2. **内存管理**：严格的内存管理是稳定性的关键
3. **错误处理**：完善的错误处理机制提高可靠性

### 教训总结
1. **调试困难**：JNI调试比纯Java困难，需要更多工具支持
2. **兼容性问题**：不同Android版本和设备的兼容性需要测试
3. **团队协作**：JNI开发需要团队成员具备C/C++技能

### 最佳实践
1. **代码规范**：建立严格的JNI编码规范
2. **测试覆盖**：实现全面的单元测试和集成测试
3. **文档完善**：提供详细的使用文档和示例
4. **性能监控**：建立性能监控和优化机制