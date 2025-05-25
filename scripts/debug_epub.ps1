# Debug EPUB Analyzer
# Run with: powershell -ExecutionPolicy Bypass -File debug_epub.ps1

function Write-Log {
    param([string]$message, [string]$color = "White")
    $timestamp = Get-Date -Format "HH:mm:ss.fff"
    Write-Host "[$timestamp] $message" -ForegroundColor $color
}

try {
    # Clear screen and show header
    Clear-Host
    Write-Log "=== EPUB Debug Analyzer ===" "Cyan"
    Write-Log "This script will help debug EPUB analysis" "Cyan"
    
    # Get EPUB path
    $EpubPath = $args[0]
    if (-not $EpubPath) {
        Write-Log "No path provided as argument" "Yellow"
        $EpubPath = Read-Host "Please enter path to EPUB file"
    }
    
    Write-Log "Checking file: $EpubPath" "White"
    
    # Check if file exists
    if (-not (Test-Path -Path $EpubPath -PathType Leaf)) {
        Write-Log "ERROR: File does not exist" "Red"
        exit 1
    }
    
    $file = Get-Item -Path $EpubPath -ErrorAction Stop
    Write-Log "File found: $($file.FullName)" "Green"
    Write-Log "Size: $([math]::Round($file.Length / 1MB, 2)) MB" "Green"
    
    # Check if it's a ZIP file
    if (-not ($file.Extension -eq '.epub' -or $file.Extension -eq '.zip')) {
        Write-Log "WARNING: File extension is not .epub" "Yellow"
    }
    
    # Try to load .NET assembly
    try {
        Write-Log "Loading .NET compression libraries..." "White"
        Add-Type -Assembly System.IO.Compression.FileSystem -ErrorAction Stop
        Write-Log "Successfully loaded .NET compression" "Green"
    } catch {
        Write-Log "ERROR: Failed to load .NET compression: $_" "Red"
        exit 1
    }
    
    # Try to open the ZIP file
    try {
        Write-Log "Attempting to open EPUB as ZIP archive..." "White"
        $zip = [System.IO.Compression.ZipFile]::OpenRead($file.FullName)
        Write-Log "Successfully opened ZIP archive" "Green"
        Write-Log "Total entries: $($zip.Entries.Count)" "White"
    } catch {
        Write-Log "ERROR: Failed to open as ZIP: $_" "Red"
        exit 1
    }
    
    # Look for container.xml
    $container = $zip.Entries | Where-Object { $_.FullName -like '*container.xml' } | Select-Object -First 1
    if (-not $container) {
        Write-Log "WARNING: container.xml not found - showing first 10 files:" "Yellow"
        $zip.Entries | Select-Object -First 10 FullName | ForEach-Object {
            Write-Log "   $($_.FullName)" "White"
        }
        exit 1
    }
    
    Write-Log "Found container.xml: $($container.FullName)" "Green"
    
    # Read container.xml
    try {
        $reader = New-Object System.IO.StreamReader($container.Open())
        $containerContent = $reader.ReadToEnd()
        $reader.Close()
        Write-Log "Container.xml content (first 200 chars):" "White"
        Write-Log $containerContent.Substring(0, [Math]::Min(200, $containerContent.Length)) "Gray"
        
        $containerXml = [xml]$containerContent
        $opfPath = $containerXml.container.rootfiles.rootfile.fullPath
        Write-Log "Found OPF path: $opfPath" "Green"
    } catch {
        Write-Log "ERROR parsing container.xml: $_" "Red"
        exit 1
    }
    
    # Show success message
    Write-Log "`n=== Analysis Complete ===" "Cyan"
    Write-Log "Basic EPUB structure appears valid" "Green"
    
} catch {
    Write-Log "UNEXPECTED ERROR: $_" "Red"
    Write-Log $_.ScriptStackTrace "DarkGray"
} finally {
    # Clean up
    if ($null -ne $reader) { $reader.Dispose() }
    if ($null -ne $zip) { $zip.Dispose() }
    
    # Keep window open
    Write-Log "`nPress any key to exit..." "White"
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}
