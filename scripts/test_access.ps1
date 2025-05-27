# Test file access script
# Usage: .\test_access.ps1 "path\to\file.epub"

param([string]$filePath = $args[0])

Clear-Host
Write-Host "=== File Access Tester ===" -ForegroundColor Cyan

if (-not $filePath) {
    $filePath = Read-Host "Enter file path to test"
}

Write-Host "`nTesting: $filePath" -ForegroundColor White

# Test 1: File exists
Write-Host "`n[1/4] Checking if file exists..." -NoNewline
if (Test-Path -Path $filePath -PathType Leaf) {
    Write-Host " FOUND" -ForegroundColor Green
} else {
    Write-Host " NOT FOUND" -ForegroundColor Red
    Write-Host "The file does not exist at the specified path." -ForegroundColor Yellow
    Write-Host "Check the path and try again." -ForegroundColor Yellow
    pause
    exit 1
}

# Test 2: Get file info
try {
    Write-Host "[2/4] Getting file information..." -NoNewline
    $file = Get-Item -LiteralPath $filePath -Force -ErrorAction Stop
    Write-Host " SUCCESS" -ForegroundColor Green
    Write-Host "   Name: $($file.Name)" -ForegroundColor Gray
    Write-Host "   Size: $([math]::Round($file.Length / 1MB, 2)) MB" -ForegroundColor Gray
    Write-Host "   Last Modified: $($file.LastWriteTime)" -ForegroundColor Gray
    Write-Host "   Attributes: $($file.Attributes)" -ForegroundColor Gray
} catch {
    Write-Host " ERROR" -ForegroundColor Red
    Write-Host "   Could not get file information: $_" -ForegroundColor Red
    pause
    exit 1
}

# Test 3: Read file stream
try {
    Write-Host "[3/4] Testing file read access..." -NoNewline
    $stream = [System.IO.File]::OpenRead($filePath)
    $stream.Close()
    Write-Host " SUCCESS" -ForegroundColor Green
} catch {
    Write-Host " ERROR" -ForegroundColor Red
    Write-Host "   Could not read file: $_" -ForegroundColor Red
    Write-Host "   Possible permission issue or file in use." -ForegroundColor Yellow
    pause
    exit 1
}

# Test 4: Check if it's a ZIP file
try {
    Write-Host "[4/4] Checking if file is a valid ZIP archive..." -NoNewline
    Add-Type -Assembly System.IO.Compression.FileSystem
    $zip = [System.IO.Compression.ZipFile]::OpenRead($filePath)
    Write-Host " SUCCESS" -ForegroundColor Green
    Write-Host "   Number of entries: $($zip.Entries.Count)" -ForegroundColor Gray
    $zip.Dispose()
} catch {
    Write-Host " ERROR" -ForegroundColor Red
    Write-Host "   Not a valid ZIP file or cannot be opened: $_" -ForegroundColor Red
    Write-Host "   The file may be corrupted or in use by another program." -ForegroundColor Yellow
    pause
    exit 1
}

Write-Host "`n=== All tests completed successfully ===" -ForegroundColor Green
Write-Host "The file is accessible and appears to be a valid EPUB/ZIP archive." -ForegroundColor White

# Keep window open
Write-Host "`nPress any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
