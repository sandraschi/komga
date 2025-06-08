<#
.SYNOPSIS
    Analyzes a repository for path references that might need updating.
.DESCRIPTION
    This script scans files in a repository for common path patterns that might
    need to be updated when moving the repository.
.PARAMETER RepoPath
    Path to the repository to analyze.
.EXAMPLE
    .\analyze_repo.ps1 -RepoPath "C:\path\to\repository"
#>

param(
    [Parameter(Mandatory=$true)]
    [string]$RepoPath
)

# Check if the repository exists
if (-not (Test-Path $RepoPath)) {
    Write-Error "Repository not found: $RepoPath"
    exit 1
}

Write-Host "Analyzing repository: $RepoPath" -ForegroundColor Cyan

# Get all files in the repository (excluding .git and node_modules)
$files = Get-ChildItem -Path $RepoPath -Recurse -File -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch '\\.git\\|\\node_modules\\' }

Write-Host "Found $($files.Count) files to analyze"

# Common patterns that might contain paths
$patterns = @(
    'C:\\Users',
    'C:/Users',
    'C:\\\\',
    '\\\\',
    'C:\\\\Users',
    'C:/',
    'C:\\\\',
    'C:\\',
    'C:/',
    'C:\\Users',
    'C:/Users',
    'C:\\Program Files',
    'C:/Program Files',
    'C:\\Program Files (x86)',
    'C:/Program Files (x86)'
)

$foundPaths = @()

foreach ($file in $files) {
    try {
        $content = Get-Content $file.FullName -Raw -ErrorAction Stop
        
        foreach ($pattern in $patterns) {
            if ($content -match [regex]::Escape($pattern)) {
                $relativePath = $file.FullName.Substring($RepoPath.Length).TrimStart('\')
                $foundPaths += [PSCustomObject]@{
                    File = $relativePath
                    Pattern = $pattern
                    Line = ($content -split "`n" | Select-String -Pattern [regex]::Escape($pattern) | Select-Object -First 1).ToString().Trim()
                }
                break
            }
        }
    } catch {
        Write-Warning "Could not read $($file.FullName): $_"
    }
}

# Display results
if ($foundPaths.Count -gt 0) {
    Write-Host "`nFound $($foundPaths.Count) potential path references that might need updating:" -ForegroundColor Yellow
    $foundPaths | Format-Table -AutoSize -Wrap
    
    # Create a summary file
    $summaryFile = Join-Path $PSScriptRoot "path_analysis_$(Get-Date -Format 'yyyyMMdd_HHmmss').txt"
    $foundPaths | Format-Table -AutoSize -Wrap | Out-File -FilePath $summaryFile -Force
    
    Write-Host "`nDetailed report saved to: $summaryFile" -ForegroundColor Green
} else {
    Write-Host "`nNo path references found that need updating." -ForegroundColor Green
}

# Show repository structure
Write-Host "`nRepository structure:" -ForegroundColor Cyan
Get-ChildItem -Path $RepoPath -Recurse -Directory | 
    Select-Object FullName | 
    ForEach-Object { $_.FullName.Substring($RepoPath.Length).TrimStart('\') } | 
    Sort-Object

# Show file types and counts
Write-Host "`nFile types and counts:" -ForegroundColor Cyan
$files | 
    Group-Object Extension | 
    Select-Object Name, Count | 
    Sort-Object Count -Descending | 
    Format-Table -AutoSize
