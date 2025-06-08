# Komga Scripts

This directory contains scripts for managing the Komga database, processing OPF files, and working with LLM integrations.

## 📋 Table of Contents
- [Setup](#setup)
- [Database Management](#database-management)
- [OPF Processing](#opf-processing)
- [LLM Integration](#llm-integration)
- [Metadata Management](#metadata-management)
- [Configuration](#configuration)
- [Security Notes](#security-notes)
- [Troubleshooting](#troubleshooting)

## 🛠️ Setup

### Prerequisites
- Windows 10/11 or Windows Server 2016+
- PowerShell 5.1 or later
- .NET 6.0 SDK or later
- SQLite 3.35+ (for database operations)
- Python 3.8+ (for LLM-related scripts)

### Installation
1. Clone the Komga repository
2. Navigate to the scripts directory:
   ```powershell
   cd C:\path\to\komga\scripts
   ```
3. Initialize the database:
   ```powershell
   .\init_database.ps1
   ```

## 💽 Database Management

### `init_database.ps1`
Initializes a new SQLite database for Komga.

**Usage:**
```powershell
.\init_database.ps1 [-DatabasePath <string>] [-Force]
```

**Parameters:**
- `-DatabasePath`: Path where the database file will be created (default: `$PSScriptRoot\..\data\komga.db`)
- `-Force`: Overwrite existing database file if it exists

**Example:**
```powershell
.\init_database.ps1 -DatabasePath "C:\komga\data\mydb.db" -Force
```

### `backup_database.ps1`
Creates a backup of the Komga database.

**Usage:**
```powershell
.\backup_database.ps1 -SourcePath <string> -BackupDir <string> [-RetentionDays <int>]
```

## 📚 OPF Processing

### `process_opf.ps1`
Processes a single OPF file to extract and store metadata.

**Usage:**
```powershell
.\process_opf.ps1 -OpfPath <string> [-OutputDir <string>] [-Force]
```

**Parameters:**
- `-OpfPath`: Path to the OPF file to process
- `-OutputDir`: Directory to store processed files (default: same as OPF file)
- `-Force`: Overwrite existing output files

**Example:**
```powershell
.\process_opf.ps1 -OpfPath "C:\books\manga\volume1\content.opf" -OutputDir "C:\komga\processed"
```

### `batch_process_opf.ps1`
Processes multiple OPF files in a directory.

**Usage:**
```powershell
.\batch_process_opf.ps1 -SourceDir <string> [-Recurse] [-Filter <string>]
```

## 🤖 LLM Integration

### Configuration
Edit `config/application.yml` to configure LLM providers:

```yaml
komga:
  llm:
    enabled: true
    default-provider: ollama  # or openai, lmstudio, vllm
    
    # Rate limiting
    rate-limit:
      enabled: true
      requests-per-minute: 60
      max-concurrent: 10
      adaptive: true
      
    # Model management
    model:
      auto-load: true
      auto-load-models: ["llama2", "mistral"]
      status-refresh-interval: 5m
      max-loaded-models: 3
      
    # Provider configurations
    ollama:
      enabled: true
      api-url: "http://localhost:11434"
      model: "llama2"
      
    openai:
      enabled: false
      api-key: ${OPENAI_API_KEY}
      model: "gpt-4"
```

### Available Scripts

#### `llm_analyze_series.ps1`
Analyzes series metadata using LLM.

**Usage:**
```powershell
.\llm_analyze_series.ps1 -SeriesId <string> [-Model <string>] [-Force]
```

**Parameters:**
- `-SeriesId`: ID of the series to analyze
- `-Model`: LLM model to use (default: from config)
- `-Force`: Force re-analysis even if data exists

#### `llm_generate_metadata.ps1`
Generates metadata for books/series using LLM.

**Usage:**
```powershell
.\llm_generate_metadata.ps1 -Path <string> -Type <string> [-Model <string>]
```

**Parameters:**
- `-Path`: Path to book/series directory or file
- `-Type`: Type of content (book/series/collection)
- `-Model`: LLM model to use

#### `llm_process_collection.ps1`
Processes a collection with LLM-enhanced analysis.

**Usage:**
```powershell
.\llm_process_collection.ps1 -CollectionId <string> [-Model <string>] [-BatchSize <int>]
```

## 📝 Metadata Management

### `export_metadata.ps1`
Exports metadata to external format.

### `import_metadata.ps1`
Imports metadata from external sources.

## ⚙️ Configuration

### `config/application.yml`
Main configuration file for Komga. Key sections:

- `server.port`: Web server port
- `spring.datasource`: Database configuration
- `komga.library-scan-cron`: Library scan schedule
- `komga.llm`: LLM integration settings

## 🔒 Security Notes

1. **Authentication**
   - Enable authentication in production
   - Use strong passwords and HTTPS

2. **API Security**
   - Rotate API keys regularly
   - Use environment variables for sensitive data
   - Restrict API access with firewalls

3. **LLM Security**
   - Monitor API usage and costs
   - Review model outputs for sensitive data
   - Keep models updated

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Errors**
   ```powershell
   # Check database permissions
   Test-NetConnection -ComputerName localhost -Port 3306
   ```

2. **LLM Connection Issues**
   ```powershell
   # Test LLM API connectivity
   Invoke-RestMethod -Uri "http://localhost:11434/api/version"
   ```

3. **Performance Issues**
   - Monitor system resources:
     ```powershell
     Get-Process | Sort-Object CPU -Descending | Select-Object -First 5
     ```
   - Check logs in `logs/application.log`

### Getting Help
1. Check the [Komga Documentation](https://komga.org/)
2. Search [GitHub Issues](https://github.com/gotson/komga/issues)
3. Join the [Discord Community](https://discord.gg/TdRpkDu)

## 📜 License
Komga is licensed under the [MIT License](LICENSE).
