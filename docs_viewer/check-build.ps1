$buildDir = "frontend\dist"
$requiredFiles = @(
    "index.html",
    "assets\index-*.js",
    "assets\index-*.css"
)

# Check if build directory exists
if (-not (Test-Path $buildDir)) {
    Write-Output "NO: Build directory not found at $buildDir"
    exit 1
}

# Check for required files
$missingFiles = @()
foreach ($file in $requiredFiles) {
    $found = Get-ChildItem -Path (Join-Path $buildDir $file) -ErrorAction SilentlyContinue
    if (-not $found) {
        $missingFiles += $file
    }
}

# Output results
if ($missingFiles.Count -eq 0) {
    Write-Output "YES: All required files found in build directory"
    # List all files in the build directory for verification
    Write-Output "`nBuild directory contents:"
    Get-ChildItem -Path $buildDir -Recurse -File | Select-Object FullName, Length | Format-Table -AutoSize
    exit 0
} else {
    Write-Output "NO: Missing required files in build directory:"
    $missingFiles | ForEach-Object { Write-Output "  - $_" }
    Write-Output "`nExisting files in build directory:"
    Get-ChildItem -Path $buildDir -Recurse -File | Select-Object FullName, Length | Format-Table -AutoSize
    exit 1
}
