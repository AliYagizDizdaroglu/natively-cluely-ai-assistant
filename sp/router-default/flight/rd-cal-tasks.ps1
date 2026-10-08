# LAB\flight\rd-cal-tasks.ps1: the calibration dummies for rd-precheck.ps1 and register-rd.ps1 (SP\flight-eq\eq-precheck-cal-tasks.ps1 re-pointed). CALIBRATION ONLY. It registers and
# removes ONLY tasks named Natively-flight-rdcal, Natively-flight-rdcal-dry and Natively-rdcal-busy; it never names a real task of the
# flight (Natively-flight-rd, -dry, -precheck) and refuses to.
#   -Action setup -TriggerAt 'yyyy-MM-dd HH:mm' [-DryMode ok|nonight|exit1|slow|none]
#       Natively-flight-rdcal: action cmd /c exit 0, one Once trigger at -TriggerAt, StartWhenAvailable False, interactive.
#       Natively-flight-rdcal-dry (no trigger): runs cal\rdcal-dry\rdcal-dry-<mode>.cmd (written by rd-precheck-cal.mjs); none = not registered.
#   -Action teardown      unregisters all three dummies if present (never an error if absent)
#   -Action busy-start    registers Natively-rdcal-busy (ping for 90 s), starts it, waits until it reads Running
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
$dryDir = Join-Path $here 'cal\rdcal-dry'
$allowed = @('Natively-flight-rdcal', 'Natively-flight-rdcal-dry', 'Natively-flight-rdcal-precheck', 'Natively-rdcal-busy')

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
        Register-Dummy 'Natively-flight-rdcal' '/c exit 0' (New-ScheduledTaskTrigger -Once -At $trigDt)
        if ($DryMode -ne 'none') {
            $cmdPath = Join-Path $dryDir ('rdcal-dry-' + $DryMode + '.cmd')
            if (-not (Test-Path -LiteralPath $cmdPath)) { throw "missing $cmdPath" }
            Register-Dummy 'Natively-flight-rdcal-dry' ('/c "' + $cmdPath + '"') $null
        } else {
            $old = Get-ScheduledTask -TaskName 'Natively-flight-rdcal-dry' -ErrorAction SilentlyContinue
            if ($old) { Remove-Dummy 'Natively-flight-rdcal-dry' }
        }
        $ft = Get-ScheduledTask -TaskName 'Natively-flight-rdcal'
        $fi = Get-ScheduledTaskInfo -TaskName 'Natively-flight-rdcal'
        Write-Output ("SETUP Natively-flight-rdcal state=" + $ft.State + " next=" + $fi.NextRunTime + " StartWhenAvailable=" + $ft.Settings.StartWhenAvailable + " dry=" + $DryMode)
    }
    'teardown' {
        foreach ($n in $allowed) { Remove-Dummy $n }
        Write-Output 'TEARDOWN done'
    }
    'busy-start' {
        Register-Dummy 'Natively-rdcal-busy' '/c ping -n 90 127.0.0.1 >nul' $null
        Start-ScheduledTask -TaskName 'Natively-rdcal-busy'
        for ($i = 0; $i -lt 20; $i++) { if ([string](Get-ScheduledTask -TaskName 'Natively-rdcal-busy').State -eq 'Running') { break }; Start-Sleep -Seconds 1 }
        Write-Output ("BUSY Natively-rdcal-busy state=" + (Get-ScheduledTask -TaskName 'Natively-rdcal-busy').State)
    }
    'busy-stop' {
        Remove-Dummy 'Natively-rdcal-busy'
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
        # CALIBRATION of register-rd.ps1's read-back: flip StartWhenAvailable to True on a dummy, so verify must refuse it
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
        $real = @(Get-ScheduledTask -ErrorAction SilentlyContinue | Where-Object { $_.TaskName -in @('Natively-flight-rd', 'Natively-flight-rd-dry', 'Natively-flight-rd-precheck') })
        if ($left.Count -eq 0) { Write-Output ('no rdcal task left; real rd tasks present: ' + $real.Count) }
        else { Write-Output ('rdcal TASKS LEFT: ' + (($left | ForEach-Object { $_.TaskName }) -join ', ')) }
    }
    default { throw "-Action must be setup, teardown, busy-start, busy-stop, state, parse or leftovers" }
}
