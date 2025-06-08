# Research Report: Komga Repository - Build Stabilization and Feature Integration Plan (Part 2 - Expanded)

**Date:** 2025-05-29

## 3. Immediate Next Steps: Achieving a Stable Build

The absolute priority is to confirm that the recent modifications to `komga/build.gradle.kts` (specifically, excluding all YAML files from Gradle's template processing via `exclude("**/*.yml", "**/*.yaml")` in the `processResources` task) have definitively resolved the build failures. A successful and reproducible build is the bedrock for any further development or feature integration.

### 3.1. Rigorous Clean Build Execution Protocol:

To ensure no lingering state is affecting the build outcome, a meticulous clean build process is required:

1.  **Environment Sanitization:**
    *   **Terminate ALL Java Processes:** Use Task Manager (or `taskkill /F /IM java.exe /T` in an admin terminal) to ensure no instances of `java.exe` (which could be orphaned Gradle daemons or previous build attempts) are running.
    *   **Close IDEs:** Temporarily close IntelliJ IDEA, VS Code, or any other IDE that might be interacting with the project to prevent file locking or background Gradle activity.
2.  **Comprehensive Project Cleaning:**
    *   **Execute `full_cleanup.bat`:** This script is designed for a deep clean. If its exact contents are unknown, assume it performs actions like:
        *   `gradlew --stop`: Stops any active Gradle daemons for the project.
        *   `del /s /q .gradle`: Deletes the project-specific Gradle cache and history directory.
        *   `del /s /q build`: Deletes the main build output directory for the root project.
        *   Deletes `build` and `.gradle` directories within submodules (e.g., `komga/build`, `komga-tray/build`).
        *   Potentially, it might even clear the global Gradle caches (`%USERPROFILE%\.gradle\caches`), though this is a more drastic step usually reserved for persistent cache corruption issues.
    *   **Manual Verification (if `full_cleanup.bat` is suspect):** After running the script, manually verify that the `build` directories at the project root and within each submodule (`komga`, `komga-tray`) and the `.gradle` directory at the project root are indeed deleted.
3.  **Execute the Build Command:**
    *   Open a fresh terminal (PowerShell or Command Prompt).
    *   Navigate to the project root: `cd c:\Users\sandr\OneDrive\Dokumente\GitHub\komga`
    *   Run the build with specific flags for clarity and isolation:
        ```bash
        .\gradlew.bat clean build --no-daemon --info --stacktrace
        ```
        *   `clean`: Explicitly invokes Gradle's clean task, which removes build outputs. This provides a clean slate for the subsequent `build` task.
        *   `build`: This is a lifecycle task that compiles source code, processes resources, runs tests, and assembles the application (e.g., creates JAR/WAR files).
        *   `--no-daemon`: Crucial for this diagnostic phase. It ensures the build runs in a new, isolated JVM process, avoiding any state or issues from a potentially problematic Gradle Daemon.
        *   `--info`: Sets Gradle's logging level to INFO, providing more detailed output about which tasks are running, their status, and other useful build information. This is more verbose than the default LIFECYCLE level.
        *   `--stacktrace`: Instructs Gradle to print full stack traces for any exceptions that occur during the build. This is essential for diagnosing the root cause of failures.

### 3.2. Analyzing Build Output and Contingency Planning:

*   **Successful Build Scenario:**
    *   Look for the `BUILD SUCCESSFUL` message at the end of the output.
    *   Verify that build artifacts (e.g., `komga/build/libs/komga-<version>.jar`) have been created.
    *   If successful, this validates the YAML exclusion fix. The next step would be to cautiously re-enable the Gradle Daemon for faster builds and proceed to Calibre feature integration.
*   **Build Failure Scenario:**
    *   **Scrutinize Error Messages:** Do not just look at the last few lines. Read the output carefully, starting from the first indication of a problem (often prefixed with `* What went wrong:`). The `--stacktrace` option will provide detailed exception information.
    *   **Identify Failing Task:** Gradle output will clearly state which task failed (e.g., `:komga:compileKotlin`, `:komga:test`, or still `:komga:processResources` if the fix was incomplete).
    *   **Recurring `processResources` Issue:** If `processResources` still fails with a template parsing error for a *different* file type (not YAML), then the exclusion rules need to be expanded or refined for that file type. If it's still a YAML file, then our exclusion rule might have a typo or is not being applied as expected (check `build.gradle.kts` syntax carefully).
    *   **Other Potential Issues:**
        *   **Compilation Errors:** Syntax errors in Kotlin/Java code, unresolved dependencies.
        *   **Test Failures:** Issues in unit or integration tests.
        *   **Dependency Resolution Problems:** Network issues preventing download of dependencies, or conflicting dependency versions. Check the `distributionUrl` in `gradle/wrapper/gradle-wrapper.properties` to ensure it's correct and accessible.
        *   **Filesystem/Permission Issues:** Though less common, ensure the build process has necessary read/write permissions.
    *   **Iterative Refinement:** If the build fails, adjust the build scripts or code based on the error, then repeat the full clean build protocol.

## 4. Path to Running "Improved Komga with Calibre Improvements" Today

Assuming the basic application build is stabilized (i.e., `.\gradlew.bat clean build --no-daemon` completes successfully), the following roadmap aims to integrate and run the Calibre-enhanced version:

1.  **Identify and Isolate Calibre Improvement Code:**
    *   **Version Control Archeology:**
        *   Use `git log --grep="Calibre" --author="<YourNameOrRelevantAuthor>"` to find commits related to Calibre.
        *   Check `git branch --all` for feature branches named descriptively (e.g., `feature/calibre-integration`, `calibre-metadata-sync`).
        *   Review project issue trackers (e.g., GitHub Issues, Jira) for tasks related to Calibre improvements, which might reference specific commits or branches.
    *   **Understand the Scope:** Determine which files/modules are affected by these changes. Are they confined to specific services, or do they have wider implications across the codebase?
2.  **Strategic Code Integration:**
    *   **Current Working Branch:** Ensure your current local branch is clean, up-to-date with its remote counterpart, and, most importantly, *builds successfully* with the YAML fix.
    *   **Merge/Rebase:**
        *   If Calibre changes are on a separate feature branch: `git merge feature/calibre-integration` (or `git rebase main` on the feature branch, then merge). Choose rebase for a cleaner history if appropriate, but merge is safer if unsure.
        *   If changes are specific commits on another branch: `git cherry-pick <commit-hash>` can be used, but this is generally for smaller, isolated changes.
    *   **Resolve Conflicts:** Be prepared to resolve merge conflicts carefully, understanding the context of both sides of the change.
3.  **Post-Integration Build and Test Cycle:**
    *   **Full Rebuild:** After integration, immediately run `.\gradlew.bat clean build --no-daemon --info --stacktrace`.
    *   **Application Startup:**
        *   If the build succeeds, attempt to run the Komga application. The standard Spring Boot way is: `.\gradlew.bat :komga:bootRun` (ensure you target the correct submodule if `bootRun` is not in the root project).
        *   Alternatively, build the executable JAR (`.\gradlew.bat :komga:bootJar`) and run it directly: `java -jar komga/build/libs/komga-<version>.jar`.
    *   **Targeted Testing of Calibre Features:**
        *   Consult any existing test plans or use cases for the Calibre improvements.
        *   Manually test the specific workflows:
            *   Does Komga correctly read new Calibre metadata fields?
            *   If there's a sync feature, does it operate correctly in both directions (Komga to Calibre, Calibre to Komga)?
            *   Are there any new UI elements for Calibre integration? Test their functionality.
            *   Check application logs for any errors or warnings related to Calibre operations.
    *   **Regression Testing:** Briefly check core Komga functionalities to ensure the Calibre changes haven't inadvertently broken existing features.
4.  **Iterative Debugging of Integration Issues:**
    *   **New Compilation Errors:** Often due to API changes or incorrect merges.
    *   **Runtime Exceptions:** Use the IDE debugger, add detailed logging statements (`import mu.KotlinLogging`, `private val logger = KotlinLogging.logger {}`).
    *   **Isolate the Problem:** If a complex feature fails, try to break it down. Can you test smaller parts of the Calibre integration in isolation?
    *   **Consult Commit History:** If a feature used to work, `git bisect` can be a powerful tool to find the exact commit that introduced a regression, though it's more advanced.

This systematic approach should maximize the chances of getting a stable, feature-enhanced version running.
