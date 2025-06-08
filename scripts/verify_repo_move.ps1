<#
.SYNOPSIS
    Verifies the integrity of Git repositories after moving them.
.DESCRIPTION
    This script checks for common issues that might occur after moving Git repositories,
    such as broken paths, Git configurations, and project-specific settings.
.PARAMETER RepoPath
    Path to the directory containing the moved repositories.
.EXAMPLE
    .\verify_repo_move.ps1 -RepoPath "C:\Users\sandr\OneDrive\Dokumente\GitHub\CascadeProjects"
#>

param(
    [string]$RepoPath = "C:\Users\sandr\OneDrive\Dokumente\GitHub\CascadeProjects"
)

# Set error action preference
$ErrorActionPreference = 'Stop'

# Output file for the verification report
$reportFile = "$PSScriptRoot\repo_verification_report_$(Get-Date -Format 'yyyyMMdd_HHmmss').txt"

# Function to write to both console and report
function Write-Report {
    param([string]$Message, [string]$Status = 'INFO')
    
    $timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    $output = "[$timestamp] [$Status] $Message"
    
    Write-Host $output
    Add-Content -Path $reportFile -Value $output
}

# Start the verification
Write-Report "Starting repository verification at: $RepoPath"

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

Write-Report "Found $($repos.Count) repositories to verify"

# Check each repository
foreach ($repo in $repos) {
    $repoName = Split-Path $repo -Leaf
    Write-Report "Verifying repository: $repoName"
    
    try {
        Push-Location $repo
        
        # 1. Check Git status
        $status = git status --porcelain
        if ($status) {
            Write-Report "  - Has uncommitted changes" -Status 'WARNING'
        }
        
        # 2. Check remote URLs
        $remotes = git remote -v
        if (-not $remotes) {
            Write-Report "  - No remotes configured" -Status 'WARNING'
        } else {
            $remotes | ForEach-Object {
                if ($_ -match 'origin\s+(\S+)') {
                    $url = $matches[1]
                    if ($url -match 'C:\\Users\\sandr\\CascadeProjects') {
                        Write-Report "  - Found old path in remote URL: $url" -Status 'WARNING'
                    }
                }
            }
        }
        
        # 3. Check for submodules
        if (Test-Path .gitmodules) {
            Write-Report "  - Contains Git submodules" -Status 'INFO'
            $submodules = git submodule status
            $submodules | ForEach-Object {
                if ($_ -match '\+') {
                    Write-Report "    - Submodule not initialized: $_" -Status 'WARNING'
                }
            }
        }
        
        # 4. Check for Git LFS
        if (Test-Path .git\lfs) {
            Write-Report "  - Uses Git LFS" -Status 'INFO'
            $lfsStatus = git lfs status
            if ($lfsStatus -match 'Git LFS objects to be pushed') {
                Write-Report "    - Has unpushed LFS objects" -Status 'WARNING'
            }
        }
        
        # 5. Check for project-specific files
        $projectFiles = @('pom.xml', 'build.gradle', 'package.json', '*.sln')
        $foundFiles = Get-ChildItem -Path $repo -Include $projectFiles -Recurse -Depth 1 -File -ErrorAction SilentlyContinue
        
        if ($foundFiles) {
            $projectType = switch -Wildcard ($foundFiles.Name) {
                'pom.xml' { 'Maven' }
                'build.gradle' { 'Gradle' }
                'package.json' { 'Node.js' }
                '*.sln' { '.NET' }
                default { 'Unknown' }
            }
            Write-Report "  - Detected $projectType project" -Status 'INFO'
            
            # Check for lock files that might contain absolute paths
            $lockFiles = Get-ChildItem -Path $repo -Include ('package-lock.json', 'yarn.lock', 'gradle.lockfile') -Recurse -Depth 2 -File -ErrorAction SilentlyContinue
            foreach ($lockFile in $lockFiles) {
                $content = Get-Content $lockFile.FullName -Raw
                if ($content -match 'C:\\Users\\sandr\\CascadeProjects') {
                    Write-Report "    - Found old path in lock file: $($lockFile.Name)" -Status 'WARNING'
                }
            }
        }
        
        Write-Report "  - Verification completed successfully" -Status 'SUCCESS'
        
    } catch {
        Write-Report "  - Error during verification: $_" -Status 'ERROR'
    } finally {
        Pop-Location
    }
}

Write-Report "Verification complete. Report saved to: $reportFile"
Write-Host "`nSummary of findings:"
Get-Content $reportFile | Select-String -Pattern 'WARNING|ERROR' -Context 1,0

# Komga Build Preparation
Write-Host "`n=== Komga Build Preparation ==="
$komgaPath = "C:\Users\sandr\OneDrive\Dokumente\GitHub\komga"

if (Test-Path $komgaPath) {
    Write-Host "`nKomga repository found at: $komgaPath"
    
    # Check Java version
    try {
        $javaVersion = & { java -version } 2>&1 | Select-String "version" | Select-Object -First 1
        Write-Host "Java version: $javaVersion"
        
        # Check Gradle wrapper
        if (Test-Path "$komgaPath\gradlew.bat") {
            Write-Host "Gradle wrapper found. You can build using: .\gradlew build"
            
            # Check for robust_cleanup.ps1 (from your memory)
            if (Test-Path "$komgaPath\robust_cleanup.ps1") {
                Write-Host "`nRecommended first step: Run .\robust_cleanup.ps1 before building"
                Write-Host "This will ensure a clean build environment"
            } else {
                Write-Host "`nNote: robust_cleanup.ps1 not found. Consider running 'gradlew clean' before building"
            }
            
            # Check for cleanup.bat (from your memory)
            if (Test-Path "$komgaPath\cleanup.bat") {
                Write-Host "Alternatively, you can run cleanup.bat before building"
            }
            
            Write-Host "`nTo build Komga, run these commands:"
            Write-Host "1. cd '$komgaPath'"
            Write-Host "2. .\robust_cleanup.ps1  # Or .\cleanup.bat"
            Write-Host "3. .\gradlew build"
        } else {
            Write-Host "Gradle wrapper not found. Please ensure you're in the correct directory." -ForegroundColor Red
        }
    } catch {
        Write-Host "Java might not be installed or not in PATH. Please install Java 11 or later." -ForegroundColor Red
    }
} else {
    Write-Host "Komga repository not found at: $komgaPath" -ForegroundColor Red
    Write-Host "Please clone the repository first:"
    Write-Host "git clone https://github.com/sandrash/komga.git"
}
