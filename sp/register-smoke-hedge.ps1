# Registers launch-smoke-hedge.cmd as a Windows scheduled task (task Natively-smoke-hedge).
# NOT run by this session: this script never calls Register-ScheduledTask itself; the
# controller or the user invokes it manually (h40c global constraints: never start the
# Electron app from a Claude session - it reads a shadow credentials store; a live app
# exercise goes through a scheduled task instead).
#
# Fix round 1 (task-7-review.md I3/M6): the first version of this file copied
# register-natively-task.ps1's shape, which carries -StartWhenAvailable and a 2-minute
# -StartAt default. Both are wrong here, for the same reason register-h40c.ps1 (the flight's
# OWN registration script, corrected in ITS OWN fix round 1) does not carry them:
#   - StartWhenAvailable=True means a missed start (lid closed, user away) runs the smoke at
#     an arbitrary LATER time, possibly while the user is using the app - smoke-turn's first
#     action is app:stop, which kills this checkout's electron mid-use, then plays clips out
#     loud and spends quota unannounced. h40a/h40b's own registered tasks both show
#     StartWhenAvailable=False (read-only Get-ScheduledTask).
#   - A 2-minute default -StartAt would arm an unattended run that plays audio and drives the
#     app's overlay before anyone confirmed the machine is free to do that. -StartAt is
#     mandatory - there is no safe default for when this should run.
# I3 also asked for register-h40c.ps1's read-back-and-print pattern (M8 there) instead of
# echoing back the requested parameters, which can silently drift from what the task actually
# holds; and -Hours defaults to 1 to match the brief's own registration example (the smoke is
# minutes, not the flight's 5 hours).
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File register-smoke-hedge.ps1 `
#       -TaskName 'Natively-smoke-hedge' -Launcher '<dir>\launch-smoke-hedge.cmd' -StartAt '2026-09-26T18:05:00' [-Hours 1]
#
# ASCII-only on purpose (PowerShell 5.1 reads BOM-less scripts in the ANSI code page).
param(
    [Parameter(Mandatory = $true)][string]$TaskName,
    [Parameter(Mandatory = $true)][string]$Launcher,
    [Parameter(Mandatory = $true)][string]$StartAt,
    [int]$Hours = 1
)
$ErrorActionPreference = 'Stop'
# The repo folder name carries accented characters; resolve it by wildcard so this file stays ASCII.
# A stray mojibake copy of the desktop folder (2026-09-25) also matches the wildcard: keep the one with a .git.
$repo = (Resolve-Path (Join-Path $env:USERPROFILE 'OneDrive\Masa*\natively-cluely-ai-assistant') | Where-Object { Test-Path (Join-Path $_.Path '.git') } | Select-Object -First 1).Path
if (-not $repo) { throw 'repo not found: no OneDrive\Masa*\natively-cluely-ai-assistant with a .git' }
if (-not (Test-Path $Launcher)) { throw "launcher missing: $Launcher" }
if (-not (Test-Path (Join-Path $repo 'electron\test\golden\interview60.run.mjs'))) { throw "harness missing under $repo" }
if (-not (Test-Path (Join-Path $repo 'electron\llm\verbalHedge.ts'))) { throw "verbal-hedge code not merged into $repo yet" }
# M6: the startup-validation guard, not just the flag module - a checkout with the hedge but
# without the startup refusal (h40c re-review N1) would spend the whole refuse segment's
# quota and app-start time before anyone learned segment 4 cannot possibly pass.
# NEW-M7 (task-7-rereview.md): test main.ts alone, not "either file". verbalHedge.ts defines
# describeVerbalHedgeAtStartup unconditionally - it is present there whether or not anything
# ever calls it. The old -or check therefore passed even in a checkout where main.ts's call
# site was missing, which is exactly the checkout segment 4 cannot pass in. Only main.ts
# actually calling the function proves the startup refusal is wired up.
$mainSrc = Get-Content (Join-Path $repo 'electron\main.ts') -Raw
if ($mainSrc -notmatch 'describeVerbalHedgeAtStartup') {
    throw 'describeVerbalHedgeAtStartup not called from electron\main.ts - startup validation not merged into this checkout yet'
}

$action = New-ScheduledTaskAction -Execute 'cmd.exe' -Argument ('/c "' + $Launcher + '"') -WorkingDirectory $repo
$trigger = New-ScheduledTaskTrigger -Once -At ([datetime]$StartAt)
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited
# h40a/h40b's actual settings (see the header comment for I3): on battery, don't stop on
# battery, wake to run, NOT start-when-available.
$settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit (New-TimeSpan -Hours $Hours) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -WakeToRun
Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force | Out-Null

$t = Get-ScheduledTask -TaskName $TaskName
Write-Output ("registered " + $TaskName + "  state=" + $t.State + "  start=" + $StartAt + "  limit=" + $Hours + "h")
Write-Output ("workdir=" + $t.Actions[0].WorkingDirectory)
Write-Output ("logon=" + $t.Principal.LogonType + "  user=" + $t.Principal.UserId)
# I3: print the settings the TASK actually holds (read back from Get-ScheduledTask), not a
# hard-coded echo of what this script asked for - the two could differ if the task already
# existed with different settings and -Force merged rather than replaced.
Write-Output ("settings: AllowStartIfOnBatteries=" + (-not $t.Settings.DisallowStartIfOnBatteries) + `
    "  StopIfGoingOnBatteries=" + $t.Settings.StopIfGoingOnBatteries + `
    "  WakeToRun=" + $t.Settings.WakeToRun + `
    "  StartWhenAvailable=" + $t.Settings.StartWhenAvailable + `
    "  ExecutionTimeLimit=" + $t.Settings.ExecutionTimeLimit)
