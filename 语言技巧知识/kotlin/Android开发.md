# Android开发

## 概述
Kotlin已成为Android开发的官方首选语言，与Android框架深度集成。本章详细介绍Kotlin在Android开发中的最佳实践、现代架构模式和性能优化技巧。

## 基础Android开发

### Activity和Fragment

**传统Activity开发:**
```kotlin
class MainActivity : AppCompatActivity() {
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        
        // 使用View Binding
        val binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)
        
        binding.button.setOnClickListener {
            // 处理点击事件
            startActivity(Intent(this, SecondActivity::class.java))
        }
    }
    
    override fun onResume() {
        super.onResume()
        // 恢复逻辑
    }
}
```

**使用Fragment:**
```kotlin
class HomeFragment : Fragment() {
    
    private var _binding: FragmentHomeBinding? = null
    private val binding get() = _binding!!
    
    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentHomeBinding.inflate(inflater, container, false)
        return binding.root
    }
    
    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        
        binding.recyclerView.apply {
            layoutManager = LinearLayoutManager(requireContext())
            adapter = MyAdapter()
        }
    }
    
    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
```

### 资源访问

**字符串资源:**
```kotlin
// strings.xml
<string name="app_name">My App</string>
<string name="welcome_message">Hello, %1$s!</string>

// Kotlin中使用
val appName = getString(R.string.app_name)
val welcomeMessage = getString(R.string.welcome_message, "John")
```

**颜色和尺寸:**
```kotlin
// 颜色资源
val primaryColor = ContextCompat.getColor(this, R.color.primary)
val textColor = Color.parseColor("#FF0000")

// 尺寸资源
val padding = resources.getDimension(R.dimen.padding_medium)
val margin = resources.getDimensionPixelSize(R.dimen.margin_large)
```

## 现代Android架构

### ViewModel + LiveData

**ViewModel实现:**
```kotlin
class UserViewModel : ViewModel() {
    
    private val _userState = MutableLiveData<UserState>()
    val userState: LiveData<UserState> = _userState
    
    private val _loadingState = MutableLiveData<Boolean>()
    val loadingState: LiveData<Boolean> = _loadingState
    
    fun loadUser(userId: String) {
        _loadingState.value = true
        
        viewModelScope.launch {
            try {
                val user = userRepository.getUser(userId)
                _userState.value = UserState.Success(user)
            } catch (e: Exception) {
                _userState.value = UserState.Error(e.message ?: "Unknown error")
            } finally {
                _loadingState.value = false
            }
        }
    }
    
    fun updateUser(user: User) {
        viewModelScope.launch {
            userRepository.updateUser(user)
            loadUser(user.id) // 重新加载数据
        }
    }
}

sealed class UserState {
    object Loading : UserState()
    data class Success(val user: User) : UserState()
    data class Error(val message: String) : UserState()
}
```

**Activity/Fragment中使用:**
```kotlin
class UserProfileActivity : AppCompatActivity() {
    
    private lateinit var viewModel: UserViewModel
    private lateinit var binding: ActivityUserProfileBinding
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityUserProfileBinding.inflate(layoutInflater)
        setContentView(binding.root)
        
        viewModel = ViewModelProvider(this)[UserViewModel::class.java]
        
        setupObservers()
        
        val userId = intent.getStringExtra(EXTRA_USER_ID) ?: return
        viewModel.loadUser(userId)
    }
    
    private fun setupObservers() {
        viewModel.userState.observe(this) { state ->
            when (state) {
                is UserState.Loading -> showLoading()
                is UserState.Success -> showUser(state.user)
                is UserState.Error -> showError(state.message)
            }
        }
        
        viewModel.loadingState.observe(this) { isLoading ->
            binding.progressBar.isVisible = isLoading
        }
    }
    
    private fun showUser(user: User) {
        binding.nameTextView.text = user.name
        binding.emailTextView.text = user.email
        // 更新其他UI
    }
}
```

### Repository模式

**数据层实现:**
```kotlin
class UserRepository(
    private val localDataSource: UserLocalDataSource,
    private val remoteDataSource: UserRemoteDataSource,
    private val dispatcher: CoroutineDispatcher = Dispatchers.IO
) {
    
    suspend fun getUser(userId: String): User {
        return withContext(dispatcher) {
            // 首先检查本地数据
            val localUser = localDataSource.getUser(userId)
            if (localUser != null) {
                return@withContext localUser
            }
            
            // 从网络获取
            val remoteUser = remoteDataSource.getUser(userId)
            
            // 保存到本地
            localDataSource.saveUser(remoteUser)
            
            remoteUser
        }
    }
    
    suspend fun updateUser(user: User): Boolean {
        return withContext(dispatcher) {
            try {
                remoteDataSource.updateUser(user)
                localDataSource.saveUser(user)
                true
            } catch (e: Exception) {
                false
            }
        }
    }
}

// 本地数据源
class UserLocalDataSource {
    
    private val userDao: UserDao by lazy {
        AppDatabase.getInstance().userDao()
    }
    
    suspend fun getUser(userId: String): User? {
        return userDao.getUserById(userId)
    }
    
    suspend fun saveUser(user: User) {
        userDao.insertUser(user)
    }
}

// 远程数据源
class UserRemoteDataSource {
    
    private val apiService: ApiService by lazy {
        RetrofitClient.getInstance().create(ApiService::class.java)
    }
    
    suspend fun getUser(userId: String): User {
        return apiService.getUser(userId)
    }
    
    suspend fun updateUser(user: User) {
        apiService.updateUser(user.id, user)
    }
}
```

## Jetpack Compose开发

### Compose基础

**声明式UI:**
```kotlin
@Composable
fun UserProfileScreen(
    user: User,
    onEditClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        // 用户头像
        AsyncImage(
            model = user.avatarUrl,
            contentDescription = "用户头像",
            modifier = Modifier
                .size(100.dp)
                .clip(CircleShape)
                .align(Alignment.CenterHorizontally)
        )
        
        Spacer(modifier = Modifier.height(16.dp))
        
        // 用户信息
        Text(
            text = user.name,
            style = MaterialTheme.typography.h5,
            modifier = Modifier.align(Alignment.CenterHorizontally)
        )
        
        Text(
            text = user.email,
            style = MaterialTheme.typography.body1,
            color = MaterialTheme.colors.onSurface.copy(alpha = 0.6f),
            modifier = Modifier.align(Alignment.CenterHorizontally)
        )
        
        Spacer(modifier = Modifier.height(32.dp))
        
        // 编辑按钮
        Button(
            onClick = onEditClick,
            modifier = Modifier.align(Alignment.CenterHorizontally)
        ) {
            Text("编辑资料")
        }
    }
}
```

### Compose状态管理

**状态提升:**
```kotlin
@Composable
fun CounterScreen() {
    var count by remember { mutableStateOf(0) }
    
    Counter(
        count = count,
        onIncrement = { count++ },
        onDecrement = { count-- }
    )
}

@Composable
fun Counter(
    count: Int,
    onIncrement: () -> Unit,
    onDecrement: () -> Unit
) {
    Row(
        verticalAlignment = Alignment.CenterVertically
    ) {
        IconButton(onClick = onDecrement) {
            Icon(Icons.Default.Remove, "减少")
        }
        
        Text(
            text = "$count",
            style = MaterialTheme.typography.h4
        )
        
        IconButton(onClick = onIncrement) {
            Icon(Icons.Default.Add, "增加")
        }
    }
}
```

### Compose与ViewModel集成

**Compose中使用ViewModel:**
```kotlin
@Composable
fun UserProfileScreen(
    viewModel: UserViewModel = viewModel()
) {
    val userState by viewModel.userState.collectAsState()
    
    when (userState) {
        is UserState.Loading -> LoadingScreen()
        is UserState.Success -> {
            val user = (userState as UserState.Success).user
            UserProfileContent(
                user = user,
                onEditClick = { /* 导航到编辑页面 */ }
            )
        }
        is UserState.Error -> {
            val error = (userState as UserState.Error).message
            ErrorScreen(error = error)
        }
    }
}

@Composable
fun LoadingScreen() {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        CircularProgressIndicator()
    }
}

@Composable
fun ErrorScreen(error: String) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Icon(
            imageVector = Icons.Default.Error,
            contentDescription = "错误",
            modifier = Modifier.size(64.dp),
            tint = MaterialTheme.colors.error
        )
        
        Spacer(modifier = Modifier.height(16.dp))
        
        Text(
            text = "发生错误",
            style = MaterialTheme.typography.h6
        )
        
        Text(
            text = error,
            style = MaterialTheme.typography.body2,
            textAlign = TextAlign.Center
        )
    }
}
```

## 网络请求

### Retrofit + Coroutines

**API服务定义:**
```kotlin
interface ApiService {
    
    @GET("users/{userId}")
    suspend fun getUser(@Path("userId") userId: String): User
    
    @PUT("users/{userId}")
    suspend fun updateUser(
        @Path("userId") userId: String,
        @Body user: User
    ): Response<Unit>
    
    @GET("users")
    suspend fun getUsers(
        @Query("page") page: Int,
        @Query("limit") limit: Int = 20
    ): List<User>
}

// Retrofit配置
object RetrofitClient {
    
    private const val BASE_URL = "https://api.example.com/"
    
    fun getInstance(): Retrofit {
        return Retrofit.Builder()
            .baseUrl(BASE_URL)
            .addConverterFactory(GsonConverterFactory.create())
            .client(createHttpClient())
            .build()
    }
    
    private fun createHttpClient(): OkHttpClient {
        return OkHttpClient.Builder()
            .addInterceptor(HttpLoggingInterceptor().apply {
                level = HttpLoggingInterceptor.Level.BODY
            })
            .addInterceptor { chain ->
                val request = chain.request().newBuilder()
                    .addHeader("Authorization", "Bearer ${getToken()}")
                    .build()
                chain.proceed(request)
            }
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .build()
    }
    
    private fun getToken(): String {
        // 从SharedPreferences或安全存储获取token
        return ""
    }
}
```

### 图片加载

**使用Coil加载图片:**
```kotlin
@Composable
fun NetworkImage(
    url: String,
    contentDescription: String?,
    modifier: Modifier = Modifier
) {
    AsyncImage(
        model = ImageRequest.Builder(LocalContext.current)
            .data(url)
            .crossfade(true)
            .build(),
        contentDescription = contentDescription,
        modifier = modifier,
        contentScale = ContentScale.Crop
    )
}

// 在Composable中使用
NetworkImage(
    url = user.avatarUrl,
    contentDescription = "用户头像",
    modifier = Modifier
        .size(64.dp)
        .clip(CircleShape)
)
```

## 数据存储

### Room数据库

**Entity定义:**
```kotlin
@Entity(tableName = "users")
data class UserEntity(
    @PrimaryKey
    val id: String,
    val name: String,
    val email: String,
    val avatarUrl: String?,
    val createdAt: Long = System.currentTimeMillis()
)
```

**DAO接口:**
```kotlin
@Dao
interface UserDao {
    
    @Query("SELECT * FROM users WHERE id = :userId")
    suspend fun getUserById(userId: String): UserEntity?
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertUser(user: UserEntity)
    
    @Update
    suspend fun updateUser(user: UserEntity)
    
    @Delete
    suspend fun deleteUser(user: UserEntity)
    
    @Query("SELECT * FROM users ORDER BY createdAt DESC")
    fun getUsers(): Flow<List<UserEntity>>
}
```

**数据库定义:**
```kotlin
@Database(
    entities = [UserEntity::class],
    version = 1,
    exportSchema = false
)
abstract class AppDatabase : RoomDatabase() {
    
    abstract fun userDao(): UserDao
    
    companion object {
        @Volatile
        private var INSTANCE: AppDatabase? = null
        
        fun getInstance(context: Context): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                INSTANCE ?: buildDatabase(context).also { INSTANCE = it }
            }
        }
        
        private fun buildDatabase(context: Context): AppDatabase {
            return Room.databaseBuilder(
                context.applicationContext,
                AppDatabase::class.java,
                "app_database"
            ).build()
        }
    }
}
```

### SharedPreferences

**封装SharedPreferences:**
```kotlin
class PreferencesManager(context: Context) {
    
    private val sharedPreferences = context.getSharedPreferences("app_prefs", Context.MODE_PRIVATE)
    
    var authToken: String?
        get() = sharedPreferences.getString(KEY_AUTH_TOKEN, null)
        set(value) = sharedPreferences.edit().putString(KEY_AUTH_TOKEN, value).apply()
    
    var userId: String?
        get() = sharedPreferences.getString(KEY_USER_ID, null)
        set(value) = sharedPreferences.edit().putString(KEY_USER_ID, value).apply()
    
    var isFirstLaunch: Boolean
        get() = sharedPreferences.getBoolean(KEY_FIRST_LAUNCH, true)
        set(value) = sharedPreferences.edit().putBoolean(KEY_FIRST_LAUNCH, value).apply()
    
    companion object {
        private const val KEY_AUTH_TOKEN = "auth_token"
        private const val KEY_USER_ID = "user_id"
        private const val KEY_FIRST_LAUNCH = "first_launch"
    }
}

// 在Application中初始化
class MyApplication : Application() {
    
    companion object {
        lateinit var preferences: PreferencesManager
            private set
    }
    
    override fun onCreate() {
        super.onCreate()
        preferences = PreferencesManager(this)
    }
}
```

## 权限处理

### 运行时权限

**权限请求封装:**
```kotlin
class PermissionManager(
    private val activity: FragmentActivity
) {
    
    private val permissionRequest = activity.activityResultRegistry
        .register("permission_request", ActivityResultContracts.RequestMultiplePermissions()) { results ->
            onPermissionResult?.invoke(results)
        }
    
    private var onPermissionResult: ((Map<String, Boolean>) -> Unit)? = null
    
    fun requestPermissions(
        permissions: Array<String>,
        onResult: (Map<String, Boolean>) -> Unit
    ) {
        onPermissionResult = onResult
        permissionRequest.launch(permissions)
    }
    
    fun hasPermission(permission: String): Boolean {
        return ContextCompat.checkSelfPermission(activity, permission) == 
            PackageManager.PERMISSION_GRANTED
    }
    
    fun shouldShowRationale(permission: String): Boolean {
        return ActivityCompat.shouldShowRequestPermissionRationale(activity, permission)
    }
}

// 使用示例
class CameraActivity : AppCompatActivity() {
    
    private lateinit var permissionManager: PermissionManager
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        permissionManager = PermissionManager(this)
        
        if (permissionManager.hasPermission(Manifest.permission.CAMERA)) {
            startCamera()
        } else {
            requestCameraPermission()
        }
    }
    
    private fun requestCameraPermission() {
        permissionManager.requestPermissions(
            arrayOf(Manifest.permission.CAMERA)
        ) { results ->
            if (results[Manifest.permission.CAMERA] == true) {
                startCamera()
            } else {
                showPermissionDeniedDialog()
            }
        }
    }
}
```

## 性能优化

### 内存优化

**避免内存泄漏:**
```kotlin
class MainActivity : AppCompatActivity() {
    
    // 使用弱引用避免内存泄漏
    private var heavyObject: WeakReference<HeavyObject>? = null
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // 正确使用LifecycleObserver
        lifecycle.addObserver(object : DefaultLifecycleObserver {
            override fun onDestroy(owner: LifecycleOwner) {
                // 清理资源
                heavyObject?.clear()
            }
        })
    }
}
```

**图片加载优化:**
```kotlin
@Composable
fun OptimizedImage(
    url: String,
    contentDescription: String?,
    modifier: Modifier = Modifier
) {
    val imageLoader = ImageLoader.Builder(LocalContext.current)
        .crossfade(true)
        .bitmapConfig(Bitmap.Config.RGB_565) // 减少内存使用
        .build()
    
    AsyncImage(
        model = ImageRequest.Builder(LocalContext.current)
            .data(url)
            .size(Size.ORIGINAL) // 避免加载过大图片
            .build(),
        contentDescription = contentDescription,
        modifier = modifier,
        imageLoader = imageLoader
    )
}
```

### 网络优化

**缓存策略:**
```kotlin
class CachedNetworkRepository(
    private val networkRepository: NetworkRepository,
    private val cache: Cache
) {
    
    suspend fun getUser(userId: String): User {
        // 首先检查缓存
        val cachedUser = cache.getUser(userId)
        if (cachedUser != null) {
            return cachedUser
        }
        
        // 从网络获取
        val user = networkRepository.getUser(userId)
        
        // 更新缓存
        cache.saveUser(user)
        
        return user
    }
}
```

## 测试

### 单元测试

**ViewModel测试:**
```kotlin
@Test
fun `should load user data successfully`() = runTest {
    // Given
    val mockRepository = mockk<UserRepository>()
    coEvery { mockRepository.getUser("123") } returns User("123", "John", "john@test.com")
    val viewModel = UserViewModel(mockRepository)
    
    // When
    viewModel.loadUser("123")
    
    // Then
    val state = viewModel.userState.value
    assertTrue(state is UserState.Success)
    assertEquals("John", (state as UserState.Success).user.name)
}
```

### UI测试

**Compose UI测试:**
```kotlin
@Test
fun `should display user profile correctly`() {
    composeTestRule.setContent {
        UserProfileContent(
            user = User("123", "John", "john@test.com"),
            onEditClick = {}
        )
    }
    
    composeTestRule.onNodeWithText("John").assertExists()
    composeTestRule.onNodeWithText("john@test.com").assertExists()
    composeTestRule.onNodeWithContentDescription("编辑资料").assertExists()
}
```

## 总结
Kotlin为Android开发带来了现代化、安全且高效的开发体验。通过合理使用架构组件、协程、Compose等现代技术，可以构建出高质量、可维护的Android应用。