@echo off
echo === Standard Project Clean ===
echo This script will stop Gradle daemons and remove project-specific build artifacts.
echo It will NOT remove your global Gradle caches (downloaded dependencies).
echo.

echo [+] Stopping Gradle daemons...
call gradlew --stop
if errorlevel 1 (
    echo [WARNING] 'gradlew --stop' reported an error, or no daemons were running.
) else (
    echo    - Gradle daemons stopped (if any were running).
)
echo.

echo [+] Removing project build directory (.\build)...
if exist "build" (
    echo    - Attempting to remove .\build
    rd /s /q "build"
    if errorlevel 1 (
        echo [ERROR] Failed to remove .\build. It might be locked by another process.
        echo         Please ensure no programs (IDE, file explorer, etc.) are using this directory.
    ) else (
        echo    - .\build directory removed successfully.
    )
) else (
    echo    - .\build directory not found. Nothing to remove.
)
echo.

REM Add other project-specific build directories if needed, e.g., for submodules
echo [+] Removing submodule build directories (if they exist)...
for /d %%G in (komga, komga-tray, komga-webui) do (
    if exist "%%G\build" (
        echo    - Attempting to remove .\\%%G\build
        rd /s /q "%%G\build"
        if errorlevel 1 (
            echo [ERROR] Failed to remove .\\%%G\build. It might be locked.
        ) else (
            echo    - .\\%%G\build removed successfully.
        )
    ) else (
        echo    - .\\%%G\build directory not found.
    )
)
echo.

echo [+] Removing project-specific .gradle directory (.\.gradle)...
if exist ".gradle" (
    echo    - Attempting to remove .\.gradle
    rd /s /q ".gradle"
    if errorlevel 1 (
        echo [ERROR] Failed to remove .\.gradle. It might be locked.
    ) else (
        echo    - .\.gradle directory removed successfully.
    )
) else (
    echo    - .\.gradle directory not found. Nothing to remove.
)
echo.

echo === Standard Project Clean Complete ===
echo You can now try running your build again.
