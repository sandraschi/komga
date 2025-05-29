# Gradle Deep Dive - Part 3: Build Scripts In-Depth

Gradle build scripts are where you define and configure how your project is built. Understanding their structure, the available DSLs (Domain Specific Languages), and how to interact with projects and tasks is key to mastering Gradle.

## 1. Build Script Basics

*   **Location:** Each Gradle project typically has a build script in its root directory. This file is named `build.gradle.kts` if you're using the Kotlin DSL, or `build.gradle` for the Groovy DSL.
*   **Purpose:** The build script defines everything related to the project's build process: plugins, dependencies, repositories, tasks, and custom build logic.
*   **Execution:** The code in a build script is executed during Gradle's configuration phase. This means it's primarily for *configuring* the build, not for performing the build work itself (which happens in task actions during the execution phase).

## 2. Groovy DSL vs. Kotlin DSL

Gradle supports two DSLs for writing build scripts:

### a. Groovy DSL (`build.gradle`)

*   **Original DSL:** Groovy was the first language supported for Gradle build scripts.
*   **Dynamic Typing:** Groovy is a dynamically-typed language. This offers flexibility but can sometimes lead to runtime errors that might be caught at compile time in a statically-typed language.
*   **Syntax:** Often more concise for simple configurations due to Groovy's syntactic sugar (e.g., omitting parentheses for method calls with arguments).
    ```groovy
    // Groovy DSL example
    plugins {
        id 'java'
    }

    version = '1.0.0'

    repositories {
        mavenCentral()
    }

    dependencies {
        implementation 'org.apache.commons:commons-lang3:3.12.0'
    }

    task myCustomTask {
        doLast {
            println 'Executing myCustomTask in Groovy!'
        }
    }
    ```

### b. Kotlin DSL (`build.gradle.kts`)

*   **Modern Alternative:** Kotlin DSL is the newer, increasingly preferred option.
*   **Static Typing:** Kotlin is statically-typed, providing significant advantages:
    *   **Better IDE Support:** Enhanced autocompletion, refactoring, error highlighting, and navigation in IDEs like IntelliJ IDEA.
    *   **Compile-Time Safety:** Many errors are caught during script compilation rather than at runtime.
    *   **Improved Readability:** Clearer code, especially for complex build logic, due to explicit types.
*   **Syntax:** Slightly more verbose in some cases but often more explicit and maintainable.
    ```kotlin
    // Kotlin DSL example
    plugins {
        java
    }

    version = "1.0.0"

    repositories {
        mavenCentral()
    }

    dependencies {
        implementation("org.apache.commons:commons-lang3:3.12.0")
    }

    tasks.register("myCustomTask") {
        doLast {
            println("Executing myCustomTask in Kotlin!")
        }
    }
    ```

### Why Kotlin DSL is Often Preferred:

*   **IDE Experience:** Superior autocompletion and error checking significantly improve developer productivity and reduce mistakes.
*   **Maintainability:** Statically-typed code is generally easier to understand, refactor, and maintain, especially in large or complex build scripts.
*   **Seamless Integration:** If your main project code is in Kotlin (like Komga), using Kotlin for build scripts provides a consistent language experience.

## 3. Configuring Projects

Build scripts allow you to configure various aspects of the project.

*   **`group` and `version`:** These are standard properties defining the project's coordinates.
    ```kotlin
    // In build.gradle.kts
    group = "org.gotson.komga"
    version = "1.0.0-SNAPSHOT"
    ```
*   **Custom Properties (Extra Properties):** You can define custom properties using the `extra` extension.
    ```kotlin
    // In build.gradle.kts
    extra["myCustomProperty"] = "someValue"
    val myProp = extra["myCustomProperty"] as String
    println("Custom property: $myProp")
    ```
    In Groovy:
    ```groovy
    // In build.gradle
    ext.myCustomProperty = "someValue"
    println "Custom property: $myCustomProperty"
    ```

## 4. Configuring Tasks

Tasks are the workhorses of a Gradle build. You can configure existing tasks (added by plugins) or create your own.

### a. Accessing Existing Tasks

*   **By Name (Kotlin DSL):** `tasks.named("taskName") { ... }` or `tasks.getByName("taskName") { ... }` (for eager access, less common).
    ```kotlin
    tasks.named<Jar>("jar") { // Configure the 'jar' task
        archiveFileName.set("my-application.jar")
    }
    ```
*   **By Name (Groovy DSL):** `taskName { ... }` or `tasks.named('taskName') { ... }`.
    ```groovy
    jar {
        archiveFileName = 'my-application.jar'
    }
    ```

### b. Setting Task Properties

Tasks have properties that control their behavior (e.g., input files, output directories, configuration options).

### c. Defining Task Actions (`doFirst`, `doLast`)

*   `doLast { ... }`: Adds an action to be executed at the end of the task's execution.
*   `doFirst { ... }`: Adds an action to be executed at the beginning of the task's execution.
    ```kotlin
    tasks.register("hello") {
        doLast {
            println("Hello from the hello task!")
        }
    }
    ```

### d. Creating Custom Tasks

*   **Kotlin DSL:** `tasks.register("taskName") { ... }` or `tasks.register<MyTaskType>("taskName") { ... }`.
    ```kotlin
    // Simple custom task
    tasks.register("mySimpleTask") {
        group = "custom"
        description = "A simple custom task."
        doLast {
            println("Executing mySimpleTask.")
        }
    }

    // Custom task with a specific type
    open class MyCustomTask : DefaultTask() {
        @InputFile
        val inputFile = project.objects.fileProperty()

        @TaskAction
        fun performAction() {
            println("Processing file: ${inputFile.get().asFile.name}")
        }
    }
    tasks.register<MyCustomTask>("myTypedTask") {
        inputFile.set(project.file("input.txt"))
    }
    ```
*   **Groovy DSL:** `task taskName { ... }` or `task taskName(type: MyTaskType) { ... }`.

## 5. Understanding `settings.gradle.kts` (or `settings.gradle`)

This file is located in the root directory of a multi-project build.

*   **Purpose:** Defines settings for the entire build, primarily the project structure.
*   **`rootProject.name`:** Sets the name of the root project.
    ```kotlin
    // In settings.gradle.kts
    rootProject.name = "komga-parent"
    ```
*   **`include(":subproject-name")`:** Includes subprojects in the build.
    ```kotlin
    // In settings.gradle.kts
    rootProject.name = "komga-parent"
    include(":komga")
    include(":komga-tray")
    include(":komga-webui")

    // To change a subproject's directory if it's not a direct child
    // project(":komga-webui").projectDir = File("../some-other-location/komga-webui")
    ```
*   The settings script is evaluated during the **Initialization Phase** of the build lifecycle.

## 6. Accessing Project Properties

Gradle provides various ways to define and access properties:

*   **Project Properties:** Defined in `build.gradle.kts` (e.g., `project.version`, `project.group`).
*   **`gradle.properties` file:** A key-value file in the project root or Gradle user home (`~/.gradle/gradle.properties`) for build-wide settings (e.g., JVM arguments for the daemon, enabling features).
    ```properties
    # In gradle.properties
    org.gradle.jvmargs=-Xmx2g -Dfile.encoding=UTF-8
    myCustomProjectProperty=valueFromGradleProperties
    ```
    Access in build script (Kotlin DSL):
    ```kotlin
    val customProp = project.properties["myCustomProjectProperty"] as? String
    println("Property from gradle.properties: $customProp")
    ```
*   **System Properties:** Passed via `-D` on the command line (e.g., `gradlew build -DmySystemProp=foo`).
*   **Environment Variables:** Gradle can access environment variables.

--- 
End of Part 3. Next part will cover Plugins, Task Dependencies, and Incremental Builds.
