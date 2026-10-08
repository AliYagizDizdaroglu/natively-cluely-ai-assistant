# Registers one of the three h40d launchers as a Windows scheduled task (r4 section 2 and 7.4). Ready, NOT run: this
# session never calls Register-ScheduledTask; the controller or the user invokes this manually. (Never start the
# Electron app from a Claude session - it reads a shadow credentials store; a live app exercise goes through a
# scheduled task instead.)
#
# SP\register-h40c.ps1 with the names changed, plus:
#   -Which flight | dry | prestart   picks the task, its launcher and its time limit, so the flight task cannot be
#       registered with the dry launcher by a slip of the keyboard:
#         flight    Natively-flight-h40d          launch-h40d.cmd            5 h  (r4 section 2: 5 h limit)
#         dry       Natively-flight-h40d-dry      launch-h40d-dry.cmd        1 h  (h40c's dry twin ran under a 1 h limit)
#         prestart  Natively-prestart-h40d        launch-h40d-prestart.cmd   1 h  (r4 section 7.3)
#       -Hours overrides the limit. The launcher is the one beside this script.
#   -StartAt is mandatory (there is no safe default for a flight's start) and must read like 2026-10-02T13:30:00, local
#       time, and lie in the future: a Once trigger in the past registers a task that never runs, silently.
#   The launcher is refused while it still holds a commit placeholder (node instruments\gen-launchers.mjs --commit HASH
#       for the flight and the dry twin, --prestart-commit HASH for the prestart), and MAIN must already carry the verbal
#       hedge and cue mode source (the merge is done), as h40c's script checked for the hedge.
#   After registering, the task's settings are read back from Get-ScheduledTask and ASSERTED, not echoed: the state must
#       read Ready, StartWhenAvailable must read False (r4 section 2: a missed start never fires late; h40b's final review
#       named True a regression), and the next run, when the scheduler reports one, must be the requested time.
#       Exit 1 and a REGISTRATION FAILED line otherwise.
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File '<VH>\register-h40d.ps1' -Which dry -StartAt '2026-10-01T18:00:00'
#   powershell -NoProfile -ExecutionPolicy Bypass -File '<VH>\register-h40d.ps1' -Which prestart -StartAt '2026-10-01T20:00:00'
#   powershell -NoProfile -ExecutionPolicy Bypass -File '<VH>\register-h40d.ps1' -Which flight -StartAt '2026-10-02T13:30:00'
#
# ASCII-only on purpose (PowerShell 5.1 reads BOM-less scripts in the ANSI code page): the accented repo path is resolved
# by wildcard, keeping the copy that has a .git (a mojibake twin of the desktop folder also matches).
param(
    [Parameter(Mandatory = $true)][ValidateSet('flight', 'dry', 'prestart')][string]$Which,
    [Parameter(Mandatory = $true)][string]$StartAt,
    [int]$Hours = 0
)

# The three functions below have no side effects: no cmdlet that touches the Task Scheduler. They are calibrated by
# instruments\ps-cal.ps1, which evaluates their text out of this file without running the script.
function Get-TaskPlan {
    param([string]$Which, [string]$Folder, [int]$Hours)
    $plans = @{
        flight   = @{ Name = 'Natively-flight-h40d';     Launcher = 'launch-h40d.cmd';          Hours = 5 }
        dry      = @{ Name = 'Natively-flight-h40d-dry'; Launcher = 'launch-h40d-dry.cmd';      Hours = 1 }
        prestart = @{ Name = 'Natively-prestart-h40d';   Launcher = 'launch-h40d-prestart.cmd'; Hours = 1 }
    }
    if (-not $plans.ContainsKey($Which)) { throw "unknown -Which '$Which'" }
    $p = $plans[$Which]
    $h = $p.Hours
    if ($Hours -gt 0) { $h = $Hours }
    [pscustomobject]@{ Name = $p.Name; Launcher = (Join-Path $Folder $p.Launcher); Hours = $h }
}

function Get-StartTime {
    param([string]$StartAt, [datetime]$Now)
    $t = [datetime]::MinValue
    $ok = [datetime]::TryParseExact($StartAt, 'yyyy-MM-ddTHH:mm:ss', [System.Globalization.CultureInfo]::InvariantCulture, [System.Globalization.DateTimeStyles]::None, [ref]$t)
    if (-not $ok) { throw "-StartAt must read like 2026-10-02T13:30:00 (local time), got '$StartAt'" }
    if ($t -le $Now) { throw "-StartAt $StartAt is not in the future: a Once trigger in the past registers a task that never runs" }
    $t
}

# r4 section 2 and 7.4: what the read-back of the registered task must show. One string per violated condition.
function Get-RegistrationProblems {
    param([string]$State, [bool]$StartWhenAvailable, $NextRun, [datetime]$Start)
    $p = @()
    if ($StartWhenAvailable) { $p += 'StartWhenAvailable reads True: a missed start would fire late, r4 section 2 requires False' }
    if ($State -ne 'Ready') { $p += "the state reads '$State', not Ready" }
    if ($NextRun -and ([datetime]$NextRun).Year -gt 1999) {
        if ([math]::Abs((([datetime]$NextRun) - $Start).TotalSeconds) -gt 120) { $p += "the next run reads $NextRun, not the requested $Start" }
    }
    $p
}

$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$plan = Get-TaskPlan -Which $Which -Folder $here -Hours $Hours
$start = Get-StartTime -StartAt $StartAt -Now (Get-Date)
# The repo folder name carries accented characters; resolve it by wildcard so this file stays ASCII. A stray mojibake copy
# of the desktop folder also matches the wildcard: keep the one with a .git (register-natively-task.ps1's own fix).
$repo = (Resolve-Path (Join-Path $env:USERPROFILE 'OneDrive\Masa*\natively-cluely-ai-assistant') | Where-Object { Test-Path (Join-Path $_.Path '.git') } | Select-Object -First 1).Path
if (-not $repo) { throw 'repo not found: no OneDrive\Masa*\natively-cluely-ai-assistant with a .git' }
if (-not (Test-Path $plan.Launcher)) { throw "launcher missing: $($plan.Launcher)" }
if (Select-String -Path $plan.Launcher -Pattern '@@' -SimpleMatch -Quiet) {
    $opt = '--commit <the registered HEAD hash>'
    if ($Which -eq 'prestart') { $opt = '--prestart-commit <MAIN HEAD at prestart time>' }
    throw "the launcher still holds a commit placeholder: node instruments\gen-launchers.mjs $opt"
}
if (-not (Test-Path (Join-Path $repo 'electron\test\golden\interview60.run.mjs'))) { throw "harness missing under $repo" }
if (-not (Test-Path (Join-Path $repo 'electron\llm\verbalHedge.ts'))) { throw "verbal hedge code not merged into $repo yet" }
if (-not (Select-String -Path (Join-Path $repo 'electron\llm\verbalStreamFilter.ts') -Pattern 'CUE_LINE_PREFIX' -SimpleMatch -Quiet)) { throw "cue mode is not merged into $repo yet: verbalStreamFilter.ts has no CUE_LINE_PREFIX" }

$action = New-ScheduledTaskAction -Execute 'cmd.exe' -Argument ('/c "' + $plan.Launcher + '"') -WorkingDirectory $repo
$trigger = New-ScheduledTaskTrigger -Once -At $start
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited
# h40c's settings: on battery, do not stop on battery, wake to run, and NOT StartWhenAvailable (a missed start never fires
# late: the latency comparison depends on the time of day, r4 section 6).
$settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit (New-TimeSpan -Hours $plan.Hours) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -WakeToRun
Register-ScheduledTask -TaskName $plan.Name -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force | Out-Null

$t = Get-ScheduledTask -TaskName $plan.Name
$i = Get-ScheduledTaskInfo -TaskName $plan.Name
Write-Output ("registered " + $plan.Name + "  state=" + $t.State + "  start=" + $start.ToString('dddd yyyy-MM-dd HH:mm:ss', [System.Globalization.CultureInfo]::InvariantCulture) + "  limit=" + $plan.Hours + "h")
Write-Output ("launcher=" + $plan.Launcher)
Write-Output ("workdir=" + $t.Actions[0].WorkingDirectory)
Write-Output ("logon=" + $t.Principal.LogonType + "  user=" + $t.Principal.UserId)
# The settings the TASK actually holds, read back (not a hard-coded echo).
Write-Output ("settings: AllowStartIfOnBatteries=" + (-not $t.Settings.DisallowStartIfOnBatteries) + `
    "  StopIfGoingOnBatteries=" + $t.Settings.StopIfGoingOnBatteries + `
    "  WakeToRun=" + $t.Settings.WakeToRun + `
    "  StartWhenAvailable=" + $t.Settings.StartWhenAvailable + `
    "  ExecutionTimeLimit=" + $t.Settings.ExecutionTimeLimit)
Write-Output ("next run: " + $i.NextRunTime)
if ($Which -eq 'flight') {
    # r4 section 6: the playback start must fall inside 12:00-15:00 local; a 13:30 task fire gave 13:36 on h40b and h40c.
    $playback = $start.AddMinutes(6)
    if ($playback.TimeOfDay -ge [timespan]'12:00:00' -and $playback.TimeOfDay -lt [timespan]'15:00:00') {
        Write-Output ("flight window: playback expected about " + $playback.ToString('HH:mm') + " local, IN WINDOW 12:00-15:00")
    } else {
        Write-Output ("WARNING flight window: playback expected about " + $playback.ToString('HH:mm') + " local, OUT OF WINDOW 12:00-15:00 (the hour cannot PASS, r4 section 6)")
    }
}
$problems = @(Get-RegistrationProblems -State ([string]$t.State) -StartWhenAvailable ([bool]$t.Settings.StartWhenAvailable) -NextRun $i.NextRunTime -Start $start)
if ($problems.Count -gt 0) {
    $problems | ForEach-Object { Write-Output ("REGISTRATION PROBLEM: " + $_) }
    Write-Output ("REGISTRATION FAILED: " + $plan.Name + " is registered but does not read back as r4 requires")
    exit 1
}
Write-Output ("REGISTRATION OK: " + $plan.Name + " reads Ready, StartWhenAvailable False, next run as requested")
