# Simple EPUB Analyzer
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
    Write-Host ("{0,-8}: {1} files" -f $type.Name, $type.Count)
}

# Look for common EPUB files
$filePatterns = @{
    'mimetype' = 'mimetype'
    'container.xml' = 'META-INF/container.xml'
    'OPF File' = '*.opf'
    'NCX File' = '*.ncx'
    'HTML Files' = '*.xhtml,*.html'
    'Images' = '*.jpg,*.jpeg,*.png,*.gif,*.svg'
    'Styles' = '*.css'
}

Write-Host "`n=== Important Files ===" -ForegroundColor Green
foreach ($entry in $filePatterns.GetEnumerator()) {
    $patterns = $entry.Value -split ','
    $found = $false
    
    foreach ($pattern in $patterns) {
        $fileMatches = $zip.Entries | Where-Object { $_.FullName -like $pattern } | Select-Object -First 3
        if ($fileMatches) {
            if (-not $found) {
                Write-Host ("`n{0}:" -f $entry.Key) -ForegroundColor Yellow
                $found = $true
            }
            $fileMatches | ForEach-Object { 
                Write-Host ("- {0,-60} {1,8} KB" -f $_.FullName, [math]::Round($_.Length/1KB, 1))
            }
        }
    }
}

# Try to find and read OPF file
$opfFile = $zip.Entries | Where-Object { $_.Name -like '*.opf' } | Select-Object -First 1
if ($opfFile) {
    Write-Host "`n=== Metadata ===" -ForegroundColor Green
    Write-Host ("OPF File: {0}" -f $opfFile.FullName)
    
    try {
        $reader = New-Object System.IO.StreamReader($opfFile.Open())
        $content = $reader.ReadToEnd()
        $reader.Close()
        
        # Extract metadata using regex
        $metadata = @{
            'Title'    = ($content -replace '(?s).*<dc:title[^>]*>(.*?)</dc:title>.*', '$1')
            'Author'   = ($content -replace '(?s).*<dc:creator[^>]*>(.*?)</dc:creator>.*', '$1')
            'Language' = ($content -replace '(?s).*<dc:language[^>]*>(.*?)</dc:language>.*', '$1')
            'Publisher'= ($content -replace '(?s).*<dc:publisher[^>]*>(.*?)</dc:publisher>.*', '$1')
        }
        
        $metadata.GetEnumerator() | Where-Object { $_.Value -ne $content } | ForEach-Object {
            Write-Host ("{0,-10}: {1}" -f $_.Key, $_.Value) -ForegroundColor Cyan
        }
    } catch {
        Write-Host "Could not read metadata from OPF file" -ForegroundColor Red
    }
}

# Clean up
$zip.Dispose()

Write-Host "`nDone. Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
