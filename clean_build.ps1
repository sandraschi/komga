<#
.SYNOPSIS
    Safe build output cleanup script for Komga
.DESCRIPTION
    Cleans build output directories while preserving all caches and dependencies.
    Safe to run at any time - won't cause unnecessary re-downloads.
#>

# Set error action preference
$ErrorActionPreference = 'Stop'

try {
    # Header
    Write-Host "=== Starting Safe Build Cleanup ===" -ForegroundColor Cyan

    # Stop any running Gradle daemons
    Write-Host "Stopping Gradle daemons..." -ForegroundColor Yellow
    & ./gradlew --stop 2>&1 | Out-Null

    # Define build output directories to clean
    $buildDirs = @(
        "build",
        "komga/build",
        "komga-tray/build",
        "komga-webui/build"
    )

    # Clean each build directory
    foreach ($dir in $buildDirs) {
        $fullPath = Join-Path -Path $PSScriptRoot -ChildPath $dir -ErrorAction Stop
        
        if (Test-Path $fullPath) {
            Write-Host "Cleaning build outputs: $dir" -ForegroundColor Yellow
            try {
                Remove-Item -Path $fullPath -Recurse -Force -ErrorAction Stop
                Write-Host "  ✓ Cleaned successfully" -ForegroundColor Green
            } catch {
                Write-Host "  ! Could not clean (may be locked): $($_.Exception.Message)" -ForegroundColor Red
            }
        } else {
            Write-Host "  - Directory not found: $dir" -ForegroundColor Gray
        }
    }

    Write-Host "=== Cleanup Complete (all caches and dependencies preserved) ===" -ForegroundColor Green
    exit 0
} catch {
    Write-Host "=== ERROR: $($_.Exception.Message) ===" -ForegroundColor Red
    exit 1
}
