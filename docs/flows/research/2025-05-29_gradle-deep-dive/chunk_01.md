# Gradle Deep Dive - Part 1: Introduction & Core Concepts

This document is the first part of an extensive guide to Gradle, tailored to help understand its workings, especially in the context of a project like Komga.

## 1. What is Gradle?

Gradle is an advanced, open-source build automation system. It's designed to be flexible enough to build almost any type of software. Gradle combines the best features of other build tools like Ant (flexibility) and Maven (convention over configuration, dependency management, lifecycle) while introducing its own powerful capabilities.

**Key Characteristics:**

*   **Polyglot:** While build scripts can be written in Groovy or Kotlin, Gradle can build projects written in Java, Kotlin, Scala, C++, Swift, Android, and more.
*   **Performance-Oriented:** Gradle incorporates several features to speed up builds, such as incremental builds, build caching, and the Gradle Daemon.
*   **Extensible:** A rich plugin ecosystem allows Gradle to be adapted for various project types and workflows. You can also easily write custom plugins.
*   **Convention over Configuration (with flexibility):** Gradle provides sensible defaults (conventions) but allows you to override them easily when needed.
*   **Powerful Dependency Management:** Sophisticated handling of dependencies, including transitive dependencies, conflict resolution, and custom repository support.

## 2. Why Gradle?

Compared to older tools like Maven or Ant, Gradle offers:

*   **Expressive Build Language:** Using Groovy or Kotlin for build scripts allows for more powerful and readable build logic compared to XML (Maven/Ant).
*   **Performance:** Generally faster builds due to its advanced caching mechanisms, incremental task execution, and daemon.
*   **Flexibility:** Less rigid than Maven, allowing for easier customization of the build process.
*   **IDE Support:** Excellent integration with major IDEs like IntelliJ IDEA, Android Studio, and Eclipse.
*   **Growing Community:** Widely adopted, especially for Android development and increasingly for backend JVM projects.

## 3. Core Gradle Concepts

Understanding these fundamental concepts is crucial for working effectively with Gradle.

### a. Projects and Subprojects (Multi-Project Builds)

*   A **Project** in Gradle represents a component to be built (e.g., a JAR library, a web application).
*   Gradle excels at **multi-project builds**. A root project can contain multiple subprojects, each with its own build configuration. These subprojects can depend on each other.
    *   Example: Komga itself is a multi-project build (`komga`, `komga-tray`, `komga-webui`).
*   The `settings.gradle.kts` (or `settings.gradle`) file in the root project defines the project structure and includes subprojects.

### b. Build Scripts

*   Each project has a **build script**, by default named `build.gradle.kts` (for Kotlin DSL) or `build.gradle` (for Groovy DSL).
*   This script defines how the project is built: its tasks, dependencies, plugins, and other configurations.
*   **Kotlin DSL (`.gradle.kts`)** is increasingly preferred for its static typing, better IDE support (autocompletion, refactoring), and improved readability for complex logic.

### c. Tasks

*   A **Task** is the fundamental unit of work in a Gradle build (e.g., compiling code, running tests, creating a JAR, publishing artifacts).
*   Tasks have inputs and outputs. Gradle's incremental build feature uses this to avoid re-running tasks whose inputs haven't changed.
*   Tasks can depend on other tasks, forming a Directed Acyclic Graph (DAG) that Gradle executes.
*   Common tasks: `clean`, `build`, `test`, `assemble`.

### d. Plugins

*   **Plugins** extend Gradle's capabilities. They can add pre-configured tasks, new conventions, and dependency management features.
*   Examples:
    *   `kotlin("jvm")`: Adds support for building Kotlin JVM projects.
    *   `org.springframework.boot`: Simplifies building and running Spring Boot applications.
    *   `java`: Core plugin for Java projects.
*   Plugins are applied in the `plugins { ... }` block at the top of a build script.

### e. The Gradle Wrapper (`gradlew` / `gradlew.bat`)

*   The **Gradle Wrapper** is the recommended way to execute Gradle builds.
*   It's a script (`gradlew` for Linux/macOS, `gradlew.bat` for Windows) included in your project.
*   **Benefits:**
    *   **Standardized Build Environment:** Ensures that everyone working on the project uses the same Gradle version, preventing version-related inconsistencies.
    *   **No Manual Installation:** Users don't need to install Gradle manually; the wrapper downloads the specified Gradle version automatically if it's not already present.
*   You should always use `gradlew` commands instead of a globally installed `gradle` command for project builds.

## 4. The Gradle Build Lifecycle

A Gradle build proceeds through three distinct phases:

1.  **Initialization Phase:**
    *   Gradle determines the project structure (which projects are involved in the build).
    *   It evaluates the `settings.gradle.kts` (or `settings.gradle`) file.
    *   It creates a `Project` instance for each project included in the build.

2.  **Configuration Phase:**
    *   Gradle evaluates the `build.gradle.kts` (or `build.gradle`) scripts for all projects involved.
    *   It creates and configures all tasks defined in the build scripts and by applied plugins.
    *   It builds the task execution graph (the DAG) by resolving task dependencies.
    *   **Crucially, all build script code is executed during this phase.** This is why it's important to avoid performing heavy computations or I/O directly in the script body; such logic should be part of a task's *action*.

3.  **Execution Phase:**
    *   Gradle executes the tasks requested by the user (e.g., `gradlew build`) and their dependencies, in the order determined by the DAG.
    *   Only tasks that are part of the requested execution graph are run.

## 5. The Gradle Daemon

*   The **Gradle Daemon** is a long-lived background process that significantly speeds up builds.
*   **How it works:**
    *   It keeps build information (like project structure, compiled build scripts, and task graphs) in memory across builds.
    *   This avoids the overhead of re-initializing Gradle and re-evaluating build scripts for every build.
*   The Daemon is enabled by default since Gradle 3.0.
*   **When to disable it (`--no-daemon`):**
    *   For CI/CD environments where each build runs in a fresh environment (though even here, it can sometimes be beneficial).
    *   When troubleshooting issues that might be related to a stale Daemon state (though `gradlew --stop` is often a better first step to resolve this).
    *   If you need to free up system resources immediately after a build.

--- 
End of Part 1. Next part will cover Dependency Management in Gradle.
