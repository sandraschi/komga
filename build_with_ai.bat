@echo off
setlocal enabledelayedexpansion

:: Set error handling
set EXIT_CODE=0
set "TEMP_LOG_DIR=%TEMP%\komga_build_logs"

:: Create logs directory if it doesn't exist
if not exist "%TEMP_LOG_DIR%" (
    mkdir "%TEMP_LOG_DIR%"
)

:: Clear previous log
echo. > "%TEMP_LOG_DIR%\build.log"

echo ========================================
echo Starting AI-enabled build at %DATE% %TIME%
echo ========================================

echo [1/6] Stopping any running Java processes...
taskkill /F /IM java.exe /T >nul 2>&1
if %ERRORLEVEL% NEQ 0 if %ERRORLEVEL% NEQ 128 (
    echo [INFO] No Java processes found or failed to stop them
) else (
    echo [INFO] Stopped Java processes
)

:: Clean build directories
echo [2/6] Cleaning build directories...

:: Clean project root build directory
if exist "%CD%\build" (
    echo Removing directory: %CD%\build
    takeown /F "%CD%\build\*" /R /D Y >nul 2>&1
    icacls "%CD%\build" /grant "%USERNAME%:F" /T /C /Q >nul 2>&1
    rd /s /q "%CD%\build" 2>nul || (
        echo [ERROR] Failed to remove directory: %CD%\build
    )
)

:: Clean all build directories in subfolders
for /d %%i in ("%CD%\*\build") do (
    echo Removing directory: %%~fi
    takeown /F "%%~fi\*" /R /D Y >nul 2>&1
    icacls "%%~fi" /grant "%USERNAME%:F" /T /C /Q >nul 2>&1
    rd /s /q "%%~fi" 2>nul || (
        echo [ERROR] Failed to remove directory: %%~fi
    )
)

:: Clean Gradle caches
echo [3/6] Cleaning Gradle caches...
if exist "%USERPROFILE%\.gradle\caches" (
    echo Cleaning Gradle caches...
    rd /s /q "%USERPROFILE%\.gradle\caches" 2>nul || (
        echo [WARN] Failed to remove Gradle caches, continuing...
    )
)

:: Stop Gradle daemons
echo [4/6] Stopping Gradle daemons...
call gradlew --stop >nul 2>&1

:: Build with detailed logging
echo [5/6] Building with detailed logging...
echo Log file: %TEMP_LOG_DIR%\build.log

:: Run the build with detailed logging
call gradlew clean build --stacktrace --info --debug --refresh-dependencies --no-build-cache --no-scan --no-daemon -Dorg.gradle.parallel=false -Dorg.gradle.caching=false -x test -x check > "%TEMP_LOG_DIR%\build.log" 2>&1
set EXIT_CODE=!ERRORLEVEL!

:: Check build result
echo [6/6] Build completed with status: 
if !EXIT_CODE! EQU 0 (
    echo [SUCCESS] Build completed successfully!
    echo.
    echo To start Komga, run:
    echo gradlew bootRun --no-daemon
    echo.
) else (
    echo [ERROR] Build failed with error code !EXIT_CODE!
    echo.
    
    :: Show Kotlin compilation errors if any
    echo [ERROR] Kotlin compilation errors:
    findstr /i "error: " "%TEMP_LOG_DIR%\build.log" | findstr /v "ERROR [org.gradle" | findstr /v "[ERROR] [org.gradle" | findstr /v "[ERROR] [system.err]" | more
    
    echo.
    echo [INFO] Last 20 lines of the log:
    powershell -Command "Get-Content '%TEMP_LOG_DIR%\build.log' | Select-Object -Last 20"
    
    echo.
    echo For full details, see: %TEMP_LOG_DIR%\build.log
    echo.
)

:: Clean up
echo Build process completed. Exit code: !EXIT_CODE!
if !EXIT_CODE! NEQ 0 exit /b !EXIT_CODE!
    powershell -Command "Get-Content -Tail 200 '%TEMP_LOG_DIR%\build.log'"
    echo.
    echo [INFO] Full log: %TEMP_LOG_DIR%\build.log
    start notepad.exe "%TEMP_LOG_DIR%\build.log"
)

exit /b %EXIT_CODE%

endlocal
