@echo off
setlocal enabledelayedexpansion

echo === FULL CLEANUP SCRIPT ===
echo This will clean all Gradle caches and temporary files.
echo Close all IDEs and other programs using these files.
echo.
pause

:: Kill any running Java processes
echo.
echo Killing any running Java processes...
taskkill /F /IM java.exe /T 2>nul

:: Clean Gradle caches
echo.
echo Cleaning Gradle caches...
set GRADLE_USER_HOME=%USERPROFILE%\.gradle

if exist "%GRADLE_USER_HOME%\caches" (
    echo Removing Gradle caches...
    rmdir /s /q "%GRADLE_USER_HOME%\caches" 2>nul
)

if exist "%GRADLE_USER_HOME%\daemon" (
    echo Removing Gradle daemon...
    rmdir /s /q "%GRADLE_USER_HOME%\daemon" 2>nul
)

if exist "%GRADLE_USER_HOME%\workers" (
    echo Removing Gradle workers...
    rmdir /s /q "%GRADLE_USER_HOME%\workers" 2>nul
)

:: Clean project directories
echo.
echo Cleaning project directories...
for %%d in (
    ".gradle"
    "build"
    "app\build"
    "komga\build"
    "bin"
    "out"
    "*.log"
) do (
    if exist "%%~d" (
        echo Removing %%~d...
        if exist "%%~d" rmdir /s /q "%%~d" 2>nul
        if exist "%%~d" del /f /q "%%~d" 2>nul
    )
)

:: Clean temporary files
echo.
echo Cleaning temporary files...
del /f /s /q *.log 2>nul
del /f /s /q *.tmp 2>nul
del /f /s /q *.tmp.* 2>nul

:: Recreate necessary directories
mkdir .gradle 2>nul

:: Initialize Gradle wrapper
echo.
echo Initializing Gradle wrapper...
if exist gradlew.bat (
    call gradlew.bat --version
) else (
    echo gradlew.bat not found, please run 'gradle wrapper' manually
)

echo.
echo === CLEANUP COMPLETE ===
echo.
echo Please close all terminals and IDEs, then run:
echo 1. Open a NEW terminal
echo 2. Navigate to project directory
echo 3. Run: python build_and_analyze.py --stacktrace

pause
