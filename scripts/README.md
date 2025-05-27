# Komga Scripts

This directory contains scripts for managing the Komga database and processing OPF files.

## Setup

1. **Install Dependencies**:
   - PowerShell 5.1 or later
   - SQLite (for database operations)
   - .NET Core SDK (for running the application)

2. **Initialize the Database**:
   ```powershell
   .\init_database.ps1
   ```

## Usage

### Process an OPF File

```powershell
.\process_opf.ps1 -OpfPath "path\to\book.opf"
```

### Process All OPF Files in a Directory

```powershell
Get-ChildItem -Path "path\to\books" -Recurse -Filter "*.opf" | ForEach-Object {
    .\process_opf.ps1 -OpfPath $_.FullName
}
```

## Configuration

Edit `config/application.yml` to configure the application:
- Database connection
- File storage paths
- Logging levels
- Authentication settings

## Security Note

By default, authentication is disabled for development. For production use, please enable authentication in `application.yml`.
