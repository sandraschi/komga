# Simple EPUB analyzer using .NET

# Path to the EPUB file
$epubPath = "L:\Multimedia Files\Written Word\Calibre-Bibliothek\William Shakespeare\Complete Works of William Shakespea (4331)\Complete Works of William Shake - William Shakespeare.epub"

# Check if file exists
if (-not (Test-Path $epubPath)) {
    Write-Error "File not found: $epubPath"
    exit 1
}

# Display basic information
Write-Host "=== EPUB Analysis ===" -ForegroundColor Cyan
Write-Host "File: $epubPath"
$fileInfo = Get-Item $epubPath
Write-Host "Size: $([math]::Round($fileInfo.Length / 1MB, 2)) MB"
Write-Host "Last Modified: $($fileInfo.LastWriteTime)"

# Check if the file is a valid ZIP (EPUB is a ZIP archive)
$isZip = $false
try {
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $zip = [System.IO.Compression.ZipFile]::OpenRead($epubPath)
    $isZip = $true
    $zip.Dispose()
} catch {
    Write-Error "Not a valid ZIP file: $_"
    exit 1
}

# Extract and analyze the container.xml file
Write-Host "\n=== Container Analysis ===" -ForegroundColor Cyan
$containerContent = ""
try {
    $zip = [System.IO.Compression.ZipFile]::OpenRead($epubPath)
    $containerEntry = $zip.GetEntry("META-INF/container.xml")
    if ($containerEntry) {
        $stream = $containerEntry.Open()
        $reader = New-Object System.IO.StreamReader($stream)
        $containerContent = $reader.ReadToEnd()
        $reader.Close()
        $stream.Close()
        
        # Display container content
        Write-Host "Container file found:"
        $containerContent -split "`n" | ForEach-Object { 
            if ($_ -match "rootfile") { 
                Write-Host "  $_" -ForegroundColor Yellow 
            } else { 
                Write-Host "  $_" 
            }
        }
        
        # Extract the root file path
        if ($containerContent -match 'rootfile[^>]*full-path="([^"]+)"') {
            $rootFilePath = $matches[1]
            Write-Host "\nRoot file path: $rootFilePath" -ForegroundColor Green
            
            # Now analyze the root file (OPF file)
            $rootFileEntry = $zip.GetEntry($rootFilePath)
            if ($rootFileEntry) {
                $stream = $rootFileEntry.Open()
                $reader = New-Object System.IO.StreamReader($stream)
                $rootFileContent = $reader.ReadToEnd()
                $reader.Close()
                $stream.Close()
                
                Write-Host "\n=== OPF File Analysis ===" -ForegroundColor Cyan
                
                # Extract and display metadata
                if ($rootFileContent -match '<metadata[^>]*>([\s\S]*?)<\/metadata>') {
                    $metadata = $matches[1]
                    Write-Host "\n--- Metadata ---"
                    $metadata -split "`n" | ForEach-Object { 
                        if ($_ -match "<title>|<creator>|<language>") { 
                            Write-Host "  $_" -ForegroundColor Yellow 
                        } 
                    }
                }
                
                # Extract and display manifest items
                if ($rootFileContent -match '<manifest>([\s\S]*?)<\/manifest>') {
                    $manifest = $matches[1]
                    Write-Host "\n--- Manifest Items (first 10) ---"
                    $itemCount = 0
                    $manifest -split "`n" | ForEach-Object { 
                        if ($_ -match '<item[^>]*id="([^"]*)"[^>]*href="([^"]*)"[^>]*media-type="([^"]*)"') {
                            if ($itemCount++ -lt 10) {
                                Write-Host "  ID: $($matches[1])"
                                Write-Host "    Href: $($matches[2])"
                                Write-Host "    Type: $($matches[3])"
                            }
                        }
                    }
                    
                    # Count total items
                    $totalItems = [regex]::Matches($manifest, '<item').Count
                    if ($totalItems -gt 10) {
                        Write-Host "  ... and $($totalItems - 10) more items"
                    }
                }
                
                # Extract and display spine items
                if ($rootFileContent -match '<spine[^>]*>([\s\S]*?)<\/spine>') {
                    $spine = $matches[1]
                    Write-Host "\n--- Spine Items (first 10) ---"
                    $itemCount = 0
                    $spine -split "`n" | ForEach-Object { 
                        if ($_ -match '<itemref[^>]*idref="([^"]*)"') {
                            if ($itemCount++ -lt 10) {
                                Write-Host "  Ref: $($matches[1])"
                            }
                        }
                    }
                    
                    # Count total spine items
                    $totalSpine = [regex]::Matches($spine, 'itemref').Count
                    if ($totalSpine -gt 10) {
                        Write-Host "  ... and $($totalSpine - 10) more spine items"
                    }
                }
                
                # Look for NCX file (table of contents)
                if ($rootFileContent -match '<item[^>]*media-type="application/x-dtbncx+xml"[^>]*href="([^"]*)"') {
                    $ncxPath = [System.IO.Path]::Combine([System.IO.Path]::GetDirectoryName($rootFilePath), $matches[1])
                    $ncxPath = $ncxPath.Replace('\', '/')
                    Write-Host "\n=== NCX File ===" -ForegroundColor Cyan
                    Write-Host "Path: $ncxPath"
                    
                    # Try to read the NCX file
                    $ncxEntry = $zip.GetEntry($ncxPath)
                    if ($ncxEntry) {
                        $stream = $ncxEntry.Open()
                        $reader = New-Object System.IO.StreamReader($stream)
                        $ncxContent = $reader.ReadToEnd()
                        $reader.Close()
                        $stream.Close()
                        
                        # Extract and display TOC entries (first 10)
                        Write-Host "\n--- Table of Contents (first 10 entries) ---"
                        $navPointMatches = [regex]::Matches($ncxContent, '<navPoint[\s\S]*?<text>(.*?)<\/text>', 'IgnoreCase')
                        
                        $count = 0
                        foreach ($match in $navPointMatches) {
                            if ($count++ -ge 10) { break }
                            $title = $match.Groups[1].Value.Trim()
                            Write-Host "  $title"
                        }
                        
                        if ($navPointMatches.Count -gt 10) {
                            Write-Host "  ... and $($navPointMatches.Count - 10) more entries"
                        }
                    }
                }
            }
        }
    } else {
        Write-Host "No container.xml found in the EPUB file." -ForegroundColor Red
    }
    
    $zip.Dispose()
} catch {
    Write-Error "Error analyzing EPUB: $_"
    if ($zip) { $zip.Dispose() }
    exit 1
}

Write-Host "\n=== Analysis Complete ===" -ForegroundColor Green
