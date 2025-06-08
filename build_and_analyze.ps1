# Build and Analyze Script for Komga
# This script cleans, builds, and analyzes the project

# Set error action preference
$ErrorActionPreference = "Stop"

# Configuration
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$buildLog = "$PSScriptRoot\build_output_${timestamp}.log"
$errorLog = "$PSScriptRoot\build_errors_${timestamp}.log"

# Function to write output
function Write-BuildOutput {
    param([string]$Message, [string]$Color = "White")
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $output = "[$timestamp] $Message"
    
    Write-Host $output -ForegroundColor $Color
    Add-Content -Path $buildLog -Value $output
}

# Function to clean build directories
function Remove-BuildDirectories {
    Write-BuildOutput "Cleaning build directories..." -Color "Cyan"
    
    $directoriesToClean = @(
        "$PSScriptRoot\build",
        "$PSScriptRoot\.gradle",
        "$PSScriptRoot\komga\build",
        "$PSScriptRoot\komga\out",
        "$PSScriptRoot\komga-tray\build",
        "$PSScriptRoot\komga-tray\out"
    )
    
    foreach ($dir in $directoriesToClean) {
        if (Test-Path $dir) {
            try {
                Write-BuildOutput "  Removing directory: $dir" -Color "Yellow"
                Remove-Item -Path $dir -Recurse -Force -ErrorAction Stop
            }
            catch {
                Write-BuildOutput "  ❌ Failed to remove $dir : $_" -Color "Red"
                # Continue with other directories even if one fails
            }
        }
    }
    
    # Clean Gradle caches
    try {
        Write-BuildOutput "Cleaning Gradle caches..." -Color "Cyan"
        & .\gradlew.bat clean --no-daemon --stacktrace 2>&1 | Out-File -FilePath $buildLog -Append
    }
    catch {
        Write-BuildOutput "  ❌ Gradle clean failed: $_" -Color "Red"
    }
}

# Function to run Gradle build
function Invoke-GradleBuild {
    [CmdletBinding()]
    param(
        [string]$Task = 'build'
    )
    
    $gradleCmd = '.\gradlew.bat'
    
    try {
        # Create a temporary file for error output
        $tempErrorFile = [System.IO.Path]::GetTempFileName()
        
        # Set Gradle environment variables
        $env:GRADLE_OPTS = '-Xmx2048m -Dorg.gradle.daemon=false'
        $env:JAVA_OPTS = '-Xmx2048m'
        
        # Build Gradle arguments
        $gradleArgs = @(
            $Task,
            '--no-daemon',
            '--stacktrace',
            '--info'
        )
        
        $commandLine = "$gradleCmd $($gradleArgs -join ' ')"
        Write-BuildOutput "Running: $commandLine" -Color 'Yellow'
        
        $process = Start-Process -FilePath $gradleCmd -ArgumentList $gradleArgs `
                               -NoNewWindow -PassThru -RedirectStandardOutput $buildLog -RedirectStandardError $tempErrorFile
        
        $process.WaitForExit()
        $exitCode = $process.ExitCode
        
        # Show output in console
        Get-Content $buildLog | ForEach-Object { Write-Output $_ }
        
        # Handle error output
        $errors = $null
        try {
            if ((Test-Path $tempErrorFile) -and (Get-Item $tempErrorFile).Length -gt 0) {
                $errors = Get-Content $tempErrorFile -ErrorAction SilentlyContinue
                if ($null -ne $errors) {
                    Write-BuildOutput '=== Gradle Errors ===' -Color 'Red'
                    $errors | ForEach-Object { Write-BuildOutput $_ -Color 'Red' }
                    Add-Content -Path $buildLog -Value "`n=== Errors ===`n$errors"
                }
            }
        }
        catch {
            Write-BuildOutput "  ⚠️  Error reading error log: $_" -Color 'Yellow'
        }
        finally {
            # Clean up temp file
            if (Test-Path $tempErrorFile) {
                Remove-Item $tempErrorFile -Force -ErrorAction SilentlyContinue
            }
        }
        
        return $exitCode
    }
    catch {
        Write-BuildOutput "  ❌ Error running Gradle: $_" -Color 'Red'
        return 1
    }
}

# Function to analyze build results
function Test-BuildResults {
    param(
        [string]$logFile,
        [int]$exitCode
    )
    
    if ($exitCode -eq 0) {
        Write-BuildOutput "✅ BUILD SUCCESSFUL" -Color "Green"
        
        # Check for warnings
        $warnings = Get-Content $logFile -ErrorAction SilentlyContinue | Where-Object { $_ -match "warning:" }
        if ($warnings) {
            Write-BuildOutput "`n⚠️  Found $($warnings.Count) warning(s):" -Color "Yellow"
            $warnings | Select-Object -First 10 | ForEach-Object { 
                Write-BuildOutput "  - $_" -Color "Yellow"
            }
            if ($warnings.Count -gt 10) {
                Write-BuildOutput "  ... and $($warnings.Count - 10) more warnings" -Color "Yellow"
            }
        }
    }
    else {
        Write-BuildOutput "❌ BUILD FAILED with exit code $exitCode" -Color "Red"
        
        # Show error details
        $errors = Get-Content $logFile -ErrorAction SilentlyContinue | Where-Object { 
            $_ -match "error:|FAILED|Exception|Error" -and 
            -not $_.Contains("Deprecated") -and 
            -not $_.Contains("warning:")
        }
        
        if ($errors) {
            Write-BuildOutput "`n❌ Error summary:" -Color "Red"
            $errors | Select-Object -First 20 | ForEach-Object {
                Write-BuildOutput "  - $_" -Color "Red"
            }
            if ($errors.Count -gt 20) {
                Write-BuildOutput "  ... and $($errors.Count - 20) more errors" -Color "Red"
            }
        }
    }
}

# Main execution
try {
    # Clean up previous build outputs
    Write-BuildOutput "=== Starting Build and Analyze ===" -Color "Cyan"
    
    # Clean build directories
    Remove-BuildDirectories
    
    # Run build
    $buildExitCode = Invoke-GradleBuild -Task "build"
    
    # Analyze build results
    if ($null -eq $buildExitCode) { $buildExitCode = 1 }  # Default to error if null
    Test-BuildResults -logFile $buildLog -exitCode $buildExitCode
    
    # Run tests if build was successful
    if ($buildExitCode -eq 0) {
        Write-BuildOutput "`n=== Running Tests ===" -Color "Cyan"
        $testExitCode = Invoke-GradleBuild -Task "test"
        
        if ($testExitCode -eq 0) {
            Write-BuildOutput "✅ TESTS PASSED" -Color "Green"
        }
        else {
            Write-BuildOutput "❌ TESTS FAILED with exit code $testExitCode" -Color "Red"
        }
    }
}
catch {
    Write-BuildOutput "❌ SCRIPT FAILED: $_" -Color "Red"
    Write-BuildOutput $_.ScriptStackTrace -Color "Red"
    exit 1
}
finally {
    # Show log file locations
    Write-BuildOutput "`n=== Build Completed ===" -Color "Cyan"
    Write-BuildOutput "Build log: $buildLog" -Color "Cyan"
    
    if (Test-Path $errorLog) {
        Write-BuildOutput "Error log: $errorLog" -Color "Cyan"
    }
    
    # Open the build log if there were errors
    if (($buildExitCode -ne 0 -or $testExitCode -ne 0) -and (Test-Path $buildLog)) {
        Write-BuildOutput "Opening build log for review..." -Color "Yellow"
        Start-Process $buildLog
    }
}
