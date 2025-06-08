# Fix Taskbar Auto-Hide Issues
# This script identifies processes that may be preventing the taskbar from auto-hiding
# and offers options to close them.

# Run as admin check
if (-not ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "This script should be run as administrator for best results." -ForegroundColor Yellow
    Write-Host "Some actions may not work with standard permissions." -ForegroundColor Yellow
    Write-Host ""
    $runAsAdmin = Read-Host "Do you want to restart the script as administrator? (y/n)"
    if ($runAsAdmin -eq 'y') {
        Start-Process powershell -ArgumentList "-ExecutionPolicy Bypass -File `"$PSCommandPath`"" -Verb RunAs
        exit
    }
}

Write-Host "=== Taskbar Auto-Hide Fix Tool ===" -ForegroundColor Cyan
Write-Host "This script will identify and help you manage processes that may be" -ForegroundColor Cyan
Write-Host "preventing your taskbar from automatically hiding." -ForegroundColor Cyan
Write-Host ""

# Check if auto-hide is enabled
$registryPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\StuckRects3"
if (Test-Path $registryPath) {
    $settings = Get-ItemProperty -Path $registryPath -Name Settings
    $taskbarAutoHideEnabled = ($settings.Settings[8] -band 1) -eq 1

    if (-not $taskbarAutoHideEnabled) {
        Write-Host "Taskbar auto-hide appears to be DISABLED in your settings." -ForegroundColor Yellow
        Write-Host "Would you like to enable it now?" -ForegroundColor Yellow
        $enableAutoHide = Read-Host "(y/n)"
        
        if ($enableAutoHide -eq 'y') {
            try {
                $settingsValue = $settings.Settings
                $settingsValue[8] = $settingsValue[8] -bor 1
                Set-ItemProperty -Path $registryPath -Name Settings -Value $settingsValue
                Write-Host "Auto-hide enabled. Restarting Explorer to apply changes..." -ForegroundColor Green
                Stop-Process -Name explorer -Force
                Start-Process explorer
                Write-Host "Explorer restarted. Auto-hide should now be enabled." -ForegroundColor Green
            }
            catch {
                Write-Host "Error enabling auto-hide: $_" -ForegroundColor Red
            }
        }
    }
    else {
        Write-Host "Taskbar auto-hide is currently ENABLED in your settings." -ForegroundColor Green
    }
}
else {
    Write-Host "Could not determine taskbar auto-hide status." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Checking for processes that commonly prevent taskbar auto-hide..." -ForegroundColor Cyan

# Define common culprits that prevent auto-hiding
$commonCulprits = @(
    @{Name="Teams"; ProcessName="Teams"; Reason="Pending notifications or message alerts"},
    @{Name="Outlook"; ProcessName="OUTLOOK"; Reason="Email notifications or calendar reminders"},
    @{Name="Skype"; ProcessName="Skype"; Reason="Message alerts or call notifications"},
    @{Name="Slack"; ProcessName="slack"; Reason="Unread messages or notifications"},
    @{Name="Discord"; ProcessName="Discord"; Reason="Unread messages or notifications"},
    @{Name="Windows Security"; ProcessName="SecurityHealthSystray"; Reason="Security alerts"},
    @{Name="Windows Update"; ProcessName="MusNotification"; Reason="Pending updates"},
    @{Name="Dropbox"; ProcessName="Dropbox"; Reason="Sync notifications"},
    @{Name="OneDrive"; ProcessName="OneDrive"; Reason="Sync notifications"},
    @{Name="Google Drive"; ProcessName="GoogleDriveFS"; Reason="Sync notifications"},
    @{Name="Steam"; ProcessName="Steam"; Reason="Game updates or notifications"},
    @{Name="Epic Games Launcher"; ProcessName="EpicGamesLauncher"; Reason="Game updates"},
    @{Name="Windows Explorer"; ProcessName="explorer"; Reason="File operations or notifications"}
)

# Get all running processes
$runningProcesses = Get-Process

# Check for running processes that match common culprits
$foundCulprits = @()
foreach ($culprit in $commonCulprits) {
    $processes = $runningProcesses | Where-Object {$_.ProcessName -like "*$($culprit.ProcessName)*"}
    if ($processes) {
        foreach ($process in $processes) {
            $foundCulprits += @{
                Name = $culprit.Name
                Process = $process
                Reason = $culprit.Reason
            }
        }
    }
}

# Check for notification-related processes
$notificationProcesses = $runningProcesses | Where-Object {
    $_.ProcessName -like "*notification*" -or 
    $_.ProcessName -like "*toast*" -or 
    $_.ProcessName -like "*alert*" -or 
    $_.ProcessName -like "*tray*"
}

foreach ($process in $notificationProcesses) {
    if (-not ($foundCulprits | Where-Object {$_.Process.Id -eq $process.Id})) {
        $foundCulprits += @{
            Name = $process.ProcessName
            Process = $process
            Reason = "Notification-related process"
        }
    }
}

# Check for taskbar-related issues in recent application events
Write-Host "Scanning recent application events for taskbar-related issues..." -ForegroundColor Cyan
$recentEvents = Get-WinEvent -LogName "Application" -MaxEvents 100 -ErrorAction SilentlyContinue | 
    Where-Object {$_.Message -like "*taskbar*" -or $_.Message -like "*notification*" -or $_.Message -like "*explorer*"} |
    Select-Object TimeCreated, ProviderName, Message

if ($recentEvents) {
    Write-Host "Found application events that might be related to taskbar issues:" -ForegroundColor Yellow
    foreach ($event in $recentEvents | Select-Object -First 3) {
        Write-Host "  - $($event.TimeCreated): $($event.ProviderName)" -ForegroundColor Yellow
        Write-Host "    $($event.Message.Substring(0, [Math]::Min(100, $event.Message.Length)))..." -ForegroundColor Gray
    }
    Write-Host ""
}

# Display results
if ($foundCulprits.Count -eq 0) {
    Write-Host "No common taskbar auto-hide culprits were found running." -ForegroundColor Green
    Write-Host "If you're still experiencing issues, try these steps:" -ForegroundColor Cyan
    Write-Host "1. Restart Windows Explorer (this script can do this for you)" -ForegroundColor White
    Write-Host "2. Check for any Windows updates" -ForegroundColor White
    Write-Host "3. Look for any applications showing notifications in the Action Center" -ForegroundColor White
    Write-Host "4. Try toggling the auto-hide setting off and on again" -ForegroundColor White
}
else {
    Write-Host "Found $($foundCulprits.Count) potential taskbar auto-hide culprits:" -ForegroundColor Yellow
    
    # Display table of culprits
    $i = 1
    foreach ($culprit in $foundCulprits) {
        $memory = [math]::Round($culprit.Process.WorkingSet / 1MB, 2)
        Write-Host "[$i] $($culprit.Name) (PID: $($culprit.Process.Id), Memory: $memory MB)" -ForegroundColor White
        Write-Host "    Possible reason: $($culprit.Reason)" -ForegroundColor Gray
        $i++
    }
    
    Write-Host ""
    Write-Host "Options:" -ForegroundColor Cyan
    Write-Host "1. Close a specific process (enter the number)" -ForegroundColor White
    Write-Host "2. Close all listed processes" -ForegroundColor White
    Write-Host "3. Restart Windows Explorer" -ForegroundColor White
    Write-Host "4. Exit without changes" -ForegroundColor White
    
    $choice = Read-Host "Enter your choice (1-4)"
    
    switch ($choice) {
        "1" {
            $processNum = Read-Host "Enter the number of the process to close"
            if ($processNum -match '^\d+$' -and [int]$processNum -ge 1 -and [int]$processNum -le $foundCulprits.Count) {
                $selectedProcess = $foundCulprits[[int]$processNum - 1].Process
                try {
                    $selectedProcess | Stop-Process -Force -ErrorAction Stop
                    Write-Host "Process $($selectedProcess.ProcessName) (PID: $($selectedProcess.Id)) closed successfully." -ForegroundColor Green
                }
                catch {
                    Write-Host "Error closing process: $_" -ForegroundColor Red
                }
            }
            else {
                Write-Host "Invalid selection." -ForegroundColor Red
            }
        }
        "2" {
            $confirm = Read-Host "Are you sure you want to close all listed processes? (y/n)"
            if ($confirm -eq 'y') {
                foreach ($culprit in $foundCulprits) {
                    try {
                        $culprit.Process | Stop-Process -Force -ErrorAction Stop
                        Write-Host "Process $($culprit.Process.ProcessName) (PID: $($culprit.Process.Id)) closed successfully." -ForegroundColor Green
                    }
                    catch {
                        Write-Host "Error closing process $($culprit.Process.ProcessName): $_" -ForegroundColor Red
                    }
                }
            }
        }
        "3" {
            $confirm = Read-Host "Are you sure you want to restart Windows Explorer? (y/n)"
            if ($confirm -eq 'y') {
                try {
                    Write-Host "Restarting Windows Explorer..." -ForegroundColor Yellow
                    Stop-Process -Name explorer -Force
                    Start-Process explorer
                    Write-Host "Windows Explorer restarted successfully." -ForegroundColor Green
                }
                catch {
                    Write-Host "Error restarting Windows Explorer: $_" -ForegroundColor Red
                }
            }
        }
        "4" {
            Write-Host "Exiting without changes." -ForegroundColor Yellow
        }
        default {
            Write-Host "Invalid choice. Exiting without changes." -ForegroundColor Red
        }
    }
}

Write-Host ""
Write-Host "Additional tips to fix taskbar auto-hide issues:" -ForegroundColor Cyan
Write-Host "1. Check Action Center for pending notifications (Windows+A)" -ForegroundColor White
Write-Host "2. Ensure no dialog boxes or windows are open but minimized" -ForegroundColor White
Write-Host "3. Try right-clicking the taskbar and selecting 'Taskbar settings'" -ForegroundColor White
Write-Host "   Then toggle 'Automatically hide the taskbar' off and on again" -ForegroundColor White
Write-Host "4. Make sure your display scaling is set properly" -ForegroundColor White
Write-Host "5. Consider running this script again after system updates" -ForegroundColor White

Write-Host ""
# Pause to keep the console window open
Read-Host "Press Enter to exit"
