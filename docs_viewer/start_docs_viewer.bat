@echo off
setlocal enabledelayedexpansion

REM --- Close any old docs_viewer_backend or docs_viewer_frontend windows ---
for /f "tokens=2 delims=," %%a in ('tasklist /v /fo csv ^| findstr /i "docs_viewer_backend"') do (
    echo Closing old backend window with PID %%a
    taskkill /F /PID %%a >nul 2>&1
)
for /f "tokens=2 delims=," %%a in ('tasklist /v /fo csv ^| findstr /i "docs_viewer_frontend"') do (
    echo Closing old frontend window with PID %%a
    taskkill /F /PID %%a >nul 2>&1
)

REM --- Kill any process using ports 5173 or 5174 ---
echo Checking for processes using ports 5173 and 5174...
for %%P in (5173 5174) do (
  for /f "tokens=5" %%a in ('netstat -ano ^| findstr :%%P ^| findstr LISTENING') do (
    echo Killing process on port %%P with PID %%a
    taskkill /F /PID %%a >nul 2>&1
  )
)

REM Set directories
set "BACKEND_DIR=%~dp0backend"
set "FRONTEND_DIR=%~dp0frontend"
set "BACKEND_LOG=%~dp0backend.log"
set "FRONTEND_LOG=%~dp0frontend.log"

REM Start backend
echo Starting backend...
cd /d "%BACKEND_DIR%"
if not exist node_modules (
    echo Installing backend dependencies...
    call npm install >> "%BACKEND_LOG%" 2>&1
)
start "docs_viewer_backend" cmd /k "node index.js >> "%BACKEND_LOG%" 2>&1"

REM Wait for backend to be ready (poll localhost:5174/api/tree)
echo Waiting for backend to start...
set "RETRIES=0"
:waitloop
timeout /t 2 >nul
powershell -Command "try { (Invoke-WebRequest -Uri http://localhost:5174/api/tree -UseBasicParsing).StatusCode } catch { 0 }" >nul 2>&1
if %errorlevel% neq 0 (
    set /a RETRIES+=1
    if !RETRIES! geq 15 (
        echo Backend failed to start after 30 seconds. See %BACKEND_LOG% for details.
        pause
        exit /b 1
    )
    goto waitloop
)

REM Start frontend
echo Starting frontend...
cd /d "%FRONTEND_DIR%"
if not exist node_modules (
    echo Installing frontend dependencies...
    call npm install >> "%FRONTEND_LOG%" 2>&1
)
start "docs_viewer_frontend" cmd /k "npm run dev >> "%FRONTEND_LOG%" 2>&1"

REM Wait a few seconds for frontend to start
timeout /t 5 >nul

REM Open browser
start http://localhost:5173

echo All done! Backend and frontend are running. Check the browser window.

REM --- Start backend health monitor in a new window ---
start "docs_viewer_backend_monitor" cmd /c "call :monitor_backend"
goto :eof

:monitor_backend
REM Monitor backend every 10 seconds
:monitor_loop
    timeout /t 10 >nul
    powershell -Command "try { (Invoke-WebRequest -Uri http://localhost:5174/api/tree -UseBasicParsing).StatusCode } catch { 0 }" >nul 2>&1
    if %errorlevel% neq 0 (
        echo.
        echo [MONITOR] Backend is NOT responding! It may have crashed.
        echo [MONITOR] See %BACKEND_LOG% for details.
        if exist %BACKEND_LOG% start notepad.exe %BACKEND_LOG%
        pause
        exit /b 2
    )
    goto monitor_loop

exit /b 0 