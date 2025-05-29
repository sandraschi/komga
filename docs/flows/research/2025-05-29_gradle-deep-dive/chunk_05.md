# Gradle Deep Dive - Part 5: Multi-Project Builds, `buildSrc`, and Testing

This section delves into managing complex projects with multiple modules, organizing custom build logic using `buildSrc`, and leveraging Gradle's robust testing capabilities.

## 1. Multi-Project Builds

Many real-world applications consist of multiple, interconnected modules (e.g., a core library, a web application, an API). Gradle excels at managing such multi-project (or multi-module) builds.

### a. Structure

*   **Root Project:** A multi-project build has a single root project.
*   **Subprojects:** The root project contains one or more subprojects (modules).
*   **`settings.gradle.kts` (or `settings.gradle`):** Located in the root project's directory, this file defines the structure of the multi-project build by including the subprojects.
    ```kotlin
    // settings.gradle.kts in the root project directory
    rootProject.name = "my-application-parent" // Optional: sets the root project's name

    include(":core-library")
    include(":web-app")
    include(":shared-utils")

    // If a subproject is not in a directory with the same name as the module:
    // project(":web-app").projectDir = file("../my-custom-webapp-dir")
    ```
*   **Build Scripts:** Each subproject has its own `build.gradle.kts` file, and the root project can also have one for common configurations.

### b. Configuring Subprojects from the Root Project

The root project's `build.gradle.kts` can define configurations that apply to all subprojects or specific ones.

*   **`subprojects { ... }` block:** Applies configuration to all subprojects.
    ```kotlin
    // In root project's build.gradle.kts
    subprojects {
        apply(plugin = "java") // Apply java plugin to all subprojects
        repositories {
            mavenCentral()
        }
        dependencies {
            // Add a common test dependency to all subprojects
            testImplementation("org.junit.jupiter:junit-jupiter-api:5.10.0")
        }
        tasks.withType<Test>().configureEach {
            useJUnitPlatform()
        }
    }
    ```
*   **`project(":subproject-name") { ... }` block:** Configures a specific subproject.
    ```kotlin
    // In root project's build.gradle.kts
    project(":core-library") {
        description = "The core business logic of the application."
        // Specific configurations for core-library
    }
    ```

### c. Dependencies Between Projects

Subprojects can depend on each other. This is a key aspect of modular design.

```kotlin
// In web-app/build.gradle.kts
dependencies {
    implementation(project(":core-library"))
    implementation(project(":shared-utils"))
}
```
Gradle automatically ensures that `core-library` and `shared-utils` are built before `web-app` if they are dependencies.

### d. Advantages of Multi-Project Builds

*   **Modularity:** Clear separation of concerns, making the codebase easier to understand and maintain.
*   **Reusability:** Modules can be reused across different parts of the application or even in other projects.
*   **Improved Build Times:** Gradle can build independent modules in parallel (if `--parallel` is enabled).
*   **Independent Development:** Teams can work on different modules more independently.

## 2. The `buildSrc` Directory

`buildSrc` is a special directory in the root of your project that Gradle treats as a separate, automatically included build. It's used to encapsulate custom build logic, making it reusable across all build scripts in your project.

### a. Purpose

*   **Organize Custom Build Logic:** Instead of cluttering your main `build.gradle.kts` files with complex logic, you can put custom tasks, plugins, and convention classes into `buildSrc`.
*   **Share Logic:** Code in `buildSrc` is automatically compiled and added to the classpath of all your project's build scripts.
*   **Statically-Typed Logic:** You can write this logic in Kotlin, Java, or Groovy, benefiting from IDE support and type safety (especially with Kotlin/Java).

### b. Structure

`buildSrc` is itself a mini-Gradle project:

```
my-application/
├── buildSrc/
│   ├── src/
│   │   ├── main/
│   │   │   ├── kotlin/  (or java/ or groovy/)
│   │   │   │   └── org/example/buildlogic/
│   │   │   │       ├── MyCustomTask.kt
│   │   │   │       └── MyConventionPlugin.kt
│   ├── build.gradle.kts (build script for buildSrc itself, e.g., to add dependencies like gradleApi())
├── app/
│   └── build.gradle.kts
├── library/
│   └── build.gradle.kts
├── build.gradle.kts
└── settings.gradle.kts
```

*   **`buildSrc/build.gradle.kts`:** You can declare dependencies needed by your build logic here, such as `gradleApi()` (to access Gradle's API) or other utility libraries.
    ```kotlin
    // In buildSrc/build.gradle.kts
    plugins {
        `kotlin-dsl` // Enables Kotlin DSL for buildSrc itself
    }
    repositories {
        mavenCentral()
    }
    dependencies {
        implementation(gradleApi()) // Provides access to Gradle API classes
        // implementation("com.example:my-build-utils:1.0") // Other dependencies for build logic
    }
    ```

### c. Usage Example

If you define `MyCustomTask.kt` in `buildSrc`, you can use it in any `build.gradle.kts`:

```kotlin
// In my-application/app/build.gradle.kts
tasks.register<org.example.buildlogic.MyCustomTask>("doSomethingCustom") {
    // Configure your custom task
}
```

## 3. Testing in Gradle

Gradle has excellent support for running automated tests, primarily through plugins like `java` or `kotlin-jvm`.

### a. The `test` Task

*   The `java` (and related) plugins add a standard task named `test`.
*   This task automatically discovers and executes tests written with popular frameworks like JUnit and TestNG.
*   It generates test reports (HTML and XML).

### b. Declaring Test Dependencies

Use `testImplementation` for test libraries and `testRuntimeOnly` for runtime aspects of test frameworks.

```kotlin
// In build.gradle.kts
dependencies {
    testImplementation("org.junit.jupiter:junit-jupiter-api:5.10.0")
    testRuntimeOnly("org.junit.jupiter:junit-jupiter-engine:5.10.0")
    testImplementation("org.mockito:mockito-core:5.6.0")
}
```

### c. Configuring the `test` Task

You can customize the behavior of the `test` task:

```kotlin
// In build.gradle.kts
tasks.withType<Test>().configureEach { // Configure all tasks of type Test
    useJUnitPlatform() // Essential for JUnit 5. Older JUnit 4 is often the default.

    // Filter tests to run
    // filter {
    //     includeTestsMatching("*.MyTestSuite")
    //     includeTestsMatching("com.example.package.*")
    // }

    // Set system properties for tests
    systemProperty("my.test.property", "value")

    // Configure JVM arguments for the test process
    // jvmArgs("-Xmx1g")

    // Enable test logging for events like PASSED, FAILED, SKIPPED
    testLogging {
        events("passed", "skipped", "failed")
        // showStandardStreams = true // Show stdout/stderr from tests
    }

    // Fail the build if no tests are found (default is usually false)
    // failFast = true
}
```

### d. Test Reporting

*   HTML reports are typically generated in `build/reports/tests/test/index.html`.
*   XML reports (often used by CI servers) are in `build/test-results/test/`.

### e. Integration Tests

While Gradle doesn't have a dedicated "integrationTest" task out-of-the-box like Maven's Failsafe plugin, there are common patterns to set them up:

1.  **Custom SourceSet:** Define a new source set (e.g., `integrationTest`).
    ```kotlin
    sourceSets {
        create("integrationTest") {
            compileClasspath += sourceSets.main.get().output + configurations.testRuntimeClasspath.get()
            runtimeClasspath += sourceSets.main.get().output + configurations.testRuntimeClasspath.get()
        }
    }

    val integrationTestImplementation by configurations.getting {
        extendsFrom(configurations.testImplementation.get())
    }
    val integrationTestRuntimeOnly by configurations.getting {
        extendsFrom(configurations.testRuntimeOnly.get())
    }

    dependencies {
        // Add specific dependencies for integration tests if needed
        // integrationTestImplementation("com.example:test-containers:1.16.0")
    }

    tasks.register<Test>("integrationTest") {
        description = "Runs integration tests."
        group = "verification"
        testClassesDirs = sourceSets["integrationTest"].output.classesDirs
        classpath = sourceSets["integrationTest"].runtimeClasspath
        mustRunAfter(tasks.named("test"))
    }

    tasks.named("check") { // Ensure integration tests run as part of 'check'
        dependsOn(tasks.named("integrationTest"))
    }
    ```
    This creates an `integrationTest` task that runs tests from `src/integrationTest/java` (or kotlin).

--- 
End of Part 5. Next part will cover Build Scans, Profiling, and Troubleshooting.
