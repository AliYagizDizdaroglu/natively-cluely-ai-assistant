# b1-precheck.ps1 (bundle-1 smoke / flight). SP\router-default\flight\rd-precheck.ps1 re-pointed to the bundle-1 tasks: the gates are rd's, the arming-record gate is replaced by a
# task-argument gate (the bundle has no arming record; the launcher takes T as its first argument, so the gate reads T out of the registered task).
# Run by the scheduled task Natively-smoke-b1-precheck (or Natively-flight-b1-precheck) at T - 6 min (register-b1.ps1 registers it).
# It re-checks what could stop the run at T, starts the dry twin itself, and writes ONE verdict. It changes nothing except: running the dry-twin task (guards only, no app,
# no model call), writing b1-<Kind>-precheck.out.txt, and, on ANY FAIL, `Disable-ScheduledTask <main task>` (read back and printed). Never holds the app's own log open.
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File b1-precheck.ps1 -At 'yyyy-MM-dd HH:mm' [-Kind smoke|flight] [-FakeFail <gate>] [-DryTimeoutSec <n>] [-AudioScript <file>]
#   -At            the PRECHECK's own time (T - 6 min), a FULL date-time (a bare HH:mm would resolve to today). The script waits until -At.
#   -Kind          smoke (default): tasks Natively-smoke-b1, -dry, -precheck; flight: Natively-flight-b1, -dry, -precheck.
#   -FakeFail      CALIBRATION ONLY: forces one gate to read FAIL (a gate name below, or disable-readback).
# Gates (one line each, `PRECHECK <name>: OK|FAIL <reading>`):
#   main-task      the task exists, State Ready, next run = At + 6 min
#   task-arg       the task action's argument holds T = At + 6 min as `"yyyy-MM-dd HH:mm"` (the launcher takes T from its first argument)
#   other-tasks    Natively-* tasks Running other than the main task and this precheck task = 0
#   electron       electron.exe processes = 0      port   nothing listening on 5180      tail   tail.exe = 0
#   error-log      %TEMP%\natively-b1-<Kind>-launcher-error.log absent
#   dry-twin       the dry task is registered, started HERE, ends within -DryTimeoutSec with result 0x0, and its NEW log bytes hold a line starting `GUARD OK` and a line `NIGHT GATES OK`
#   audio-state is printed (INFO lines), never gated. It does NOT detect a voice chat: a quiet machine for the whole window is the user's side (project_system_audio_contamination).
# Output b1-<Kind>-precheck.out.txt ends with `PRECHECK OK <yyyy-MM-ddTHH:mm:ss+03>` (exit 0) or `PRECHECK FAILED (<n>): <names>` (exit 1, and the main task is disabled). A crash is a FAIL too.
# PowerShell names are case-insensitive: every name below is distinct from every parameter name. UTF-8 with BOM (the LAB path holds a non-ASCII character).
param(
    [string]$At = '',
    [string]$Kind = 'smoke',
    [string]$FakeFail = '',
    [int]$DryTimeoutSec = 240,
    [string]$AudioScript = ''
)
$ErrorActionPreference = 'Stop'
$inv = [System.Globalization.CultureInfo]::InvariantCulture
$gateNames = @('main-task', 'task-arg', 'other-tasks', 'electron', 'port', 'tail', 'error-log', 'dry-twin')

function Exit-Usage([string]$why) {
    Write-Output ("PRECHECK usage error: " + $why)
    Write-Output "usage: b1-precheck.ps1 -At 'yyyy-MM-dd HH:mm' [-Kind smoke|flight] [-FakeFail <gate>] [-DryTimeoutSec <n>]"
    exit 2
}

$atDt = [datetime]::MinValue
if ($At -notmatch '^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$' -or -not [datetime]::TryParseExact($At, 'yyyy-MM-dd HH:mm', $inv, [System.Globalization.DateTimeStyles]::None, [ref]$atDt)) {
    Exit-Usage "-At must be a full date-time 'yyyy-MM-dd HH:mm' (got '$At'): a bare HH:mm would resolve to today"
}
if (@('smoke', 'flight') -notcontains $Kind) { Exit-Usage "-Kind must be smoke or flight (got '$Kind')" }
if ($FakeFail -ne '' -and ($gateNames + 'disable-readback') -notcontains $FakeFail) { Exit-Usage ("-FakeFail must be one of: " + (($gateNames + 'disable-readback') -join ', ')) }
if ($DryTimeoutSec -lt 1) { Exit-Usage '-DryTimeoutSec must be at least 1' }

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$sp = Split-Path -Parent (Split-Path -Parent $here)   # SP: two folders up from LAB\bundle-1\smoke
$mainName = 'Natively-' + $Kind + '-b1'
$precheckName = $mainName + '-precheck'
$dryName = $mainName + '-dry'
$outFile = Join-Path $here ('b1-' + $Kind + '-precheck.out.txt')
$errLogName = 'natively-b1-' + $Kind + '-launcher-error.log'
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

while ((Get-Date) -lt $atDt) { Start-Sleep -Seconds 5 }
Emit ("PRECHECK start " + (Stamp-Now) + " kind=" + $Kind + " at=" + $At + " tz-offset=" + [System.TimeZoneInfo]::Local.GetUtcOffset((Get-Date)).ToString())

try {
    $expectedT = $atDt.AddMinutes(6)
    $expectedText = Minute-Text $expectedT

    # main task: Ready, next run = At + 6
    $nextRun = $null
    $mt = Get-ScheduledTask -TaskName $mainName -ErrorAction SilentlyContinue
    if ($mt) {
        $mi = Get-ScheduledTaskInfo -TaskName $mainName
        if ($mi.NextRunTime -and $mi.NextRunTime.Year -gt 1999) { $nextRun = $mi.NextRunTime }
        $nextText = 'none'
        if ($nextRun) { $nextText = Minute-Text $nextRun }
        Gate 'main-task' (([string]$mt.State -eq 'Ready') -and ($nextText -eq $expectedText)) ("state=" + $mt.State + " next=" + $nextText + " expected=" + $expectedText)
        $argText = [string]$mt.Actions[0].Arguments
        Gate 'task-arg' ($argText.Contains('"' + $expectedText + '"')) ("the task action argument T reads " + $(if ($argText.Contains('"' + $expectedText + '"')) { $expectedText } else { 'something other than ' + $expectedText }))
    } else {
        Gate 'main-task' $false ("NOT REGISTERED (" + $mainName + ")")
        Gate 'task-arg' $false 'no task to read'
    }

    # other Natively-* tasks Running (the main task and this precheck task excluded)
    $others = @(Get-ScheduledTask -TaskName 'Natively-*' -ErrorAction SilentlyContinue | Where-Object { $_.State -eq 'Running' -and $_.TaskName -ne $mainName -and $_.TaskName -ne $precheckName })
    Gate 'other-tasks' ($others.Count -eq 0) ("Running other than " + $mainName + " and " + $precheckName + ": " + $others.Count + $(if ($others.Count -gt 0) { ' [' + (($others | ForEach-Object { $_.TaskName }) -join ', ') + ']' } else { '' }))

    $electrons = @(Get-CimInstance Win32_Process -Filter "Name='electron.exe'")
    Gate 'electron' ($electrons.Count -eq 0) ("electron.exe processes: " + $electrons.Count)
    $portHeld = [bool](Get-NetTCPConnection -LocalPort 5180 -State Listen -ErrorAction SilentlyContinue)
    Gate 'port' (-not $portHeld) ("port 5180 held: " + $portHeld)
    $tails = @(Get-Process tail -ErrorAction SilentlyContinue)
    Gate 'tail' ($tails.Count -eq 0) ("tail.exe watchers: " + $tails.Count)
    $errLogPath = Join-Path $env:TEMP $errLogName
    $errLogHere = Test-Path -LiteralPath $errLogPath
    Gate 'error-log' (-not $errLogHere) ($errLogName + " present: " + $errLogHere)

    # the dry twin: started HERE, the stamp is written only after it ends
    $mainRepo = (Resolve-Path (Join-Path $env:USERPROFILE 'OneDrive\Masa*\natively-cluely-ai-assistant') | Where-Object { Test-Path (Join-Path $_.Path '.git') } | Select-Object -First 1).Path
    $logPath = Join-Path $mainRepo ('electron\test\golden\interview60.runs\b1-' + $Kind + '-dry.launcher.log')
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

    # audio-state: printed, never gated. Its own try/catch and a local Continue: under the script's Stop, ANY stderr line of the child would be a terminating error.
    $audioPath = $AudioScript
    if ($audioPath -eq '') { $audioPath = Join-Path $sp 'audio-state.ps1' }
    if (Test-Path -LiteralPath $audioPath) {
        $eapSaved = $ErrorActionPreference
        $script:audioBad = ''
        try {
            $ErrorActionPreference = 'Continue'
            $audioOut = @(& powershell -NoProfile -ExecutionPolicy Bypass -File $audioPath 2>&1 | ForEach-Object { if ($_ -is [System.Management.Automation.ErrorRecord]) { $script:audioBad = 'it wrote to stderr' } else { [string]$_ } })
            if ($LASTEXITCODE -ne 0) { $script:audioBad = 'exit ' + $LASTEXITCODE }
            foreach ($al in $audioOut) { if ($al.Trim() -ne '') { Emit ("PRECHECK audio-state INFO: " + $al.Trim()) } }
        } catch {
            $script:audioBad = 'it threw'
        } finally {
            $ErrorActionPreference = $eapSaved
        }
        if ($script:audioBad -ne '') { Emit ("PRECHECK audio-state INFO: unreadable (" + $script:audioBad + "); not a gate") }
    } else {
        Emit ("PRECHECK audio-state INFO: audio-state.ps1 NOT FOUND at " + $audioPath)
    }
} catch {
    $script:failed.Add('internal')
    Emit ("PRECHECK internal: FAIL the precheck itself crashed: " + ([string]$_.Exception.Message).Substring(0, [Math]::Min(160, ([string]$_.Exception.Message).Length)))
}

# ---- the verdict
if ($script:failed.Count -eq 0) {
    Emit ("PRECHECK OK " + (Stamp-Now))
    $verdictOk = $true
} else {
    $verdictOk = $false
    # any FAIL disables the main task, so it cannot start at T on a state the precheck refused. The disable comes BEFORE the verdict line so the output file's LAST line is the verdict;
    # a read-back that is not Disabled is itself a FAIL.
    try {
        if (Get-ScheduledTask -TaskName $mainName -ErrorAction SilentlyContinue) {
            $null = Disable-ScheduledTask -TaskName $mainName
            $stateNow = [string](Get-ScheduledTask -TaskName $mainName).State
            if ($FakeFail -eq 'disable-readback') { $stateNow = 'Ready' }
            Emit ("PRECHECK main task " + $mainName + " disabled, state now: " + $stateNow)
            if ($stateNow -ne 'Disabled') {
                $script:failed.Add('disable-readback')
                Emit ("PRECHECK main task " + $mainName + " NOT DISABLED: FAIL read back state " + $stateNow + " (it must read Disabled)")
            }
        } else {
            Emit ("PRECHECK main task " + $mainName + " is NOT REGISTERED, nothing to disable")
        }
    } catch {
        $script:failed.Add('disable-failed')
        Emit ("PRECHECK main task " + $mainName + " COULD NOT BE DISABLED: " + ([string]$_.Exception.Message).Substring(0, [Math]::Min(120, ([string]$_.Exception.Message).Length)))
    }
    Emit ("PRECHECK FAILED (" + $script:failed.Count + "): " + ($script:failed -join ', '))
}
[System.IO.File]::WriteAllText($outFile, (($script:lines -join "`r`n") + "`r`n"), (New-Object System.Text.UTF8Encoding $false))
if ($verdictOk) { exit 0 } else { exit 1 }
