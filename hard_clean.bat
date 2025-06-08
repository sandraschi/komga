@echo off
setlocal enabledelayedexpansion

REM =======================================
REM === HARD CLEAN SCRIPT - USE WITH CAUTION ===
REM =======================================
echo =======================================
echo === HARD CLEAN SCRIPT - USE WITH CAUTION ===
echo =======================================
echo.
echo This will remove all build directories and Gradle caches.
echo Close all IDEs and programs using these directories first!
echo.

REM [1/3] Stopping Gradle daemons

echo [1/3] Stopping Gradle daemons...
taskkill /F /IM "java.exe" /FI "WINDOWTITLE eq Gradle Daemon" >nul 2>&1
call gradlew --stop >nul 2>&1

echo.
echo [2/3] Removing directories...

set "dirs=build .gradle out"
set "subdirs=komga komga-tray komga-webui"

REM Remove root directories
for %%d in (%dirs%) do (
    if exist "%%d" (
        echo Removing %%d...
        rd /s /q "%%d" 2>nul
        if exist "%%d" (
            echo [WARNING] Could not remove %%d - it may be locked
        ) else (
            echo - %%d removed
        )
    ) else (
        echo - %%d not found
    )
)

REM Remove submodule directories
for %%s in (%subdirs%) do (
    if exist "%%s" (
        pushd "%%s"
        for %%d in (build .gradle) do (
            if exist "%%d" (
                echo Removing %%s\%%d...
                rd /s /q "%%d" 2>nul
                if exist "%%d" (
                    echo [WARNING] Could not remove %%s\%%d - it may be locked
                ) else (
                    echo - %%s\%%d removed
                )
            )
        )
        popd
    )
)

echo.
echo [3/3] Verifying...
set "all_removed=1"

for %%d in (%dirs%) do (
    if exist "%%d" (
        echo [WARNING] %%d still exists - may be locked
        set "all_removed=0"
    )
)

if "!all_removed!"=="1" (
    echo - All directories removed successfully!
) else (
    echo [WARNING] Some directories could not be removed.
    echo            Close any programs that might be using them and try again.
)

echo.
echo =======================================
echo Hard clean completed!
echo =======================================
REM Remove pause for automation. Uncomment if you want to pause at the end.
REM pause
