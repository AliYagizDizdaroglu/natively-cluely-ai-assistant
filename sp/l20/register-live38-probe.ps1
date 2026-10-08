# Registers the 3.8 Live health probe: one task, nine one-shot triggers (04:30, 10:00, 20:00 local on
# 2026-09-29, 09-30, 10-01). 04:30 keeps it clear of the 05:00 cue smoke; each probe is ~5 min.
#   powershell -NoProfile -ExecutionPolicy Bypass -File '<SP>\l20\register-live38-probe.ps1'
# ASCII only.
$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$launcher = Join-Path $here 'launch-live38-probe.cmd'
if (-not (Test-Path $launcher)) { throw "launcher missing: $launcher" }
$times = @()
foreach ($d in '2026-09-29', '2026-09-30', '2026-10-01') { foreach ($h in '04:30', '10:00', '20:00') { $times += "$($d)T$($h):00" } }
$triggers = $times | ForEach-Object { New-ScheduledTaskTrigger -Once -At ([datetime]$_) }
$action = New-ScheduledTaskAction -Execute 'cmd.exe' -Argument ('/c "' + $launcher + '"') -WorkingDirectory $here
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit (New-TimeSpan -Minutes 20) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -WakeToRun
Register-ScheduledTask -TaskName 'Natively-probe-live38' -Action $action -Trigger $triggers -Principal $principal -Settings $settings -Force | Out-Null
$t = Get-ScheduledTask -TaskName 'Natively-probe-live38'
Write-Output ("registered Natively-probe-live38 triggers=" + $t.Triggers.Count + " next=" + ($t | Get-ScheduledTaskInfo).NextRunTime + " workdir=" + $t.Actions[0].WorkingDirectory)
