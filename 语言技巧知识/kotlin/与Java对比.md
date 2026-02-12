# 与Java对比

## 概述
Kotlin作为现代JVM语言，与Java相比具有许多优势和改进。本章详细对比两种语言的核心特性、语法差异和最佳实践。

## 基础语法对比

### 变量声明

**Java:**
```java
// 可变变量
String name = "John";
name = "Jane";

// 不可变变量
final String constant = "CONSTANT";
```

**Kotlin:**
```kotlin
// 可变变量
var name: String = "John"
name = "Jane"

// 不可变变量
val constant: String = "CONSTANT"
// constant = "NEW_VALUE" // 编译错误

// 类型推断
val inferred = "Hello" // 类型自动推断为String
```

### 函数定义

**Java:**
```java
public String greet(String name) {
    return "Hello, " + name;
}

// 静态方法
public static String staticGreet(String name) {
    return "Hello, " + name;
}
```

**Kotlin:**
```kotlin
fun greet(name: String): String {
    return "Hello, $name"
}

// 单表达式函数
fun simpleGreet(name: String) = "Hello, $name"

// 顶层函数（无需类）
fun globalGreet(name: String) = "Hello, $name"

// 默认参数
fun greetWithDefault(name: String = "World") = "Hello, $name"
```

## 空安全机制

### Java的空安全问题

**Java:**
```java
public class User {
    private String name;
    
    public String getName() {
        return name; // 可能返回null
    }
}

// 使用时的空指针检查
User user = getUser();
if (user != null && user.getName() != null) {
    System.out.println(user.getName().toUpperCase());
}
```

### Kotlin的空安全解决方案

**Kotlin:**
```kotlin
data class User(val name: String?) // 明确的可空类型

// 安全调用操作符
val user: User? = getUser()
val upperName = user?.name?.toUpperCase() // 如果任何部分为null，整个表达式返回null

// Elvis操作符提供默认值
val displayName = user?.name ?: "Unknown"

// 非空断言（谨慎使用）
val guaranteedName = user!!.name // 如果user为null，抛出NullPointerException

// 安全类型转换
val stringValue: Any = "Hello"
val length = (stringValue as? String)?.length ?: 0
```

## 集合操作

### Java集合操作

**Java:**
```java
List<String> names = Arrays.asList("Alice", "Bob", "Charlie");

// 过滤
List<String> filtered = new ArrayList<>();
for (String name : names) {
    if (name.startsWith("A")) {
        filtered.add(name);
    }
}

// 映射
List<String> upperNames = new ArrayList<>();
for (String name : names) {
    upperNames.add(name.toUpperCase());
}

// 使用Stream API（Java 8+）
List<String> result = names.stream()
    .filter(name -> name.startsWith("A"))
    .map(String::toUpperCase)
    .collect(Collectors.toList());
```

### Kotlin集合操作

**Kotlin:**
```kotlin
val names = listOf("Alice", "Bob", "Charlie")

// 函数式操作
val result = names
    .filter { it.startsWith("A") }
    .map { it.toUpperCase() }

// 更多便捷操作
val firstA = names.firstOrNull { it.startsWith("A") }
val hasB = names.any { it.startsWith("B") }
val grouped = names.groupBy { it.first() }

// 可变集合
val mutableNames = mutableListOf("Alice", "Bob")
mutableNames.add("Charlie")
```

## 面向对象编程

### 类定义对比

**Java:**
```java
public class Person {
    private String name;
    private int age;
    
    public Person(String name, int age) {
        this.name = name;
        this.age = age;
    }
    
    public String getName() {
        return name;
    }
    
    public void setName(String name) {
        this.name = name;
    }
    
    public int getAge() {
        return age;
    }
    
    public void setAge(int age) {
        this.age = age;
    }
    
    @Override
    public String toString() {
        return "Person{name='" + name + "', age=" + age + "}";
    }
    
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Person person = (Person) o;
        return age == person.age && Objects.equals(name, person.name);
    }
    
    @Override
    public int hashCode() {
        return Objects.hash(name, age);
    }
}
```

**Kotlin:**
```kotlin
data class Person(val name: String, val age: Int)
// 自动生成toString(), equals(), hashCode(), copy()等方法

// 使用
val person = Person("Alice", 25)
val copied = person.copy(age = 26)
```

### 继承和多态

**Java:**
```java
public abstract class Animal {
    protected String name;
    
    public Animal(String name) {
        this.name = name;
    }
    
    public abstract void makeSound();
    
    public void sleep() {
        System.out.println(name + " is sleeping");
    }
}

public class Dog extends Animal {
    public Dog(String name) {
        super(name);
    }
    
    @Override
    public void makeSound() {
        System.out.println(name + " says: Woof!");
    }
}
```

**Kotlin:**
```kotlin
abstract class Animal(val name: String) {
    abstract fun makeSound()
    
    fun sleep() {
        println("$name is sleeping")
    }
}

class Dog(name: String) : Animal(name) {
    override fun makeSound() {
        println("$name says: Woof!")
    }
}
```

## 函数式编程特性

### Lambda表达式

**Java:**
```java
// 函数式接口
@FunctionalInterface
interface Calculator {
    int calculate(int a, int b);
}

// 使用
Calculator adder = (a, b) -> a + b;
int result = adder.calculate(5, 3);
```

**Kotlin:**
```kotlin
// 函数类型
val adder: (Int, Int) -> Int = { a, b -> a + b }
val result = adder(5, 3)

// 更简洁的语法
val multiplier = { a: Int, b: Int -> a * b }
```

### 高阶函数

**Java:**
```java
public static <T> List<T> filter(List<T> list, Predicate<T> predicate) {
    List<T> result = new ArrayList<>();
    for (T item : list) {
        if (predicate.test(item)) {
            result.add(item);
        }
    }
    return result;
}

// 使用
List<String> names = Arrays.asList("Alice", "Bob", "Charlie");
List<String> filtered = filter(names, name -> name.startsWith("A"));
```

**Kotlin:**
```kotlin
// 内置的高阶函数
val names = listOf("Alice", "Bob", "Charlie")
val filtered = names.filter { it.startsWith("A") }

// 自定义高阶函数
fun <T> List<T>.customFilter(predicate: (T) -> Boolean): List<T> {
    return this.filter(predicate)
}
```

## 扩展函数和属性

### Kotlin独有的特性

**Kotlin:**
```kotlin
// 为String添加扩展函数
fun String.addExclamation(): String {
    return "$this!"
}

// 为Int添加扩展函数
fun Int.isEven(): Boolean {
    return this % 2 == 0
}

// 扩展属性
val String.lastChar: Char
    get() = this[length - 1]

// 使用
val greeting = "Hello".addExclamation() // "Hello!"
val isEven = 4.isEven() // true
val lastChar = "Kotlin".lastChar // 'n'
```

**Java等价实现（繁琐）:**
```java
public class StringUtils {
    public static String addExclamation(String str) {
        return str + "!";
    }
    
    public static char getLastChar(String str) {
        return str.charAt(str.length() - 1);
    }
}

// 使用
String greeting = StringUtils.addExclamation("Hello");
char lastChar = StringUtils.getLastChar("Java");
```

## 委托属性

### Kotlin委托模式

**Kotlin:**
```kotlin
// 延迟初始化
val heavyObject: HeavyObject by lazy {
    println("Initializing heavy object")
    HeavyObject()
}

// 可观察属性
var name: String by Delegates.observable("<no name>") { prop, old, new ->
    println("Property ${prop.name} changed from '$old' to '$new'")
}

// 映射委托
class User(val map: Map<String, Any?>) {
    val name: String by map
    val age: Int by map
}

val user = User(mapOf("name" to "John", "age" to 25))
println(user.name) // "John"
```

## 协程 vs 线程

### Java线程处理

**Java:**
```java
// 传统线程
new Thread(() -> {
    // 后台任务
    String result = performNetworkRequest();
    
    // 更新UI（需要Handler）
    runOnUiThread(() -> {
        textView.setText(result);
    });
}).start();

// CompletableFuture（Java 8+）
CompletableFuture.supplyAsync(() -> performNetworkRequest())
    .thenAccept(result -> {
        // 更新UI
        runOnUiThread(() -> textView.setText(result));
    });
```

### Kotlin协程

**Kotlin:**
```kotlin
// 使用协程
lifecycleScope.launch {
    // 在IO线程执行网络请求
    val result = withContext(Dispatchers.IO) {
        performNetworkRequest()
    }
    
    // 自动回到主线程更新UI
    textView.text = result
}

// 结构化并发
fun loadUserData() = lifecycleScope.launch {
    val userDeferred = async { getUser() }
    val postsDeferred = async { getPosts() }
    
    val user = userDeferred.await()
    val posts = postsDeferred.await()
    
    // 更新UI
    updateUI(user, posts)
}
```

## 与Android开发集成

### Activity和Fragment

**Java:**
```java
public class MainActivity extends AppCompatActivity {
    private TextView textView;
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        
        textView = findViewById(R.id.text_view);
        textView.setText("Hello Java");
    }
}
```

**Kotlin:**
```kotlin
class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        
        val textView = findViewById<TextView>(R.id.text_view)
        textView.text = "Hello Kotlin"
        
        // 使用Kotlin Android扩展（已弃用，推荐View Binding）
        // textView.text = "Hello Kotlin" // 直接使用ID
    }
}
```

### 与Jetpack Compose集成

**Kotlin:**
```kotlin
@Composable
fun Greeting(name: String) {
    Text(text = "Hello $name!")
}

@Composable
fun MyApp() {
    MaterialTheme {
        Column {
            Greeting("Android")
            Button(onClick = { /* 处理点击 */ }) {
                Text("Click me")
            }
        }
    }
}
```

## 互操作性

### 在Kotlin中调用Java代码

**Kotlin:**
```kotlin
// 调用Java类
val javaList = java.util.ArrayList<String>()
javaList.add("Kotlin")

// 使用Java静态方法
val files = java.io.File(".").listFiles()

// 使用Java库
val gson = com.google.gson.Gson()
val json = gson.toJson(mapOf("name" to "John"))
```

### 在Java中调用Kotlin代码

**Java:**
```java
// 调用Kotlin顶层函数
String result = MyKotlinFileKt.greet("Java");

// 调用Kotlin类
Person person = new Person("John", 25);
String name = person.getName(); // 自动生成的getter

// 调用扩展函数（通过静态方法）
StringUtils.addExclamation("Hello");
```

## 性能对比

### 编译时性能

- **Kotlin**: 编译速度稍慢于Java，但增量编译优化良好
- **Java**: 编译速度快，成熟稳定

### 运行时性能

- **Kotlin**: 与Java性能相当，内联函数等特性可优化性能
- **Java**: 成熟的JVM优化，性能稳定

### 内存使用

- **Kotlin**: 内联类等特性可减少对象分配
- **Java**: 标准对象模型，内存使用可预测

## 迁移策略

### 渐进式迁移

1. **在Java项目中添加Kotlin支持**
   ```gradle
   plugins {
       id 'org.jetbrains.kotlin.jvm' version '1.9.0'
   }
   ```

2. **新功能使用Kotlin开发**
3. **逐步将Java类转换为Kotlin**
4. **利用自动转换工具**（Android Studio提供）

### 共存策略

```kotlin
// Kotlin调用Java
class KotlinService {
    private val javaService = JavaService()
    
    fun processData(): String {
        return javaService.getData().toUpperCase()
    }
}

// Java调用Kotlin
public class JavaService {
    private KotlinHelper helper = new KotlinHelper();
    
    public String getData() {
        return helper.process("data");
    }
}
```

## 总结

### Kotlin的优势
1. **空安全**: 编译时防止空指针异常
2. **简洁语法**: 减少样板代码
3. **函数式编程**: 更好的集合操作
4. **扩展函数**: 增强现有类功能
5. **协程**: 简化异步编程
6. **与Java互操作**: 平滑迁移路径

### 适用场景
- **新项目**: 优先选择Kotlin
- **Android开发**: Google官方推荐
- **现有Java项目**: 可逐步迁移
- **需要现代语言特性**: 函数式编程、协程等

Kotlin不是要取代Java，而是提供更现代、更安全的替代方案，特别适合Android开发和现代JVM应用开发。