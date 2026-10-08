# register-b1.ps1 (bundle-1 smoke / flight). SP\router-default\flight\register-rd.ps1 re-pointed to the bundle-1 tasks, with its read-back and its refusals; the supersede path, the calibration
# switches and the rd-only quota/window bounds are dropped. Registers the scheduled tasks as Ready, NOT run, and ASSERTS what the Task Scheduler reads back. It never starts a task.
# The user's own interactive logon (LogonType Interactive, RunLevel Limited) is the principal for every task: the app appears on the desktop the user is looking at.
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File register-b1.ps1 -Kind smoke  -Which all -T 'yyyy-MM-dd HH:mm'    (dry + main + precheck)
#   powershell -NoProfile -ExecutionPolicy Bypass -File register-b1.ps1 -Kind smoke  -Which dry -T 'yyyy-MM-dd HH:mm'    (the dry twin only: no trigger; T is its argument)
#   powershell -NoProfile -ExecutionPolicy Bypass -File register-b1.ps1 -Kind flight -Which all -T 'yyyy-MM-dd HH:mm'    (THE LATER FLIGHT, one line)
#   powershell -NoProfile -ExecutionPolicy Bypass -File register-b1.ps1 -Kind smoke  -Which verify -T 'yyyy-MM-dd HH:mm' (read back, change nothing)
#   -Plan prints what would be registered and writes nothing.
# Tasks (Kind smoke / flight):
#   dry        Natively-smoke-b1-dry        Natively-flight-b1-dry        no trigger (the precheck starts it)     limit 1 h
#   main       Natively-smoke-b1            Natively-flight-b1            Once at T                               limit 2 h / 5 h
#   precheck   Natively-smoke-b1-precheck   Natively-flight-b1-precheck   Once at T - 6 (b1-precheck.ps1)         limit 15 min
# Every task: StartWhenAvailable FALSE (a missed start never fires late), WakeToRun, WorkingDirectory MAIN (the precheck: this folder). T is a FULL date-time 'yyyy-MM-dd HH:mm', local, +03:00 (the machine
# offset is asserted), T - 6 min in the future (not for dry or verify), at most now + 48 h, and T + 75 min inside ONE quota day (resets 07:00Z = 10:00 local). The launcher gets T as its first argument:
#   cmd /c ""<launcher>" "<T>""
# The launcher's NATIVELY_FLIGHT_COMMIT must equal MAIN's HEAD now, else the registration is refused (regenerate with gen-launchers-b1.mjs --commit <HEAD>).
# Exit codes: 0 ok, 1 read-back problem, 2 refusal or usage. UTF-8 with BOM (the folder name holds a non-ASCII character); the repo is found by wildcard keeping the copy that has a .git.
# PowerShell names are case-insensitive: every name below is distinct from every parameter name.
param(
    [string]$Which = '',
    [string]$Kind = '',
    [string]$T = '',
    [switch]$Plan
)
$inv = [System.Globalization.CultureInfo]::InvariantCulture
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
function Exit-Refused([string]$why) { Write-Output ("REFUSED: " + $why); exit 2 }
function Minute-Text($dt) { return ([datetime]$dt).ToString('yyyy-MM-dd HH:mm', $inv) }
function Get-TimeOrNull([string]$Text) {
    $parsed = [datetime]::MinValue
    if ($Text -match '^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$' -and [datetime]::TryParseExact($Text, 'yyyy-MM-dd HH:mm', $inv, [System.Globalization.DateTimeStyles]::None, [ref]$parsed)) { return $parsed }
    return $null
}

if (@('smoke', 'flight') -notcontains $Kind) { Exit-Refused "-Kind must be smoke or flight (got '$Kind')" }
if (@('all', 'dry', 'main', 'precheck', 'verify') -notcontains $Which) { Exit-Refused "-Which must be all, dry, main, precheck or verify (got '$Which')" }
$offset = [System.TimeZoneInfo]::Local.GetUtcOffset((Get-Date))
if ($offset -ne [timespan]::FromHours(3)) { Exit-Refused ("this machine's UTC offset is " + $offset.ToString() + ", not +03:00: every T is a +03:00 reading and a task trigger is local time") }
$timeWanted = Get-TimeOrNull $T
if (-not $timeWanted) { Exit-Refused "-T must be a full date-time 'yyyy-MM-dd HH:mm' (got '$T'): a bare time would resolve to today" }
$clock = Get-Date
if (@('all', 'main', 'precheck') -contains $Which) {
    if ($timeWanted.AddMinutes(-6) -le $clock) { Exit-Refused "-T $T minus 6 min is not in the future: a Once trigger in the past registers a task that never runs, silently" }
    if ($timeWanted -gt $clock.AddHours(48)) { Exit-Refused "-T $T is more than 48 h after now" }
}
$tUtc = [datetime]::SpecifyKind($timeWanted.AddHours(-3), [System.DateTimeKind]::Utc)
$qEpoch = [datetime]::SpecifyKind([datetime]'2026-01-01', [System.DateTimeKind]::Utc)
if ([math]::Floor(($tUtc.AddHours(-7) - $qEpoch).TotalDays) -ne [math]::Floor(($tUtc.AddMinutes(75).AddHours(-7) - $qEpoch).TotalDays)) { Exit-Refused "-T $T + 75 min crosses the quota day reset at 10:00 local (07:00Z): the run must stay inside one quota day" }

$repo = (Resolve-Path (Join-Path $env:USERPROFILE 'OneDrive\Masa*\natively-cluely-ai-assistant') | Where-Object { Test-Path (Join-Path $_.Path '.git') } | Select-Object -First 1).Path
if (-not $repo) { Exit-Refused 'repo not found: no OneDrive\Masa*\natively-cluely-ai-assistant with a .git' }
if (-not (Test-Path (Join-Path $repo 'electron\test\golden\interview60.run.mjs'))) { Exit-Refused "harness missing under $repo" }
$lab = Split-Path -Parent (Split-Path -Parent $here)   # SP
$launcherDir = $here
if ($Kind -eq 'flight') { $launcherDir = Join-Path (Split-Path -Parent $here) 'flight' }
$base = 'Natively-' + $Kind + '-b1'
$plans = @{
    dry      = @{ Name = ($base + '-dry');      Launcher = (Join-Path $launcherDir ('launch-b1-' + $Kind + '-dry.cmd')); Hours = 1; Trigger = $false }
    main     = @{ Name = $base;                 Launcher = (Join-Path $launcherDir ('launch-b1-' + $Kind + '.cmd'));     Hours = $(if ($Kind -eq 'flight') { 5 } else { 2 }); Trigger = $true }
    precheck = @{ Name = ($base + '-precheck'); Launcher = '';                                                           Hours = 0; Trigger = $true }
}
$kinds = @($Which)
if ($Which -eq 'all' -or $Which -eq 'verify') { $kinds = @('dry', 'main', 'precheck') }

# the launcher's own lines: no placeholder, the pinned commit equals MAIN's HEAD, ASCII with CRLF
if ($Which -ne 'verify') {
    $head = (& git -C $repo rev-parse HEAD).Trim()
    foreach ($k in $kinds) {
        $lp = $plans[$k].Launcher
        if ($lp -eq '') { if (-not (Test-Path -LiteralPath (Join-Path $here 'b1-precheck.ps1'))) { Exit-Refused 'b1-precheck.ps1 missing beside this script' }; continue }
        if (-not (Test-Path -LiteralPath $lp)) { Exit-Refused "launcher missing: $lp" }
        $bytes = [System.IO.File]::ReadAllBytes($lp)
        $text = [System.Text.Encoding]::GetEncoding(28591).GetString($bytes)
        if ($text.Contains('@@')) { Exit-Refused "$lp still holds a placeholder" }
        if (@($bytes | Where-Object { $_ -gt 126 }).Count -gt 0) { Exit-Refused "$lp holds a non-ASCII byte" }
        $crs = @($bytes | Where-Object { $_ -eq 13 }).Count; $lfs = @($bytes | Where-Object { $_ -eq 10 }).Count
        if ($crs -ne $lfs) { Exit-Refused "$lp is not CRLF throughout (CR $crs, LF $lfs)" }
        $m = [regex]::Match($text, '(?m)^set NATIVELY_FLIGHT_COMMIT=([0-9a-f]{40})\r?$')
        if (-not $m.Success) { Exit-Refused "$lp has no NATIVELY_FLIGHT_COMMIT line with a 40-hex hash" }
        if ($m.Groups[1].Value -ne $head) { Exit-Refused ("$lp pins commit " + $m.Groups[1].Value.Substring(0, 7) + " but MAIN HEAD is " + $head.Substring(0, 7) + ": regenerate with gen-launchers-b1.mjs --commit " + $head) }
    }
}

$ErrorActionPreference = 'Stop'
$failures = 0
$nextReport = @()
foreach ($k in $kinds) {
    $pl = $plans[$k]
    $startAt = $null
    if ($k -eq 'main') { $startAt = $timeWanted }
    if ($k -eq 'precheck') { $startAt = $timeWanted.AddMinutes(-6) }
    $tText = Minute-Text $timeWanted
    if ($Which -ne 'verify') {
        if ($k -eq 'precheck') {
            $argText = '-NoProfile -ExecutionPolicy Bypass -File "' + (Join-Path $here 'b1-precheck.ps1') + '" -At "' + (Minute-Text $startAt) + '" -Kind ' + $Kind
            $action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $argText -WorkingDirectory $here
        } else {
            $argText = '/c ""' + $pl.Launcher + '" "' + $tText + '""'
            $action = New-ScheduledTaskAction -Execute 'cmd.exe' -Argument $argText -WorkingDirectory $repo
        }
        $principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited
        $span = New-TimeSpan -Hours $pl.Hours
        if ($k -eq 'precheck') { $span = New-TimeSpan -Minutes 15 }
        # no -StartWhenAvailable: a missed start never fires late
        $settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit $span -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -WakeToRun
        if ($Plan) {
            Write-Output ("PLAN " + $pl.Name + ": " + $action.Execute + " " + $action.Arguments + "  workdir=" + $action.WorkingDirectory + "  limit=" + $span + "  trigger=" + $(if ($pl.Trigger) { 'Once at ' + (Minute-Text $startAt) } else { 'none' }))
            continue
        }
        if ($pl.Trigger) {
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
    $trigCount = 0
    if ($taskObj.Triggers) { $trigCount = @($taskObj.Triggers).Count }   # (@($null).Count is 1 in PowerShell)
    Write-Output ("registered " + $pl.Name + "  state=" + $taskObj.State + "  limit=" + $taskObj.Settings.ExecutionTimeLimit + "  triggers=" + $trigCount)
    Write-Output ("  action=" + $taskObj.Actions[0].Execute + " " + $taskObj.Actions[0].Arguments)
    Write-Output ("  workdir=" + $taskObj.Actions[0].WorkingDirectory + "  logon=" + $taskObj.Principal.LogonType + "  runlevel=" + $taskObj.Principal.RunLevel + "  user=" + $taskObj.Principal.UserId)
    Write-Output ("  settings: AllowStartIfOnBatteries=" + (-not $taskObj.Settings.DisallowStartIfOnBatteries) + "  StopIfGoingOnBatteries=" + $taskObj.Settings.StopIfGoingOnBatteries + "  WakeToRun=" + $taskObj.Settings.WakeToRun + "  StartWhenAvailable=" + $taskObj.Settings.StartWhenAvailable)
    $nextText = 'none'
    if ($infoObj.NextRunTime -and $infoObj.NextRunTime.Year -gt 1999) { $nextText = Minute-Text $infoObj.NextRunTime }
    Write-Output ("  next run: " + $nextText)
    $problems = @()
    if ([bool]$taskObj.Settings.StartWhenAvailable) { $problems += 'StartWhenAvailable reads True: a missed start would fire late, the registration requires False' }
    if ([string]$taskObj.State -ne 'Ready') { $problems += ("the state reads '" + $taskObj.State + "', not Ready") }
    if ([string]$taskObj.Principal.LogonType -ne 'Interactive') { $problems += ("the logon type reads '" + $taskObj.Principal.LogonType + "', not Interactive: the app would not appear on the user's desktop") }
    if ($pl.Trigger) {
        if ($trigCount -ne 1) { $problems += "the task has $trigCount triggers, one is required" }
        if ($infoObj.NextRunTime -and $infoObj.NextRunTime.Year -gt 1999) {
            if ([math]::Abs((([datetime]$infoObj.NextRunTime) - $startAt).TotalSeconds) -gt 60) { $problems += "the next run reads $nextText, not the requested $(Minute-Text $startAt)" }
        } else { $problems += 'the Task Scheduler reports no next run' }
    } elseif ($trigCount -ne 0) { $problems += "the task has $trigCount triggers, none is required (the precheck starts it)" }
    $actionArgs = [string]$taskObj.Actions[0].Arguments
    if ($k -eq 'precheck') {
        if (-not $actionArgs.Contains('b1-precheck.ps1') -or -not $actionArgs.Contains('-At "' + (Minute-Text $startAt) + '"') -or -not $actionArgs.Contains('-Kind ' + $Kind)) { $problems += 'the action does not run b1-precheck.ps1 with -At T - 6 and the kind' }
    } else {
        if (-not $actionArgs.Contains($pl.Launcher)) { $problems += "the action does not name the launcher $($pl.Launcher)" }
        if (-not $actionArgs.Contains('"' + $tText + '"')) { $problems += "the action does not carry T $tText as the launcher argument" }
        if ($taskObj.Actions[0].WorkingDirectory -ne $repo) { $problems += "the working directory reads '$($taskObj.Actions[0].WorkingDirectory)', not the repo $repo" }
    }
    if ($problems.Count -gt 0) {
        foreach ($pr in $problems) { Write-Output ("REGISTRATION PROBLEM: " + $pr) }
        Write-Output ("REGISTRATION FAILED: " + $pl.Name + " does not read back as required")
        $failures++
    } else {
        Write-Output ("REGISTRATION OK: " + $pl.Name + " reads Ready, Interactive, StartWhenAvailable False" + $(if ($pl.Trigger) { ', next run as requested' } else { ', no trigger' }))
    }
    if ($pl.Trigger) { $nextReport += ($k + '=' + $nextText) }
}
if ($Plan) { Write-Output 'PLAN only: nothing was registered'; exit 0 }
if ($nextReport.Count -gt 0) { Write-Output ("NEXT RUNS " + ($nextReport -join '  ')) }
if ($failures -gt 0) { exit 1 }
exit 0
