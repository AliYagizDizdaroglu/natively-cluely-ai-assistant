# register-once.ps1 (router-default Task 3). A small generic one-shot task registrar, modelled on flight-eq\register-eq.ps1's
# read-back block. It registers ONE interactive task (the user logged on) with a Once trigger, StartWhenAvailable FALSE, then READS IT BACK
# and asserts it. It never starts the task: the Task Scheduler does, at the trigger. -Plan prints what would be registered, writes nothing.
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File register-once.ps1 -Name Natively-router-probe -InMinutes 3 \
#       -Execute cmd.exe -Argument '/c ""C:\Program Files\nodejs\node.exe" "<LAB>\live-probe.mjs" > "<LAB>\live-probe.out.txt" 2>&1"' \
#       -WorkingDirectory <LAB> -LimitMinutes 10
#   (-At 'yyyy-MM-dd HH:mm' instead of -InMinutes for a fixed time; exactly one of the two)
#   powershell ... -File register-once.ps1 -Name <name> -Verify -At '...'     read back an existing task, change nothing
# Exit codes: 0 ok, 1 read-back problem, 2 refusal or usage. Names below are distinct from every parameter name (PowerShell is case-insensitive).
# Saved UTF-8 with BOM (the LAB path holds a non-ASCII character).
param(
    [string]$Name = '',
    [string]$Execute = '',
    [string]$Argument = '',
    [string]$WorkingDirectory = '',
    [string]$At = '',
    [int]$InMinutes = 0,
    [int]$LimitMinutes = 10,
    [switch]$Verify,
    [switch]$Plan
)
$inv = [System.Globalization.CultureInfo]::InvariantCulture
function Exit-Refused([string]$why) { Write-Output ("REFUSED: " + $why); exit 2 }
function Minute-Text($dt) { return ([datetime]$dt).ToString('yyyy-MM-dd HH:mm', $inv) }

if ($Name -notmatch '^[A-Za-z0-9._-]+$') { Exit-Refused "-Name must be letters, digits, . _ - (got '$Name')" }
if (($At -ne '') -eq ($InMinutes -gt 0)) { Exit-Refused 'give exactly one of -At and -InMinutes' }
$startAt = $null
if ($At -ne '') {
    $parsed = [datetime]::MinValue
    if (-not ($At -match '^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$' -and [datetime]::TryParseExact($At, 'yyyy-MM-dd HH:mm', $inv, [System.Globalization.DateTimeStyles]::None, [ref]$parsed))) { Exit-Refused "-At must be a full date-time 'yyyy-MM-dd HH:mm' (got '$At')" }
    $startAt = $parsed
} else { $startAt = (Get-Date).AddMinutes($InMinutes) }
if (-not $Verify -and $startAt -le (Get-Date)) { Exit-Refused "the trigger time $(Minute-Text $startAt) is not in the future: a Once trigger in the past never runs, silently" }
if (-not $Verify) {
    if ($Execute -eq '') { Exit-Refused '-Execute is required' }
    if ($LimitMinutes -lt 1) { Exit-Refused '-LimitMinutes must be at least 1' }
}

$ErrorActionPreference = 'Stop'
if (-not $Verify) {
    $action = if ($WorkingDirectory -ne '') { New-ScheduledTaskAction -Execute $Execute -Argument $Argument -WorkingDirectory $WorkingDirectory } else { New-ScheduledTaskAction -Execute $Execute -Argument $Argument }
    $principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited
    # no -StartWhenAvailable: a missed start never fires late
    $settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit (New-TimeSpan -Minutes $LimitMinutes) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
    if ($Plan) {
        Write-Output ("PLAN " + $Name + ": " + $Execute + " " + $Argument + "  workdir=" + $WorkingDirectory + "  limit=" + $LimitMinutes + " min  trigger=Once at " + (Minute-Text $startAt))
        Write-Output 'PLAN only: nothing was registered'; exit 0
    }
    $trigger = New-ScheduledTaskTrigger -Once -At $startAt
    Register-ScheduledTask -TaskName $Name -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force | Out-Null
}

# read back: asserted, never echoed from what was asked for
$taskObj = Get-ScheduledTask -TaskName $Name -ErrorAction SilentlyContinue
if (-not $taskObj) { Write-Output ("REGISTRATION PROBLEM: " + $Name + " is NOT REGISTERED"); Write-Output ("REGISTRATION FAILED: " + $Name); exit 1 }
$infoObj = Get-ScheduledTaskInfo -TaskName $Name
$trigCount = 0
if ($taskObj.Triggers) { $trigCount = @($taskObj.Triggers).Count }   # (@($null).Count is 1 in PowerShell)
Write-Output ("registered " + $Name + "  state=" + $taskObj.State + "  limit=" + $taskObj.Settings.ExecutionTimeLimit + "  triggers=" + $trigCount)
Write-Output ("  action=" + $taskObj.Actions[0].Execute + " " + $taskObj.Actions[0].Arguments)
Write-Output ("  workdir=" + $taskObj.Actions[0].WorkingDirectory + "  logon=" + $taskObj.Principal.LogonType + "  user=" + $taskObj.Principal.UserId)
Write-Output ("  settings: AllowStartIfOnBatteries=" + (-not $taskObj.Settings.DisallowStartIfOnBatteries) + "  StopIfGoingOnBatteries=" + $taskObj.Settings.StopIfGoingOnBatteries + "  StartWhenAvailable=" + $taskObj.Settings.StartWhenAvailable)
$nextText = 'none'
if ($infoObj.NextRunTime -and $infoObj.NextRunTime.Year -gt 1999) { $nextText = Minute-Text $infoObj.NextRunTime }
Write-Output ("  next run: " + $nextText)
$problems = @()
if ([bool]$taskObj.Settings.StartWhenAvailable) { $problems += 'StartWhenAvailable reads True: a missed start would fire late, the registration requires False' }
if ([string]$taskObj.State -ne 'Ready') { $problems += ("the state reads '" + $taskObj.State + "', not Ready") }
if ([string]$taskObj.Principal.LogonType -ne 'Interactive') { $problems += ("the logon type reads '" + $taskObj.Principal.LogonType + "', not Interactive") }
if ($trigCount -ne 1) { $problems += "the task has $trigCount triggers, one is required" }
if ($infoObj.NextRunTime -and $infoObj.NextRunTime.Year -gt 1999) {
    if ([math]::Abs((([datetime]$infoObj.NextRunTime) - $startAt).TotalSeconds) -gt 60) { $problems += "the next run reads $nextText, not the requested $(Minute-Text $startAt)" }
} else { $problems += 'the Task Scheduler reports no next run' }
if ($Execute -ne '' -and [string]$taskObj.Actions[0].Execute -ne $Execute) { $problems += ("the action executes '" + $taskObj.Actions[0].Execute + "', not '" + $Execute + "'") }
if ($Argument -ne '' -and [string]$taskObj.Actions[0].Arguments -ne $Argument) { $problems += 'the action arguments differ from the requested ones' }
if ($problems.Count -gt 0) {
    foreach ($pr in $problems) { Write-Output ("REGISTRATION PROBLEM: " + $pr) }
    Write-Output ("REGISTRATION FAILED: " + $Name + " does not read back as required")
    exit 1
}
Write-Output ("REGISTRATION OK: " + $Name + " reads Ready, StartWhenAvailable False, next run " + $nextText)
exit 0
