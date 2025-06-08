Write-Host "=== SUPER CLEAN SCRIPT ===" -ForegroundColor Cyan
Write-Host "This will remove all build directories and Gradle caches"

# Stop Gradle daemons
Write-Host "`n[1/3] Stopping Gradle daemons..." -ForegroundColor Yellow
Stop-Process -Name "java" -Force -ErrorAction SilentlyContinue | Out-Null
& .\gradlew --stop 2>&1 | Out-Null

# Define directories to remove
$dirs = @(
    "build",
    ".gradle",
    "out",
    "komga\build",
    "komga\.gradle",
    "komga-tray\build",
    "komga-tray\.gradle",
    "komga-webui\build",
    "komga-webui\.gradle"
)

# Remove directories
Write-Host "`n[2/3] Removing directories..." -ForegroundColor Yellow
foreach ($dir in $dirs) {
    $fullPath = Join-Path $PSScriptRoot $dir
    if (Test-Path $fullPath) {
        try {
            Remove-Item -Path $fullPath -Recurse -Force -ErrorAction Stop
            Write-Host "  - Removed: $dir" -ForegroundColor Green
        } catch {
            Write-Host "  - Failed to remove: $dir (may be locked)" -ForegroundColor Red
        }
    } else {
        Write-Host "  - Not found: $dir" -ForegroundColor Gray
    }
}

# Clean Gradle caches
Write-Host "`n[3/3] Cleaning Gradle caches..." -ForegroundColor Yellow
if (Test-Path "$env:USERPROFILE\.gradle") {
    & .\gradlew clean --no-daemon 2>&1 | Out-Null
    Write-Host "  - Gradle cache cleaned" -ForegroundColor Green
} else {
    Write-Host "  - Gradle cache directory not found" -ForegroundColor Gray
}

Write-Host "`n=== CLEANUP COMPLETE ===" -ForegroundColor Cyan
Write-Host "You can now try building the project again."

# Self-delete
Start-Sleep -Seconds 2
Remove-Item -Path $PSCommandPath -Force
