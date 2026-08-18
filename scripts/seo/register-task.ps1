<#
.SYNOPSIS
  Registers (or re-registers) the daily 9:00 AM SEO maintenance Scheduled Task.

.DESCRIPTION
  Runs under your own user account, interactively, so it inherits your logged-on
  session. No elevation and no stored password required. Re-run this script
  after moving the repo to update the stored paths.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts\seo\register-task.ps1
  powershell -ExecutionPolicy Bypass -File scripts\seo\register-task.ps1 -Unregister
#>
[CmdletBinding()]
param(
  # Remove the task instead of creating it.
  [switch]$Unregister,
  # Override the run time (24h "HH:mm").
  [string]$At = "09:00"
)

$ErrorActionPreference = "Stop"

$TaskName = "QRGenerator-DailySEO"
$Runner = Join-Path $PSScriptRoot "run-daily-seo.ps1"

if ($Unregister) {
  try {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction Stop
    Write-Output "Removed scheduled task '$TaskName'."
  } catch {
    Write-Output "No scheduled task named '$TaskName' to remove."
  }
  return
}

if (-not (Test-Path $Runner)) { throw "Runner script not found at $Runner" }

$action = New-ScheduledTaskAction `
  -Execute "powershell.exe" `
  -Argument "-NoProfile -NonInteractive -ExecutionPolicy Bypass -File `"$Runner`"" `
  -WorkingDirectory (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))

$trigger = New-ScheduledTaskTrigger -Daily -At $At

# StartWhenAvailable covers the machine being off at 9:00 — the run catches up
# on next boot rather than being silently skipped. The 2h limit stops a hung
# run from sitting there until tomorrow's trigger.
$settings = New-ScheduledTaskSettingsSet `
  -StartWhenAvailable `
  -DontStopIfGoingOnBatteries `
  -AllowStartIfOnBatteries `
  -ExecutionTimeLimit (New-TimeSpan -Hours 2) `
  -MultipleInstances IgnoreNew

$principal = New-ScheduledTaskPrincipal `
  -UserId "$env:USERDOMAIN\$env:USERNAME" `
  -LogonType Interactive `
  -RunLevel Limited

Register-ScheduledTask `
  -TaskName $TaskName `
  -Action $action `
  -Trigger $trigger `
  -Settings $settings `
  -Principal $principal `
  -Description "Daily SEO maintenance for QR-Generator. Commits to a dated branch for review; never pushes or deploys." `
  -Force | Out-Null

Write-Output "Registered '$TaskName' to run daily at $At as $env:USERNAME."
Write-Output "Run now:   Start-ScheduledTask -TaskName $TaskName"
Write-Output "Inspect:   Get-ScheduledTaskInfo -TaskName $TaskName"
Write-Output "Remove:    powershell -ExecutionPolicy Bypass -File scripts\seo\register-task.ps1 -Unregister"
