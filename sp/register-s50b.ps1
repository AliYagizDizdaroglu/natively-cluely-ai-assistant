# Registers (or re-registers) the whole-turn proof flight as a Windows scheduled task.
# Same shape as Natively-flight-s50a: cmd.exe runs the ASCII-only launcher, the task's
# WorkingDirectory is the repo (the launcher never cd's into the accented path itself),
# the principal is the interactive user (a flight needs the user logged on: it plays audio
# and drives the app's overlay), 4 h limit, start-when-available.
# Usage: powershell -NoProfile -ExecutionPolicy Bypass -File register-s50b.ps1 [-StartAt '2026-09-11T10:10:00']
# The file is ASCII-only on purpose (PowerShell 5.1 reads BOM-less scripts in the ANSI code page).
param(
    [string]$StartAt = (Get-Date).AddMinutes(3).ToString('s')
)
$ErrorActionPreference = 'Stop'
# The repo folder name carries accented characters; resolve it by wildcard so this file stays ASCII.
$repo = (Resolve-Path (Join-Path $env:USERPROFILE 'OneDrive\Masa*\natively-cluely-ai-assistant')).Path
$launcher = Join-Path $PSScriptRoot 'launch-s50b.cmd'
if (-not (Test-Path $launcher)) { throw "launcher missing: $launcher" }
if (-not (Test-Path (Join-Path $repo 'electron\test\golden\interview60.flight.mjs'))) { throw "flight script missing under $repo" }
$action = New-ScheduledTaskAction -Execute 'cmd.exe' -Argument ('/c "' + $launcher + '"') -WorkingDirectory $repo
$trigger = New-ScheduledTaskTrigger -Once -At ([datetime]$StartAt)
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit (New-TimeSpan -Hours 4) -StartWhenAvailable
Register-ScheduledTask -TaskName 'Natively-flight-s50b' -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force | Out-Null
$t = Get-ScheduledTask -TaskName 'Natively-flight-s50b'
Write-Output ("registered Natively-flight-s50b state=" + $t.State + " start=" + $StartAt)
Write-Output ("workdir=" + $t.Actions[0].WorkingDirectory)
Write-Output ("logon=" + $t.Principal.LogonType + " user=" + $t.Principal.UserId)
