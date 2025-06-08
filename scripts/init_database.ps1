# Database initialization script
$dbPath = "$PSScriptRoot\..\data\komga.db"

# Create SQLite connection
Add-Type -Path "System.Data.SQLite"
$connectionString = "Data Source=$dbPath;Version=3;"
$connection = New-Object -TypeName System.Data.SQLite.SQLiteConnection -ArgumentList $connectionString

# Create tables
$createTables = @"
CREATE TABLE IF NOT EXISTS books (
    id TEXT PRIMARY KEY,
    title TEXT,
    author TEXT,
    file_path TEXT UNIQUE,
    opf_path TEXT,
    cover_path TEXT,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS opf_metadata (
    book_id TEXT PRIMARY KEY,
    metadata_json TEXT,
    FOREIGN KEY (book_id) REFERENCES books(id)
);
"@

try {
    $connection.Open()
    $command = $connection.CreateCommand()
    $command.CommandText = $createTables
    $command.ExecuteNonQuery()
    Write-Host "Database initialized successfully at $dbPath" -ForegroundColor Green
} catch {
    Write-Host "Error initializing database: $_" -ForegroundColor Red
} finally {
    if ($connection.State -eq 'Open') { $connection.Close() }
}
