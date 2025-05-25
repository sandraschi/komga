# PowerShell script to analyze EPUB structure

# Path to the EPUB file
$epubPath = "L:\Multimedia Files\Written Word\Calibre-Bibliothek\William Shakespeare\Complete Works of William Shakespea (4331)\Complete Works of William Shake - William Shakespeare.epub"

# Check if file exists
if (-not (Test-Path $epubPath)) {
    Write-Error "File not found: $epubPath"
    exit 1
}

# Create a temporary directory
$tempDir = Join-Path $env:TEMP "epub_analysis_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

# Extract the EPUB (it's just a ZIP file)
try {
    Expand-Archive -Path $epubPath -DestinationPath $tempDir -Force
} catch {
    Write-Error "Failed to extract EPUB: $_"
    Remove-Item -Path $tempDir -Recurse -Force -ErrorAction SilentlyContinue
    exit 1
}

# Function to display file structure
function Show-FileStructure {
    param (
        [string]$Path,
        [string]$Indent = ""
    )
    
    $items = Get-ChildItem -Path $Path -Force
    
    foreach ($item in $items) {
        if ($item.PSIsContainer) {
            Write-Output "$Indent[$($item.Name)]"
            Show-FileStructure -Path $item.FullName -Indent "$Indent  "
        } else {
            Write-Output "$Indent$($item.Name) ($([math]::Round($item.Length / 1KB, 2)) KB)"
        }
    }
}

# Display basic information
Write-Host "=== EPUB Analysis ===" -ForegroundColor Cyan
Write-Host "File: $epubPath"
Write-Host "Size: $([math]::Round((Get-Item $epubPath).Length / 1MB, 2)) MB"
Write-Host "Extracted to: $tempDir"

# Check for container.xml (EPUB standard)
$containerPath = Join-Path $tempDir "META-INF\container.xml"
if (Test-Path $containerPath) {
    Write-Host "\n=== Container Description ===" -ForegroundColor Cyan
    Get-Content $containerPath -Raw | Write-Host
}

# Check for OPF file (usually in OEBPS/content.opf or similar)
$opfFiles = Get-ChildItem -Path $tempDir -Filter "*.opf" -Recurse -File
if ($opfFiles) {
    Write-Host "\n=== OPF File Found ===" -ForegroundColor Cyan
    $opfFile = $opfFiles[0].FullName
    Write-Host "OPF File: $($opfFiles[0].FullName)"
    
    # Display OPF content (first 20 lines)
    Write-Host "\n--- OPF Content (first 20 lines) ---"
    Get-Content $opfFile -TotalCount 20 | ForEach-Object { 
        if ($_ -match "<title>|<creator>|<language>") {
            Write-Host "  $_" -ForegroundColor Yellow
        } else {
            Write-Host "  $_"
        }
    }
}

# Display NCX file (table of contents)
$ncxFiles = Get-ChildItem -Path $tempDir -Filter "*.ncx" -Recurse -File
if ($ncxFiles) {
    Write-Host "\n=== Table of Contents (NCX) ===" -ForegroundColor Cyan
    $ncxFile = $ncxFiles[0].FullName
    Write-Host "NCX File: $ncxFile"
    
    # Display TOC entries (first 20)
    Write-Host "\n--- TOC Entries (first 20) ---"
    $tocContent = Get-Content $ncxFile -Raw
    $tocMatches = [regex]::Matches($tocContent, '<navPoint[\s\S]*?<text>(.*?)<\/text>', 'IgnoreCase')
    
    $count = 0
    foreach ($match in $tocMatches) {
        if ($count++ -ge 20) { break }
        $title = $match.Groups[1].Value.Trim()
        Write-Host "  $title"
    }
    
    if ($tocMatches.Count -gt 20) {
        Write-Host "  ... and $($tocMatches.Count - 20) more entries"
    }
}

# Display HTML files structure
Write-Host "\n=== HTML Files Structure ===" -ForegroundColor Cyan
$htmlFiles = Get-ChildItem -Path $tempDir -Filter "*.xhtml" -Recurse -File | Select-Object -First 20
foreach ($file in $htmlFiles) {
    $relativePath = $file.FullName.Substring($tempDir.Length + 1)
    Write-Host "  $relativePath ($([math]::Round($file.Length / 1KB, 2)) KB)"
}

if ((Get-ChildItem -Path $tempDir -Filter "*.xhtml" -Recurse -File).Count -gt 20) {
    Write-Host "  ... and $(((Get-ChildItem -Path $tempDir -Filter "*.xhtml" -Recurse -File).Count - 20)) more HTML files"
}

# Display directory structure
Write-Host "\n=== Directory Structure ===" -ForegroundColor Cyan
Show-FileStructure -Path $tempDir | Select-Object -First 100

# Clean up
Write-Host "\n=== Clean Up ===" -ForegroundColor Cyan
Write-Host "Temporary files will be deleted. Press any key to continue..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
Remove-Item -Path $tempDir -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "Temporary files removed."
