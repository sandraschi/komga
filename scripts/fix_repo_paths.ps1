<#
.SYNOPSIS
    Fixes absolute paths in Git repositories after moving them.
.DESCRIPTION
    This script automatically updates common absolute path references that might break
    when moving repositories between locations. It handles:
    - Git configuration files
    - Project files (like .idea, .vscode)
    - Common dependency files (package.json, build.gradle, etc.)
    - Environment files (.env, *.properties)
.PARAMETER RepoPath
    Path to the directory containing the moved repositories.
.PARAMETER DryRun
    If specified, only shows what would be changed without making any actual changes.
.EXAMPLE
    # Show what would be changed
    .\fix_repo_paths.ps1 -RepoPath "C:\Users\sandr\OneDrive\Dokumente\GitHub\CascadeProjects" -DryRun
    
    # Apply the changes
    .\fix_repo_paths.ps1 -RepoPath "C:\Users\sandr\OneDrive\Dokumente\GitHub\CascadeProjects"
#>

param(
    [string]$RepoPath = "C:\Users\sandr\OneDrive\Dokumente\GitHub\CascadeProjects",
    [switch]$DryRun
)

# Set error action preference
$ErrorActionPreference = 'Stop'

# Output file for the fix report
$reportFile = "$PSScriptRoot\repo_fix_report_$(Get-Date -Format 'yyyyMMdd_HHmmss').txt"

# Function to write to both console and report
function Write-Report {
    param([string]$Message, [string]$Status = 'INFO')
    
    $timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    $output = "[$timestamp] [$Status] $Message"
    
    Write-Host $output
    Add-Content -Path $reportFile -Value $output
}

# Function to replace text in a file
function Update-FileContent {
    param(
        [string]$FilePath,
        [string]$Pattern,
        [string]$Replacement,
        [string]$Description
    )
    
    if (-not (Test-Path $FilePath)) {
        Write-Report "File not found: $FilePath" -Status 'WARNING'
        return $false
    }
    
    try {
        $content = Get-Content $FilePath -Raw -ErrorAction Stop
        
        if ($content -match $Pattern) {
            $newContent = $content -replace $Pattern, $Replacement
            
            if (-not $DryRun) {
                $newContent | Set-Content -Path $FilePath -NoNewline -Force -Encoding UTF8
                Write-Report "  - Fixed: $Description" -Status 'FIXED'
                return $true
            } else {
                Write-Report "  - Would fix: $Description" -Status 'DRYRUN'
                return $true
            }
        }
        return $false
    } catch {
        Write-Report "  - Error processing $FilePath : $_" -Status 'ERROR'
        return $false
    }
}

# Start the fix process
Write-Report "Starting repository path fixes at: $RepoPath"
if ($DryRun) {
    Write-Report "RUNNING IN DRY RUN MODE - NO CHANGES WILL BE MADE" -Status 'WARNING'
}

# Check if the directory exists
if (-not (Test-Path $RepoPath)) {
    Write-Report "Directory not found: $RepoPath" -Status 'ERROR'
    exit 1
}

# Get all Git repositories
$repos = Get-ChildItem -Path $RepoPath -Directory -Recurse -Force -ErrorAction SilentlyContinue | 
    Where-Object { Test-Path "$($_.FullName)\.git" } | 
    Select-Object -ExpandProperty FullName -Unique

if (-not $repos) {
    Write-Report "No Git repositories found in: $RepoPath" -Status 'WARNING'
    exit 0
}

Write-Report "Found $($repos.Count) repositories to process"

# Process each repository
foreach ($repo in $repos) {
    $repoName = Split-Path $repo -Leaf
    Write-Report "Processing repository: $repoName"
    
    $fixCount = 0
    
    try {
        Push-Location $repo
        
        # 1. Fix Git config
        $gitConfig = "$repo\.git\config"
        if (Test-Path $gitConfig) {
            $fixCount += Update-FileContent -FilePath $gitConfig `
                -Pattern 'C:\\Users\\sandr\\CascadeProjects' `
                -Replacement $RepoPath.Replace('\', '\\') `
                -Description "Updated Git remote paths in .git/config"
        }
        
        # 2. Fix IDE configuration files
        $ideFiles = @(
            "$repo\.idea\workspace.xml",
            "$repo\.idea\modules.xml",
            "$repo\.vscode\settings.json",
            "$repo\.vscode\launch.json"
        )
        
        foreach ($file in $ideFiles) {
            if (Test-Path $file) {
                $fixCount += Update-FileContent -FilePath $file `
                    -Pattern 'C:\\Users\\sandr\\CascadeProjects' `
                    -Replacement $RepoPath.Replace('\', '\\') `
                    -Description "Updated paths in $(Split-Path $file -Leaf)"
            }
        }
        
        # 3. Fix common project files
        $projectFiles = Get-ChildItem -Path $repo -Include ('*.json', '*.xml', '*.properties', '*.gradle', '*.kt', '*.java', '*.ts', '*.tsx', '*.js', '*.jsx', '*.md') -Recurse -File -ErrorAction SilentlyContinue |
            Where-Object { $_.FullName -notmatch '\\node_modules\\|\\.git\\|\\build\\|\\target\\|\\dist\\' }
        
        foreach ($file in $projectFiles) {
            $relativePath = $file.FullName.Substring($repo.Length + 1)
            $fixCount += Update-FileContent -FilePath $file.FullName `
                -Pattern 'C:\\Users\\sandr\\CascadeProjects' `
                -Replacement $RepoPath.Replace('\', '\\') `
                -Description "Updated paths in $relativePath"
        }
        
        # 4. Fix environment files
        $envFiles = Get-ChildItem -Path $repo -Include ('.env*', '*.env', '*.properties') -Recurse -File -ErrorAction SilentlyContinue |
            Where-Object { $_.FullName -notmatch '\\.git\\|\\node_modules\\|\\build\\|\\target\\' }
        
        foreach ($file in $envFiles) {
            $relativePath = $file.FullName.Substring($repo.Length + 1)
            $fixCount += Update-FileContent -FilePath $file.FullName `
                -Pattern 'C:[/\\]Users[/\\]sandr[/\\]CascadeProjects' `
                -Replacement $RepoPath.Replace('\', '/') `
                -Description "Updated paths in $relativePath"
        }
        
        # 5. Update Git hooks
        $hookFiles = Get-ChildItem -Path "$repo\.git\hooks" -File -ErrorAction SilentlyContinue
        foreach ($file in $hookFiles) {
            $fixCount += Update-FileContent -FilePath $file.FullName `
                -Pattern 'C:[/\\]Users[/\\]sandr[/\\]CascadeProjects' `
                -Replacement $RepoPath.Replace('\', '/') `
                -Description "Updated paths in Git hook: $($file.Name)"
        }
        
        if ($fixCount -gt 0) {
            Write-Report "  - Fixed $fixCount path references in $repoName" -Status 'SUCCESS'
        } else {
            Write-Report "  - No path references needed updating" -Status 'INFO'
        }
        
    } catch {
        Write-Report "  - Error processing repository: $_" -Status 'ERROR'
    } finally {
        Pop-Location
    }
}

Write-Report "`nPath fixing complete. Report saved to: $reportFile"

# Show summary
Write-Host "`n=== Fix Summary ==="
$fixSummary = Get-Content $reportFile | Select-String -Pattern 'FIXED|ERROR|DRYRUN' | Select-Object -First 20
if ($fixSummary) {
    $fixSummary
    if ((Get-Content $reportFile | Select-String -Pattern 'FIXED|ERROR|DRYRUN').Count -gt 20) {
        Write-Host "... and more (see full report for details)"
    }
} else {
    Write-Host "No path references needed updating."
}

if ($DryRun) {
    Write-Host "`nThis was a dry run. No changes were made." -ForegroundColor Yellow
    Write-Host "To apply these changes, run the script without the -DryRun parameter."
} else {
    Write-Host "`nChanges have been applied. Please verify the changes before committing." -ForegroundColor Green
}

Write-Host "`nFull report: $reportFile"
