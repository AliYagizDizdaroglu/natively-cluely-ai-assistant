# E\night-gates.ps1  (AMENDMENT-A2 A2.6 / A2.10 P5, as changed by A3.7 m13, A4.3b and fix round 1 of tools-367-review / A4-RECHECK)
# Night-safety gates for the flight-eq hour. READ-ONLY: it reads powercfg, WMI and the registry and changes nothing.
#
#   powershell -File night-gates.ps1 -At 'yyyy-MM-dd HH:mm' [-FakeJson <file>] [-PowercfgTextFile <file>]
#
# One line per gate, 'NIGHT <name>: OK|FAIL <reading>', then two informational lines 'NIGHT <name>: INFO <reading>' (never a
# verdict), then 'NIGHT GATES OK' (exit 0) or 'NIGHT GATES FAILED (<n>): <names>' (exit 1). A bad -At or a bad fake: exit 2.
# Gates (all FAIL = no hour):
#   standby-ac    AC 'sleep after' timeout is 0 (never)            [powercfg /q SCHEME_CURRENT SUB_SLEEP STANDBYIDLE]
#   hibernate-ac  AC 'hibernate after' timeout is 0 (never)        [HIBERNATEIDLE]
#                 powercfg's text must hold EXACTLY five 0x........ values (min, max, increment, AC, DC); AC is the fourth.
#                 Anything else is unreadable = FAIL.
#   power         the AC line (GetSystemPowerStatus ACLineStatus) must read online in EVERY passing case, AND either every
#                 Win32_Battery BatteryStatus is in {2,3,6,7,8,9,11} (2 = AC; the others are AC-connected charge states: a
#                 charging laptop reports 6, not 2), or Win32_Battery returned no instance AND GetSystemPowerStatus BatteryFlag
#                 says 128 ('no system battery'; the deliberate desktop signal). A failed Win32_Battery query, or an empty one
#                 while BatteryFlag does not say 128, is FAIL (never read as "no battery"). Departure from A2's literal text
#                 ("no battery, or BatteryStatus 2"): A4.3b / A4-RECHECK m2, a battery-only state can never pass.
#   reboot        CBS RebootPending or WU RebootRequired present = FAIL (PendingFileRenameOperations printed, not gated).
#                 FAIL too when a parent key of those flags (Component Based Servicing; WindowsUpdate\Auto Update) is missing:
#                 then the flags cannot be read (a path typo must not read as "absent").
#   updates       Windows Update active hours (wrap-aware, inclusive) cover [At-30 min, At+5 h], OR the EARLIEST of the present
#                 PauseUpdatesExpiryTime / PauseQualityUpdatesEndTime / PauseFeatureUpdatesEndTime > At+5 h (strict; one
#                 unparseable value = no pause). Missing ActiveHoursStart/End: FAIL unless the pause covers.
#                 AND (A5.5 N-m3, tools-367 re-review NG-I1) none of these policy override values is present under
#                 Policies\Microsoft\Windows\WindowsUpdate or ...\WindowsUpdate\AU: SetActiveHours, ActiveHoursStart,
#                 ActiveHoursEnd, ConfigureDeadlineForQualityUpdates, ConfigureDeadlineForFeatureUpdates, SetComplianceDeadline,
#                 SetDisablePauseUXAccess, AlwaysAutoRebootAtScheduledTime. Any present = FAIL updates, whatever the hours say.
#   INFO lines    'NIGHT policy: INFO' (Policies\...\WindowsUpdate\AU NoAutoUpdate, AUOptions, and which override values are
#                 present) and 'NIGHT pause-status: INFO' (UpdatePolicy\Settings PausedQualityStatus / PausedFeatureStatus).
#                 Never a verdict of their own (the override values also gate 'updates', above).
# -FakeJson (calibration only; the guard never passes it) replaces ALL readings; a missing key is a refusal (exit 2).
#   keys: standbyAcSec, hibernateAcSec (int), battery ("none" | "error" | int | [int]), batteryFlag (int | null),
#         acLine (true|false|null), rebootPendingCbs, rebootRequiredWu, pendingFileRename (bool),
#         rebootParentMissing (string | null), activeHoursStart, activeHoursEnd (int 0-23 | null),
#         pauseUpdatesExpiry, pauseQualityUpdatesEnd, pauseFeatureUpdatesEnd (ISO string | null),
#         pausedQualityStatus, pausedFeatureStatus, policyNoAutoUpdate, policyAUOptions (int | null),
#         policyOverrides (array of value names)
# -PowercfgTextFile (calibration only): the text a `powercfg /q` would print, read from a file for BOTH sleep settings (with
#   -FakeJson it replaces the fake's two timeouts; everything else stays as the fake says).
# ASCII only; saved with a UTF-8 BOM. PowerShell names are case-insensitive: every name below is distinct ($At, not $AtText:
# a parameter prefix such as -At must stay unambiguous).
param(
    [string]$At = '',
    [string]$FakeJson = '',
    [string]$PowercfgTextFile = ''
)
$ErrorActionPreference = 'Stop'
$inv = [System.Globalization.CultureInfo]::InvariantCulture

function Exit-Usage([string]$why) {
    Write-Output ("NIGHT usage error: " + $why)
    Write-Output "usage: night-gates.ps1 -At 'yyyy-MM-dd HH:mm' [-FakeJson <file>] [-PowercfgTextFile <file>]"
    exit 2
}

# ---- -At ------------------------------------------------------------------------------------------------
$atLocal = [datetime]::MinValue
if ($At -notmatch '^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$' -or
    -not [datetime]::TryParseExact($At, 'yyyy-MM-dd HH:mm', $inv, [System.Globalization.DateTimeStyles]::None, [ref]$atLocal)) {
    Exit-Usage "-At must be a valid 'yyyy-MM-dd HH:mm' (got '$At')"
}
if ($PowercfgTextFile -and -not (Test-Path -LiteralPath $PowercfgTextFile)) { Exit-Usage "-PowercfgTextFile not found" }
$atOffset = New-Object System.DateTimeOffset($atLocal, [System.TimeZoneInfo]::Local.GetUtcOffset($atLocal))
$winLo = $atLocal.AddMinutes(-30)      # local wall clock, as the active hours are
$winHi = $atLocal.AddHours(5)
$paHi  = $atOffset.AddHours(5)         # absolute instant, as the pause expiry is

# ---- readings -------------------------------------------------------------------------------------------
function Get-AcFromPowercfgText([string]$raw) {
    # A powercfg /q block lists Minimum, Maximum and increment, then the Current AC and Current DC index, all as 0x.........
    # The label text is localised, so count the hex values: exactly five, and AC is the fourth. Anything else is unreadable.
    $hexes = [regex]::Matches($raw, '0x[0-9a-fA-F]{8}')
    if ($hexes.Count -ne 5) { return $null }
    return [Convert]::ToInt64($hexes[3].Value.Substring(2), 16)
}

function Read-AcSetting([string]$alias) {
    if ($PowercfgTextFile) { $raw = Get-Content -LiteralPath $PowercfgTextFile -Raw -Encoding UTF8 }
    else { $raw = (& powercfg.exe /q SCHEME_CURRENT SUB_SLEEP $alias | Out-String) }
    return Get-AcFromPowercfgText $raw
}

function Read-PowerStatus {
    # kernel32 GetSystemPowerStatus: ACLineStatus 1 = online, 0 = offline, 255 = unknown; BatteryFlag 128 = no system battery
    if (-not ('NightGatesNative' -as [type])) {
        Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public static class NightGatesNative { [StructLayout(LayoutKind.Sequential)] public struct SPS { public byte AC; public byte BF; public byte BLP; public byte R1; public int BLT; public int BFT; } [DllImport("kernel32.dll")] public static extern bool GetSystemPowerStatus(out SPS s); }'
    }
    $sps = New-Object NightGatesNative+SPS
    if (-not [NightGatesNative]::GetSystemPowerStatus([ref]$sps)) { return @{ ac = $null; flag = $null } }
    $acv = $null
    if ($sps.AC -eq 1) { $acv = $true } elseif ($sps.AC -eq 0) { $acv = $false }
    return @{ ac = $acv; flag = [int]$sps.BF }
}

function Read-Real {
    $uxPath = 'HKLM:\SOFTWARE\Microsoft\WindowsUpdate\UX\Settings'
    $ux = Get-ItemProperty -Path $uxPath -ErrorAction SilentlyContinue
    $upPath = 'HKLM:\SOFTWARE\Microsoft\WindowsUpdate\UpdatePolicy\Settings'
    $up = Get-ItemProperty -Path $upPath -ErrorAction SilentlyContinue
    $polWu = Get-ItemProperty -Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate' -ErrorAction SilentlyContinue
    $polAu = Get-ItemProperty -Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU' -ErrorAction SilentlyContinue
    $batList = @()
    $batErr = $false
    try { $batList = @(Get-CimInstance -ClassName Win32_Battery -ErrorAction Stop | ForEach-Object { [int]$_.BatteryStatus }) } catch { $batList = @(); $batErr = $true }
    $pfr = $null
    try { $pfr = (Get-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager' -Name PendingFileRenameOperations -ErrorAction Stop).PendingFileRenameOperations } catch { $pfr = $null }
    $ps = Read-PowerStatus
    $cbsParent = 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Component Based Servicing'
    $wuParent  = 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\WindowsUpdate\Auto Update'
    $parentMissing = $null
    if (-not (Test-Path $cbsParent)) { $parentMissing = 'Component Based Servicing' }
    elseif (-not (Test-Path $wuParent)) { $parentMissing = 'WindowsUpdate\Auto Update' }
    $overrideNames = 'SetActiveHours', 'ActiveHoursStart', 'ActiveHoursEnd', 'ConfigureDeadlineForQualityUpdates', 'ConfigureDeadlineForFeatureUpdates', 'SetComplianceDeadline', 'SetDisablePauseUXAccess', 'AlwaysAutoRebootAtScheduledTime'
    $present = @()
    foreach ($key in @($polWu, $polAu)) {
        if ($key) { foreach ($nm in $overrideNames) { if (($key.PSObject.Properties.Name -contains $nm) -and ($present -notcontains $nm)) { $present += $nm } } }
    }
    return @{
        standbyAcSec          = Read-AcSetting 'STANDBYIDLE'
        hibernateAcSec        = Read-AcSetting 'HIBERNATEIDLE'
        battery               = $batList
        batteryQueryError     = $batErr
        batteryFlag           = $ps.flag
        acLine                = $ps.ac
        rebootPendingCbs      = [bool](Test-Path 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Component Based Servicing\RebootPending')
        rebootRequiredWu      = [bool](Test-Path 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\WindowsUpdate\Auto Update\RebootRequired')
        rebootParentMissing   = $parentMissing
        pendingFileRename     = [bool]($null -ne $pfr)
        activeHoursStart      = $(if ($ux -and $null -ne $ux.ActiveHoursStart) { [int]$ux.ActiveHoursStart } else { $null })
        activeHoursEnd        = $(if ($ux -and $null -ne $ux.ActiveHoursEnd) { [int]$ux.ActiveHoursEnd } else { $null })
        pauseUpdatesExpiry    = $(if ($ux -and $ux.PauseUpdatesExpiryTime) { [string]$ux.PauseUpdatesExpiryTime } else { $null })
        pauseQualityUpdatesEnd = $(if ($ux -and $ux.PauseQualityUpdatesEndTime) { [string]$ux.PauseQualityUpdatesEndTime } else { $null })
        pauseFeatureUpdatesEnd = $(if ($ux -and $ux.PauseFeatureUpdatesEndTime) { [string]$ux.PauseFeatureUpdatesEndTime } else { $null })
        pausedQualityStatus   = $(if ($up -and $null -ne $up.PausedQualityStatus) { [int]$up.PausedQualityStatus } else { $null })
        pausedFeatureStatus   = $(if ($up -and $null -ne $up.PausedFeatureStatus) { [int]$up.PausedFeatureStatus } else { $null })
        policyNoAutoUpdate    = $(if ($polAu -and $null -ne $polAu.NoAutoUpdate) { [int]$polAu.NoAutoUpdate } else { $null })
        policyAUOptions       = $(if ($polAu -and $null -ne $polAu.AUOptions) { [int]$polAu.AUOptions } else { $null })
        policyOverrides       = $present
    }
}

function Read-Fake([string]$path) {
    if (-not (Test-Path -LiteralPath $path)) { Exit-Usage "-FakeJson file not found" }
    try { $obj = Get-Content -LiteralPath $path -Raw -Encoding UTF8 | ConvertFrom-Json } catch { Exit-Usage "-FakeJson is not valid JSON" }
    $need = 'standbyAcSec','hibernateAcSec','battery','batteryFlag','acLine','rebootPendingCbs','rebootRequiredWu','rebootParentMissing','pendingFileRename','activeHoursStart','activeHoursEnd','pauseUpdatesExpiry','pauseQualityUpdatesEnd','pauseFeatureUpdatesEnd','pausedQualityStatus','pausedFeatureStatus','policyNoAutoUpdate','policyAUOptions','policyOverrides'
    $have = @($obj.PSObject.Properties.Name)
    foreach ($k in $need) { if ($have -notcontains $k) { Exit-Usage "-FakeJson lacks key '$k' (a fake replaces every reading)" } }
    $bat = $obj.battery
    $batErr = $false
    if ($bat -is [string]) {
        if ($bat -eq 'none') { $bat = @() }
        elseif ($bat -eq 'error') { $bat = @(); $batErr = $true }
        else { Exit-Usage "-FakeJson battery must be 'none', 'error', an int or an int array" }
    } else { $bat = @($bat | ForEach-Object { [int]$_ }) }
    return @{
        standbyAcSec          = $(if ($null -ne $obj.standbyAcSec) { [int64]$obj.standbyAcSec } else { $null })
        hibernateAcSec        = $(if ($null -ne $obj.hibernateAcSec) { [int64]$obj.hibernateAcSec } else { $null })
        battery               = $bat
        batteryQueryError     = $batErr
        batteryFlag           = $(if ($null -ne $obj.batteryFlag) { [int]$obj.batteryFlag } else { $null })
        acLine                = $obj.acLine
        rebootPendingCbs      = [bool]$obj.rebootPendingCbs
        rebootRequiredWu      = [bool]$obj.rebootRequiredWu
        rebootParentMissing   = $(if ($obj.rebootParentMissing) { [string]$obj.rebootParentMissing } else { $null })
        pendingFileRename     = [bool]$obj.pendingFileRename
        activeHoursStart      = $(if ($null -ne $obj.activeHoursStart) { [int]$obj.activeHoursStart } else { $null })
        activeHoursEnd        = $(if ($null -ne $obj.activeHoursEnd) { [int]$obj.activeHoursEnd } else { $null })
        pauseUpdatesExpiry    = $(if ($obj.pauseUpdatesExpiry) { [string]$obj.pauseUpdatesExpiry } else { $null })
        pauseQualityUpdatesEnd = $(if ($obj.pauseQualityUpdatesEnd) { [string]$obj.pauseQualityUpdatesEnd } else { $null })
        pauseFeatureUpdatesEnd = $(if ($obj.pauseFeatureUpdatesEnd) { [string]$obj.pauseFeatureUpdatesEnd } else { $null })
        pausedQualityStatus   = $(if ($null -ne $obj.pausedQualityStatus) { [int]$obj.pausedQualityStatus } else { $null })
        pausedFeatureStatus   = $(if ($null -ne $obj.pausedFeatureStatus) { [int]$obj.pausedFeatureStatus } else { $null })
        policyNoAutoUpdate    = $(if ($null -ne $obj.policyNoAutoUpdate) { [int]$obj.policyNoAutoUpdate } else { $null })
        policyAUOptions       = $(if ($null -ne $obj.policyAUOptions) { [int]$obj.policyAUOptions } else { $null })
        policyOverrides       = @($obj.policyOverrides | Where-Object { $null -ne $_ } | ForEach-Object { [string]$_ })
    }
}

# ---- gates ----------------------------------------------------------------------------------------------
$failed = New-Object System.Collections.Generic.List[string]
function Emit-Gate([string]$gate, [bool]$ok, [string]$reading) {
    if ($ok) { Write-Output ("NIGHT " + $gate + ": OK " + $reading) }
    else { Write-Output ("NIGHT " + $gate + ": FAIL " + $reading); $failed.Add($gate) }
}
function Fmt-Hex($n) { if ($null -eq $n) { return 'unreadable' } return ('0x{0:x8} ({1} s)' -f [int64]$n, [int64]$n) }
function Fmt-Opt($n) { if ($null -eq $n) { return 'absent' } return [string]$n }

function Test-HoursCover([int]$hStart, [int]$hEnd, [datetime]$from, [datetime]$to) {
    if ($hStart -eq $hEnd) { return $false }
    foreach ($dayOff in -1, 0, 1) {
        $day = $from.Date.AddDays($dayOff)
        $winStart = $day.AddHours($hStart)
        if ($hStart -lt $hEnd) { $winEnd = $day.AddHours($hEnd) } else { $winEnd = $day.AddDays(1).AddHours($hEnd) }
        if ($winStart -le $from -and $to -le $winEnd) { return $true }
    }
    return $false
}

$rd = $(if ($FakeJson) { Read-Fake $FakeJson } else { Read-Real })
if ($PowercfgTextFile) {
    $rd.standbyAcSec = Read-AcSetting 'STANDBYIDLE'
    $rd.hibernateAcSec = Read-AcSetting 'HIBERNATEIDLE'
}
if ($FakeJson) { Write-Output 'NIGHT note: readings are FAKED by -FakeJson (calibration only)' }
if ($PowercfgTextFile) { Write-Output 'NIGHT note: the sleep timeouts are parsed from -PowercfgTextFile (calibration only)' }

# standby-ac, hibernate-ac
Emit-Gate 'standby-ac'   ($null -ne $rd.standbyAcSec   -and $rd.standbyAcSec   -eq 0) ('AC sleep timeout ' + (Fmt-Hex $rd.standbyAcSec))
Emit-Gate 'hibernate-ac' ($null -ne $rd.hibernateAcSec -and $rd.hibernateAcSec -eq 0) ('AC hibernate timeout ' + (Fmt-Hex $rd.hibernateAcSec))

# power: on AC in EVERY passing case (A4.3b + A4-RECHECK m2)
$bats = @($rd.battery)
$acTxt = $(if ($null -eq $rd.acLine) { 'unknown' } elseif ($rd.acLine) { 'online' } else { 'offline' })
$batTxt = $(if ($rd.batteryQueryError) { 'Win32_Battery query FAILED' } elseif ($bats.Count -eq 0) { 'no Win32_Battery instance' } else { 'battery status ' + ($bats -join ',') })
$flagTxt = $(if ($null -eq $rd.batteryFlag) { 'unknown' } else { [string]$rd.batteryFlag })
$chargeAc = @(2, 3, 6, 7, 8, 9, 11)
$powerOk = $false
if ($rd.acLine -ne $true) { $powerOk = $false }
elseif ($rd.batteryQueryError) { $powerOk = $false }
elseif ($bats.Count -eq 0) { if ($rd.batteryFlag -eq 128) { $powerOk = $true } }
else { $powerOk = (@($bats | Where-Object { $chargeAc -notcontains $_ }).Count -eq 0) }
Emit-Gate 'power' $powerOk ('AC line ' + $acTxt + ', ' + $batTxt + ', BatteryFlag ' + $flagTxt + ' (OK needs AC online and every status in 2,3,6,7,8,9,11, or no battery with BatteryFlag 128)')

# reboot
$cbsTxt = $(if ($rd.rebootPendingCbs) { 'PRESENT' } else { 'absent' })
$wuTxt  = $(if ($rd.rebootRequiredWu) { 'PRESENT' } else { 'absent' })
$pfrTxt = $(if ($rd.pendingFileRename) { 'present' } else { 'absent' })
if ($rd.rebootParentMissing) {
    Emit-Gate 'reboot' $false ('parent registry key missing: ' + $rd.rebootParentMissing + ' (the pending-reboot flags cannot be read)')
} else {
    Emit-Gate 'reboot' (-not ($rd.rebootPendingCbs -or $rd.rebootRequiredWu)) ("CBS RebootPending " + $cbsTxt + ", WU RebootRequired " + $wuTxt + " (PendingFileRenameOperations " + $pfrTxt + ", not gated)")
}

# updates
$winTxt = $winLo.ToString('yyyy-MM-dd HH:mm') + ' .. ' + $winHi.ToString('yyyy-MM-dd HH:mm')
$hoursOk = $false
$ahTxt = 'active hours missing'
if ($null -ne $rd.activeHoursStart -and $null -ne $rd.activeHoursEnd -and
    $rd.activeHoursStart -ge 0 -and $rd.activeHoursStart -le 23 -and $rd.activeHoursEnd -ge 0 -and $rd.activeHoursEnd -le 23) {
    $hoursOk = Test-HoursCover $rd.activeHoursStart $rd.activeHoursEnd $winLo $winHi
    $ahTxt = 'active hours ' + $rd.activeHoursStart + '->' + $rd.activeHoursEnd + $(if ($hoursOk) { ' cover' } else { ' do NOT cover' })
}
$pauseOk = $false
$pTxt = 'no pause'
$pauseVals = [ordered]@{ PauseUpdatesExpiryTime = $rd.pauseUpdatesExpiry; PauseQualityUpdatesEndTime = $rd.pauseQualityUpdatesEnd; PauseFeatureUpdatesEndTime = $rd.pauseFeatureUpdatesEnd }
$pePresent = @($pauseVals.Keys | Where-Object { $pauseVals[$_] })
if ($pePresent.Count -gt 0) {
    $earliest = $null
    $badName = $null
    foreach ($pk in $pePresent) {
        $pe = [System.DateTimeOffset]::MinValue
        if ([System.DateTimeOffset]::TryParse($pauseVals[$pk], $inv, [System.Globalization.DateTimeStyles]::AssumeUniversal, [ref]$pe)) {
            if ($null -eq $earliest -or $pe -lt $earliest) { $earliest = $pe }
        } else { $badName = $pk }
    }
    if ($badName) { $pTxt = 'pause value unparseable: ' + $badName }
    else {
        $pauseOk = ($earliest -gt $paHi)
        $pTxt = 'pause to ' + $earliest.UtcDateTime.ToString("yyyy-MM-dd'T'HH:mm:ss'Z'") + $(if ($pauseOk) { ' > ' } else { ' <= ' }) + 'At+5h (' + $paHi.UtcDateTime.ToString("yyyy-MM-dd'T'HH:mm:ss'Z'") + ') [earliest of ' + $pePresent.Count + ' value(s)]'
    }
}
$ovTxt = $(if (@($rd.policyOverrides).Count -gt 0) { (@($rd.policyOverrides) -join ',') } else { 'none' })
$ovOk = (@($rd.policyOverrides).Count -eq 0)
Emit-Gate 'updates' (($hoursOk -or $pauseOk) -and $ovOk) ('[' + $winTxt + '] ' + $ahTxt + '; ' + $pTxt + '; policy override values: ' + $ovTxt)

# informational lines (never a verdict of their own)
Write-Output ('NIGHT policy: INFO NoAutoUpdate=' + (Fmt-Opt $rd.policyNoAutoUpdate) + ' AUOptions=' + (Fmt-Opt $rd.policyAUOptions) + '; override values present: ' + $ovTxt + ' (also gate updates)')
Write-Output ('NIGHT pause-status: INFO PausedQualityStatus=' + (Fmt-Opt $rd.pausedQualityStatus) + ' PausedFeatureStatus=' + (Fmt-Opt $rd.pausedFeatureStatus) + ' (informational, not gated)')

if ($failed.Count -eq 0) { Write-Output 'NIGHT GATES OK'; exit 0 }
Write-Output ('NIGHT GATES FAILED (' + $failed.Count + '): ' + ($failed -join ', '))
exit 1
