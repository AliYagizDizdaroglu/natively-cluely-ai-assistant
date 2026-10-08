# Throwaway: wait (max 70 min) until Natively-smoke-hedge has started and finished, then print its result.
$deadline = (Get-Date).AddMinutes(70)
$started = $false
while ((Get-Date) -lt $deadline) {
    $t = Get-ScheduledTask -TaskName 'Natively-smoke-hedge'
    $i = Get-ScheduledTaskInfo -TaskName 'Natively-smoke-hedge'
    if ($t.State -eq 'Running') { $started = $true }
    if ($started -and $t.State -ne 'Running') { break }
    if (-not $started -and $i.LastRunTime -gt (Get-Date '2026-09-26T23:19:00') -and $t.State -ne 'Running') { $started = $true; break }
    Start-Sleep -Seconds 20
}
$i = Get-ScheduledTaskInfo -TaskName 'Natively-smoke-hedge'
"state=$((Get-ScheduledTask -TaskName 'Natively-smoke-hedge').State) lastRun=$($i.LastRunTime.ToString('HH:mm:ss')) lastResult=$($i.LastTaskResult) now=$((Get-Date).ToString('HH:mm:ss')) started=$started"
