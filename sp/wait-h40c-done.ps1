# Throwaway: wait for the 13:30 h40c flight task to run and finish, then exit with one report. Polls the
# task scheduler once a minute and nothing else, so it never holds the app's log open during the hour.
# Every terminal state reports: finished (any result code), never started by 13:45, still running at 19:00.
# The parameters exist only so the branches can be calibrated against known cases; the defaults are h40c's.
param([string]$Task = 'Natively-flight-h40c', [string]$Fire = '13:30', [string]$NoStartBy = '13:45', [string]$Deadline = '19:00')
# PowerShell names ignore case: the parsed times need names unlike the string parameters, or each
# assignment is coerced back into its [string] parameter (calibration caught exactly that).
$fireAt = [datetime]::ParseExact($Fire, 'HH:mm', $null)
$noStartAt = [datetime]::ParseExact($NoStartBy, 'HH:mm', $null)
$deadlineAt = [datetime]::ParseExact($Deadline, 'HH:mm', $null)
$outcome = "STILL RUNNING at the $Deadline deadline"
while ((Get-Date) -lt $deadlineAt) {
    $t = Get-ScheduledTask -TaskName $Task
    $i = Get-ScheduledTaskInfo -TaskName $Task
    $ran = $i.LastRunTime -ge $fireAt.AddMinutes(-1)
    if ($ran -and $t.State -ne 'Running') { $outcome = 'FINISHED'; break }
    if (-not $ran -and $t.State -ne 'Running' -and (Get-Date) -gt $noStartAt) { $outcome = "DID NOT START by $NoStartBy"; break }
    Start-Sleep -Seconds 60
}
$i = Get-ScheduledTaskInfo -TaskName $Task
"$Task $outcome at $(Get-Date -Format 'HH:mm:ss'): lastRun=$($i.LastRunTime.ToString('yyyy-MM-dd HH:mm:ss')) result=0x$('{0:X}' -f $i.LastTaskResult)"
$m = (Resolve-Path (Join-Path $env:USERPROFILE 'OneDrive\Masa*\natively-cluely-ai-assistant') | Where-Object { Test-Path (Join-Path $_.Path '.git') } | Select-Object -First 1).Path
$log = Join-Path $m 'electron\test\golden\interview60.runs\flight-h40c.launcher.log'
if (Test-Path -LiteralPath $log) { '--- flight launcher log, last 30 lines'; Get-Content -LiteralPath $log -Tail 30 | ForEach-Object { $_.Substring(0, [Math]::Min(220, $_.Length)) } } else { 'no flight launcher log' }
$err = Join-Path $env:TEMP 'natively-h40c-launcher-error.log'
if (Test-Path -LiteralPath $err) { '--- launcher error log, last 3 lines'; Get-Content -LiteralPath $err -Tail 3 }
