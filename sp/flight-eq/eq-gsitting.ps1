# eq-gsitting.ps1 - the post-hour G sitting runner of flight-eq (PREREGISTER section 2 and A2.2, A3.4, A4.4(c), A5 (B-I1, marker-first), A7 I3, NOTE-controller-tools; fix round 1 of gsitting-review.md).
#
#   normal : powershell -ExecutionPolicy Bypass -File E\eq-gsitting.ps1 -Run <run-dir> -ReaderOut <file> -B4CalOut <file> -Headroom35 <n> -Headroom31 <n> [-WhatIf]
#   resume : the same plus -Resume   (continues from the first step without a clean `end exit=0` line)
#   holes  : the same plus -Holes "<rep>:<ids>[;<rep>:<ids>...]"   (front rep 1-5 as `3:S1Q04F,S2Q05F`; back rep 1-3 with a b prefix as `b2:S1Q06F`)
#
# 16 steps, strictly in order, each ONE `interview60.answers.mjs` call (cwd MAIN, stdout+stderr to E\gsitting-out\step-<n>.out/err.txt, never echoed):
#   front 3.5-lite HIGH, reps 1..5: captured-g-high[-rK] (block) and captured-no-block-high[-rK] (--no-block);  back 3.1-lite LOW, reps 1..3: captured-g-low[-rK], captured-no-block-low[-rK]
#   counterbalanced (A3.4): front reps 1,3,5 block first, reps 2,4 no-block first; back rep 1 block first, rep 2 no-block first, rep 3 block first.
# Every call carries  --tag <tag> --thinking HIGH|LOW [--no-block] --captured <Run>\interview60.prompts.json --only <G_twin>  (PAIRED_ARMS' args for captured-high / captured-low).
# <G_twin> is READ from the reader's output file (line "READ G_twin = {a, b, c} (n)"), never typed. -Holes uses --only <the hole ids> (eq-twins accepts either).
# The child gets launch-eq.cmd's full env block, parsed at run time: every `set (NATIVELY|I60)_X=value` is applied, every `set X=` (empty) removes the name.
#
# Log E\gsitting.log (append, UTF-8 no BOM, LF), the ONLY lines starting with STEP:
#   STEP <n> <tag> start <iso-utc>
#   STEP <n> <tag> end <iso-utc> exit=<code>
# Other lines start with GSITTING (begin, refuse, stop, resume, failed-attempt, note, done). A -Resume re-run of step n keeps its number and tag, so the failed attempt's
# STEP lines are rewritten to `GSITTING failed-attempt STEP ...` (eq-twins' parseSitting refuses a duplicate tag); the whole old log is first copied to the failed folder.
# -Holes steps are numbered 17 and up with eq-twins' tagOf(..., b=true) tags: `<base>-rK-b` (rep 1 too: `<base>-r1-b`).
#
# Refuses (exit 2, one GSITTING refuse line, no STEP line): A7 I3 cutoff (projected steps x 3 min) | a Natively-* task Running | electron.exe running | launch-eq.cmd missing or 0 env names |
#   quota ledger unreadable | G_twin unreadable or < 3 | the reader's or b4cal's run name is not -Run | eq-b4-cal DIFF, BLOCK FAIL (marker-first excepted), LABEL OUTSIDE --g not NONE (A5.5 B-I1) |
#   m6 ledger bars | stale outputs / a log that already holds STEP lines (normal mode) | -Resume with nothing to resume | -Holes on a rep with no hole or before 16 clean steps.
# A non-zero step exit: the sitting stops, a GSITTING stop line names the step, exit 1. No automatic retry: -Resume and -Holes are separate controller calls.
# Exit: 0 all steps exit 0 | 1 a step failed | 2 refusal or usage | 4 crash.
# Test seams (calibration only, never given on a real run): -NodeExe -AnswersScript -LedgerScript -GoldenDir -LogPath -OutDir -LauncherCmd -NowOverride -FakeRunningTasks -FakeElectronCount -GapLimitMinutes -SlowMinutes.
# No model call is made by this script itself; the answers calls are the registered ones.
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$Run,
    [Parameter(Mandatory = $true)][string]$ReaderOut,
    [Parameter(Mandatory = $true)][string]$B4CalOut,
    [Parameter(Mandatory = $true)][int]$Headroom35,
    [Parameter(Mandatory = $true)][int]$Headroom31,
    [switch]$WhatIf,
    [switch]$Resume,
    [string]$Holes = '',
    [string]$NodeExe = 'C:\Program Files\nodejs\node.exe',
    [string]$AnswersScript = '',
    [string]$LedgerScript = '',
    [string]$GoldenDir = '',
    [string]$LogPath = '',
    [string]$OutDir = '',
    [string]$LauncherCmd = '',
    [string]$NowOverride = '',
    [string[]]$FakeRunningTasks = $null,
    [int]$FakeElectronCount = -1,
    [double]$GapLimitMinutes = 15,
    [double]$SlowMinutes = 10
)
$ErrorActionPreference = 'Stop'

$vUe = [string][char]0xFC
$vMain = 'C:\Users\sotka\OneDrive\Masa' + $vUe + 'st' + $vUe + '\natively-cluely-ai-assistant'
$vEdir = $PSScriptRoot
$vSp = Split-Path -Parent $vEdir
if ($GoldenDir -eq '') { $GoldenDir = Join-Path $vMain 'electron\test\golden' }
if ($AnswersScript -eq '') { $AnswersScript = Join-Path $GoldenDir 'interview60.answers.mjs' }
if ($LedgerScript -eq '') { $LedgerScript = Join-Path $vSp 'quota-ledger-today.mjs' }
if ($LogPath -eq '') { $LogPath = Join-Path $vEdir 'gsitting.log' }
if ($OutDir -eq '') { $OutDir = Join-Path $vEdir 'gsitting-out' }
if ($LauncherCmd -eq '') { $LauncherCmd = Join-Path $vEdir 'launch-eq.cmd' }

$vFront = 'gemini-3.5-flash-lite'
$vBack = 'gemini-3.1-flash-lite'
$vStepCount = 16
$vMinutesPerStep = 3
$vGapLimitMin = $GapLimitMinutes
$vSlowMin = $SlowMinutes

function Get-IsoUtc { return [DateTime]::UtcNow.ToString("yyyy-MM-dd'T'HH:mm:ss.fff'Z'") }
function Write-Log([string]$vLine) { [IO.File]::AppendAllText($LogPath, $vLine + "`n", (New-Object System.Text.UTF8Encoding($false))) }
function Stop-Refuse([string]$vWhy) {
    $vMsg = 'GSITTING refuse ' + (Get-IsoUtc) + ': ' + $vWhy
    Write-Output $vMsg
    if (-not $WhatIf) { try { Write-Log $vMsg } catch { } }
    exit 2
}
# the STEP lines of the log as tag -> @{N; Start; End; Exit}; $null when the file is absent
function Read-StepLog {
    $vState = @{}
    if (-not (Test-Path -LiteralPath $LogPath)) { return $vState }
    foreach ($vRaw in (Get-Content -LiteralPath $LogPath -Encoding UTF8)) {
        $vLm = [regex]::Match($vRaw, '^STEP (\d+) (\S+) (start|end) (\S+?)(?: exit=(-?\d+))?$')
        if (-not $vLm.Success) { continue }
        $vTagK = $vLm.Groups[2].Value
        if (-not $vState.ContainsKey($vTagK)) { $vState[$vTagK] = @{ N = [int]$vLm.Groups[1].Value; Start = $null; End = $null; Exit = $null } }
        if ($vLm.Groups[3].Value -eq 'start') { $vState[$vTagK].Start = $vLm.Groups[4].Value } else { $vState[$vTagK].End = $vLm.Groups[4].Value; if ($vLm.Groups[5].Success) { $vState[$vTagK].Exit = [int]$vLm.Groups[5].Value } }
    }
    return $vState
}
function Out-FileOf([string]$vModel, [string]$vTag) { return (Join-Path $GoldenDir ('interview60.answers.' + $vModel + '_' + $vTag + '.json')) }

try {
    if ($Resume -and $Holes -ne '') { Stop-Refuse '-Resume and -Holes are exclusive' }
    $vMode = 'normal'
    if ($Resume) { $vMode = 'resume' }
    if ($Holes -ne '') { $vMode = 'holes' }

    # ---- the base plan: 16 steps, counterbalanced (A3.4) ----
    $vSteps = New-Object System.Collections.ArrayList
    $vN = 0
    foreach ($vLeg in @(@{ Name = 'front'; Model = $vFront; Think = 'HIGH'; Lv = 'high'; Reps = 5 }, @{ Name = 'back'; Model = $vBack; Think = 'LOW'; Lv = 'low'; Reps = 3 })) {
        for ($vRep = 1; $vRep -le $vLeg.Reps; $vRep++) {
            $vSfx = ''
            if ($vRep -gt 1) { $vSfx = '-r' + $vRep }
            $vBlockStep = @{ Tag = 'captured-g-' + $vLeg.Lv + $vSfx; NoBlock = $false; Arm = 'blk' }
            $vNoBlockStep = @{ Tag = 'captured-no-block-' + $vLeg.Lv + $vSfx; NoBlock = $true; Arm = 'nob' }
            if (($vRep % 2) -eq 1) { $vPair = @($vBlockStep, $vNoBlockStep) } else { $vPair = @($vNoBlockStep, $vBlockStep) }
            foreach ($vItem in $vPair) {
                $vN++
                $null = $vSteps.Add(@{ N = $vN; Tag = $vItem.Tag; NoBlock = $vItem.NoBlock; Model = $vLeg.Model; Think = $vLeg.Think; Leg = $vLeg.Name; Rep = $vRep; Second = (($vN % 2) -eq 0) })
            }
        }
    }
    if ($vSteps.Count -ne $vStepCount) { throw "internal: plan has $($vSteps.Count) steps, expected $vStepCount" }
    foreach ($vS in $vSteps) { $vS.Out = Out-FileOf $vS.Model $vS.Tag }

    # ---- the steps this call will run (decided after the log is read; the cutoff needs their count) ----
    $vLogState = Read-StepLog
    $vRunList = @()
    $vFirstIdx = 0
    $vHoleSpecs = @()
    if ($vMode -eq 'normal') { $vRunList = @($vSteps) }
    if ($vMode -eq 'resume') {
        if ($vLogState.Count -eq 0) { Stop-Refuse 'nothing to resume: the log holds no STEP line (run without -Resume)' }
        $vFirstIdx = -1
        for ($vI = 0; $vI -lt $vStepCount; $vI++) {
            $vSt = $vLogState[$vSteps[$vI].Tag]
            $vClean = ($null -ne $vSt) -and ($null -ne $vSt.Start) -and ($null -ne $vSt.End) -and ($vSt.Exit -eq 0)
            if (-not $vClean) { $vFirstIdx = $vI; break }
        }
        if ($vFirstIdx -lt 0) { Stop-Refuse 'nothing to resume: all 16 steps already end exit=0' }
        for ($vI = 0; $vI -lt $vFirstIdx; $vI++) { if (-not (Test-Path -LiteralPath $vSteps[$vI].Out)) { Stop-Refuse ("resume: step " + $vSteps[$vI].N + " is clean in the log but its output file is missing") } }
        for ($vI = $vFirstIdx + 1; $vI -lt $vStepCount; $vI++) {
            if ($vLogState.ContainsKey($vSteps[$vI].Tag)) { Stop-Refuse ("resume: step " + $vSteps[$vI].N + " has STEP lines but an earlier step is not clean: the log is not a stop-at-first-failure log") }
            if (Test-Path -LiteralPath $vSteps[$vI].Out) { Stop-Refuse ("resume: step " + $vSteps[$vI].N + " (" + $vSteps[$vI].Tag + ") has an output file but never ran: tags are never reused") }
        }
        $vRunList = @($vSteps[$vFirstIdx..($vStepCount - 1)])
    }
    if ($vMode -eq 'holes') {
        if ($vLogState.Count -eq 0) { Stop-Refuse '-Holes: the log holds no STEP line, there is no sitting to re-run holes of' }
        foreach ($vS in $vSteps) {
            $vSt = $vLogState[$vS.Tag]
            if (($null -eq $vSt) -or ($null -eq $vSt.End) -or ($vSt.Exit -ne 0)) { Stop-Refuse ("-Holes: step " + $vS.N + " " + $vS.Tag + " has no clean end exit=0 line: finish the sitting with -Resume first") }
        }
        $vSeenSpec = @{}
        foreach ($vSpecRaw in ($Holes -split ';')) {
            $vSpecM = [regex]::Match($vSpecRaw.Trim(), '^(b?)(\d+):([A-Za-z0-9_,]+)$')
            if (-not $vSpecM.Success) { Stop-Refuse ("-Holes spec '" + $vSpecRaw + "' is not <rep>:<ids> (back reps as b<rep>:<ids>)") }
            $vSpecLeg = 'front'; $vSpecMax = 5
            if ($vSpecM.Groups[1].Value -eq 'b') { $vSpecLeg = 'back'; $vSpecMax = 3 }
            $vSpecRep = [int]$vSpecM.Groups[2].Value
            if ($vSpecRep -lt 1 -or $vSpecRep -gt $vSpecMax) { Stop-Refuse ("-Holes: " + $vSpecLeg + " rep " + $vSpecRep + " does not exist") }
            if ($vSeenSpec.ContainsKey($vSpecLeg + $vSpecRep)) { Stop-Refuse ("-Holes names " + $vSpecLeg + " rep " + $vSpecRep + " twice") }
            $vSeenSpec[$vSpecLeg + $vSpecRep] = 1
            $vSpecIds = @($vSpecM.Groups[3].Value -split ',' | Where-Object { $_ })
            $vHoleSpecs += , @{ Leg = $vSpecLeg; Rep = $vSpecRep; Ids = $vSpecIds }
        }
        $vHoleSpecs = @($vHoleSpecs | Sort-Object { if ($_.Leg -eq 'front') { 0 } else { 1 } }, { $_.Rep })
    }

    if ($NowOverride -ne '') { $vNow = [DateTime]::Parse($NowOverride, [Globalization.CultureInfo]::InvariantCulture) } else { $vNow = Get-Date }

    # ---- refusal: A7 I3 cutoff. Before 10:00 local the call must be projected to END before 10:00; from 10:00 on it may start (fresh ledger read below) ----
    if ($vMode -eq 'holes') { $vProjSteps = 2 * $vHoleSpecs.Count } else { $vProjSteps = $vRunList.Count }
    $vTen = $vNow.Date.AddHours(10)
    $vProjEnd = $vNow.AddMinutes($vMinutesPerStep * $vProjSteps)
    if ($vNow -lt $vTen -and $vProjEnd -ge $vTen) {
        Stop-Refuse ("A7 I3 cutoff: start " + $vNow.ToString('HH:mm') + " + " + ($vMinutesPerStep * $vProjSteps) + " min = projected end " + $vProjEnd.ToString('HH:mm') + " is not before 10:00 local; start after 10:00 on a fresh ledger read")
    }

    # ---- refusal: machine not quiet ----
    if ($null -ne $FakeRunningTasks) { $vRunTasks = @($FakeRunningTasks | Where-Object { $_ }) }
    else { $vRunTasks = @(Get-ScheduledTask -TaskName 'Natively-*' -ErrorAction SilentlyContinue | Where-Object { $_.State -eq 'Running' } | ForEach-Object { $_.TaskName }) }
    if ($vRunTasks.Count -gt 0) { Stop-Refuse ("Natively-* task(s) Running: " + ($vRunTasks -join ', ')) }
    if ($FakeElectronCount -ge 0) { $vElectronN = $FakeElectronCount } else { $vElectronN = @(Get-CimInstance Win32_Process -Filter "Name='electron.exe'").Count }
    if ($vElectronN -gt 0) { Stop-Refuse ("electron.exe processes: " + $vElectronN) }

    # ---- refusal: the launcher's env block (B1). Every `set (NATIVELY|I60)_X=value` line; empty value = remove the name ----
    if (-not (Test-Path -LiteralPath $LauncherCmd)) { Stop-Refuse ("launcher file not found, the env block cannot be read: " + $LauncherCmd) }
    $vEnvSet = @{}
    $vEnvClear = @()
    foreach ($vL in (Get-Content -LiteralPath $LauncherCmd)) {
        $vEm = [regex]::Match($vL, '^set ((?:NATIVELY|I60)_[A-Z0-9_]+)=(.*)$')
        if (-not $vEm.Success) { continue }
        $vEv = $vEm.Groups[2].Value.TrimEnd()
        if ($vEv -eq '') { $vEnvClear += $vEm.Groups[1].Value } elseif ($vEv -notmatch '%') { $vEnvSet[$vEm.Groups[1].Value] = $vEv }
    }
    if (($vEnvSet.Count + $vEnvClear.Count) -eq 0) { Stop-Refuse ("launcher file yields 0 env names: " + $LauncherCmd) }
    if (-not $vEnvSet.ContainsKey('NATIVELY_ROSTER')) { Stop-Refuse 'launcher file sets no NATIVELY_ROSTER: answers.mjs would read the wrong roster' }

    # ---- refusal: the quota ledger must be readable (exit 0, its first line present). Reset = 10:00 local of the current quota day ----
    if ($vNow -lt $vTen) { $vReset = $vTen.AddDays(-1) } else { $vReset = $vTen }
    $vResetIso = $vReset.ToUniversalTime().ToString("yyyy-MM-dd'T'HH:mm:ss.000'Z'")
    if (-not (Test-Path -LiteralPath $LedgerScript)) { Stop-Refuse ("quota ledger script not found: " + $LedgerScript) }
    $vLedgerText = ''
    $vLedgerExit = 1
    try {
        $vLedgerLines = & $NodeExe $LedgerScript $vResetIso 2>$null
        $vLedgerExit = $LASTEXITCODE
        $vLedgerText = ($vLedgerLines | Out-String)
    } catch { $vLedgerExit = 1 }
    if ($vLedgerExit -ne 0 -or $vLedgerText -notmatch 'quota day starts') { Stop-Refuse ("quota ledger not readable (exit " + $vLedgerExit + ", first line " + $(if ($vLedgerText -match 'quota day starts') { 'present' } else { 'absent' }) + ")") }
    $vUsed35 = 0
    $vUsed31 = 0
    foreach ($vM in [regex]::Matches($vLedgerText, '"gemini-3\.5-flash-lite":(\d+)')) { $vUsed35 += [int]$vM.Groups[1].Value }
    foreach ($vM in [regex]::Matches($vLedgerText, '"gemini-3\.1-flash-lite":(\d+)')) { $vUsed31 += [int]$vM.Groups[1].Value }

    # ---- G_twin from the reader's output file, and the run name (I1) ----
    $vRunName = Split-Path -Leaf ($Run.TrimEnd('\', '/'))
    if (-not (Test-Path -LiteralPath $ReaderOut)) { Stop-Refuse ("reader output file not found: " + $ReaderOut) }
    $vReaderText = @(Get-Content -LiteralPath $ReaderOut -Encoding UTF8)
    $vReaderHead = @($vReaderText | Where-Object { $_ -match '^READER ' })
    if ($vReaderHead.Count -lt 1) { Stop-Refuse "reader output has no 'READER <run>:' line" }
    $vRm = [regex]::Match($vReaderHead[0], '^READER (.+?): ')
    if (-not $vRm.Success -or $vRm.Groups[1].Value -ne $vRunName) { Stop-Refuse ("reader output is for run '" + $(if ($vRm.Success) { $vRm.Groups[1].Value } else { '?' }) + "', not -Run '" + $vRunName + "'") }
    $vReadLine = @($vReaderText | Where-Object { $_ -match '^READ G_twin = \{' })
    if ($vReadLine.Count -ne 1) { Stop-Refuse ("reader output holds " + $vReadLine.Count + " 'READ G_twin' lines, need exactly 1") }
    $vGm = [regex]::Match($vReadLine[0], '^READ G_twin = \{([^}]*)\} \((\d+)\)')
    if (-not $vGm.Success) { Stop-Refuse "the READ G_twin line is not in the reader's known shape" }
    $vGids = @($vGm.Groups[1].Value -split ',' | ForEach-Object { $_.Trim() } | Where-Object { $_ })
    if ($vGids.Count -ne [int]$vGm.Groups[2].Value) { Stop-Refuse ("READ G_twin names " + $vGids.Count + " ids but its count says " + $vGm.Groups[2].Value) }
    foreach ($vId in $vGids) { if ($vId -notmatch '^[A-Za-z0-9_]+$') { Stop-Refuse "a G_twin id has characters outside [A-Za-z0-9_]" } }
    if (@($vGids | Select-Object -Unique).Count -ne $vGids.Count) { Stop-Refuse "G_twin names an id twice" }
    if ($vGids.Count -lt 3) { Stop-Refuse ("|G_twin| = " + $vGids.Count + " < 3: A2.4 INCOMPLETE, the sitting does not run") }
    $vGcsv = $vGids -join ','

    # ---- refusal: eq-b4-cal (run name, DIFF, BLOCK FAIL except marker-first, LABEL OUTSIDE) ----
    if (-not (Test-Path -LiteralPath $B4CalOut)) { Stop-Refuse ("eq-b4-cal output file not found: " + $B4CalOut) }
    $vB4 = @(Get-Content -LiteralPath $B4CalOut -Encoding UTF8)
    if (@($vB4 | Where-Object { $_ -match '^TRANSCRIPT ' }).Count -ne 1 -or @($vB4 | Where-Object { $_ -match '^BLOCK ' }).Count -ne 1) { Stop-Refuse "eq-b4-cal output lacks exactly one TRANSCRIPT line and one BLOCK line" }
    $vB4Head = @($vB4 | Where-Object { $_ -match '^B4CAL run=' })
    if ($vB4Head.Count -ne 1) { Stop-Refuse "eq-b4-cal output lacks exactly one 'B4CAL run=' line" }
    $vBm = [regex]::Match($vB4Head[0], '^B4CAL run=(\S+)')
    if ($vBm.Groups[1].Value -ne $vRunName) { Stop-Refuse ("eq-b4-cal output is for run '" + $vBm.Groups[1].Value + "', not -Run '" + $vRunName + "'") }
    $vOutsideLines = @($vB4 | Where-Object { $_ -match '^LABEL OUTSIDE --g' })
    if ($vOutsideLines.Count -ne 1 -or $vOutsideLines[0].TrimEnd() -ne 'LABEL OUTSIDE --g NONE') { Stop-Refuse "eq-b4-cal reads LABEL OUTSIDE --g other than NONE (or the line is absent): --g was built wrong, rebuild and re-run eq-b4-cal (A5.5 B-I1)" }
    $vTr = @($vB4 | Where-Object { $_ -match '^TRANSCRIPT ' })[0]
    $vBl = @($vB4 | Where-Object { $_ -match '^BLOCK ' })[0]
    if ($vTr -match '^TRANSCRIPT DIFF') { Stop-Refuse "eq-b4-cal reads TRANSCRIPT DIFF (rule 5d)" }
    if ($vTr -notmatch '^TRANSCRIPT (OK|UNCALIBRATED)') { Stop-Refuse "eq-b4-cal TRANSCRIPT line is not OK, UNCALIBRATED or DIFF" }
    if ($vBl -match '^BLOCK FAIL') {
        # every failing id must be marker-first; a single non-marker-first failing id refuses
        $vFailIds = @(($vBl -replace '^BLOCK FAIL ', '') -split ',')
        $vNonMf = @($vFailIds | Where-Object { $_ -notmatch '\(marker-first' })
        if ($vNonMf.Count -gt 0) { Stop-Refuse "eq-b4-cal reads BLOCK FAIL (not marker-first)" }
    } elseif ($vBl -notmatch '^BLOCK (OK|NONE)') { Stop-Refuse "eq-b4-cal BLOCK line is not OK, NONE or FAIL" }

    # ---- -Holes: every named rep must have a real hole in its ORIGINAL files, its ids must be in G_twin ----
    if ($vMode -eq 'holes') {
        $vHoleAll = @{}
        $vBsteps = New-Object System.Collections.ArrayList
        $vNb = $vLogState.Values | ForEach-Object { $_.N } | Measure-Object -Maximum
        $vN = [int]$vNb.Maximum
        foreach ($vSp2 in $vHoleSpecs) {
            foreach ($vId in $vSp2.Ids) { if ($vGids -notcontains $vId) { Stop-Refuse ("-Holes: " + $vId + " is not in G_twin") } }
            $vOrig = @($vSteps | Where-Object { $_.Leg -eq $vSp2.Leg -and $_.Rep -eq $vSp2.Rep })
            $vHoleHere = @()
            foreach ($vId in $vSp2.Ids) {
                $vIsHole = $false
                foreach ($vO in $vOrig) {
                    $vJson = Get-Content -LiteralPath $vO.Out -Raw -Encoding UTF8 | ConvertFrom-Json
                    $vRec = $vJson.PSObject.Properties[$vId]
                    if (($null -eq $vRec) -or ($null -ne $vRec.Value.PSObject.Properties['transientError'])) { $vIsHole = $true }
                }
                if (-not $vIsHole) { Stop-Refuse ("-Holes: " + $vSp2.Leg + " rep " + $vSp2.Rep + " id " + $vId + " is no hole in either original file (a -b re-run may only fill holes)") }
                $vHoleHere += $vId
                $vHoleAll[$vId] = 1
            }
            $vSfx2 = '-r' + $vSp2.Rep + '-b'
            foreach ($vO in $vOrig) {
                $vN++
                $vBase = $vO.Tag -replace '-r\d+$', ''
                $null = $vBsteps.Add(@{ N = $vN; Tag = ($vBase + $vSfx2); NoBlock = $vO.NoBlock; Model = $vO.Model; Think = $vO.Think; Leg = $vO.Leg; Rep = $vO.Rep; Second = (($vBsteps.Count % 2) -eq 1); OnlyIds = ($vHoleHere -join ','); Out = (Out-FileOf $vO.Model ($vBase + $vSfx2)) })
            }
        }
        $vRunList = @($vBsteps)
        foreach ($vS in $vRunList) {
            if ($vLogState.ContainsKey($vS.Tag)) { Stop-Refuse ("-Holes: tag " + $vS.Tag + " is already in the log: tags are never reused") }
            if (Test-Path -LiteralPath $vS.Out) { Stop-Refuse ("-Holes: output for tag " + $vS.Tag + " already exists: tags are never reused") }
        }
        $vBarN = $vHoleAll.Count
    } else { $vBarN = $vGids.Count }

    # ---- m6 ledger bars: the controller's headroom must meet the bars AND not exceed 500 minus the ledger's app-log mentions ----
    $vBar35 = 10 * $vBarN + 12
    $vBar31 = 6 * $vBarN + 8
    if ($Headroom35 -lt $vBar35) { Stop-Refuse ("m6: 3.5-lite headroom " + $Headroom35 + " < " + $vBar35) }
    if ($Headroom31 -lt $vBar31) { Stop-Refuse ("m6: 3.1-lite headroom " + $Headroom31 + " < " + $vBar31) }
    if ($Headroom35 -gt (500 - $vUsed35)) { Stop-Refuse ("m6: claimed 3.5-lite headroom " + $Headroom35 + " exceeds 500 - ledger mentions " + $vUsed35) }
    if ($Headroom31 -gt (500 - $vUsed31)) { Stop-Refuse ("m6: claimed 3.1-lite headroom " + $Headroom31 + " exceeds 500 - ledger mentions " + $vUsed31) }

    # ---- inputs and stale outputs ----
    $vPrompts = Join-Path $Run 'interview60.prompts.json'
    if (-not (Test-Path -LiteralPath $vPrompts)) { Stop-Refuse ("run folder has no interview60.prompts.json: " + $Run) }
    if (-not (Test-Path -LiteralPath $AnswersScript)) { Stop-Refuse ("answers script not found: " + $AnswersScript) }
    if ($vMode -eq 'normal') {
        $vStale = @($vSteps | Where-Object { Test-Path -LiteralPath $_.Out } | ForEach-Object { $_.Tag })
        if ($vStale.Count -gt 0) { Stop-Refuse ("output file(s) already exist for tag(s) " + ($vStale -join ', ') + ": tags are never reused") }
        if ((-not $WhatIf) -and $vLogState.Count -gt 0) { Stop-Refuse ("log " + $LogPath + " already holds STEP lines: a sitting is never resumed or retried implicitly (use -Resume, or -Holes after 16 clean steps)") }
    }

    # ---- build the command lines (one place, used by -WhatIf and the real run) ----
    foreach ($vS in $vRunList) {
        $vOnly = $vGcsv
        if ($vS.ContainsKey('OnlyIds')) { $vOnly = $vS.OnlyIds }
        $vArgs = '"' + $AnswersScript + '" --model ' + $vS.Model + ' --tag ' + $vS.Tag + ' --thinking ' + $vS.Think
        if ($vS.NoBlock) { $vArgs += ' --no-block' }
        $vArgs += ' --captured "' + $vPrompts + '" --only ' + $vOnly
        $vS.Args = $vArgs
    }

    if ($WhatIf) {
        Write-Output ("GSITTING whatif mode=" + $vMode + ": |G_twin| = " + $vGids.Count + " [" + $vGcsv + "]; bars " + $vBar35 + "/" + $vBar31 + " met by " + $Headroom35 + "/" + $Headroom31 + "; env set " + $vEnvSet.Count + " cleared " + $vEnvClear.Count + "; " + $vRunList.Count + " command line(s) follow, no call is made")
        foreach ($vS in $vRunList) { Write-Output ("CMD " + $vS.N + " " + $vS.Tag + ": node " + $vS.Args) }
        exit 0
    }

    # ---- the run ----
    New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
    if ($vMode -eq 'resume') {
        $vF = $vSteps[$vFirstIdx]
        $vStamp = [DateTime]::UtcNow.ToString("yyyyMMdd'T'HHmmss'Z'")
        $vFailDir = Join-Path $OutDir ('failed-' + $vF.N + '-' + $vStamp)
        New-Item -ItemType Directory -Force -Path $vFailDir | Out-Null
        Copy-Item -LiteralPath $LogPath -Destination (Join-Path $vFailDir 'gsitting.log.before-resume') -Force
        $vMoved = 0
        foreach ($vP in @($vF.Out, (Join-Path $OutDir ('step-' + $vF.N + '.out.txt')), (Join-Path $OutDir ('step-' + $vF.N + '.err.txt')))) {
            if (Test-Path -LiteralPath $vP) { Move-Item -LiteralPath $vP -Destination (Join-Path $vFailDir (Split-Path -Leaf $vP)); $vMoved++ }
        }
        $vOldLines = @(Get-Content -LiteralPath $LogPath -Encoding UTF8)
        $vNewLines = @($vOldLines | ForEach-Object { if ($_ -match ('^STEP ' + $vF.N + ' ')) { 'GSITTING failed-attempt ' + $_ } else { $_ } })
        [IO.File]::WriteAllText($LogPath, (($vNewLines -join "`n") + "`n"), (New-Object System.Text.UTF8Encoding($false)))
        Write-Log ("GSITTING resume " + (Get-IsoUtc) + ": from step " + $vF.N + " " + $vF.Tag + "; " + $vMoved + " partial file(s) moved (not deleted) to " + (Split-Path -Leaf $vFailDir) + "; the failed attempt's STEP lines are kept as GSITTING failed-attempt lines")
    }
    foreach ($vName in $vEnvClear) { [Environment]::SetEnvironmentVariable($vName, $null, 'Process') }
    foreach ($vName in $vEnvSet.Keys) { [Environment]::SetEnvironmentVariable($vName, $vEnvSet[$vName], 'Process') }
    Write-Log ("GSITTING begin " + (Get-IsoUtc) + " mode=" + $vMode + " run=" + $vRunName + " G_twin=" + $vGcsv + " env-set=" + $vEnvSet.Count + " env-cleared=" + $vEnvClear.Count + " steps=" + $vRunList.Count)

    $vStartAt = @{}
    $vPrevKey = ''
    foreach ($vS in $vRunList) {
        $vStartNow = [DateTime]::UtcNow
        $vStartAt[$vS.N] = $vStartNow
        # m1: the 15-minute condition is start to start and a front-leg matter (2c reads front reps only); the first step of the pair started in this call
        if ($vS.Second -and $vS.Leg -eq 'front' -and $vStartAt.ContainsKey($vS.N - 1)) {
            $vGapMin = ($vStartNow - $vStartAt[$vS.N - 1]).TotalMinutes
            if ($vGapMin -gt $vGapLimitMin) { Write-Log ("GSITTING note: front rep " + $vS.Rep + " second step starts " + [math]::Round($vGapMin, 1) + " min after the first (> " + $vGapLimitMin + "): 2c is reported for this rep") }
        }
        Write-Log ("STEP " + $vS.N + " " + $vS.Tag + " start " + (Get-IsoUtc))
        $vOutF = Join-Path $OutDir ('step-' + $vS.N + '.out.txt')
        $vErrF = Join-Path $OutDir ('step-' + $vS.N + '.err.txt')
        $vProc = Start-Process -FilePath $NodeExe -ArgumentList $vS.Args -WorkingDirectory $vMain -NoNewWindow -PassThru -RedirectStandardOutput $vOutF -RedirectStandardError $vErrF
        $null = $vProc.Handle
        $vProc.WaitForExit()
        $vCode = $vProc.ExitCode
        Write-Log ("STEP " + $vS.N + " " + $vS.Tag + " end " + (Get-IsoUtc) + " exit=" + $vCode)
        $vDurMin = ([DateTime]::UtcNow - $vStartNow).TotalMinutes
        if ($vDurMin -gt $vSlowMin) { Write-Log ("GSITTING note slow step " + $vS.N + " " + [math]::Round($vDurMin, 1)) }
        if ($vCode -ne 0) {
            $vStopMsg = "GSITTING stop " + (Get-IsoUtc) + ": step " + $vS.N + " " + $vS.Tag + " exit=" + $vCode + "; no retry, the later steps did not run"
            Write-Log $vStopMsg
            Write-Output $vStopMsg
            exit 1
        }
    }
    $vCopied = 0
    foreach ($vS in $vRunList) {
        if (Test-Path -LiteralPath $vS.Out) { Copy-Item -LiteralPath $vS.Out -Destination (Join-Path $Run (Split-Path -Leaf $vS.Out)) -Force; $vCopied++ }
    }
    # m3: the files are COPIED into the run folder (the harness's own behaviour), not moved: A2.10 said moved; the originals stay in MAIN golden
    $vDone = "GSITTING done " + (Get-IsoUtc) + ": mode=" + $vMode + ", " + $vRunList.Count + " step(s) exit 0; " + $vCopied + " of " + $vRunList.Count + " output files COPIED (originals stay in golden) into " + $vRunName
    Write-Log $vDone
    Write-Output $vDone
    exit 0
} catch {
    $vCrash = 'GSITTING crash ' + (Get-IsoUtc) + ': ' + (($_.Exception.Message -split "`n")[0])
    Write-Output $vCrash
    try { if (-not $WhatIf) { Write-Log $vCrash } } catch { }
    exit 4
}
