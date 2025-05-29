@echo off
:: Run the build script and keep the window open
python build_and_analyze.py
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ⚠️  Build failed with error code %ERRORLEVEL%
) else (
    echo.
    echo ✅ Build completed successfully!
)
echo.
pause
