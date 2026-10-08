# SP\h40c-precheck.ps1 re-pointed to h40d (r4 section 6 and 7.4). Waits until 13:24 local, then re-checks what could stop the
# 13:30 h40d flight and exits with one report. Reports only; changes nothing except running the dry-twin task (guards
# only, no app, no API call), and not even that with -ReadOnly. Never holds the app's own log open.
#   -At        the clock time to wait for. Exists so the body can be calibrated now: a time already passed runs at once.
#   -Label     the flight's label. Tasks Natively-flight-LABEL and Natively-flight-LABEL-dry, the dry twin's log
#              interview60.runs\flight-LABEL-dry.launcher.log in MAIN. h40d by default; h40c to calibrate against the
#              h40c task names.
#   -ReadOnly  does not start the dry-twin task: prints the guard lines already in its log instead. For the known-case
#              run only; the real 13:24 run omits it.
# Changed against h40c's script: the count of Natively-* tasks Running other than the flight (r4 section 6: no other
# task Running); a task that is missing, or that has no next run, is printed instead of crashing the line; the dry log is
# filtered for the dist proof verdict as well (r4 section 7.4: GUARD OK and every marker as expected); audio-state.ps1
# is looked up in the scratchpad above this folder, where it lives.
# Not covered, as in h40c's script: the user logged on, sleep never, no restart pending, the Context toggle (r4 section 6).
param([string]$At = '13:24', [string]$Label = 'h40d', [switch]$ReadOnly)
$runAt = [datetime]::ParseExact($At, 'HH:mm', $null)   # not $at: PowerShell names ignore case
while ((Get-Date) -lt $runAt) { Start-Sleep -Seconds 30 }
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$sp = Split-Path -Parent $here
$m = (Resolve-Path (Join-Path $env:USERPROFILE 'OneDrive\Masa*\natively-cluely-ai-assistant') | Where-Object { Test-Path (Join-Path $_.Path '.git') } | Select-Object -First 1).Path
$flight = 'Natively-flight-' + $Label
$dry = $flight + '-dry'
"PRECHECK $(Get-Date -Format 'HH:mm:ss') label=$Label"
$ft = Get-ScheduledTask -TaskName $flight -ErrorAction SilentlyContinue
if ($ft) {
    $i = Get-ScheduledTaskInfo -TaskName $flight
    $next = 'none'
    if ($i.NextRunTime -and $i.NextRunTime.Year -gt 1999) { $next = $i.NextRunTime.ToString('yyyy-MM-dd HH:mm') }
    "flight task: $($ft.State) next=$next"
} else {
    "flight task: NOT REGISTERED ($flight)"
}
$others = @(Get-ScheduledTask -TaskName 'Natively-*' -ErrorAction SilentlyContinue | Where-Object { $_.State -eq 'Running' -and $_.TaskName -ne $flight })
"other Natively-* tasks Running: $($others.Count)"
$others | ForEach-Object { "  $($_.TaskName)" }
$el = @(Get-CimInstance Win32_Process -Filter "Name='electron.exe'")
"electron processes: $($el.Count)"
$el | ForEach-Object { $cl = [string]$_.CommandLine; "  $($_.ProcessId) $($cl.Substring(0, [Math]::Min(160, $cl.Length)))" }
"processes named like natively: $(@(Get-Process | Where-Object { $_.ProcessName -match 'natively' }).Count)"
"port 5180 held: $([bool](Get-NetTCPConnection -LocalPort 5180 -State Listen -ErrorAction SilentlyContinue))"
"tail.exe watchers: $(@(Get-Process tail -ErrorAction SilentlyContinue).Count)"
$b = Get-CimInstance Win32_Battery -ErrorAction SilentlyContinue
if ($b) { "power: BatteryStatus=$($b.BatteryStatus) (2 = AC) charge=$($b.EstimatedChargeRemaining)%" }
$audio = Join-Path $sp 'audio-state.ps1'
if (Test-Path -LiteralPath $audio) {
    powershell -NoProfile -ExecutionPolicy Bypass -File $audio
} else {
    "audio: audio-state.ps1 NOT FOUND at $audio"
}
$log = Join-Path $m ('electron\test\golden\interview60.runs\flight-' + $Label + '-dry.launcher.log')
$len = 0
if (Test-Path -LiteralPath $log) { $len = (Get-Item -LiteralPath $log).Length }
$from = $len
if ($ReadOnly) {
    'dry-twin guard chain: NOT RUN (-ReadOnly); the guard lines already in its log follow'
    $from = 0
} elseif (-not (Get-ScheduledTask -TaskName $dry -ErrorAction SilentlyContinue)) {
    "dry-twin guard chain: NOT RUN, the task $dry is NOT REGISTERED"
    $from = -1
} else {
    $start = Get-Date
    Start-ScheduledTask -TaskName $dry
    do {
        Start-Sleep -Seconds 3
        $d = Get-ScheduledTask -TaskName $dry
        $di = Get-ScheduledTaskInfo -TaskName $dry
    } while (((Get-Date) - $start).TotalSeconds -lt 120 -and ($d.State -eq 'Running' -or $di.LastRunTime -lt $start.AddSeconds(-2)))
    "dry-twin guard chain: result=0x$('{0:X}' -f $di.LastTaskResult)"
}
if ($from -ge 0 -and (Test-Path -LiteralPath $log)) {
    $fs = [IO.File]::Open($log, 'Open', 'Read', 'ReadWrite')
    $fs.Seek($from, 'Begin') | Out-Null
    $sr = New-Object IO.StreamReader($fs)
    $lines = @($sr.ReadToEnd() -split "`n" | Where-Object { $_ -match 'GUARD|matches|does not|DIST PROOF: (THE |NOT |BAD |missing|filter sha256)' } | ForEach-Object { $_.Substring(0, [Math]::Min(220, $_.Length)) })
    $sr.Close()
    if ($ReadOnly) { $lines = @($lines | Select-Object -Last 8) }
    $lines -join "`n"
}
