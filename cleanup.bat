@echo off
setlocal enabledelayedexpansion

echo === Cleaning Gradle Caches ===

:: Stop any running Gradle daemons
echo Stopping Gradle daemons...
call gradlew.bat --stop 2>nul

:: Clean Gradle caches
set GRADLE_USER_HOME=%USERPROFILE%\.gradle

if exist "%GRADLE_USER_HOME%\caches" (
    echo Removing Gradle caches from %GRADLE_USER_HOME%\caches
    rmdir /s /q "%GRADLE_USER_HOME%\caches" 2>nul
)

:: Clean project build directories
for %%d in (
    "build" 
    ".gradle" 
    "app\build" 
    "komga\build"
    "bin"
    "out"
) do (
    if exist "%%~d" (
        echo Removing directory: %%~d
        rmdir /s /q "%%~d" 2>nul
    )
)

echo.
echo === Cleanup Complete ===
echo Please run the build again with: python build_and_analyze.py

pause
