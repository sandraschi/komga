@echo off
setlocal enabledelayedexpansion

echo ===================================
echo  BUILD DIRECTORY VALIDATION SCRIPT
echo ===================================

echo Checking frontend/dist directory...
echo -------------------------------
call :check_directory "frontend\dist"
set FRONTEND_DIST_RESULT=!ERRORLEVEL!

echo.
echo Checking root /dist directory...
echo -------------------------------
call :check_directory "dist"
set ROOT_DIST_RESULT=!ERRORLEVEL!

echo.
echo ============
echo FINAL RESULT
echo ============
set TOTAL_VALID=0

if %FRONTEND_DIST_RESULT% EQU 0 (
    echo [OK] frontend/dist is valid
    set /a TOTAL_VALID+=1
) else (
    echo [WARN] frontend/dist is missing or invalid
)

if %ROOT_DIST_RESULT% EQU 0 (
    echo [OK] /dist is valid
    set /a TOTAL_VALID+=1
) else (
    echo [WARN] /dist is missing or invalid
)

if %TOTAL_VALID% EQU 0 (
    echo [ERROR] No valid build directories found!
    exit /b 1
) else (
    echo.
    echo [SUCCESS] Found %TOTAL_VALID% valid build directory/ies
    exit /b 0
)

:check_directory
set DIR_TO_CHECK=%~1
echo Checking: %DIR_TO_CHECK%

if not exist "%DIR_TO_CHECK%" (
    echo Directory not found: %DIR_TO_CHECK%
    exit /b 1
)

set HAS_INDEX=0
set HAS_ASSETS=0
set HAS_JS=0
set HAS_CSS=0

if exist "%DIR_TO_CHECK%\index.html" (
    echo [OK] index.html found
    set HAS_INDEX=1
) else (
    echo [ERROR] index.html not found
)

if exist "%DIR_TO_CHECK%\assets" (
    echo [OK] assets/ directory found
    set HAS_ASSETS=1
    
    dir /b "%DIR_TO_CHECK%\assets\*.js" >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        set JS_COUNT=0
        for /f "tokens=*" %%f in ('dir /b /s "%DIR_TO_CHECK%\assets\*.js" 2^>nul ^| find /c /v ""') do set JS_COUNT=%%f
        echo [OK] Found %JS_COUNT% JavaScript files
        set HAS_JS=1
    ) else (
        echo [ERROR] No JavaScript files found in assets/
    )
    
    dir /b "%DIR_TO_CHECK%\assets\*.css" >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        set CSS_COUNT=0
        for /f "tokens=*" %%f in ('dir /b /s "%DIR_TO_CHECK%\assets\*.css" 2^>nul ^| find /c /v ""') do set CSS_COUNT=%%f
        echo [OK] Found %CSS_COUNT% CSS files
        set HAS_CSS=1
    else (
        echo [ERROR] No CSS files found in assets/
    )
) else (
    echo [ERROR] assets/ directory not found
)

if %HAS_INDEX% EQU 1 if %HAS_ASSETS% EQU 1 if %HAS_JS% EQU 1 if %HAS_CSS% EQU 1 (
    exit /b 0
) else (
    exit /b 1
)
