@echo off
echo === Deep System-Wide Gradle Clean ===
echo [CRITICAL WARNING] This script will:
echo   1. Stop Gradle daemons.
echo   2. Remove project-specific build artifacts (.\build, .\.gradle, submodule builds).
echo   3. Remove your GLOBAL Gradle caches (%%USERPROFILE%%\.gradle\caches).
echo.
echo Removing global caches means ALL dependencies for ALL your Gradle projects
echo will need to be re-downloaded on their next build, which can be very time-consuming.
echo.
echo Use this script only if you suspect deep-seated cache corruption issues.
echo.
set /p "confirmation=Are you absolutely sure you want to proceed? (yes/no): "
if /i not "%confirmation%"=="yes" (
    echo Deep clean aborted by user.
    exit /b 1
)
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
        echo [ERROR] Failed to remove .\build. It might be locked.
    ) else (
        echo    - .\build directory removed.
    )
) else (
    echo    - .\build directory not found.
)
echo.

echo [+] Removing submodule build directories (if they exist)...
for /d %%G in (komga, komga-tray, komga-webui) do (
    if exist "%%G\build" (
        echo    - Attempting to remove .\\%%G\build
        rd /s /q "%%G\build"
        if errorlevel 1 (
            echo [ERROR] Failed to remove .\\%%G\build. It might be locked.
        ) else (
            echo    - .\\%%G\build removed.
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
        echo    - .\.gradle directory removed.
    )
) else (
    echo    - .\.gradle directory not found.
)
echo.

echo [+] Removing GLOBAL Gradle caches from %%USERPROFILE%%\.gradle\caches ...
if exist "%%USERPROFILE%%\.gradle\caches" (
    echo    - Attempting to remove %%USERPROFILE%%\.gradle\caches
    rd /s /q "%%USERPROFILE%%\.gradle\caches"
    if errorlevel 1 (
        echo [ERROR] Failed to remove %%USERPROFILE%%\.gradle\caches.
        echo         This is a critical system directory for Gradle.
        echo         Ensure no Gradle processes are running and check for file locks or permissions.
    ) else (
        echo    - Global Gradle caches (%%USERPROFILE%%\.gradle\caches) removed successfully.
    )
) else (
    echo    - Global Gradle caches directory (%%USERPROFILE%%\.gradle\caches) not found.
)
echo.

echo === Deep Clean Complete ===
echo Your system is now in a very clean Gradle state. The next build will re-download all dependencies.
