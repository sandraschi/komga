# Gradle Deep Dive - Part 6: Build Scans, Profiling, and Troubleshooting

This final part focuses on tools and techniques for understanding build behavior, diagnosing problems, optimizing performance, and effectively troubleshooting Gradle builds.

## 1. Gradle Build Scans™

A Gradle Build Scan™ is a powerful, shareable web-based report containing extensive information about a build. It's an invaluable tool for understanding, debugging, and optimizing builds, as well as for collaborating with others on build-related issues.

### a. What They Are

When you create a build scan, Gradle collects data about your build execution and uploads it to `scans.gradle.com` (publicly, by default) or to a private Gradle Enterprise server if your organization uses one.

### b. How to Create One

Simply add the `--scan` flag to your Gradle command:

```bash
./gradlew build --scan
```

After the build finishes (even if it fails), Gradle will prompt you to publish the scan. You'll need to accept the terms of service (once per machine) and then confirm by typing `yes`.

### c. Information Provided

A build scan offers a wealth of information, including:

*   **Summary:** Overview of build time, tasks executed, failures, etc.
*   **Performance:** Detailed breakdown of time spent in configuration, task execution, and specific operations. Helps identify bottlenecks.
*   **Timeline:** A visual representation of task execution, including parallel execution.
*   **Dependencies:** Full dependency resolution trees, insights into why specific versions were chosen.
*   **Plugins:** List of applied plugins and their versions.
*   **Console Log:** The full console output of the build.
*   **Environment:** Details about the OS, JVM, Gradle version, and environment variables.
*   **Tests:** Test results, including failures and performance.
*   **Infrastructure:** Information about network activity, caching, etc.

### d. Benefits

*   **Troubleshooting:** Quickly diagnose build failures and performance issues.
*   **Collaboration:** Easily share build details with team members or when seeking help online.
*   **Optimization:** Identify areas for performance improvement.
*   **Historical Record:** Track build behavior over time.

### e. Publishing Terms

*   **Public Scans (`scans.gradle.com`):** By default, scans are public but anonymized (project names and some details might be obscured). Be mindful if your build log contains sensitive information.
*   **Gradle Enterprise:** For private, on-premise or cloud-hosted build scan and cache servers, offering more control and features for teams.

## 2. Profiling Builds

If your build is slow, profiling helps pinpoint where the time is being spent.

### a. Using `gradlew --profile`

This command generates an HTML report detailing the build's performance.

```bash
./gradlew build --profile
```

The report is typically saved in `build/reports/profile/profile-YYYY-MM-DD-HH-MM-SS.html`.

### b. Analyzing the Report

The profile report shows:

*   **Summary:** Total build time, configuration time, task execution time.
*   **Configuration:** Time spent evaluating settings and build scripts.
*   **Dependency Resolution:** Time spent resolving dependencies for each configuration.
*   **Task Execution:** A breakdown of time spent in each task, sorted by duration.

This helps identify if the bottleneck is in script compilation, dependency resolution, or specific long-running tasks.

### c. Using `--scan` for Deeper Performance Analysis

Build scans provide even more detailed performance insights than the local `--profile` report, including a timeline view and more granular data.

## 3. Common Gradle Issues and Troubleshooting Strategies

### a. Slow Builds

*   **Check Daemon Status:** Ensure the Gradle Daemon is running (`gradlew --status`). If not, subsequent builds will be slower. The first build after starting the daemon is always slower.
*   **Configuration Time:** High configuration time (visible in `--profile` or build scan) can be due to complex logic in build scripts. Optimize scripts, use `buildSrc` for custom logic.
*   **Incremental Build Misconfigurations:** Ensure tasks correctly declare inputs/outputs.
*   **Network Issues:** Slow dependency downloads. Check network, repository status.
*   **Insufficient Resources:** Low memory/CPU. Increase daemon JVM memory via `org.gradle.jvmargs` in `gradle.properties`.
*   **Turn off unused features:** e.g. `--no-build-cache` if you suspect local cache issues.

### b. Dependency Conflicts

*   **Symptoms:** `DuplicatePlatformClassesException`, `NoSuchMethodError`, `NoClassDefFoundError` at runtime.
*   **Tools:**
    *   `gradlew dependencies`: Shows the dependency tree for all configurations.
    *   `gradlew :module:dependencies --configuration <name>`: For a specific module and configuration.
    *   `gradlew dependencyInsight --dependency <name> --configuration <name>`: Shows why a specific dependency or version was chosen.
*   **Resolution:** Use `constraints`, `resolutionStrategy { force 'group:name:version' }`, or exclude transitive dependencies.

### c. Task Failures

*   **Analyze Stack Traces:** The console output usually provides a stack trace. Read it carefully.
*   **`--stacktrace`:** Provides more detailed stack traces.
*   **`--info` or `--debug`:** Increases log verbosity, which might reveal more context about the failure.
*   **Isolate the Issue:** Try running the failing task directly.

### d. Out-of-Memory Errors

*   **Symptom:** `java.lang.OutOfMemoryError: Java heap space` or `GC overhead limit exceeded`.
*   **Solution:** Increase the Gradle Daemon's heap size in `gradle.properties` (in project root or `~/.gradle/`):
    ```properties
    org.gradle.jvmargs=-Xmx4g -XX:MaxMetaspaceSize=1g
    ```
    Adjust `Xmx` (max heap) and `MaxMetaspaceSize` as needed.

### e. "Could not resolve..." / "Could not download..." Errors

*   **Check Repositories:** Ensure the necessary repositories (`mavenCentral()`, `google()`, custom repos) are declared in `build.gradle.kts`.
*   **Dependency Spelling/Coordinates:** Verify `group:name:version` are correct.
*   **Network Connectivity:** Ensure you have internet access and can reach the repositories.
*   **Firewall/Proxy Issues:** Corporate firewalls or proxies might block access. Configure Gradle for your proxy if needed (see Gradle documentation).
*   **`--refresh-dependencies`:** Forces Gradle to ignore cached dependency resolution results and re-resolve them from remote repositories.

### f. Caching Issues / Stale State

*   **Symptoms:** Unexpected behavior, build works after a clean but not incrementally.
*   **`--rerun-tasks`:** Forces all tasks to re-run, ignoring up-to-date checks.
*   **`gradlew clean`:** Removes the `build` directory.
*   **`gradlew --stop`:** Stops all Gradle Daemons, which can help if a daemon has a stale state.
*   **Manual Cache Cleaning (Use with caution):**
    *   Project-specific: Delete `.gradle` directory in project root.
    *   Global: Delete `~/.gradle/caches/`. This will force re-download of all dependencies for all projects.

## 4. Useful Command-Line Options

*   **Daemon Control:**
    *   `--daemon`: (Default) Use the Gradle Daemon.
    *   `--no-daemon`: Do not use the Gradle Daemon.
    *   `--stop`: Stops all running Gradle Daemons.
*   **Parallelism & Caching:**
    *   `--parallel` / `--no-parallel`: Enables/disables parallel execution of tasks in different projects.
    *   `--configure-on-demand`: (Experimental) Configures only necessary projects for the requested tasks.
    *   `--build-cache` / `--no-build-cache`: Enables/disables the build cache for the current build.
*   **Logging Verbosity:**
    *   `--info`: More detailed output.
    *   `--debug`: Very verbose output, including internal Gradle logging.
    *   `--quiet` or `-q`: Minimal output.
*   **Console Output:**
    *   `--console plain|auto|rich|verbose`: Controls the type of console output. `rich` provides a more dynamic UI.

## 5. Getting Help

*   **Official Gradle Documentation:** The primary source for information ([docs.gradle.org](https://docs.gradle.org)).
*   **Gradle User Manual:** Comprehensive guide to all features.
*   **Gradle DSL Reference:** Details on all available properties and methods in build scripts.
*   **Community Forums:**
    *   [Gradle Forums](https://discuss.gradle.org/)
    *   [Stack Overflow](https://stackoverflow.com/questions/tagged/gradle) (use the `gradle` tag).
*   **Build Scans:** Share build scans when asking for help to provide context.

--- 
End of Part 6. This concludes the Gradle Deep Dive series.
