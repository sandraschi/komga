# Research Report: Komga Repository - Status and Build Problems (Part 1 - Expanded)

**Date:** 2025-05-29

## 1. Current Repository Status and Project Goals

The "improved Komga" repository represents an ongoing effort to enhance the core Komga application, a self-hosted comics/manga server. The current development cycle is focused on two main fronts: integrating significant new features, particularly enhancements related to **Calibre integration** (such as improved metadata handling, two-way synchronization, or custom column support – specific details of these Calibre improvements should be verified from project documentation or commit history), and simultaneously resolving complex build system issues that are hindering development progress.

### Technology Stack Overview:

*   **Kotlin:** The primary programming language (likely a recent version like 1.9.x). Kotlin's conciseness, null safety, and excellent Java interoperability make it a strong choice for modern server-side applications.
*   **Spring Boot:** The core application framework (likely version 3.x). Spring Boot simplifies the development of stand-alone, production-grade Spring-based applications. Key modules in use probably include:
    *   `spring-boot-starter-web`: For building RESTful APIs and web functionalities.
    *   `spring-boot-starter-data-jpa`: For database interaction using the Java Persistence API.
    *   `spring-boot-starter-security`: For authentication and authorization.
    *   `spring-boot-starter-actuator`: For monitoring and managing the application.
*   **Gradle:** The build automation tool (version 8.11.1 as identified). Gradle is responsible for compiling code, managing dependencies, running tests, packaging the application, and other build-related tasks. It uses a Kotlin DSL (`build.gradle.kts`) for build script definition in this project.
*   **Project Structure:** Komga appears to be a multi-module Gradle project, including at least:
    *   `komga`: The core application logic and server.
    *   `komga-tray`: Potentially a desktop tray application for managing the server (this needs confirmation based on its actual purpose).
    *   `komga-webui`: The frontend user interface, likely built with a modern JavaScript framework (e.g., Vue.js, React) and integrated into the Gradle build for packaging or serving.

## 2. Detailed Analysis of Recent Build Problems

We've encountered and systematically addressed several build issues. Understanding these is key to preventing regressions and improving build stability.

### 2.1. Initial Build Hangs and Environment Instability

*   **Problem:** The Gradle build process was frequently hanging indefinitely, providing no clear error messages.
*   **Root Causes Investigated:**
    *   **Orphaned Java/Gradle Processes:** Multiple instances of Java or Gradle daemons running in the background can lead to resource conflicts. This includes file locks on build artifacts or cache directories, port conflicts if the build attempts to start services, or general system resource exhaustion.
    *   **Corrupted Gradle Caches:** Gradle maintains extensive caches (`%USERPROFILE%\.gradle\caches`) for dependencies, compiled scripts, and task outputs. If these caches become corrupted, they can lead to unpredictable build behavior, including hangs or incorrect build results.
    *   **IDE Interference:** Integrated Development Environments (IDEs) like IntelliJ IDEA or VS Code often have their own Gradle integration and can sometimes hold locks on files or run background Gradle tasks that conflict with manual command-line builds.
*   **Resolution Steps Taken:**
    *   **Process Termination:** Manually identifying and terminating all `java.exe` and Gradle-related processes.
    *   **Execution of `cleanup.bat` / `full_cleanup.bat`:** These scripts were designed to automate the environment cleaning process. Their typical actions include:
        *   Stopping any running Gradle daemons (`gradlew --stop`).
        *   Deleting local project build directories (`build`, `.gradle` within the project).
        *   Potentially clearing parts of the global Gradle cache (`%USERPROFILE%\.gradle\caches`).
    *   **Using `--no-daemon`:** This Gradle command-line option forces Gradle to run the build in a fresh, single-use process, bypassing the Gradle Daemon. This is invaluable for debugging because:
        *   It isolates the build from any potential issues within a running daemon (e.g., stale state, memory leaks in the daemon).
        *   It ensures that all build logic is executed from scratch, providing a more consistent and reproducible environment for diagnosing problems.

### 2.2. Gradle `processResources` Task Failure - YAML Templating Issue

*   **Problem:** After resolving the initial hangs, the build consistently failed during the `:komga:processResources` task. The error messages indicated failures in parsing YAML files (e.g., `application-meta-book.yml`, `application-dev.yml`) as Groovy templates.
    *   Example Error: `Failed to parse template script (your template may contain an error or be trying to use expressions not currently supported): startup failed: SimpleTemplateScriptX.groovy: 1: Unexpected input: ...`
*   **Deep Dive into `processResources` and Templating:**
    *   The `processResources` task is a standard Gradle Java plugin task. Its primary function is to copy resources from source directories (typically `src/main/resources`) into the build output directory (usually `build/resources/main`), making them available on the classpath or for packaging.
    *   Gradle allows these resources to be "filtered" or processed. One common form of processing is template expansion, where placeholders in resource files are replaced with values from project properties or other sources. This is often triggered by an `expand(project.properties)` call within the `processResources` configuration block in `build.gradle.kts`.
    *   The default templating engine used by Gradle for this is Groovy's `SimpleTemplateEngine`. This engine looks for expressions like `${...}` or `<%= ... %>` to evaluate.
*   **Root Cause of the YAML Parsing Failure:**
    *   The YAML configuration files in Komga (e.g., `application-*.yml`) use syntax that, while valid YAML, inadvertently conflicts with the `SimpleTemplateEngine`'s expectations.
    *   Common conflicting patterns in YAML:
        *   `${OPENAI_API_KEY:}` or `${KOMGA_CONFIG_DIRECTORY:data/meta-books}`: This is a standard Spring Boot convention for defining default values for properties if environment variables are not set. However, `${...}` is a primary placeholder syntax for Groovy templates.
        *   Unquoted strings or map keys that might resemble Groovy code or expressions, especially if they contain special characters like colons, brackets, or parentheses in specific positions that the template engine tries to interpret.
*   **Resolution Attempted and Rationale:**
    *   The fix involved modifying the `processResources` task configuration in `komga/build.gradle.kts`.
    *   Initially, specific files were excluded: `exclude("application-meta-book.yml")`.
    *   This was then broadened to `exclude("**/*.yml", "**/*.yaml")`. This directive tells Gradle to copy all files ending with `.yml` or `.yaml` as-is, without attempting to pass them through the template engine.
    *   The rationale is that these YAML files are Spring Boot configuration files and are meant to be parsed by Spring Boot at runtime. They do not require pre-processing by Gradle's templating engine. Spring Boot itself handles the resolution of placeholders like `${...}`.
*   **Implications and Further Considerations:**
    *   If any YAML files *did* genuinely require Gradle-level template expansion (which seems unlikely for Spring Boot configurations but is theoretically possible for other types of resources), the `exclude` rule would need to be more nuanced. For instance, one might exclude all YAML by default and then use a `filesMatching("**/specific-template-that-needs-expansion.yml") { expand(project.properties) }` block to selectively enable templating for specific files.
    *   This issue highlights the importance of understanding how build tools interact with project files and the potential for conflicts when file syntax overlaps with build tool conventions.

This detailed analysis of past and current issues should provide a solid foundation for the next steps in stabilizing the build.
