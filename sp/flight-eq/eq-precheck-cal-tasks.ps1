# E\eq-precheck-cal-tasks.ps1: the calibration dummies for eq-precheck.ps1 (A2.10 P8, A3.7, A5.2). CALIBRATION ONLY. It registers and
# removes ONLY tasks named Natively-flight-eqcal, Natively-flight-eqcal-dry and Natively-eqcal-busy; it never names a real task of the
# flight (Natively-flight-eq, -dry, -precheck) and refuses to.
#   -Action setup -TriggerAt 'yyyy-MM-dd HH:mm' [-DryMode ok|nonight|exit1|slow|none]
#       Natively-flight-eqcal: action cmd /c exit 0, one Once trigger at -TriggerAt, StartWhenAvailable False, interactive.
#       Natively-flight-eqcal-dry (no trigger): runs E\eqcal-dry\eqcal-dry-<mode>.cmd (written by eq-precheck-cal.mjs); none = not registered.
#   -Action teardown      unregisters all three dummies if present (never an error if absent)
#   -Action busy-start    registers Natively-eqcal-busy (ping for 90 s), starts it, waits until it reads Running
#   -Action busy-stop     stops and unregisters it
#   -Action state -Name <task>   prints `STATE <name> <State> next=<yyyy-MM-dd HH:mm|none>` for a dummy
# UTF-8 with BOM (the folder name holds a non-ASCII character).
param(
    [string]$Action = '',
    [string]$TriggerAt = '',
    [string]$DryMode = 'ok',
    [string]$Name = ''
)
$ErrorActionPreference = 'Stop'
$inv = [System.Globalization.CultureInfo]::InvariantCulture
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$dryDir = Join-Path $here 'eqcal-dry'
$allowed = @('Natively-flight-eqcal', 'Natively-flight-eqcal-dry', 'Natively-flight-eqcal-precheck', 'Natively-eqcal-busy')

function Register-Dummy([string]$taskName, [string]$cmdLine, $trigger) {
    if ($allowed -notcontains $taskName) { throw "refusing to register $taskName" }
    $act = New-ScheduledTaskAction -Execute 'cmd.exe' -Argument $cmdLine
    $prin = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited
    $set = New-ScheduledTaskSettingsSet -ExecutionTimeLimit (New-TimeSpan -Minutes 10) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
    if ($trigger) { Register-ScheduledTask -TaskName $taskName -Action $act -Trigger $trigger -Principal $prin -Settings $set -Force | Out-Null }
    else { Register-ScheduledTask -TaskName $taskName -Action $act -Principal $prin -Settings $set -Force | Out-Null }
}
function Remove-Dummy([string]$taskName) {
    if ($allowed -notcontains $taskName) { throw "refusing to unregister $taskName" }
    $t = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
    if ($t) {
        if ([string]$t.State -eq 'Running') { Stop-ScheduledTask -TaskName $taskName }
        Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
    }
}

switch ($Action) {
    'setup' {
        $trigDt = [datetime]::MinValue
        if (-not [datetime]::TryParseExact($TriggerAt, 'yyyy-MM-dd HH:mm', $inv, [System.Globalization.DateTimeStyles]::None, [ref]$trigDt)) { throw "-TriggerAt must be 'yyyy-MM-dd HH:mm'" }
        Register-Dummy 'Natively-flight-eqcal' '/c exit 0' (New-ScheduledTaskTrigger -Once -At $trigDt)
        if ($DryMode -ne 'none') {
            $cmdPath = Join-Path $dryDir ('eqcal-dry-' + $DryMode + '.cmd')
            if (-not (Test-Path -LiteralPath $cmdPath)) { throw "missing $cmdPath" }
            Register-Dummy 'Natively-flight-eqcal-dry' ('/c "' + $cmdPath + '"') $null
        } else {
            $old = Get-ScheduledTask -TaskName 'Natively-flight-eqcal-dry' -ErrorAction SilentlyContinue
            if ($old) { Remove-Dummy 'Natively-flight-eqcal-dry' }
        }
        $ft = Get-ScheduledTask -TaskName 'Natively-flight-eqcal'
        $fi = Get-ScheduledTaskInfo -TaskName 'Natively-flight-eqcal'
        Write-Output ("SETUP Natively-flight-eqcal state=" + $ft.State + " next=" + $fi.NextRunTime + " StartWhenAvailable=" + $ft.Settings.StartWhenAvailable + " dry=" + $DryMode)
    }
    'teardown' {
        foreach ($n in $allowed) { Remove-Dummy $n }
        Write-Output 'TEARDOWN done'
    }
    'busy-start' {
        Register-Dummy 'Natively-eqcal-busy' '/c ping -n 90 127.0.0.1 >nul' $null
        Start-ScheduledTask -TaskName 'Natively-eqcal-busy'
        for ($i = 0; $i -lt 20; $i++) { if ([string](Get-ScheduledTask -TaskName 'Natively-eqcal-busy').State -eq 'Running') { break }; Start-Sleep -Seconds 1 }
        Write-Output ("BUSY Natively-eqcal-busy state=" + (Get-ScheduledTask -TaskName 'Natively-eqcal-busy').State)
    }
    'busy-stop' {
        Remove-Dummy 'Natively-eqcal-busy'
        Write-Output 'BUSY stopped'
    }
    'state' {
        if ($allowed -notcontains $Name) { throw "refusing to read $Name" }
        $t = Get-ScheduledTask -TaskName $Name -ErrorAction SilentlyContinue
        if (-not $t) { Write-Output ("STATE " + $Name + " ABSENT"); exit 0 }
        $i = Get-ScheduledTaskInfo -TaskName $Name
        $nx = 'none'
        if ($i.NextRunTime -and $i.NextRunTime.Year -gt 1999) { $nx = $i.NextRunTime.ToString('yyyy-MM-dd HH:mm', $inv) }
        Write-Output ("STATE " + $Name + " " + $t.State + " next=" + $nx + " StartWhenAvailable=" + $t.Settings.StartWhenAvailable + " result=0x" + ('{0:X}' -f [int64]$i.LastTaskResult) + " lastrun=" + $i.LastRunTime.ToString('yyyy-MM-dd HH:mm:ss', $inv))
    }
    'swa-on' {
        # CALIBRATION of register-eq.ps1's read-back: flip StartWhenAvailable to True on a dummy, so verify must refuse it
        if ($allowed -notcontains $Name) { throw "refusing to change $Name" }
        $swaSettings = (Get-ScheduledTask -TaskName $Name).Settings
        $swaSettings.StartWhenAvailable = $true
        Set-ScheduledTask -TaskName $Name -Settings $swaSettings | Out-Null
        Write-Output ("SWA " + $Name + " StartWhenAvailable=" + (Get-ScheduledTask -TaskName $Name).Settings.StartWhenAvailable)
    }
    'disable' {
        if ($allowed -notcontains $Name) { throw "refusing to change $Name" }
        Disable-ScheduledTask -TaskName $Name | Out-Null
        Write-Output ("DISABLE " + $Name + " " + (Get-ScheduledTask -TaskName $Name).State)
    }
    'parse' {
        # -Name is a script file here: prints its Windows PowerShell ParseFile error count
        $perr = $null
        $null = [System.Management.Automation.Language.Parser]::ParseFile($Name, [ref]$null, [ref]$perr)
        Write-Output ("ParseFile errors: " + @($perr).Count)
    }
    'leftovers' {
        $left = @(Get-ScheduledTask -ErrorAction SilentlyContinue | Where-Object { $allowed -contains $_.TaskName })
        $real = @(Get-ScheduledTask -ErrorAction SilentlyContinue | Where-Object { $_.TaskName -in @('Natively-flight-eq', 'Natively-flight-eq-dry', 'Natively-flight-eq-precheck') })
        if ($left.Count -eq 0) { Write-Output ('no eqcal task left; real eq tasks present: ' + $real.Count) }
        else { Write-Output ('eqcal TASKS LEFT: ' + (($left | ForEach-Object { $_.TaskName }) -join ', ')) }
    }
    default { throw "-Action must be setup, teardown, busy-start, busy-stop, state, parse or leftovers" }
}
