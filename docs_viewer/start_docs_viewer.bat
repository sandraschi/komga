@echo off
setlocal enabledelayedexpansion

:: ===========================================
:: Configuration
:: ===========================================
set "BACKEND_DIR=%~dp0backend"
set "FRONTEND_DIR=%~dp0frontend"
set "BACKEND_LOG=%~dp0backend.log"
set "FRONTEND_LOG=%~dp0frontend.log"
set "PORT=5174"
set "MAX_RETRIES=15"
set "RETRY_DELAY=2"

:: ===========================================
:: Initialize
:: ===========================================
title Docs Viewer - Starting...
cls
echo [%TIME%] ===== Starting Docs Viewer =====
echo [%TIME%] Backend: %BACKEND_DIR%
echo [%TIME%] Frontend: %FRONTEND_DIR%
echo.

:: ===========================================
:: Kill existing processes (optimized)
:: ===========================================
echo [%TIME%] Stopping any running instances...

:: Kill by window title
for /f "tokens=2" %%a in ('tasklist /v ^| findstr /i "docs_viewer_backend docs_viewer_frontend" ^| findstr /v findstr') do (
    echo [%TIME%] Killing process with PID: %%a
    taskkill /F /PID %%a >nul 2>&1
)

:: Kill by port
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%PORT% "') do (
    echo [%TIME%] Killing process on port %PORT% (PID: %%a)
    taskkill /F /PID %%a >nul 2>&1
)

:: ===========================================
:: Start Frontend Build (in parallel)
:: ===========================================
start "" /MIN cmd /c "(
    cd /d "%FRONTEND_DIR%" && ^
    echo [%TIME%] Installing frontend dependencies... && ^
    (if not exist node_modules npm install) && ^
    echo [%TIME%] Building frontend... && ^
    npm run build && ^
    echo [%TIME%] Frontend build completed
) > "%FRONTEND_LOG%" 2>&1"

:: ===========================================
:: Setup and Start Backend
:: ===========================================
(
    cd /d "%BACKEND_DIR%"
    
    :: Install backend dependencies if needed
    if not exist node_modules (
        echo [%TIME%] Installing backend dependencies...
        call npm install >> "%BACKEND_LOG%" 2>&1
    )
    
    :: Start backend
    echo [%TIME%] Starting backend server...
    start "docs_viewer_backend" /MIN node main.js >> "%BACKEND_LOG%" 2>&1
)

:: ===========================================
:: Wait for Backend to be Ready
:: ===========================================
echo [%TIME%] Waiting for backend to start...
set "RETRIES=0"

:check_backend
ping -n 2 127.0.0.1 >nul 2>&1  :: Small delay
powershell -Command "try { $null = Invoke-WebRequest -Uri 'http://localhost:%PORT%/api/tree' -UseBasicParsing -TimeoutSec 2; exit 0 } catch { exit 1 }" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    set /a "RETRIES+=1"
    if !RETRIES! GEQ %MAX_RETRIES% (
        echo [%TIME%] ERROR: Backend failed to start after !MAX_RETRIES! attempts.
        echo [%TIME%] Check %BACKEND_LOG% for details.
        start notepad "%BACKEND_LOG%"
        goto :error_exit
    )
    <nul set /p "=."
    goto check_backend
)

:: ===========================================
:: Final Output
:: ===========================================
cls
title Docs Viewer - Running on http://localhost:%PORT%

echo [%TIME%] ===== Docs Viewer is Running =====
echo.
echo   Frontend: http://localhost:%PORT%
echo   Backend:  http://localhost:%PORT%/api

echo.
echo   Logs:
echo   - Backend:  %BACKEND_LOG%
echo   - Frontend: %FRONTEND_LOG%
echo.
echo   Press Ctrl+C to stop the application
echo   or close this window to exit.
echo.

echo [%TIME%] Opening in browser...
start "" "http://localhost:%PORT%"

:: ===========================================
:: Start Health Monitor (in background)
:: ===========================================
start "" /MIN cmd /c "(
    echo [%TIME%] Health monitor started
    set RETRIES=0
    :monitor_loop
    ping -n 10 127.0.0.1 >nul
    powershell -Command "try { $null = Invoke-WebRequest -Uri 'http://localhost:%PORT%/api/tree' -UseBasicParsing -TimeoutSec 5; exit 0 } catch { exit 1 }" >nul 2>&1
    if %ERRORLEVEL% NEQ 0 (
        set /a "RETRIES+=1"
        if !RETRIES! GEQ 3 (
            echo [%TIME%] ERROR: Backend is not responding! Check %BACKEND_LOG%
            start notepad "%BACKEND_LOG%"
            exit 1
        )
    ) else (
        set "RETRIES=0"
    )
    goto monitor_loop
)"

:: ===========================================
:: Keep Window Open and Handle Exit
:: ===========================================
:keep_alive
ping -n 2 127.0.0.1 >nul 2>&1
goto keep_alive

:error_exit
echo.
echo [%TIME%] Press any key to exit...
pause >nul
exit /b 1 