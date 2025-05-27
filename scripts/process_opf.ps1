param(
    [Parameter(Mandatory=$true)]
    [string]$OpfPath,
    
    [string]$BookId = [guid]::NewGuid().ToString()
)

# Load required assemblies
Add-Type -Assembly System.IO.Compression
Add-Type -Path "System.Data.SQLite"

# Database connection
$dbPath = "$PSScriptRoot\..\data\komga.db"
$connectionString = "Data Source=$dbPath;Version=3;"

# Read OPF file
$opfContent = Get-Content -Path $OpfPath -Raw
$xml = [xml]$opfContent

# Extract metadata
$ns = @{
    dc = "http://purl.org/dc/elements/1.1/"
    opf = "http://www.idpf.org/2007/opf"
}

$metadata = @{
    title = ($xml.package.metadata.dc:title | Select-Object -First 1).'#text'
    creator = ($xml.package.metadata.dc:creator | Select-Object -First 1).'#text'
    language = ($xml.package.metadata.dc:language | Select-Object -First 1).'#text'
    publisher = ($xml.package.metadata.dc:publisher | Select-Object -First 1).'#text'
}

# Copy cover image if exists
$coverItem = $xml.package.metadata.meta | Where-Object { $_.name -eq 'cover' } | Select-Object -First 1
$coverPath = $null

if ($coverItem) {
    $coverId = $coverItem.content
    $coverFile = $xml.package.manifest.item | Where-Object { $_.id -eq $coverId } | Select-Object -First 1
    
    if ($coverFile) {
        $coverSource = Join-Path (Split-Path $OpfPath -Parent) $coverFile.href
        $coverExt = [System.IO.Path]::GetExtension($coverFile.href)
        $coverPath = "covers\$BookId$coverExt"
        Copy-Item -Path $coverSource -Destination "$PSScriptRoot\..\data\$coverPath" -Force
    }
}

# Save to database
try {
    $connection = New-Object -TypeName System.Data.SQLite.SQLiteConnection -ArgumentList $connectionString
    $connection.Open()
    
    # Insert book
    $command = $connection.CreateCommand()
    $command.CommandText = @"
    INSERT OR REPLACE INTO books (id, title, author, file_path, opf_path, cover_path)
    VALUES (@id, @title, @author, @file_path, @opf_path, @cover_path)
"@
    
    $command.Parameters.AddWithValue("@id", $BookId) | Out-Null
    $command.Parameters.AddWithValue("@title", $metadata.title) | Out-Null
    $command.Parameters.AddWithValue("@author", $metadata.creator) | Out-Null
    $command.Parameters.AddWithValue("@file_path", (Split-Path $OpfPath -Parent)) | Out-Null
    $command.Parameters.AddWithValue("@opf_path", $OpfPath) | Out-Null
    $command.Parameters.AddWithValue("@cover_path", $coverPath) | Out-Null
    $command.ExecuteNonQuery() | Out-Null
    
    # Insert metadata
    $command = $connection.CreateCommand()
    $command.CommandText = @"
    INSERT OR REPLACE INTO opf_metadata (book_id, metadata_json)
    VALUES (@book_id, @metadata_json)
"@
    
    $command.Parameters.AddWithValue("@book_id", $BookId) | Out-Null
    $command.Parameters.AddWithValue("@metadata_json", ($metadata | ConvertTo-Json -Compress)) | Out-Null
    $command.ExecuteNonQuery() | Out-Null
    
    Write-Host "Processed OPF: $($metadata.title)" -ForegroundColor Green
} catch {
    Write-Host "Error processing OPF: $_" -ForegroundColor Red
} finally {
    if ($connection -ne $null) { $connection.Close() }
}
