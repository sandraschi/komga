# Kotlin Development Guide for Komga

## Table of Contents
1. [Introduction to Kotlin](#introduction-to-kotlin)
2. [Why Kotlin?](#why-kotlin)
3. [Kotlin Basics](#kotlin-basics)
4. [Kotlin in Komga](#kotlin-in-komga)
5. [Common Patterns](#common-patterns)
6. [Testing in Kotlin](#testing-in-kotlin)
7. [Build and Run](#build-and-run)
8. [Resources](#resources)

## Introduction to Kotlin

[Kotlin](https://kotlinlang.org/) is a modern, statically-typed programming language that runs on the Java Virtual Machine (JVM). It was developed by JetBrains and is now officially supported by Google for Android development.

## Why Kotlin?

### Key Advantages
- **Interoperability**: 100% compatible with Java
- **Null Safety**: Built-in null safety prevents null pointer exceptions
- **Concise**: Reduces boilerplate code by ~40% compared to Java
- **Modern Features**: Extension functions, smart casts, data classes
- **Coroutines**: Simplified asynchronous programming
- **Tooling**: Excellent IDE support, especially in IntelliJ IDEA

### Kotlin vs Java in Komga
- More expressive domain models with data classes
- Safer code with null safety
- Cleaner asynchronous code with coroutines
- Extension functions for utility methods
- More maintainable and readable code

## Kotlin Basics

### Variables
```kotlin
// Read-only variable
val name = "Komga"

// Mutable variable
var count = 0
count++

// Nullable type
var description: String? = null
```

### Data Classes
```kotlin
data class Book(
    val id: String,
    val title: String,
    val author: String = "Unknown",
    val pageCount: Int = 0
)
```

### Null Safety
```kotlin
val name: String? = null

// Safe call operator
val length = name?.length  // returns null if name is null

// Elvis operator
val nonNullName = name ?: "Default"

// Not-null assertion (use with caution!)
val forcedLength = name!!.length
```

### Extension Functions
```kotlin
fun String.addExclamation() = "$this!"
println("Hello".addExclamation())  // "Hello!"
```

### Collections
```kotlin
val numbers = listOf(1, 2, 3, 4, 5)

// Filter and map
val evenSquares = numbers
    .filter { it % 2 == 0 }
    .map { it * it }
```

### Coroutines (for async operations)
```kotlin
suspend fun fetchData() {
    // Runs in IO thread pool
    val data = withContext(Dispatchers.IO) {
        // Long-running operation
        fetchFromNetwork()
    }
    // Back on main thread
    updateUI(data)
}
```

## Kotlin in Komga

### Project Structure
- `src/main/kotlin/org/gotson/komga/` - Main Kotlin source code
- `src/test/kotlin/org/gotson/komga/` - Test files

### Common Kotlin Patterns in Komga

1. **Domain Models**
   ```kotlin
   data class Book(
       val id: String,
       val title: String,
       val url: URL,
       val media: Media,
       val metadata: Metadata = Metadata()
   )
   ```

2. **Service Layer**
   ```kotlin
   @Service
   class BookService(
       private val bookRepository: BookRepository,
       private val eventPublisher: ApplicationEventPublisher
   ) {
       @Transactional
       fun updateBook(book: Book) {
           bookRepository.save(book)
           eventPublisher.publishEvent(BookUpdatedEvent(book))
       }
   }
   ```

3. **Repository Layer**
   ```kotlin
   @Repository
   interface BookRepository : JpaRepository<Book, String> {
       fun findByTitleContainingIgnoreCase(title: String): List<Book>
       
       @Query("SELECT b FROM Book b WHERE b.metadata.seriesId = :seriesId")
       fun findBySeriesId(seriesId: String): List<Book>
   }
   ```

## Common Patterns

### Dependency Injection
```kotlin
@Service
class MyService(
    private val repository: MyRepository,
    private val config: AppConfig
) {
    // ...
}
```

### Null Safety in Services
```kotlin
fun findBookById(id: String): Book {
    return bookRepository.findById(id)
        ?: throw NotFoundException("Book not found with id: $id")
}
```

### Using Scope Functions
```kotlin
// Apply - configure objects
alertDialog.apply {
    setTitle("Title")
    setMessage("Message")
    setPositiveButton("OK", null)
}.show()

// Let - null checks and transformations
val length = value?.let { 
    // Only executed if value is not null
    it.length 
} ?: 0
```

## Testing in Kotlin

### Unit Tests with JUnit 5
```kotlin
@Test
fun `should process book correctly`() {
    // Given
    val book = createTestBook()
    
    // When
    val result = processor.process(book)
    
    // Then
    assertThat(result).isNotNull()
    assertThat(result.status).isEqualTo(Status.PROCESSED)
}
```

### Mocking with MockK
```kotlin
@Test
fun `should call repository on save`() {
    // Given
    val book = createTestBook()
    every { repository.save(any()) } returns book
    
    // When
    service.saveBook(book)
    
    // Then
    verify { repository.save(book) }
}
```

## Build and Run

### Building the Project
```bash
# Build the project
./gradlew build

# Run tests
./gradlew test

# Run the application
./gradlew bootRun
```

### Development Workflow
1. Make code changes
2. Run tests: `./gradlew test`
3. Build the project: `./gradlew build`
4. Run the application: `./gradlew bootRun`

## Resources

### Official Documentation
- [Kotlin Language Documentation](https://kotlinlang.org/docs/home.html)
- [Kotlin Standard Library](https://kotlinlang.org/api/latest/jvm/stdlib/)
- [Kotlin Coroutines](https://kotlinlang.org/docs/coroutines-guide.html)

### Learning Resources
- [Kotlin Koans](https://play.kotlinlang.org/koans)
- [Kotlin by Example](https://play.kotlinlang.org/byExample/overview)
- [Kotlin for Java Developers (Coursera)](https://www.coursera.org/learn/kotlin-for-java-developers)

### Kotlin in Spring
- [Spring Framework Kotlin Support](https://spring.io/guides/tutorials/spring-boot-kotlin/)
- [Spring Data Kotlin](https://spring.io/guides/tutorials/spring-boot-kotlin/)

### Style Guides
- [Kotlin Coding Conventions](https://kotlinlang.org/docs/coding-conventions.html)
- [Kotlin Style Guide](https://developer.android.com/kotlin/style-guide)

### Tools
- [Kotlin Playground](https://play.kotlinlang.org/)
- [IntelliJ IDEA](https://www.jetbrains.com/idea/)
- [Kotlin REPL](https://kotlinlang.org/docs/command-line.html#run-the-repl)
