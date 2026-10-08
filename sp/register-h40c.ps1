# Registers launch-h40c.cmd as a Windows scheduled task. Ready, NOT run: this session never
# calls Register-ScheduledTask; the controller or the user invokes this manually before the
# flight (h40c global constraints: never start the Electron app from a Claude session - it reads
# a shadow credentials store; a live app exercise goes through a scheduled task instead).
#
# Shape copied from register-natively-task.ps1 (the working h40a/h40b task launcher), with h40b's
# ACTUAL settings baked in so this file needs no manual Set-ScheduledTask follow-up afterwards.
#
# Fix round 1, review finding I7: an earlier version of this file claimed h40b's task was
# corrected to ADD StartWhenAvailable. That is backwards. Read-only Get-ScheduledTask on the live
# Natively-flight-h40a and -h40b tasks shows both have StartWhenAvailable=False. h40b's own
# final review (scratchpad sdd\2026-09-25-flight-h40b\final-review.md:119-133, :225-227) names
# StartWhenAvailable=True as a REGRESSION it flagged and had corrected to False: "a closed lid at
# 17:00 causes a late start at an arbitrary time" is exactly wrong for an hour whose latency
# comparison depends on the time of day (see PREREGISTER-h40c.md's registered start window). This
# script does not set it. The four settings both flights actually shared: 5 h execution limit,
# AllowStartIfOnBatteries, DontStopIfGoingOnBatteries, WakeToRun.
#
# I7's second problem: -StartAt used to default to "2 minutes from now", so running this without
# it would arm a ~5-hour, ~500-request flight two minutes later, possibly before the
# pre-registration is even committed. -StartAt is now mandatory - there is no safe default for a
# flight's start time.
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File '<SP>\register-h40c.ps1' `
#       -TaskName 'Natively-flight-h40c' -Launcher '<SP>\launch-h40c.cmd' -Hours 5 -StartAt '2026-09-27T13:30:00'
# (M8 nit, fix round 2: -File was a bare relative filename here; both paths are the absolute SP
# path, matching how the launcher argument was already given.)
#
# ASCII-only on purpose (PowerShell 5.1 reads BOM-less scripts in the ANSI code page).
param(
    [Parameter(Mandatory = $true)][string]$TaskName,
    [Parameter(Mandatory = $true)][string]$Launcher,
    [Parameter(Mandatory = $true)][string]$StartAt,
    [int]$Hours = 5
)
$ErrorActionPreference = 'Stop'
# The repo folder name carries accented characters; resolve it by wildcard so this file stays
# ASCII. A stray mojibake copy of the desktop folder also matches the wildcard: keep the one
# with a .git (register-natively-task.ps1's own fix, 2026-09-25, after a first h40b attempt
# resolved an array and failed to register).
$repo = (Resolve-Path (Join-Path $env:USERPROFILE 'OneDrive\Masa*\natively-cluely-ai-assistant') | Where-Object { Test-Path (Join-Path $_.Path '.git') } | Select-Object -First 1).Path
if (-not $repo) { throw 'repo not found: no OneDrive\Masa*\natively-cluely-ai-assistant with a .git' }
if (-not (Test-Path $Launcher)) { throw "launcher missing: $Launcher" }
if (-not (Test-Path (Join-Path $repo 'electron\test\golden\interview60.run.mjs'))) { throw "harness missing under $repo" }
if (-not (Test-Path (Join-Path $repo 'electron\llm\verbalHedge.ts'))) { throw "verbal hedge code not merged into $repo yet" }

$action = New-ScheduledTaskAction -Execute 'cmd.exe' -Argument ('/c "' + $Launcher + '"') -WorkingDirectory $repo
$trigger = New-ScheduledTaskTrigger -Once -At ([datetime]$StartAt)
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited
# h40a/h40b's actual settings (see the header comment for I7): on battery, don't stop on
# battery, wake to run, NOT start-when-available.
$settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit (New-TimeSpan -Hours $Hours) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -WakeToRun
Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force | Out-Null

$t = Get-ScheduledTask -TaskName $TaskName
Write-Output ("registered " + $TaskName + "  state=" + $t.State + "  start=" + $StartAt + "  limit=" + $Hours + "h")
Write-Output ("workdir=" + $t.Actions[0].WorkingDirectory)
Write-Output ("logon=" + $t.Principal.LogonType + "  user=" + $t.Principal.UserId)
# M8: print the settings the TASK actually holds (read back from Get-ScheduledTask), not a
# hard-coded echo of what this script asked for - the two could differ if the task already
# existed with different settings and -Force merged rather than replaced, or if a future edit to
# this file's $settings line was not mirrored into a hand-written echo string.
Write-Output ("settings: AllowStartIfOnBatteries=" + (-not $t.Settings.DisallowStartIfOnBatteries) + `
    "  StopIfGoingOnBatteries=" + $t.Settings.StopIfGoingOnBatteries + `
    "  WakeToRun=" + $t.Settings.WakeToRun + `
    "  StartWhenAvailable=" + $t.Settings.StartWhenAvailable + `
    "  ExecutionTimeLimit=" + $t.Settings.ExecutionTimeLimit)
