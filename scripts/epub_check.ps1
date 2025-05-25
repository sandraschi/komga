# Simple EPUB Checker
param($EpubPath = $args[0])

if (-not $EpubPath) { $EpubPath = Read-Host "Enter EPUB path" }

# Show basic info
$file = Get-Item $EpubPath -ErrorAction Stop
Write-Host "`n=== EPUB Info ===" -ForegroundColor Cyan
Write-Host "File: $($file.FullName)"
Write-Host "Size: $([math]::Round($file.Length / 1MB, 2)) MB"

# Load required assembly
Add-Type -Assembly System.IO.Compression.FileSystem

# Open EPUB
$zip = [System.IO.Compression.ZipFile]::OpenRead($file.FullName)
Write-Host "`nTotal entries: $($zip.Entries.Count)"

# Show file types
Write-Host "`n=== File Types ===" -ForegroundColor Green
$fileTypes = $zip.Entries | Group-Object { [System.IO.Path]::GetExtension($_.Name) } | 
    Select-Object Name, Count | Sort-Object Count -Descending

foreach ($type in $fileTypes) {
    Write-Host "$($type.Name.PadRight(8)): $($type.Count) files"
}

# Look for common EPUB files
$importantFiles = @(
    'mimetype',
    'META-INF/container.xml',
    '*.opf',
    'toc.ncx',
    '*.xhtml',
    '*.html',
    '*.jpg',
    '*.png',
    '*.css'
)

Write-Host "`n=== Important Files ===" -ForegroundColor Green
foreach ($pattern in $importantFiles) {
    $matches = $zip.Entries | Where-Object { $_.FullName -like "*$pattern" } | Select-Object -First 3
    if ($matches) {
        Write-Host "`n$pattern:" -ForegroundColor Yellow
        $matches | ForEach-Object { 
            Write-Host "- $($_.FullName)" 
            if ($_.Length -gt 0) {
                Write-Host "  Size: $([math]::Round($_.Length/1KB, 2)) KB" -ForegroundColor Gray
            }
        }
    }
}

# Try to find OPF file
$opfFile = $zip.Entries | Where-Object { $_.Name -like "*.opf" } | Select-Object -First 1
if ($opfFile) {
    Write-Host "`n=== OPF File ===" -ForegroundColor Green
    Write-Host "Found: $($opfFile.FullName)"
    
    # Try to read OPF content
    try {
        $reader = New-Object System.IO.StreamReader($opfFile.Open())
        $content = $reader.ReadToEnd()
        $reader.Close()
        
        # Extract title using simple regex
        if ($content -match '<dc:title[^>]*>(.*?)</dc:title>') {
            Write-Host "Title: $($matches[1])" -ForegroundColor Cyan
        }
        if ($content -match '<dc:creator[^>]*>(.*?)</dc:creator>') {
            Write-Host "Author: $($matches[1])" -ForegroundColor Cyan
        }
        if ($content -match '<dc:language[^>]*>(.*?)</dc:language>') {
            Write-Host "Language: $($matches[1])" -ForegroundColor Cyan
        }
    } catch {
        Write-Host "Could not read OPF content" -ForegroundColor Red
    }
}

# Clean up
$zip.Dispose()

Write-Host "`nDone. Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
