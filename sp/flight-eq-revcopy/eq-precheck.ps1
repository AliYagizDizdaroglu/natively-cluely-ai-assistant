# E\eq-precheck.ps1 (AMENDMENT-A2 A2.6 / A2.10 P8, A3.7 I4a, A4.6 m9, A5.2, A6.1). VH\h40d-precheck.ps1 re-pointed to flight-eq.
# Run by the scheduled task Natively-flight-eq-precheck at T - 6 min (the controller registers it with register-eq.ps1).
# It re-checks what could stop the flight at T, starts the dry twin itself, and writes ONE verdict. It changes nothing except:
# running the dry-twin task (guards only, no app, no API call), writing E\<Label>-precheck.out.txt, and, on ANY FAIL,
# `Disable-ScheduledTask Natively-flight-<Label>` (read back and printed). Never holds the app's own log open.
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File eq-precheck.ps1 -At 'yyyy-MM-dd HH:mm' [-Label eq] [-DryTask <name>]
#       [-DryLog <path>] [-FakeFail <gate>] [-ArmingPath <file>] [-DryTimeoutSec <n>]
#   -At            the PRECHECK's own time (T - 6 min), as a FULL date-time: a bare HH:mm would resolve to today and a post-midnight
#                  precheck armed in the evening would run at once, so it is refused (exit 2). The script waits until -At.
#   -Label         eq by default; tasks Natively-flight-<Label>, Natively-flight-<Label>-dry, output E\<Label>-precheck.out.txt.
#                  `eqcal` is the calibration dummy (eq-precheck-cal.mjs); it never touches the real tasks.
#   -DryTask       the dry twin's task name (default Natively-flight-<Label>-dry).
#   -DryLog        the dry twin's launcher log (default MAIN\electron\test\golden\interview60.runs\flight-<Label>-dry.launcher.log).
#   -FakeFail      CALIBRATION ONLY: forces one gate to read FAIL. One of the gate names below.
#   -ArmingPath    the arming record (default E\ARMING-flight-eq.md). The calibration passes stubs from E\eqcal-arming\ and never
#                  writes the real record path.
#   -DryTimeoutSec how long to wait for the dry twin (default 240 s, A3.7; a dry run still running then = FAIL dry-timeout).
# Gates (one line each, `PRECHECK <name>: OK|FAIL <reading>`):
#   flight-task    the flight task exists, State Ready, next run = At + 6 min
#   arming-record  the record exists; exactly ONE line `T: yyyy-MM-dd HH:mm`; that T = At + 6 min = the flight task's NextRunTime;
#                  its LAST line is `ARMING COMPLETE <yyyy-MM-ddTHH:mm:ss+03>` with the stamp <= At - 4 min (= T - 10): a record
#                  finished later than that can never pass, so an overrun is self-enforcing (A6.1 I1, A6.1 m2)
#   other-tasks    Natively-* tasks Running other than the flight task and this precheck task = 0
#   electron       electron.exe processes = 0           port   nothing listening on 5180           tail   tail.exe = 0
#   error-log      %TEMP%\natively-<Label>-launcher-error.log absent
#   dry-twin       the dry task is registered, started HERE, ends within -DryTimeoutSec with result 0x0, and its NEW log bytes hold
#                  a line starting `GUARD OK` and a line `NIGHT GATES OK`          (a dry run still running at the limit: dry-timeout)
#   audio-state is printed (INFO lines), never gated (A1.2).
# Output file E\<Label>-precheck.out.txt ends with `PRECHECK OK <yyyy-MM-ddTHH:mm:ss+03>` (exit 0) or `PRECHECK FAILED (<n>): <names>`
# (exit 1, and the flight task is disabled). A crash is a FAIL too (fail closed). Usage error: exit 2, nothing written.
# Not covered, as in h40c's script: the user logged on, sleep never, no restart pending (night-gates.ps1 reads those in the dry twin's
# guard), the Context toggle (the guard reads knowledge mode).
# PowerShell names are case-insensitive: every name below is distinct from every parameter name.
param(
    [string]$At = '',
    [string]$Label = 'eq',
    [string]$DryTask = '',
    [string]$DryLog = '',
    [string]$FakeFail = '',
    [string]$ArmingPath = '',
    [int]$DryTimeoutSec = 240
)
$ErrorActionPreference = 'Stop'
$inv = [System.Globalization.CultureInfo]::InvariantCulture
$gateNames = @('flight-task', 'arming-record', 'other-tasks', 'electron', 'port', 'tail', 'error-log', 'dry-twin')

function Exit-Usage([string]$why) {
    Write-Output ("PRECHECK usage error: " + $why)
    Write-Output "usage: eq-precheck.ps1 -At 'yyyy-MM-dd HH:mm' [-Label eq] [-DryTask <name>] [-DryLog <path>] [-FakeFail <gate>] [-ArmingPath <file>] [-DryTimeoutSec <n>]"
    exit 2
}

# ---- arguments (refused before anything is waited for, started or written) -----------------------------------------------
$atDt = [datetime]::MinValue
if ($At -notmatch '^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$' -or -not [datetime]::TryParseExact($At, 'yyyy-MM-dd HH:mm', $inv, [System.Globalization.DateTimeStyles]::None, [ref]$atDt)) {
    Exit-Usage "-At must be a full date-time 'yyyy-MM-dd HH:mm' (got '$At'): a bare HH:mm would resolve to today"
}
if ($Label -notmatch '^[A-Za-z0-9]+$') { Exit-Usage "-Label must be letters and digits (got '$Label')" }
if ($FakeFail -ne '' -and $gateNames -notcontains $FakeFail) { Exit-Usage ("-FakeFail must be one of: " + ($gateNames -join ', ')) }
if ($DryTimeoutSec -lt 1) { Exit-Usage '-DryTimeoutSec must be at least 1' }

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$sp = Split-Path -Parent $here
$flightName = 'Natively-flight-' + $Label
$precheckName = $flightName + '-precheck'
$dryName = $DryTask
if ($dryName -eq '') { $dryName = $flightName + '-dry' }
$armingFile = $ArmingPath
if ($armingFile -eq '') { $armingFile = Join-Path $here 'ARMING-flight-eq.md' }
$outFile = Join-Path $here ($Label + '-precheck.out.txt')
$errLogName = 'natively-' + $Label + '-launcher-error.log'
$script:lines = New-Object System.Collections.Generic.List[string]
$script:failed = New-Object System.Collections.Generic.List[string]
function Emit([string]$s) { $script:lines.Add($s); Write-Output $s }
function Gate([string]$name, [bool]$ok, [string]$reading) {
    if ($FakeFail -eq $name) { $ok = $false; $reading = "forced by -FakeFail (calibration); real reading: $reading" }
    if ($ok) { Emit ("PRECHECK " + $name + ": OK " + $reading) }
    else { Emit ("PRECHECK " + $name + ": FAIL " + $reading); $script:failed.Add($name) }
}
function Stamp-Now { return ((Get-Date).ToString('yyyy-MM-ddTHH:mm:ss', $inv) + '+03') }
function Minute-Text($dt) { return $dt.ToString('yyyy-MM-dd HH:mm', $inv) }

# ---- wait until -At --------------------------------------------------------------------------------------------------------
while ((Get-Date) -lt $atDt) { Start-Sleep -Seconds 5 }
Emit ("PRECHECK start " + (Stamp-Now) + " label=" + $Label + " at=" + $At + " tz-offset=" + [System.TimeZoneInfo]::Local.GetUtcOffset((Get-Date)).ToString())

try {
    $expectedT = $atDt.AddMinutes(6)
    $expectedText = Minute-Text $expectedT

    # flight task: Ready, next run = At + 6
    $nextRun = $null
    $ft = Get-ScheduledTask -TaskName $flightName -ErrorAction SilentlyContinue
    if ($ft) {
        $fi = Get-ScheduledTaskInfo -TaskName $flightName
        if ($fi.NextRunTime -and $fi.NextRunTime.Year -gt 1999) { $nextRun = $fi.NextRunTime }
        $nextText = 'none'
        if ($nextRun) { $nextText = Minute-Text $nextRun }
        $flightOk = ([string]$ft.State -eq 'Ready') -and ($nextText -eq $expectedText)
        Gate 'flight-task' $flightOk ("state=" + $ft.State + " next=" + $nextText + " expected=" + $expectedText)
    } else {
        Gate 'flight-task' $false ("NOT REGISTERED (" + $flightName + ")")
    }

    # arming record: exists, one T: line = At + 6 = NextRunTime, last line ARMING COMPLETE with stamp <= At - 4 min
    $armOk = $false
    $armWhy = ''
    if (-not (Test-Path -LiteralPath $armingFile)) {
        $armWhy = 'record ABSENT'
    } else {
        $recLines = @([System.IO.File]::ReadAllLines($armingFile) | ForEach-Object { $_.TrimEnd() } | Where-Object { $_ -ne '' })
        $tLines = @($recLines | Where-Object { $_ -match '^T: \d{4}-\d{2}-\d{2} \d{2}:\d{2}$' })
        $lastLine = ''
        if ($recLines.Count -gt 0) { $lastLine = $recLines[$recLines.Count - 1] }
        $stampMatch = [regex]::Match($lastLine, '^ARMING COMPLETE (\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})\+03$')
        if ($tLines.Count -ne 1) {
            $armWhy = ("the record has " + $tLines.Count + " 'T:' lines, exactly one is required (a superseded T is written as 'Superseded:')")
        } elseif ($tLines[0].Substring(3) -ne $expectedText) {
            $armWhy = ("record T " + $tLines[0].Substring(3) + " is not At + 6 min (" + $expectedText + ")")
        } elseif (-not $nextRun -or (Minute-Text $nextRun) -ne $tLines[0].Substring(3)) {
            $armWhy = ("record T " + $tLines[0].Substring(3) + " is not the flight task's NextRunTime")
        } elseif (-not $stampMatch.Success) {
            $armWhy = 'the record does not END with an ARMING COMPLETE line (an unfinished record)'
        } else {
            $stampDt = [datetime]::ParseExact($stampMatch.Groups[1].Value, 'yyyy-MM-ddTHH:mm:ss', $inv)
            if ($stampDt -gt $atDt.AddMinutes(-4)) {
                $armWhy = ("ARMING COMPLETE stamp " + $stampMatch.Groups[1].Value + " is later than At - 4 min (" + (Minute-Text $atDt.AddMinutes(-4)) + "): finished too late")
            } else {
                $armOk = $true
                $armWhy = ("T " + $tLines[0].Substring(3) + " = At + 6 = NextRunTime, complete " + $stampMatch.Groups[1].Value)
            }
        }
    }
    Gate 'arming-record' $armOk $armWhy

    # other Natively-* tasks Running (the flight task and this precheck task excluded)
    $others = @(Get-ScheduledTask -TaskName 'Natively-*' -ErrorAction SilentlyContinue | Where-Object { $_.State -eq 'Running' -and $_.TaskName -ne $flightName -and $_.TaskName -ne $precheckName })
    Gate 'other-tasks' ($others.Count -eq 0) ("Running other than " + $flightName + " and " + $precheckName + ": " + $others.Count + $(if ($others.Count -gt 0) { ' [' + (($others | ForEach-Object { $_.TaskName }) -join ', ') + ']' } else { '' }))

    $electrons = @(Get-CimInstance Win32_Process -Filter "Name='electron.exe'")
    Gate 'electron' ($electrons.Count -eq 0) ("electron.exe processes: " + $electrons.Count)
    $portHeld = [bool](Get-NetTCPConnection -LocalPort 5180 -State Listen -ErrorAction SilentlyContinue)
    Gate 'port' (-not $portHeld) ("port 5180 held: " + $portHeld)
    $tails = @(Get-Process tail -ErrorAction SilentlyContinue)
    Gate 'tail' ($tails.Count -eq 0) ("tail.exe watchers: " + $tails.Count)
    $errLogPath = Join-Path $env:TEMP $errLogName
    $errLogHere = Test-Path -LiteralPath $errLogPath
    Gate 'error-log' (-not $errLogHere) ($errLogName + " present: " + $errLogHere)

    # the dry twin: started HERE, the stamp is written only after it ends (A3.7)
    $logPath = $DryLog
    if ($logPath -eq '') {
        $mainRepo = (Resolve-Path (Join-Path $env:USERPROFILE 'OneDrive\Masa*\natively-cluely-ai-assistant') | Where-Object { Test-Path (Join-Path $_.Path '.git') } | Select-Object -First 1).Path
        $logPath = Join-Path $mainRepo ('electron\test\golden\interview60.runs\flight-' + $Label + '-dry.launcher.log')
    }
    $dryObj = Get-ScheduledTask -TaskName $dryName -ErrorAction SilentlyContinue
    if (-not $dryObj) {
        Gate 'dry-twin' $false ("the dry task " + $dryName + " is NOT REGISTERED")
    } else {
        $logLen = 0
        if (Test-Path -LiteralPath $logPath) { $logLen = (Get-Item -LiteralPath $logPath).Length }
        $dryStart = Get-Date
        Start-ScheduledTask -TaskName $dryName
        $timedOut = $false
        while ($true) {
            Start-Sleep -Seconds 3
            $dryNow = Get-ScheduledTask -TaskName $dryName
            $dryInfo = Get-ScheduledTaskInfo -TaskName $dryName
            $ended = ([string]$dryNow.State -ne 'Running') -and ($dryInfo.LastRunTime -ge $dryStart.AddSeconds(-2))
            if ($ended) { break }
            if (((Get-Date) - $dryStart).TotalSeconds -ge $DryTimeoutSec) { $timedOut = $true; break }
        }
        $dryElapsed = [math]::Round(((Get-Date) - $dryStart).TotalSeconds, 0)
        if ($timedOut) {
            Gate 'dry-twin' $false ("dry-timeout: still running after " + $DryTimeoutSec + " s")
            $script:failed.Add('dry-timeout')
        } else {
            $dryResult = [int64]$dryInfo.LastTaskResult
            $newText = ''
            if (Test-Path -LiteralPath $logPath) {
                $fsr = [System.IO.File]::Open($logPath, 'Open', 'Read', 'ReadWrite')
                try {
                    if ($logLen -le $fsr.Length) { $null = $fsr.Seek($logLen, 'Begin') }
                    $sr = New-Object System.IO.StreamReader($fsr)
                    $newText = $sr.ReadToEnd()
                } finally { $fsr.Close() }
            }
            $guardLine = [regex]::IsMatch($newText, '(?m)^GUARD OK')
            $nightLine = [regex]::IsMatch($newText, '(?m)^NIGHT GATES OK\s*$')
            Gate 'dry-twin' (($dryResult -eq 0) -and $guardLine -and $nightLine) ("result=0x" + ('{0:X}' -f $dryResult) + " in " + $dryElapsed + " s; new log bytes " + $newText.Length + " chars; GUARD OK line: " + $guardLine + "; NIGHT GATES OK line: " + $nightLine)
        }
    }

    # audio-state: printed, never gated
    $audioScript = Join-Path $sp 'audio-state.ps1'
    if (Test-Path -LiteralPath $audioScript) {
        $audioOut = @(& powershell -NoProfile -ExecutionPolicy Bypass -File $audioScript 2>&1 | ForEach-Object { [string]$_ })
        foreach ($al in $audioOut) { if ($al.Trim() -ne '') { Emit ("PRECHECK audio-state INFO: " + $al.Trim()) } }
    } else {
        Emit ("PRECHECK audio-state INFO: audio-state.ps1 NOT FOUND at " + $audioScript)
    }
} catch {
    $script:failed.Add('internal')
    Emit ("PRECHECK internal: FAIL the precheck itself crashed: " + ([string]$_.Exception.Message).Substring(0, [Math]::Min(160, ([string]$_.Exception.Message).Length)))
}

# ---- the verdict -------------------------------------------------------------------------------------------------------------
if ($script:failed.Count -eq 0) {
    Emit ("PRECHECK OK " + (Stamp-Now))
    $verdictOk = $true
} else {
    Emit ("PRECHECK FAILED (" + $script:failed.Count + "): " + ($script:failed -join ', '))
    $verdictOk = $false
    # any FAIL disables the flight task, so it cannot start at T on a state the precheck refused (A2.6)
    try {
        if (Get-ScheduledTask -TaskName $flightName -ErrorAction SilentlyContinue) {
            $null = Disable-ScheduledTask -TaskName $flightName
            Emit ("PRECHECK flight task " + $flightName + " disabled, state now: " + (Get-ScheduledTask -TaskName $flightName).State)
        } else {
            Emit ("PRECHECK flight task " + $flightName + " is NOT REGISTERED, nothing to disable")
        }
    } catch {
        Emit ("PRECHECK flight task " + $flightName + " COULD NOT BE DISABLED: " + ([string]$_.Exception.Message).Substring(0, [Math]::Min(120, ([string]$_.Exception.Message).Length)))
    }
}
[System.IO.File]::WriteAllText($outFile, (($script:lines -join "`r`n") + "`r`n"), (New-Object System.Text.UTF8Encoding $false))
if ($verdictOk) { exit 0 } else { exit 1 }
