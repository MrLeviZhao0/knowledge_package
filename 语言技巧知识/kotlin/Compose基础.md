# Compose基础

## 概述
Jetpack Compose是Android的现代声明式UI工具包，完全使用Kotlin构建，提供了更简单、更直观的方式来构建用户界面。

## 核心概念

### 声明式UI
与传统的命令式UI不同，Compose使用声明式方法：

```kotlin
@Composable
fun Greeting(name: String) {
    Text(text = "Hello, $name!")
}

@Composable
fun MyApp() {
    Column {
        Greeting("Alice")
        Greeting("Bob")
    }
}
```

### 组合函数
组合函数是Compose的基本构建块：

```kotlin
@Composable
fun MessageCard(message: Message) {
    Row {
        Image(
            painter = painterResource(id = R.drawable.profile_picture),
            contentDescription = "Profile picture"
        )
        Column {
            Text(text = message.author)
            Text(text = message.content)
        }
    }
}
```

## 布局系统

### 常用布局

#### Column - 垂直布局
```kotlin
@Composable
fun VerticalList() {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp)
    ) {
        Text("Item 1")
        Text("Item 2") 
        Text("Item 3")
    }
}
```

#### Row - 水平布局
```kotlin
@Composable
fun HorizontalList() {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text("Left")
        Text("Center")
        Text("Right")
    }
}
```

#### Box - 叠加布局
```kotlin
@Composable
fun OverlayLayout() {
    Box {
        Image(
            painter = painterResource(id = R.drawable.background),
            contentDescription = "Background"
        )
        Text(
            text = "Overlay Text",
            modifier = Modifier.align(Alignment.Center),
            color = Color.White
        )
    }
}
```

## 修饰符系统

### 常用修饰符

```kotlin
@Composable
fun StyledButton() {
    Button(
        onClick = { /* 点击处理 */ },
        modifier = Modifier
            .fillMaxWidth()
            .height(56.dp)
            .padding(16.dp)
            .background(Color.Blue)
            .clip(RoundedCornerShape(8.dp))
    ) {
        Text("Styled Button")
    }
}
```

### 自定义修饰符

```kotlin
fun Modifier.clickableWithRipple(
    onClick: () -> Unit
): Modifier = composed {
    val interactionSource = remember { MutableInteractionSource() }
    val isPressed by interactionSource.collectIsPressedAsState()
    
    this.then(
        Modifier
            .clickable(
                interactionSource = interactionSource,
                indication = rememberRipple()
            ) { onClick() }
            .background(
                color = if (isPressed) Color.LightGray else Color.White
            )
    )
}
```

## 状态管理基础

### 状态提升

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
    Row {
        Button(onClick = onDecrement) { Text("-") }
        Text(text = "Count: $count")
        Button(onClick = onIncrement) { Text("+") }
    }
}
```

### 列表处理

```kotlin
@Composable
fun TodoList() {
    val todos = remember { mutableStateListOf<Todo>() }
    
    LazyColumn {
        items(todos) { todo ->
            TodoItem(
                todo = todo,
                onToggle = { todo.isDone = !todo.isDone },
                onDelete = { todos.remove(todo) }
            )
        }
    }
}

@Composable
fun TodoItem(
    todo: Todo,
    onToggle: () -> Unit,
    onDelete: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp)
    ) {
        Checkbox(
            checked = todo.isDone,
            onCheckedChange = { onToggle() }
        )
        Text(
            text = todo.text,
            modifier = Modifier.weight(1f)
        )
        IconButton(onClick = onDelete) {
            Icon(Icons.Default.Delete, "Delete")
        }
    }
}
```

## 主题系统

### Material Design主题

```kotlin
@Composable
fun MyApp() {
    MaterialTheme(
        colors = lightColors(
            primary = Color(0xFF6200EE),
            primaryVariant = Color(0xFF3700B3),
            secondary = Color(0xFF03DAC5)
        ),
        typography = Typography(
            h1 = TextStyle(
                fontWeight = FontWeight.Bold,
                fontSize = 24.sp
            )
        ),
        shapes = Shapes(
            small = RoundedCornerShape(4.dp),
            medium = RoundedCornerShape(8.dp),
            large = RoundedCornerShape(16.dp)
        )
    ) {
        // App内容
        HomeScreen()
    }
}
```

## 动画系统

### 简单动画

```kotlin
@Composable
fun AnimatedButton() {
    var expanded by remember { mutableStateOf(false) }
    val rotation by animateFloatAsState(
        targetValue = if (expanded) 180f else 0f
    )
    
    IconButton(onClick = { expanded = !expanded }) {
        Icon(
            imageVector = Icons.Default.ExpandMore,
            contentDescription = "Expand",
            modifier = Modifier.rotate(rotation)
        )
    }
}
```

### 过渡动画

```kotlin
@Composable
fun AnimatedContentExample() {
    var count by remember { mutableStateOf(0) }
    
    AnimatedContent(
        targetState = count,
        transitionSpec = {
            slideInVertically { -it } with slideOutVertically { it }
        }
    ) { targetCount ->
        Text("Count: $targetCount")
    }
    
    Button(onClick = { count++ }) {
        Text("Increment")
    }
}
```

## 最佳实践

### 性能优化

```kotlin
@Composable
fun OptimizedList(items: List<Item>) {
    LazyColumn {
        items(
            items = items,
            key = { it.id }  // 使用key提高性能
        ) { item ->
            ItemRow(item = item)
        }
    }
}

@Composable
fun ItemRow(item: Item) {
    // 使用derivedStateOf避免不必要的重组
    val displayText by remember(item) {
        derivedStateOf { "Item: ${item.name}" }
    }
    
    Text(text = displayText)
}
```

### 测试

```kotlin
@Test
fun testCounter() {
    composeTestRule.setContent {
        CounterScreen()
    }
    
    composeTestRule.onNodeWithText("Count: 0").assertExists()
    composeTestRule.onNodeWithText("+").performClick()
    composeTestRule.onNodeWithText("Count: 1").assertExists()
}
```

## 总结
Compose通过声明式的方法简化了UI开发，提供了更好的性能、更少的代码和更直观的开发体验。掌握Compose基础是构建现代Android应用的关键。