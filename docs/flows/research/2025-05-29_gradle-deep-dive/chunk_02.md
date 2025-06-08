# Gradle Deep Dive - Part 2: Dependency Management

Effective dependency management is a cornerstone of modern software development, and Gradle provides a robust and flexible system for handling project dependencies.

## 1. Declaring Dependencies

Dependencies are declared in the `dependencies { ... }` block within a `build.gradle.kts` (or `build.gradle`) file. Each dependency is typically identified by its group, name, and version (GAV coordinates: `group:name:version`).

```kotlin
dependencies {
    // Example: Spring Boot Starter Web
    implementation("org.springframework.boot:spring-boot-starter-web:3.2.0")

    // Example: Kotlin Standard Library
    implementation("org.jetbrains.kotlin:kotlin-stdlib-jdk8")

    // Example: JUnit Jupiter for testing
    testImplementation("org.junit.jupiter:junit-jupiter-api:5.10.0")
    testRuntimeOnly("org.junit.jupiter:junit-jupiter-engine:5.10.0")
}
```

### Common Dependency Configurations:

Gradle provides several standard configurations for declaring dependencies, which define their scope and how they are used:

*   **`implementation`**: This is the most common configuration. Dependencies are used at compile time and runtime but are *not* exposed to consumers of your library/project (i.e., they are internal implementation details). This improves encapsulation and build speed by reducing unnecessary recompilations upstream.
*   **`api`**: Used for dependencies that are part of your project's public API. If your project is a library, consumers will also have access to these dependencies transitively. Use this sparingly to avoid leaking implementation details.
*   **`compileOnly`**: Dependencies needed only at compile time and are not included in the runtime classpath. Useful for annotation processors or libraries provided by the runtime environment (e.g., Servlet API in a web container).
*   **`runtimeOnly`**: Dependencies needed only at runtime and not at compile time. Examples include JDBC drivers or logging implementations.
*   **`testImplementation`**: Dependencies for compiling and running tests (e.g., JUnit, Mockito). Not included in the main project's classpath.
*   **`testCompileOnly`**: Test dependencies needed only for compilation, not runtime.
*   **`testRuntimeOnly`**: Test dependencies needed only for runtime.

## 2. Repositories

Gradle needs to know where to download declared dependencies. This is configured in the `repositories { ... }` block.

```kotlin
repositories {
    mavenCentral() // Most common repository for Java/JVM libraries
    google()       // For Android libraries
    mavenLocal()   // Local Maven cache (~/.m2/repository)

    // Custom Maven repository
    maven {
        url = uri("https://my.custom.repo/maven2")
    }

    // Ivy repository (less common for new projects)
    ivy {
        url = uri("https://my.custom.repo/ivy")
    }
}
```
Common repositories:
*   `mavenCentral()`: The default and largest public repository.
*   `jcenter()`: Was popular, but is now read-only and effectively deprecated for new submissions. `mavenCentral()` is preferred.
*   `google()`: Hosts Android-specific libraries.
*   `mavenLocal()`: Uses your local Maven repository, useful for testing unpublished local artifacts.

## 3. Transitive Dependencies

When you declare a dependency, Gradle automatically pulls in its dependencies (transitive dependencies). This simplifies configuration but can sometimes lead to conflicts or unwanted libraries.

Example: If `library-A` depends on `library-C`, and your project depends on `library-A`, Gradle will also include `library-C`.

## 4. Dependency Configurations (Advanced)

Configurations are named collections of dependencies. `implementation`, `api`, etc., are pre-defined configurations. You can also create custom configurations for more fine-grained control over dependency scopes, although this is an advanced use case.

## 5. Resolving Dependency Conflicts

Conflicts occur when different parts of your project (or its dependencies) require different versions of the same library. Gradle has a built-in conflict resolution strategy:

*   **Default Strategy:** By default, Gradle selects the newest (highest) version of a conflicting dependency. For example, if `library-A` needs `common-lib:1.0` and `library-B` needs `common-lib:2.0`, Gradle will pick `common-lib:2.0`.

*   **Forcing a Version:** You can explicitly force a specific version if the default resolution isn't what you want:
    ```kotlin
    dependencies {
        implementation("org.example:common-lib") { // No version here
            version { strictly("1.5") } // Force version 1.5
        }
        // or for a specific transitive dependency
        constraints {
            implementation("org.example:transitive-common-lib:1.5") {
                 because("Specific version needed for compatibility")
            }
        }
    }
    ```
    Or, more commonly using `resolutionStrategy`:
    ```kotlin
    configurations.all {
        resolutionStrategy {
            force("org.example:common-lib:1.5")
            // Or force specific versions for specific configurations
            eachDependency {
                if (requested.group == "org.example" && requested.name == "another-lib") {
                    useVersion("2.1")
                    because("Legacy component requires this specific version")
                }
            }
        }
    }
    ```

## 6. Excluding Transitive Dependencies

Sometimes, a library pulls in a transitive dependency that you don't want or that conflicts with another library.

```kotlin
dependencies {
    implementation("org.example:library-A:1.0") {
        exclude(group = "org.unwanted", module = "unwanted-lib")
    }
}
```

## 7. Using Bill of Materials (BOMs)

A Bill of Materials (BOM) is a special kind of POM (Project Object Model) that groups together recommended versions of libraries that are known to work well together. This is common for large frameworks like Spring Boot or Spring Cloud.

```kotlin
dependencies {
    // Import the Spring Boot BOM
    implementation(platform("org.springframework.boot:spring-boot-dependencies:3.2.0"))

    // Now declare Spring Boot dependencies without specifying versions
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
}
```
Using `platform(...)` imports the BOM, and Gradle will use the versions defined in that BOM for any dependencies declared without a version.

## 8. Viewing Dependency Reports

Gradle provides tasks to help you understand your project's dependencies:

*   **`gradlew dependencies`**: Shows a tree of all dependencies for all configurations, including transitive ones and how conflicts were resolved.
    *   `gradlew :subproject:dependencies` for a specific subproject.
    *   `gradlew dependencies --configuration implementation` for a specific configuration.

*   **`gradlew dependencyInsight --dependency <name> --configuration <config>`**: Provides detailed information about a specific dependency, why it was included, and how its version was selected.
    *   Example: `gradlew dependencyInsight --dependency jackson-databind --configuration runtimeClasspath`

These reports are invaluable for debugging dependency issues.

--- 
End of Part 2. Next part will cover Build Scripts in Depth (Groovy vs Kotlin DSL, Project and Task Configuration).
