# Simple EPUB Reader
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

# Find container.xml
$container = $zip.Entries | Where-Object { $_.FullName -like '*container.xml' } | Select-Object -First 1
if (-not $container) { Write-Host "container.xml not found"; exit }

# Read container.xml
$reader = New-Object System.IO.StreamReader($container.Open())
$containerXml = [xml]$reader.ReadToEnd()
$reader.Close()

# Get OPF path
$opfPath = $containerXml.container.rootfiles.rootfile.fullPath
Write-Host "\nOPF Path: $opfPath"

# Read OPF file
$opfEntry = $zip.Entries | Where-Object { $_.FullName -like "*$opfPath" } | Select-Object -First 1
if (-not $opfEntry) { Write-Host "OPF file not found"; exit }

$reader = New-Object System.IO.StreamReader($opfEntry.Open())
$opfXml = [xml]$reader.ReadToEnd()
$reader.Close()

# Show metadata
Write-Host "\n=== Metadata ===" -ForegroundColor Green
$ns = @{dc="http://purl.org/dc/elements/1.1/"}
$nsManager = New-Object System.Xml.XmlNamespaceManager($opfXml.NameTable)
$ns.GetEnumerator() | ForEach-Object { $nsManager.AddNamespace($_.Key, $_.Value) }

$metadata = $opfXml.package.metadata
foreach ($tag in @("title", "creator", "language", "publisher")) {
    $elem = $metadata.SelectSingleNode("dc:$tag", $nsManager)
    if ($elem) { Write-Host "$($tag.PadRight(10)): $($elem.InnerText)" }
}

# Show file types
Write-Host "\n=== File Types ===" -ForegroundColor Green
$zip.Entries | Group-Object { [System.IO.Path]::GetExtension($_.Name) } | 
    Select-Object Name, Count | Sort-Object Count -Descending | 
    Format-Table @{Name="Type"; Expression={"$($_.Name)"}}, 
                @{Name="Count"; Expression={$_.Count}} -AutoSize

# Clean up
$zip.Dispose()

Write-Host "\nDone. Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
