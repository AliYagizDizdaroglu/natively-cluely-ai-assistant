# LAB\flight\register-rd.ps1 (router-default spec 10, plan Task 18 step 4). SP\flight-eq\register-eq.ps1 re-pointed to the router-default hour (label rd), with its read-back
# verify mode and the overrun ("supersede") path. Registers the flight's scheduled tasks as Ready, NOT run, and ASSERTS what the Task
# Scheduler reads back. It never starts a task. The controller (or the user) invokes it by hand: never the Electron app from a Claude
# session (it reads a shadow credentials store), a task does.
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File register-rd.ps1 -Which dry
#   powershell -NoProfile -ExecutionPolicy Bypass -File register-rd.ps1 -Which flight    -T 'yyyy-MM-dd HH:mm'
#   powershell -NoProfile -ExecutionPolicy Bypass -File register-rd.ps1 -Which precheck  -T 'yyyy-MM-dd HH:mm'
#   powershell -NoProfile -ExecutionPolicy Bypass -File register-rd.ps1 -Which armed     -T 'yyyy-MM-dd HH:mm'   (flight + precheck, step 13)
#   powershell -NoProfile -ExecutionPolicy Bypass -File register-rd.ps1 -Which verify    -T 'yyyy-MM-dd HH:mm'   (read back, change nothing)
#   powershell -NoProfile -ExecutionPolicy Bypass -File register-rd.ps1 -Which supersede [-ArmingPath <file>]      (the overrun path)
# Tasks, launchers and limits (Label rd):
#   dry        Natively-flight-rd-dry        launch-rd-dry.cmd   no trigger (the precheck starts it)   limit 1 h
#   flight     Natively-flight-rd            launch-rd.cmd       Once at T                              limit 5 h
#   precheck   Natively-flight-rd-precheck   powershell rd-precheck.ps1 -At <T - 6 min> -Label rd   Once at T - 6   limit 15 min
# All interactive (the user logged on), StartWhenAvailable FALSE (a missed start never fires late), WorkingDirectory MAIN for the flight
# and the dry twin. T is a FULL date-time 'yyyy-MM-dd HH:mm', local, in the future, and for Label rd (fix2: no fixed windows) at most now + 24 h, at least now + 15 min (not for -Verify), and T + 75 min inside ONE quota day (resets 07:00Z = 10:00 local). The launcher must hold no @@ placeholder and its NATIVELY_RD_T must equal -T exactly. -Plan validates and prints what WOULD be
# registered and calls no Task Scheduler cmdlet that writes. After registering, the task is READ BACK and asserted: state Ready,
# StartWhenAvailable False, the trigger / next run as requested (the dry twin: no trigger), the action naming the right launcher or script;
# exit 1 and `REGISTRATION FAILED` otherwise. `armed` prints BOTH next run times.
#   supersede (A5.2 I3): Disable-ScheduledTask the flight AND the precheck task, read each back as Disabled, rename the arming record to
#   ARMING-flight-rd.superseded-<HHmm>.md (never overwriting), print the old T from the record and whether its T - 6 has passed. A task that
#   is not registered is named, not an error. Exit 1 if a registered task does not read back Disabled. Re-registering later (-Force) enables again.
# -Now 'yyyy-MM-dd HH:mm' (local) is the CALIBRATION clock for the T bounds and the T - 6 test; the real registration never passes it.
# fix3 F4: every T in this hour is a +03:00 reading (guard, generator, arming, the quota maths here). The machine's UTC offset is asserted to be +03:00 and the script
# refuses otherwise (a task trigger is local time). -MachineOffset 'hh:mm:ss' is the CALIBRATION stand-in for the machine's offset; the real registration never passes it.
# -Label / -LauncherDir / -ArmingPath exist so the calibration can run the SAME code against the dummy tasks Natively-flight-rdcal*; the window
# bound applies to Label rd only. Exit codes: 0 ok, 1 read-back problem, 2 refusal or usage.
# UTF-8 with BOM (the folder name holds a non-ASCII character); the repo folder is found by wildcard keeping the copy that has a .git.
# PowerShell names are case-insensitive: every name below is distinct from every parameter name.
param(
    [string]$Which = '',
    [string]$T = '',
    [string]$Label = 'rd',
    [string]$LauncherDir = '',
    [string]$ArmingPath = '',
    [string]$DryLog = '',
    [switch]$Plan,
    [string]$Now = '',
    [string]$MachineOffset = ''
)
$inv = [System.Globalization.CultureInfo]::InvariantCulture
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$clockRd = Get-Date
if ($Now -ne '') {
    $nowParsed = [datetime]::MinValue
    if (-not [datetime]::TryParseExact($Now, 'yyyy-MM-dd HH:mm', $inv, [System.Globalization.DateTimeStyles]::None, [ref]$nowParsed)) { Write-Output "REFUSED: -Now must be 'yyyy-MM-dd HH:mm' (got '$Now')"; exit 2 }
    $clockRd = $nowParsed
}
# -ArmingPath / -DryLog given explicitly are passed on to the precheck task's command line (calibration only: the real registration passes neither,
# so the real precheck reads E\ARMING-flight-rd.md and MAIN's flight-rd-dry log)
$armingGiven = $PSBoundParameters.ContainsKey('ArmingPath')
$dryLogGiven = $PSBoundParameters.ContainsKey('DryLog')

function Exit-Refused([string]$why) {
    Write-Output ("REFUSED: " + $why)
    exit 2
}

$offsetRd = [System.TimeZoneInfo]::Local.GetUtcOffset((Get-Date))
if ($MachineOffset -ne '') {
    $offsetParsed = [timespan]::Zero
    if (-not [timespan]::TryParse($MachineOffset, $inv, [ref]$offsetParsed)) { Exit-Refused "-MachineOffset must be a time span like 03:00:00 (got '$MachineOffset')" }
    $offsetRd = $offsetParsed
}
if ($offsetRd -ne [timespan]::FromHours(3)) { Exit-Refused ("this machine's UTC offset is " + $offsetRd.ToString() + ", not +03:00: every T in this hour is a +03:00 reading and a task trigger is local time, so the registration would fire at the wrong instant") }

# ---- pure functions (no Task Scheduler cmdlet): what a task must read back as ----------------------------------------------------
function Get-TaskPlan {
    param([string]$Kind, [string]$LabelText, [string]$Folder)
    $plans = @{
        dry      = @{ Name = ('Natively-flight-' + $LabelText + '-dry');       Launcher = ('launch-' + $LabelText + '-dry.cmd'); Hours = 1;  Trigger = $false }
        flight   = @{ Name = ('Natively-flight-' + $LabelText);                Launcher = ('launch-' + $LabelText + '.cmd');     Hours = 5;  Trigger = $true }
        precheck = @{ Name = ('Natively-flight-' + $LabelText + '-precheck');  Launcher = '';                                    Hours = 0;  Trigger = $true }
    }
    if (-not $plans.ContainsKey($Kind)) { throw "unknown kind '$Kind'" }
    $p = $plans[$Kind]
    $launcherPath = ''
    if ($p.Launcher -ne '') { $launcherPath = Join-Path $Folder $p.Launcher }
    [pscustomobject]@{ Name = $p.Name; Launcher = $launcherPath; Hours = $p.Hours; HasTrigger = $p.Trigger }
}

function Get-TimeOrNull([string]$Text) {
    $parsed = [datetime]::MinValue
    if ($Text -match '^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$' -and [datetime]::TryParseExact($Text, 'yyyy-MM-dd HH:mm', $inv, [System.Globalization.DateTimeStyles]::None, [ref]$parsed)) { return $parsed }
    return $null
}

# what the read-back of a registered task must show; one string per violated condition (h40d's function, plus the trigger count)
function Get-RegistrationProblems {
    param([string]$State, [bool]$StartWhenAvailable, $NextRun, $Start, [int]$TriggerCount, [bool]$WantTrigger)
    $problems = @()
    if ($StartWhenAvailable) { $problems += 'StartWhenAvailable reads True: a missed start would fire late, the registration requires False' }
    if ($State -ne 'Ready') { $problems += "the state reads '$State', not Ready" }
    if ($WantTrigger) {
        if ($TriggerCount -ne 1) { $problems += "the task has $TriggerCount triggers, one is required" }
        if ($NextRun -and ([datetime]$NextRun).Year -gt 1999) {
            if ([math]::Abs((([datetime]$NextRun) - ([datetime]$Start)).TotalSeconds) -gt 60) { $problems += "the next run reads $NextRun, not the requested $Start" }
        } else { $problems += 'the Task Scheduler reports no next run' }
    } else {
        if ($TriggerCount -ne 0) { $problems += "the task has $TriggerCount triggers, none is required (the precheck starts it)" }
    }
    return $problems
}

# the launcher's own lines: no placeholder, T equal to -T (the three must agree: launcher, guard g4, tasks)
function Get-LauncherProblems {
    param([string]$LauncherPath, $TimeWanted, [bool]$CheckT)
    $problems = @()
    if (-not (Test-Path -LiteralPath $LauncherPath)) { return @("launcher missing: $LauncherPath") }
    $text = [System.IO.File]::ReadAllText($LauncherPath, [System.Text.Encoding]::GetEncoding(28591))
    if ($text.Contains('@@')) { $problems += 'the launcher still holds a placeholder: node gen-launchers-rd.mjs --commit <registered HEAD> --t <T> --deadline-min <N> --ctx-sha12 <sha12>' }
    if ($CheckT) {
        $m = [regex]::Match($text, '(?m)^set NATIVELY_RD_T=(.*?)\r?$')
        if (-not $m.Success) { $problems += 'the launcher has no NATIVELY_RD_T line' }
        elseif ($m.Groups[1].Value -ne (Minute-Text $TimeWanted)) { $problems += ("the launcher's NATIVELY_RD_T is '" + $m.Groups[1].Value + "', not -T '" + (Minute-Text $TimeWanted) + "'") }
    }
    return $problems
}
function Minute-Text($dt) { return ([datetime]$dt).ToString('yyyy-MM-dd HH:mm', $inv) }

# ---- arguments ---------------------------------------------------------------------------------------------------------------------
if (@('dry', 'flight', 'precheck', 'armed', 'verify', 'supersede') -notcontains $Which) { Exit-Refused "-Which must be dry, flight, precheck, armed, verify or supersede (got '$Which')" }
if ($Label -notmatch '^[A-Za-z0-9]+$') { Exit-Refused "-Label must be letters and digits (got '$Label')" }
if ($LauncherDir -eq '') { $LauncherDir = $here }
if ($ArmingPath -eq '') { $ArmingPath = Join-Path $here 'ARMING-flight-rd.md' }
$flightName = 'Natively-flight-' + $Label
$precheckName = $flightName + '-precheck'

# ---- supersede: the overrun path (A5.2 I3); needs no -T and never registers --------------------------------------------------------
if ($Which -eq 'supersede') {
    $ErrorActionPreference = 'Stop'
    $bad = 0
    foreach ($taskName in @($flightName, $precheckName)) {
        $existing = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
        if (-not $existing) { Write-Output ("SUPERSEDE " + $taskName + " is NOT REGISTERED, nothing to disable"); continue }
        if ($Plan) { Write-Output ("SUPERSEDE (plan) would disable " + $taskName + " (now " + $existing.State + ")"); continue }
        $null = Disable-ScheduledTask -TaskName $taskName
        $after = [string](Get-ScheduledTask -TaskName $taskName).State
        Write-Output ("SUPERSEDE " + $taskName + " disabled, read back: " + $after)
        if ($after -ne 'Disabled') { $bad++ }
    }
    if (Test-Path -LiteralPath $ArmingPath) {
        $oldT = $null
        foreach ($rl in [System.IO.File]::ReadAllLines($ArmingPath)) { if ($rl -match '^T: (\d{4}-\d{2}-\d{2} \d{2}:\d{2})$') { $oldT = $Matches[1] } }
        if ($oldT) {
            $oldDt = Get-TimeOrNull $oldT
            $passed = (Get-Date) -ge $oldDt.AddMinutes(-6)
            Write-Output ("SUPERSEDE old T " + $oldT + "; its precheck time (T - 6) has " + $(if ($passed) { 'ALREADY PASSED: no flight at that T' } else { 'not passed yet' }) + "; the superseded T goes into the new record as a Superseded: line")
        } else { Write-Output 'SUPERSEDE the record holds no T: line' }
        $dirPart = Split-Path -Parent $ArmingPath
        $baseName = [System.IO.Path]::GetFileNameWithoutExtension($ArmingPath)
        $extPart = [System.IO.Path]::GetExtension($ArmingPath)
        $newPath = Join-Path $dirPart ($baseName + '.superseded-' + (Get-Date).ToString('HHmm', $inv) + $extPart)
        $n = 2
        while (Test-Path -LiteralPath $newPath) { $newPath = Join-Path $dirPart ($baseName + '.superseded-' + (Get-Date).ToString('HHmm', $inv) + '-' + $n + $extPart); $n++ }
        if ($Plan) { Write-Output ("SUPERSEDE (plan) would rename the record to " + (Split-Path -Leaf $newPath)) }
        else { Rename-Item -LiteralPath $ArmingPath -NewName (Split-Path -Leaf $newPath); Write-Output ("SUPERSEDE record renamed to " + (Split-Path -Leaf $newPath) + "; present under the old name now: " + (Test-Path -LiteralPath $ArmingPath)) }
    } else { Write-Output "SUPERSEDE no arming record at $ArmingPath, nothing to rename" }
    if ($bad -gt 0) { Write-Output 'SUPERSEDE FAILED: a task does not read back Disabled'; exit 1 }
    Write-Output 'SUPERSEDE OK: regenerate the launchers with a new T inside a guard window (the latest is 2026-10-08 03:00, else no flight), then register again and write a new arming record'
    exit 0
}

# ---- registration, verify -----------------------------------------------------------------------------------------------------------
$ErrorActionPreference = 'Stop'
$wantKinds = @($Which)
if ($Which -eq 'armed') { $wantKinds = @('flight', 'precheck') }
if ($Which -eq 'verify') { $wantKinds = @('dry', 'flight', 'precheck') }
$needsT = ($Which -ne 'dry')
$timeWanted = $null
if ($needsT -or $T -ne '') {
    $timeWanted = Get-TimeOrNull $T
    if (-not $timeWanted) { Exit-Refused "-T must be a full date-time 'yyyy-MM-dd HH:mm' (got '$T'): a bare time would resolve to today" }
    if ($Label -eq 'rd') {
        # fix2: T is read as +03:00 (the hour's convention) -> UTC; the quota day starts 07:00Z. The run ends T + 75 min and must stay in one quota day.
        $tUtcRd = [datetime]::SpecifyKind($timeWanted.AddHours(-3), [System.DateTimeKind]::Utc)
        $qEpochRd = [datetime]::SpecifyKind([datetime]'2026-01-01', [System.DateTimeKind]::Utc)
        $qDayStartRd = [math]::Floor(($tUtcRd.AddHours(-7) - $qEpochRd).TotalDays)
        $qDayEndRd = [math]::Floor(($tUtcRd.AddMinutes(75).AddHours(-7) - $qEpochRd).TotalDays)
        if ($qDayStartRd -ne $qDayEndRd) { Exit-Refused "-T $T + 75 min (the run's expected end) crosses the quota day reset at 10:00 local (07:00Z): the run must stay inside one quota day" }
        if ($Which -ne 'verify') {
            $nowRd = $clockRd
            if ($timeWanted -lt $nowRd.AddMinutes(15)) { Exit-Refused "-T $T is less than 15 min after now (T must be at least now + 15 min; a T in the past is refused)" }
            if ($timeWanted -gt $nowRd.AddHours(24)) { Exit-Refused "-T $T is more than 24 h after now" }
        }
    }
    if ($Which -ne 'verify' -and $timeWanted.AddMinutes(-6) -le $clockRd) { Exit-Refused "-T $T minus 6 min is not in the future: a Once trigger in the past registers a task that never runs, silently" }
}
$repo = (Resolve-Path (Join-Path $env:USERPROFILE 'OneDrive\Masa*\natively-cluely-ai-assistant') | Where-Object { Test-Path (Join-Path $_.Path '.git') } | Select-Object -First 1).Path
if (-not $repo) { Exit-Refused 'repo not found: no OneDrive\Masa*\natively-cluely-ai-assistant with a .git' }
if (-not (Test-Path (Join-Path $repo 'electron\test\golden\interview60.run.mjs'))) { Exit-Refused "harness missing under $repo" }
# the router build must be in MAIN for the REAL label only: the calibration (rdcal) runs before the build lands, on dummy task names
if ($Label -eq 'rd' -and -not (Test-Path (Join-Path $repo 'electron\services\routerArbiter.ts'))) { Exit-Refused "the router build is not in $repo yet (electron\services\routerArbiter.ts is missing)" }
if ($Which -ne 'verify') {
    foreach ($kind in $wantKinds) {
        $pl = Get-TaskPlan -Kind $kind -LabelText $Label -Folder $LauncherDir
        if ($pl.Launcher -ne '') {
            $lp = @(Get-LauncherProblems -LauncherPath $pl.Launcher -TimeWanted $timeWanted -CheckT ($kind -eq 'flight' -or $T -ne ''))
            if ($lp.Count -gt 0) { Exit-Refused ($pl.Launcher + ': ' + ($lp -join '; ')) }
        } elseif (-not (Test-Path -LiteralPath (Join-Path $here 'rd-precheck.ps1'))) { Exit-Refused 'rd-precheck.ps1 missing beside this script' }
    }
}

$failures = 0
$nextReport = @()
foreach ($kind in $wantKinds) {
    $pl = Get-TaskPlan -Kind $kind -LabelText $Label -Folder $LauncherDir
    $startAt = $null
    if ($kind -eq 'flight') { $startAt = $timeWanted }
    if ($kind -eq 'precheck') { $startAt = $timeWanted.AddMinutes(-6) }

    if ($Which -ne 'verify') {
        if ($kind -eq 'precheck') {
            $argText = '-NoProfile -ExecutionPolicy Bypass -File "' + (Join-Path $here 'rd-precheck.ps1') + '" -At "' + (Minute-Text $startAt) + '" -Label ' + $Label
            if ($armingGiven) { $argText += ' -ArmingPath "' + $ArmingPath + '"' }
            if ($dryLogGiven) { $argText += ' -DryLog "' + $DryLog + '"' }
            $action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $argText -WorkingDirectory $here
        } else {
            $action = New-ScheduledTaskAction -Execute 'cmd.exe' -Argument ('/c "' + $pl.Launcher + '"') -WorkingDirectory $repo
        }
        $principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited
        $hours = $pl.Hours
        $span = New-TimeSpan -Hours $hours
        if ($kind -eq 'precheck') { $span = New-TimeSpan -Minutes 15 }
        # no -StartWhenAvailable: a missed start never fires late (the night's time of day is part of the registration)
        $settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit $span -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -WakeToRun
        if ($Plan) {
            Write-Output ("PLAN " + $pl.Name + ": " + $action.Execute + " " + $action.Arguments + "  workdir=" + $action.WorkingDirectory + "  limit=" + $span + "  trigger=" + $(if ($pl.HasTrigger) { 'Once at ' + (Minute-Text $startAt) } else { 'none' }))
            continue
        }
        if ($pl.HasTrigger) {
            $trigger = New-ScheduledTaskTrigger -Once -At $startAt
            Register-ScheduledTask -TaskName $pl.Name -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force | Out-Null
        } else {
            Register-ScheduledTask -TaskName $pl.Name -Action $action -Principal $principal -Settings $settings -Force | Out-Null
        }
    }

    # read back: asserted, never echoed from what was asked for
    $taskObj = Get-ScheduledTask -TaskName $pl.Name -ErrorAction SilentlyContinue
    if (-not $taskObj) { Write-Output ("REGISTRATION PROBLEM: " + $pl.Name + " is NOT REGISTERED"); $failures++; continue }
    $infoObj = Get-ScheduledTaskInfo -TaskName $pl.Name
    # (@($null).Count is 1 in PowerShell: a task with no trigger has Triggers = $null, so count only a real collection)
    $trigCount = 0
    if ($taskObj.Triggers) { $trigCount = @($taskObj.Triggers).Count }
    Write-Output ("registered " + $pl.Name + "  state=" + $taskObj.State + "  limit=" + $taskObj.Settings.ExecutionTimeLimit + "  triggers=" + $trigCount)
    Write-Output ("  action=" + $taskObj.Actions[0].Execute + " " + $taskObj.Actions[0].Arguments)
    Write-Output ("  workdir=" + $taskObj.Actions[0].WorkingDirectory + "  logon=" + $taskObj.Principal.LogonType + "  user=" + $taskObj.Principal.UserId)
    Write-Output ("  settings: AllowStartIfOnBatteries=" + (-not $taskObj.Settings.DisallowStartIfOnBatteries) + "  StopIfGoingOnBatteries=" + $taskObj.Settings.StopIfGoingOnBatteries + "  WakeToRun=" + $taskObj.Settings.WakeToRun + "  StartWhenAvailable=" + $taskObj.Settings.StartWhenAvailable)
    $nextText = 'none'
    if ($infoObj.NextRunTime -and $infoObj.NextRunTime.Year -gt 1999) { $nextText = Minute-Text $infoObj.NextRunTime }
    Write-Output ("  next run: " + $nextText)
    $problems = @(Get-RegistrationProblems -State ([string]$taskObj.State) -StartWhenAvailable ([bool]$taskObj.Settings.StartWhenAvailable) -NextRun $infoObj.NextRunTime -Start $startAt -TriggerCount $trigCount -WantTrigger $pl.HasTrigger)
    # the action must name the right launcher or script
    $actionArgs = [string]$taskObj.Actions[0].Arguments
    if ($kind -eq 'precheck') {
        if (-not $actionArgs.Contains('rd-precheck.ps1') -or -not $actionArgs.Contains('-At "' + (Minute-Text $startAt) + '"') -or -not $actionArgs.Contains('-Label ' + $Label)) { $problems += 'the action does not run rd-precheck.ps1 with -At T - 6 and the label' }
    } elseif (-not $actionArgs.Contains($pl.Launcher)) { $problems += "the action does not name the launcher $($pl.Launcher)" }
    if ($kind -ne 'precheck' -and $taskObj.Actions[0].WorkingDirectory -ne $repo) { $problems += "the working directory reads '$($taskObj.Actions[0].WorkingDirectory)', not the repo $repo" }
    if ($problems.Count -gt 0) {
        foreach ($pr in $problems) { Write-Output ("REGISTRATION PROBLEM: " + $pr) }
        Write-Output ("REGISTRATION FAILED: " + $pl.Name + " does not read back as required")
        $failures++
    } else {
        Write-Output ("REGISTRATION OK: " + $pl.Name + " reads Ready, StartWhenAvailable False" + $(if ($pl.HasTrigger) { ', next run as requested' } else { ', no trigger' }))
    }
    if ($pl.HasTrigger) { $nextReport += ($kind + '=' + $nextText) }
}
if ($Plan) { Write-Output 'PLAN only: nothing was registered'; exit 0 }
if ($nextReport.Count -gt 0) { Write-Output ("NEXT RUNS " + ($nextReport -join '  ')) }
if ($failures -gt 0) { exit 1 }
exit 0
