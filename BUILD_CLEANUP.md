# Build and Cleanup Guide

## Current Cleanup Script

Run `cleanup.bat` in the project root to clean build outputs.

## Better Approach: Gradle Task

Add to `build.gradle.kts`:

```kotlin
tasks.register("cleanAll") {
    group = "build"
    dependsOn("clean")
    doLast {
        delete("build", "komga/build", "komga-tray/build", "komga-webui/build")
    }
}
```

Run with: `./gradlew cleanAll`

## Simple Scripts

### Bash (WSL/Linux/macOS)
```bash
#!/bin/bash
./gradlew --stop
rm -rf build/ komga/build/ komga-tray/build/ komga-webui/build/
```

### Python (Cross-Platform)
```python
import shutil
import subprocess
from pathlib import Path

for path in ["build", "komga/build", "komga-tray/build", "komga-webui/build"]:
    if Path(path).exists():
        print(f"Removing {path}")
        shutil.rmtree(path, ignore_errors=True)
```

## Troubleshooting
- Close IDEs/editors if files are locked
- Run as admin if needed
- Use `./gradlew --stop` for Gradle issues
