# Registers one of this session's launcher scripts as a Windows scheduled task.
# Shape copied from the working Natively-flight-s50a task: cmd.exe runs an ASCII-only
# launcher, the task carries -WorkingDirectory (the launcher never cd's into the accented
# repo path itself), and the principal is the INTERACTIVE user — these runs play audio and
# drive the app's overlay, so they need the user logged on.
#
# A task is used instead of running the app directly from the Claude session because an app
# launched inside that session reads a shadow credentials store (MSIX virtualisation) and
# would answer nothing.
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File register-natively-task.ps1 `
#       -TaskName 'Natively-smoke-turn' -Launcher '<dir>\launch-smoke.cmd' [-StartAt '2026-09-10T18:05:00'] [-Hours 1]
#
# ASCII-only on purpose (PowerShell 5.1 reads BOM-less scripts in the ANSI code page).
param(
    [Parameter(Mandatory = $true)][string]$TaskName,
    [Parameter(Mandatory = $true)][string]$Launcher,
    [string]$StartAt = (Get-Date).AddMinutes(2).ToString('s'),
    [int]$Hours = 4
)
$ErrorActionPreference = 'Stop'
# The repo folder name carries accented characters; resolve it by wildcard so this file stays ASCII.
# A stray mojibake copy of the desktop folder (2026-09-25) also matches the wildcard: keep the one with a .git.
$repo = (Resolve-Path (Join-Path $env:USERPROFILE 'OneDrive\Masa*\natively-cluely-ai-assistant') | Where-Object { Test-Path (Join-Path $_.Path '.git') } | Select-Object -First 1).Path
if (-not $repo) { throw 'repo not found: no OneDrive\Masa*\natively-cluely-ai-assistant with a .git' }
if (-not (Test-Path $Launcher)) { throw "launcher missing: $Launcher" }
if (-not (Test-Path (Join-Path $repo 'electron\test\golden\interview60.run.mjs'))) { throw "harness missing under $repo" }
if (-not (Test-Path (Join-Path $repo 'electron\services\interviewerTurn.ts'))) { throw "whole-turn code not merged into $repo yet" }

$action = New-ScheduledTaskAction -Execute 'cmd.exe' -Argument ('/c "' + $Launcher + '"') -WorkingDirectory $repo
$trigger = New-ScheduledTaskTrigger -Once -At ([datetime]$StartAt)
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit (New-TimeSpan -Hours $Hours) -StartWhenAvailable
Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force | Out-Null

$t = Get-ScheduledTask -TaskName $TaskName
Write-Output ("registered " + $TaskName + "  state=" + $t.State + "  start=" + $StartAt + "  limit=" + $Hours + "h")
Write-Output ("workdir=" + $t.Actions[0].WorkingDirectory)
Write-Output ("logon=" + $t.Principal.LogonType + "  user=" + $t.Principal.UserId)
