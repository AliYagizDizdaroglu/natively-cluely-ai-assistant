# Registers launch-smoke-cues.cmd as a Windows scheduled task whose working directory is the WHOLE-TURN
# WORKTREE (register-natively-task.ps1 targets MAIN; this smoke must run the worktree build).
#   powershell -NoProfile -ExecutionPolicy Bypass -File '<SP>\register-cue-smoke.ps1' -StartAt '2026-09-29T05:00:00' [-Hours 5]
# ASCII only (PowerShell 5.1 reads BOM-less scripts in the ANSI code page); the accented repo path is
# resolved by wildcard, keeping the copy that has a .git (a mojibake twin of the desktop folder exists).
param(
    [Parameter(Mandatory = $true)][string]$StartAt,
    [string]$TaskName = 'Natively-smoke-cues',
    [int]$Hours = 5
)
$ErrorActionPreference = 'Stop'
$sp = Split-Path -Parent $MyInvocation.MyCommand.Path
$launcher = Join-Path $sp 'launch-smoke-cues.cmd'
$repo = (Resolve-Path (Join-Path $env:USERPROFILE 'OneDrive\Masa*\natively-cluely-ai-assistant') | Where-Object { Test-Path (Join-Path $_.Path '.git') } | Select-Object -First 1).Path
if (-not $repo) { throw 'repo not found' }
$wt = Join-Path $repo '.claude\worktrees\whole-turn'
if (-not (Test-Path $launcher)) { throw "launcher missing: $launcher" }
if (-not (Test-Path (Join-Path $wt 'electron\test\golden\interview60.run.mjs'))) { throw "harness missing under $wt" }
if (-not (Test-Path (Join-Path $wt 'electron\llm\verbalStreamFilter.ts'))) { throw "cue mode source missing under $wt" }
if (-not (Select-String -Path (Join-Path $wt 'dist-electron\electron\llm\verbalStreamFilter.js') -Pattern '__CUES__' -Quiet)) { throw 'worktree dist-electron does not carry cue mode' }
if (-not (Select-String -Path (Join-Path $wt 'dist-electron\electron\llm\verbalStreamFilter.js') -Pattern 'function trimCues' -SimpleMatch -Quiet)) { throw 'worktree dist-electron carries cue mode v1 without the trimCues cap: rebuild' }
if (-not (Select-String -Path (Join-Path $wt 'dist-electron\electron\llm\verbalStreamFilter.js') -Pattern 'CUE_LINE_PREFIX' -SimpleMatch -Quiet)) { throw 'worktree dist-electron lacks the early close: rebuild' }
if (-not (Select-String -Path (Join-Path $wt 'dist-electron\electron\llm\verbalStreamFilter.js') -Pattern 'offers block before the spoken answer' -SimpleMatch -Quiet)) { throw 'worktree dist-electron lacks the offers fix: rebuild' }

$action = New-ScheduledTaskAction -Execute 'cmd.exe' -Argument ('/c "' + $launcher + '"') -WorkingDirectory $wt
$trigger = New-ScheduledTaskTrigger -Once -At ([datetime]$StartAt)
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit (New-TimeSpan -Hours $Hours) -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -WakeToRun
Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force | Out-Null
$t = Get-ScheduledTask -TaskName $TaskName
Write-Output ("registered " + $TaskName + "  state=" + $t.State + "  start=" + $StartAt + "  limit=" + $Hours + "h")
Write-Output ("workdir=" + $t.Actions[0].WorkingDirectory)
Write-Output ("logon=" + $t.Principal.LogonType + "  user=" + $t.Principal.UserId + "  wake=" + $t.Settings.WakeToRun)
