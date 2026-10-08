# Throwaway: wait (max 15 min) for Natively-flight-h40c-dry to run and finish, then print its result and the
# launcher log's tail and the launcher error log if any.
$deadline = (Get-Date).AddMinutes(15)
$after = Get-Date '2026-09-26T23:31:00'
while ((Get-Date) -lt $deadline) {
    $t = Get-ScheduledTask -TaskName 'Natively-flight-h40c-dry'
    $i = Get-ScheduledTaskInfo -TaskName 'Natively-flight-h40c-dry'
    if ($i.LastRunTime -gt $after -and $t.State -ne 'Running') { break }
    Start-Sleep -Seconds 15
}
$i = Get-ScheduledTaskInfo -TaskName 'Natively-flight-h40c-dry'
"state=$((Get-ScheduledTask -TaskName 'Natively-flight-h40c-dry').State) lastRun=$($i.LastRunTime.ToString('HH:mm:ss')) lastResult=$($i.LastTaskResult)"
$m = (Resolve-Path (Join-Path $env:USERPROFILE 'OneDrive\Masa*\natively-cluely-ai-assistant') | Where-Object { Test-Path (Join-Path $_.Path '.git') } | Select-Object -First 1).Path
$log = Join-Path $m 'electron\test\golden\interview60.runs\flight-h40c-dry.launcher.log'
if (Test-Path -LiteralPath $log) { '--- launcher log tail'; Get-Content -LiteralPath $log -Tail 40 } else { 'no launcher log' }
$err = Join-Path $env:TEMP 'natively-h40c-launcher-error.log'
if (Test-Path -LiteralPath $err) { '--- launcher error log tail'; Get-Content -LiteralPath $err -Tail 5 }
