<#
.SYNOPSIS
    Backup Git repositories with progress tracking and verification.
.DESCRIPTION
    This script backs up all repositories in a specified directory, with progress tracking,
    checksum verification, and detailed logging.
.PARAMETER SourceDir
    Directory containing Git repositories to back up (default: $env:USERPROFILE\CascadeProjects)
.PARAMETER BackupDir
    Directory to store backups (default: $env:USERPROFILE\Backups\GitRepos_YYYYMMDD)
.PARAMETER LogFile
    Path to the log file (default: $BackupDir\backup_YYYYMMDD_HHMMSS.log)
.EXAMPLE
    .\backup_repos.ps1
    Backs up all repositories with default settings.
.EXAMPLE
    .\backup_repos.ps1 -SourceDir "D:\Projects" -BackupDir "E:\Backups\Projects"
    Backs up repositories from a custom source to a custom backup directory.
#>

param(
    [string]$SourceDir = "$env:USERPROFILE\CascadeProjects",
    [string]$BackupDir = "$env:USERPROFILE\Backups\GitRepos_$(Get-Date -Format 'yyyyMMdd')",
    [string]$LogFile = "$BackupDir\backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').log"
)

# Ensure backup directory exists
$null = New-Item -ItemType Directory -Path $BackupDir -Force

# Start logging
Start-Transcript -Path $LogFile -Append
Write-Output "=== Starting repository backup at $(Get-Date) ==="
Write-Output "Source: $SourceDir"
Write-Output "Backup: $BackupDir"

# Initialize counters
$totalRepos = 0
$successful = 0
$failed = 0
$skipped = 0
$totalSize = 0

# Function to get repository size
function Get-RepositorySize {
    param([string]$path)
    try {
        $size = (Get-ChildItem -Path $path -Recurse -File | Measure-Object -Property Length -Sum).Sum
        return [math]::Round($size / 1MB, 2) # Return size in MB
    } catch {
        Write-Warning "Failed to calculate size for $path : $_"
        return 0
    }
}

# Function to verify backup
function Test-ArchiveIntegrity {
    param([string]$archivePath)
    try {
        $result = Test-Archive -Path $archivePath -ErrorAction Stop
        return $result.Status -eq 'Valid'
    } catch {
        Write-Warning "Integrity check failed for $archivePath : $_"
        return $false
    }
}

# Get all repositories
$repositories = Get-ChildItem -Path $SourceDir -Directory -Recurse -Depth 2 | 
    Where-Object { Test-Path "$($_.FullName)\.git" } | 
    Select-Object -ExpandProperty FullName -Unique

$totalRepos = $repositories.Count
Write-Output "Found $totalRepos repositories to back up."

# Process each repository
foreach ($repo in $repositories) {
    $repoName = Split-Path $repo -Leaf
    $backupFile = Join-Path $BackupDir "$repoName-$(Get-Date -Format 'yyyyMMdd').zip"
    $tempDir = Join-Path $env:TEMP "backup_$(New-Guid)"
    
    try {
        # Skip if backup already exists
        if (Test-Path $backupFile) {
            Write-Output "[SKIP] $repoName - Backup already exists"
            $skipped++
            continue
        }

        Write-Output "[BACKUP] $repoName - Starting backup..."
        
        # Get repository size
        $size = Get-RepositorySize -path $repo
        $totalSize += $size
        
        # Create a clean copy
        $null = New-Item -ItemType Directory -Path $tempDir -Force
        
        # Copy repository files (excluding .git directory)
        Get-ChildItem -Path $repo -Exclude '.git' | 
            Copy-Item -Destination $tempDir -Recurse -Force
        
        # Create archive
        Compress-Archive -Path "$tempDir\*" -DestinationPath $backupFile -CompressionLevel Optimal
        
        # Verify archive
        if (-not (Test-ArchiveIntegrity -archivePath $backupFile)) {
            throw "Archive verification failed"
        }
        
        # Get checksum
        $checksum = (Get-FileHash -Path $backupFile -Algorithm SHA256).Hash
        
        # Log success
        Write-Output "[SUCCESS] $repoName - Backup created ($size MB, SHA256: $checksum)"
        $successful++
        
    } catch {
        Write-Error "[FAILED] $repoName - $_"
        $failed++
        
        # Clean up failed backup
        if (Test-Path $backupFile) {
            Remove-Item $backupFile -Force
        }
        
    } finally {
        # Clean up temp directory
        if (Test-Path $tempDir) {
            Remove-Item $tempDir -Recurse -Force -ErrorAction SilentlyContinue
        }
        
        # Update progress
        $progress = [math]::Round((($successful + $failed + $skipped) / $totalRepos) * 100, 2)
        Write-Progress -Activity "Backing up repositories" -Status "$progress% Complete" -PercentComplete $progress
    }
}

# Generate summary
$endTime = Get-Date
$duration = New-TimeSpan -Start (Get-Date).AddSeconds(-$elapsedTime) -End (Get-Date)

$summary = @"
=== Backup Summary ===
Completed:    $(Get-Date)
Duration:     $($duration.ToString('hh\:mm\:ss'))
Total Repos:  $totalRepos
Successful:   $successful
Failed:       $failed
Skipped:      $skipped
Total Size:   $($totalSize.ToString('N2')) MB
Backup Dir:   $BackupDir
Log File:     $LogFile
"@

Write-Output $summary

# Save summary to file
$summary | Out-File -FilePath "$BackupDir\backup_summary_$(Get-Date -Format 'yyyyMMdd_HHmmss').txt" -Force

# Stop logging
Write-Output "=== Backup completed at $(Get-Date) ==="
Stop-Transcript

# Display final status
if ($failed -gt 0) {
    Write-Warning "Backup completed with $failed failure(s). Check the log file for details."
    exit 1
} else {
    Write-Output "Backup completed successfully!"
    exit 0
}
