# Throwaway: wait until 13:24 local, then re-check what could stop the 13:30 h40c flight and exit with
# one report. Reports only; changes nothing except running the dry-twin task (guards only, no app, no
# API call). Never holds the app's own log open. -At exists only so the body can be calibrated now.
param([string]$At = '13:24')
$runAt = [datetime]::ParseExact($At, 'HH:mm', $null)   # not $at: PowerShell names ignore case
while ((Get-Date) -lt $runAt) { Start-Sleep -Seconds 30 }
$sp = Split-Path -Parent $MyInvocation.MyCommand.Path
$m = (Resolve-Path (Join-Path $env:USERPROFILE 'OneDrive\Masa*\natively-cluely-ai-assistant') | Where-Object { Test-Path (Join-Path $_.Path '.git') } | Select-Object -First 1).Path
"PRECHECK $(Get-Date -Format 'HH:mm:ss')"
$i = Get-ScheduledTaskInfo -TaskName 'Natively-flight-h40c'
"flight task: $((Get-ScheduledTask -TaskName 'Natively-flight-h40c').State) next=$($i.NextRunTime.ToString('yyyy-MM-dd HH:mm'))"
$el = @(Get-CimInstance Win32_Process -Filter "Name='electron.exe'")
"electron processes: $($el.Count)"
$el | ForEach-Object { "  $($_.ProcessId) $($_.CommandLine.Substring(0, [Math]::Min(160, $_.CommandLine.Length)))" }
"processes named like natively: $(@(Get-Process | Where-Object { $_.ProcessName -match 'natively' }).Count)"
"port 5180 held: $([bool](Get-NetTCPConnection -LocalPort 5180 -State Listen -ErrorAction SilentlyContinue))"
"tail.exe watchers: $(@(Get-Process tail -ErrorAction SilentlyContinue).Count)"
$b = Get-CimInstance Win32_Battery -ErrorAction SilentlyContinue
if ($b) { "power: BatteryStatus=$($b.BatteryStatus) (2 = AC) charge=$($b.EstimatedChargeRemaining)%" }
powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $sp 'audio-state.ps1')
$log = Join-Path $m 'electron\test\golden\interview60.runs\flight-h40c-dry.launcher.log'
$len = (Get-Item -LiteralPath $log).Length
$start = Get-Date
Start-ScheduledTask -TaskName 'Natively-flight-h40c-dry'
do {
    Start-Sleep -Seconds 3
    $d = Get-ScheduledTask -TaskName 'Natively-flight-h40c-dry'
    $di = Get-ScheduledTaskInfo -TaskName 'Natively-flight-h40c-dry'
} while (((Get-Date) - $start).TotalSeconds -lt 120 -and ($d.State -eq 'Running' -or $di.LastRunTime -lt $start.AddSeconds(-2)))
"dry-twin guard chain: result=0x$('{0:X}' -f $di.LastTaskResult)"
$fs = [IO.File]::Open($log, 'Open', 'Read', 'ReadWrite')
$fs.Seek($len, 'Begin') | Out-Null
$sr = New-Object IO.StreamReader($fs)
($sr.ReadToEnd() -split "`n" | Where-Object { $_ -match 'GUARD|matches|does not' } | ForEach-Object { $_.Substring(0, [Math]::Min(220, $_.Length)) }) -join "`n"
$sr.Close()
