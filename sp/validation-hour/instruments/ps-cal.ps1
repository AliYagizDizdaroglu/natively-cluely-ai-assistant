# ps-cal.ps1 (launcher builder D): calibration of VH\register-h40d.ps1 and VH\h40d-precheck.ps1 (rule 8: every check shown
# against a case with a known answer, including cases that must FAIL). It NEVER runs register-h40d.ps1 (that would register a
# task): it parses it, and evaluates the TEXT of its three pure functions and of two of its conditions, cut out through the
# parser's AST, so the code that is tested is the code in the file. It runs h40d-precheck.ps1 once, as a child, with -ReadOnly
# (no task is started). Read-only against the Task Scheduler: Get-ScheduledTask and Get-ScheduledTaskInfo only.
# ASCII-only. Prints PASS / FAIL lines; the exit code is the number of FAIL lines.
$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$vh = Split-Path -Parent $here
$script:fails = 0
$script:passes = 0
function Check([bool]$ok, [string]$label, [string]$detail = '') {
    if ($ok) { $script:passes++ } else { $script:fails++ }
    $tag = 'FAIL'
    if ($ok) { $tag = 'PASS' }
    if ($detail) { "{0}  {1}  [{2}]" -f $tag, $label, $detail } else { "{0}  {1}" -f $tag, $label }
}
function Throws([scriptblock]$sb) { try { & $sb | Out-Null; return $false } catch { return $true } }
function Parse-File([string]$p) {
    $t = $null; $e = $null
    $ast = [System.Management.Automation.Language.Parser]::ParseFile($p, [ref]$t, [ref]$e)
    [pscustomobject]@{ Ast = $ast; Errors = @($e) }
}
function Find-Main {
    (Resolve-Path (Join-Path $env:USERPROFILE 'OneDrive\Masa*\natively-cluely-ai-assistant') | Where-Object { Test-Path (Join-Path $_.Path '.git') } | Select-Object -First 1).Path
}
$main = Find-Main
$wt = Join-Path $main '.claude\worktrees\whole-turn'
$reg = Join-Path $vh 'register-h40d.ps1'
$pre = Join-Path $vh 'h40d-precheck.ps1'

'--- 1. the parser, on both scripts (nothing is run) ---'
foreach ($f in $reg, $pre) {
    $r = Parse-File $f
    Check ($r.Errors.Count -eq 0) ("parse " + (Split-Path -Leaf $f) + ": zero parse errors") ("errors=" + $r.Errors.Count)
    $bytes = [IO.File]::ReadAllBytes($f)
    $high = @($bytes | Where-Object { $_ -gt 126 }).Count
    Check ($high -eq 0 -and -not ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF)) ("bytes " + (Split-Path -Leaf $f) + ": ASCII only, no BOM") ("bytes above 126=" + $high + " length=" + $bytes.Length)
}
$text = [IO.File]::ReadAllText($reg)
$tok = $null; $err = $null
[void][System.Management.Automation.Language.Parser]::ParseInput($text + "`nif (`n", [ref]$tok, [ref]$err)
Check (@($err).Count -ge 1) 'known-bad parse: register-h40d.ps1 with an unclosed if appended reads as parse errors' ("errors=" + @($err).Count)

'--- 2. register-h40d.ps1: the three pure functions, cut out of the file ---'
$regAst = (Parse-File $reg).Ast
$funcs = @($regAst.FindAll({ param($n) $n -is [System.Management.Automation.Language.FunctionDefinitionAst] }, $false))
Check ($funcs.Count -eq 3) 'the file holds exactly three function definitions' ("names=" + (($funcs | ForEach-Object { $_.Name }) -join ','))
foreach ($f in $funcs) { . ([scriptblock]::Create($f.Extent.Text)) }
$folder = 'C:\folder'
$pf = Get-TaskPlan -Which 'flight' -Folder $folder -Hours 0
Check ($pf.Name -eq 'Natively-flight-h40d' -and $pf.Launcher -eq 'C:\folder\launch-h40d.cmd' -and $pf.Hours -eq 5) 'plan flight: Natively-flight-h40d, launch-h40d.cmd, 5 h' ("$($pf.Name) $($pf.Launcher) $($pf.Hours)")
$pd = Get-TaskPlan -Which 'dry' -Folder $folder -Hours 0
Check ($pd.Name -eq 'Natively-flight-h40d-dry' -and $pd.Launcher -eq 'C:\folder\launch-h40d-dry.cmd' -and $pd.Hours -eq 1) 'plan dry: Natively-flight-h40d-dry, launch-h40d-dry.cmd, 1 h' ("$($pd.Name) $($pd.Launcher) $($pd.Hours)")
$pp = Get-TaskPlan -Which 'prestart' -Folder $folder -Hours 0
Check ($pp.Name -eq 'Natively-prestart-h40d' -and $pp.Launcher -eq 'C:\folder\launch-h40d-prestart.cmd' -and $pp.Hours -eq 1) 'plan prestart: Natively-prestart-h40d, launch-h40d-prestart.cmd, 1 h' ("$($pp.Name) $($pp.Launcher) $($pp.Hours)")
Check ((Get-TaskPlan -Which 'flight' -Folder $folder -Hours 3).Hours -eq 3) 'plan: -Hours overrides the limit (3)'
Check (Throws { Get-TaskPlan -Which 'bogus' -Folder $folder -Hours 0 }) 'known-bad: an unknown -Which throws'
Check (@($pf.Name, $pd.Name, $pp.Name | Select-Object -Unique).Count -eq 3 -and @($pf.Launcher, $pd.Launcher, $pp.Launcher | Select-Object -Unique).Count -eq 3) 'the three plans name three different tasks and three different launchers'
foreach ($which in 'flight', 'dry', 'prestart') {
    $pl = Get-TaskPlan -Which $which -Folder $vh -Hours 0
    Check (Test-Path -LiteralPath $pl.Launcher) ("the $which launcher the plan names exists beside the script") (Split-Path -Leaf $pl.Launcher)
}
# the precheck derives its task names from -Label; with its default label they must be the register script's flight and dry names
$preAst = (Parse-File $pre).Ast
$labelParam = @($preAst.ParamBlock.Parameters | Where-Object { $_.Name.VariablePath.UserPath -eq 'Label' })[0]
$defLabel = $labelParam.DefaultValue.Value
Check (('Natively-flight-' + $defLabel) -eq $pf.Name -and (('Natively-flight-' + $defLabel) + '-dry') -eq $pd.Name) 'cross-file: the precheck default label gives the register script flight and dry task names' ("default label=$defLabel")

$now = [datetime]'2026-10-01 14:50:00'
$s = Get-StartTime -StartAt '2026-10-02T13:30:00' -Now $now
Check ($s -eq [datetime]'2026-10-02 13:30:00') 'start time: 2026-10-02T13:30:00 parses to Friday 13:30 local' ($s.ToString('yyyy-MM-dd HH:mm:ss'))
Check ((Throws { Get-StartTime -StartAt '2026-10-01T14:49:59' -Now $now })) 'known-bad: a start one second in the past throws'
Check ((Throws { Get-StartTime -StartAt '2026-10-01T14:50:00' -Now $now })) 'known-bad: a start equal to now throws (not in the future)'
Check ((Throws { Get-StartTime -StartAt '2026-10-02 13:30' -Now $now })) 'known-bad: a start without the T and seconds throws'
Check ((Throws { Get-StartTime -StartAt '10/02/2026 13:30:00' -Now $now })) 'known-bad: an ambiguous day-month order throws'
Check ((Throws { Get-StartTime -StartAt '2026-10-02T13:30' -Now $now })) 'known-bad: a start without seconds throws'
Check ((Throws { Get-StartTime -StartAt '' -Now $now })) 'known-bad: an empty start throws'

$start = [datetime]'2026-10-02 13:30:00'
$p0 = @(Get-RegistrationProblems -State 'Ready' -StartWhenAvailable $false -NextRun $start -Start $start)
Check ($p0.Count -eq 0) 'read-back: Ready, StartWhenAvailable False, next run as requested gives no problem' ("problems=" + $p0.Count)
$p1 = @(Get-RegistrationProblems -State 'Ready' -StartWhenAvailable $true -NextRun $start -Start $start)
Check ($p1.Count -eq 1 -and $p1[0] -match 'StartWhenAvailable') 'known-bad read-back: StartWhenAvailable True is named (the one condition the brief requires to read False)' ($p1 -join ' | ')
$p2 = @(Get-RegistrationProblems -State 'Disabled' -StartWhenAvailable $false -NextRun $start -Start $start)
Check ($p2.Count -eq 1 -and $p2[0] -match 'Disabled') 'known-bad read-back: a Disabled state is named' ($p2 -join ' | ')
$p3 = @(Get-RegistrationProblems -State 'Ready' -StartWhenAvailable $false -NextRun $start.AddHours(3) -Start $start)
Check ($p3.Count -eq 1 -and $p3[0] -match 'next run') 'known-bad read-back: a next run three hours off is named' ($p3 -join ' | ')
$p4 = @(Get-RegistrationProblems -State 'Ready' -StartWhenAvailable $false -NextRun $null -Start $start)
Check ($p4.Count -eq 0) 'read-back: no next run reported (null) is not a problem' ("problems=" + $p4.Count)
$p5 = @(Get-RegistrationProblems -State 'Ready' -StartWhenAvailable $false -NextRun ([datetime]'0001-01-01') -Start $start)
Check ($p5.Count -eq 0) 'read-back: the unset date 0001-01-01 is not a problem' ("problems=" + $p5.Count)
$p6 = @(Get-RegistrationProblems -State 'Disabled' -StartWhenAvailable $true -NextRun $start -Start $start)
Check ($p6.Count -eq 2) 'known-bad read-back: two violations give two problems' ("problems=" + $p6.Count)

'--- 3. register-h40d.ps1: two of its own conditions, evaluated from the file text with test inputs ---'
$ifs = @($regAst.FindAll({ param($n) $n -is [System.Management.Automation.Language.IfStatementAst] }, $true))
$ph = @($ifs | Where-Object { $_.Clauses[0].Item1.Extent.Text -match "'@@'" })
Check ($ph.Count -eq 1) 'the placeholder refusal is exactly one if statement in the file'
$phCond = [scriptblock]::Create($ph[0].Clauses[0].Item1.Extent.Text)
# The scratchpad path is 191 characters and Windows PowerShell 5.1 refuses a file path over 259 (it expands 8.3 short names
# first), so every scratch file here sits directly in this folder (219 characters) under a short name.
$tmp = $here
foreach ($n in 'launch-h40d.cmd', 'launch-h40d-dry.cmd', 'launch-h40d-prestart.cmd') {
    $plan = [pscustomobject]@{ Launcher = (Join-Path $vh $n) }
    $holds = [bool](& $phCond)
    $real = [IO.File]::ReadAllText($plan.Launcher)
    $isUnarmed = $real.Contains('@@')
    Check ($holds -eq $isUnarmed) ("placeholder condition on the real $n reads $holds, the file " + $(if ($isUnarmed) { 'holds a placeholder' } else { 'is armed' })) ''
}
$armedCopy = Join-Path $tmp 'armed.cmd'
$txt = [IO.File]::ReadAllText((Join-Path $vh 'launch-h40d.cmd')).Replace('@@REGISTERED_HEAD_FULL_HASH@@', '0123456789abcdef0123456789abcdef01234567')
[IO.File]::WriteAllText($armedCopy, $txt, [Text.Encoding]::ASCII)
$plan = [pscustomobject]@{ Launcher = $armedCopy }
Check (-not [bool](& $phCond)) 'placeholder condition on a copy of the flight launcher with a hash filled in reads False (registration allowed)'
Remove-Item -LiteralPath $armedCopy -ErrorAction SilentlyContinue
$cue = @($ifs | Where-Object { $_.Clauses[0].Item1.Extent.Text -match 'CUE_LINE_PREFIX' })
Check ($cue.Count -eq 1) 'the cue-source refusal is exactly one if statement in the file'
$cueCond = [scriptblock]::Create($cue[0].Clauses[0].Item1.Extent.Text)
$repo = $wt
Check (-not [bool](& $cueCond)) 'cue condition against the whole-turn worktree (cue source present) reads False: registration allowed' ''
$badRoot = Join-Path $tmp 'bd'
New-Item -ItemType Directory -Force -Path (Join-Path $badRoot 'electron\llm') | Out-Null
[IO.File]::WriteAllText((Join-Path $badRoot 'electron\llm\verbalStreamFilter.ts'), "// a pre-cue filter without the constant`n", [Text.Encoding]::ASCII)
$repo = $badRoot
Check ([bool](& $cueCond)) 'known-bad: cue condition against a tree whose filter lacks CUE_LINE_PREFIX reads True: the script would refuse' ''
Remove-Item -LiteralPath $badRoot -Recurse -Force
$repo = $main
$mainReads = [bool](& $cueCond)
"INFO  cue condition against MAIN today reads $mainReads (True = MAIN is not merged yet, so the script would refuse to register today; False = merged)"

'--- 4. register-h40d.ps1: its read-back, against real tasks (read-only) ---'
$t = Get-ScheduledTask -TaskName 'Natively-flight-h40c'
$i = Get-ScheduledTaskInfo -TaskName 'Natively-flight-h40c'
$probs = @(Get-RegistrationProblems -State ([string]$t.State) -StartWhenAvailable ([bool]$t.Settings.StartWhenAvailable) -NextRun $i.NextRunTime -Start (Get-Date))
Check ($probs.Count -eq 0) 'the h40c flight task (Ready, StartWhenAvailable False, no next run) reads back clean through the same property reads' ("state=$($t.State) StartWhenAvailable=$($t.Settings.StartWhenAvailable) next='$($i.NextRunTime)'")
$t2 = Get-ScheduledTask -TaskName 'Natively-smoke-cues'
$i2 = Get-ScheduledTaskInfo -TaskName 'Natively-smoke-cues'
$probs2 = @(Get-RegistrationProblems -State ([string]$t2.State) -StartWhenAvailable ([bool]$t2.Settings.StartWhenAvailable) -NextRun $i2.NextRunTime -Start (Get-Date))
Check ($probs2.Count -eq 1 -and $probs2[0] -match 'StartWhenAvailable') 'known-bad real task: Natively-smoke-cues holds StartWhenAvailable True and the read-back names it' ("StartWhenAvailable=$($t2.Settings.StartWhenAvailable) problems=" + ($probs2 -join ' | '))

'--- 5. h40d-precheck.ps1: the Running-task filter, cut out of the file, on synthetic tasks ---'
$cmds = @($preAst.FindAll({ param($n) $n -is [System.Management.Automation.Language.CommandAst] -and $n.GetCommandName() -eq 'Where-Object' -and $n.Extent.Text -match 'Running' }, $true))
Check ($cmds.Count -eq 1) 'the precheck holds exactly one Where-Object that filters on Running'
$sbAst = @($cmds[0].CommandElements | Where-Object { $_ -is [System.Management.Automation.Language.ScriptBlockExpressionAst] })[0]
$filter = $sbAst.ScriptBlock.GetScriptBlock()
$flight = 'Natively-flight-h40d'
$objs = @(
    [pscustomobject]@{ TaskName = 'Natively-flight-h40d'; State = 'Running' },
    [pscustomobject]@{ TaskName = 'Natively-flight-h40d-dry'; State = 'Running' },
    [pscustomobject]@{ TaskName = 'Natively-smoke-cues'; State = 'Ready' },
    [pscustomobject]@{ TaskName = 'Natively-probe-live38'; State = 'Running' }
)
$counted = @($objs | Where-Object $filter)
Check ($counted.Count -eq 2 -and ($counted.TaskName -contains 'Natively-flight-h40d-dry') -and ($counted.TaskName -contains 'Natively-probe-live38') -and -not ($counted.TaskName -contains 'Natively-flight-h40d')) 'filter: the flight is excluded, two other Running tasks are counted, a Ready task is not' ("counted=" + ($counted.TaskName -join ','))
$onlyFlight = @($objs[0], $objs[2]) | Where-Object $filter
Check (@($onlyFlight).Count -eq 0) 'filter: with only the flight Running and the rest Ready the count is 0' ''

'--- 5b. h40d-precheck.ps1: the dry-log line filter, cut out of the file, on real dist-proof output ---'
$pats = @($preAst.FindAll({ param($n) $n -is [System.Management.Automation.Language.StringConstantExpressionAst] -and $n.Value -match 'DIST PROOF' }, $true))
Check ($pats.Count -eq 1) 'the precheck holds exactly one string that filters on DIST PROOF'
$logPat = $pats[0].Value
$nodeExe = 'C:\Program Files\nodejs\node.exe'
$proof = Join-Path (Split-Path -Parent $vh) 'dist-proof.mjs'
$eap = $ErrorActionPreference
$ErrorActionPreference = 'Continue'   # a crashing node child writes to stderr; with Stop that would end this script
$good = @(& $nodeExe $proof --root $wt --expect combined --prefix-count 3 --offers-marker 'offers block before the spoken answer' 2>&1 | ForEach-Object { [string]$_ })
$goodExit = $LASTEXITCODE
$bad = @(& $nodeExe $proof --root $main --expect combined --prefix-count 3 --offers-marker 'offers block before the spoken answer' 2>&1 | ForEach-Object { [string]$_ })
$badExit = $LASTEXITCODE
$ErrorActionPreference = $eap
$goodHits = @($good | Where-Object { $_ -match $logPat })
Check ($goodExit -eq 0 -and $good.Count -ge 10 -and $goodHits.Count -eq 2 -and ($goodHits -join '|') -match 'THE COMBINED BUILD, every marker as expected' -and ($goodHits -join '|') -match 'filter sha256/16 [0-9a-f]{16}') 'dry-log filter on the real dist-proof output of the combined build keeps exactly the verdict line and the filter hash line' ("exit=$goodExit lines=" + $good.Count + " kept=" + $goodHits.Count)
$badHits = @($bad | Where-Object { $_ -match $logPat })
"INFO  dist-proof against MAIN's own dist today: $($bad.Count) output lines, exit $badExit; lines kept by the filter: " + (($badHits | ForEach-Object { $_.Trim() }) -join ' || ')
Check ($badExit -ne 0) 'known-bad build: dist-proof against MAIN dist-electron today (pre-merge, no cue build) exits non-zero, which the launcher turns into exit 3' ("exit=" + $badExit)
Check ($badHits.Count -ge 1 -and (($badHits -join '|') -match 'DIST PROOF: BAD') -and -not (($badHits -join '|') -match 'every marker as expected')) 'dry-log filter on the known-bad dist keeps the BAD marker lines and never shows an as-expected verdict' ("kept=" + $badHits.Count)
$failLine = @($bad | Where-Object { $_ -match 'DIST PROOF: BAD|NOT THE|CUE_LINE_PREFIX|TypeError|missing' })
"INFO  what MAIN's dist reads as (names only): " + (($failLine | Select-Object -First 4 | ForEach-Object { $_.Trim() -replace '\s+', ' ' }) -join ' || ')

'--- 6. h40d-precheck.ps1 run as the r4 known case: -At the current minute, the h40c task names, -ReadOnly ---'
$at = Get-Date -Format 'HH:mm'
$outFile = Join-Path $tmp 'pc-c.out'
$errFile = Join-Path $tmp 'pc-c.err'
$psi = Start-Process -FilePath 'powershell.exe' -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ('"' + $pre + '"'), '-At', $at, '-Label', 'h40c', '-ReadOnly') -RedirectStandardOutput $outFile -RedirectStandardError $errFile -NoNewWindow -Wait -PassThru
$lines = @(Get-Content -LiteralPath $outFile -Encoding UTF8)
$errs = @(Get-Content -LiteralPath $errFile -ErrorAction SilentlyContinue)
$lines | ForEach-Object { "    | " + $_ }
if ($errs.Count) { $errs | ForEach-Object { "    ERR| " + $_ } }
Check ($psi.ExitCode -eq 0 -and $errs.Count -eq 0) 'known case: the precheck exits 0 and writes nothing to stderr' ("exit=" + $psi.ExitCode + " stderr lines=" + $errs.Count)
$all = $lines -join "`n"
Check ($all -match '(?m)^PRECHECK \d\d:\d\d:\d\d label=h40c$') 'known case: the PRECHECK header line with the label'
Check ($all -match '(?m)^flight task: (Ready|Running|Disabled) next=(none|\d{4}-\d\d-\d\d \d\d:\d\d)$') 'known case: the h40c flight task state line, with a next run of none because the once-trigger has run (h40c does not crash on it)'
Check ($all -match '(?m)^other Natively-\* tasks Running: \d+$') 'known case: the new count of other Natively-* tasks Running'
Check ($all -match '(?m)^electron processes: \d+$') 'known case: the electron process line'
Check ($all -match '(?m)^processes named like natively: \d+$') 'known case: the natively-named process line'
Check ($all -match '(?m)^port 5180 held: (True|False)$') 'known case: the port line'
Check ($all -match '(?m)^tail\.exe watchers: \d+$') 'known case: the tail.exe line'
Check ($all -match '(?m)^default playback device: volume=') 'known case: the audio line (audio-state.ps1 found one folder above)'
Check ($all -match '(?m)^dry-twin guard chain: NOT RUN \(-ReadOnly\)') 'known case: -ReadOnly says the dry twin was NOT RUN, never silent'
"INFO  power line present: $($all -match '(?m)^power: ') (a desktop without a battery prints none, as in h40c's script)"
$out2 = Join-Path $tmp 'pc-x.out'
$err2 = Join-Path $tmp 'pc-x.err'
$psi2 = Start-Process -FilePath 'powershell.exe' -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ('"' + $pre + '"'), '-At', $at, '-Label', 'h40x', '-ReadOnly') -RedirectStandardOutput $out2 -RedirectStandardError $err2 -NoNewWindow -Wait -PassThru
$l2 = @(Get-Content -LiteralPath $out2 -Encoding UTF8)
$e2 = @(Get-Content -LiteralPath $err2 -ErrorAction SilentlyContinue)
Check ($psi2.ExitCode -eq 0 -and $e2.Count -eq 0 -and (($l2 -join "`n") -match '(?m)^flight task: NOT REGISTERED \(Natively-flight-h40x\)$')) 'known-bad: a label with no task prints NOT REGISTERED and does not crash' ("exit=" + $psi2.ExitCode + " stderr lines=" + $e2.Count)
$orig = $null
try { $orig = (Get-ScheduledTaskInfo -TaskName 'Natively-flight-h40c').NextRunTime.ToString('yyyy-MM-dd HH:mm') } catch { $orig = 'ERROR: ' + $_.Exception.Message }
Check ($orig -like 'ERROR:*') "why the null-safe line exists: h40c's original expression fails on the h40c task" ($orig)
Remove-Item -LiteralPath $outFile, $errFile, $out2, $err2 -ErrorAction SilentlyContinue

'--- 7. static checks of the code this calibration cannot run (the registration body, the dry-twin start in the precheck) ---'
# Neither Register-ScheduledTask nor Start-ScheduledTask may be called here, so the parts of the two scripts that call them are
# checked from the parse tree: every variable that is read is assigned somewhere or is a parameter or an automatic variable, and
# every parameter passed to a cmdlet exists on that cmdlet in this session. Each check is shown to FAIL on a mutated copy.
function Get-StaticProblems([string]$text) {
    $t = $null; $e = $null
    $ast = [System.Management.Automation.Language.Parser]::ParseInput($text, [ref]$t, [ref]$e)
    if (@($e).Count) { return @("parse errors: " + @($e).Count) }
    $problems = @()
    $assigned = New-Object System.Collections.Generic.HashSet[string] ([StringComparer]::OrdinalIgnoreCase)
    $strip = '^(script|global|local|private):'
    foreach ($a in $ast.FindAll({ param($n) $n -is [System.Management.Automation.Language.AssignmentStatementAst] }, $true)) {
        foreach ($v in $a.Left.FindAll({ param($n) $n -is [System.Management.Automation.Language.VariableExpressionAst] }, $true)) { [void]$assigned.Add(($v.VariablePath.UserPath -replace $strip, '')) }
    }
    foreach ($fe in $ast.FindAll({ param($n) $n -is [System.Management.Automation.Language.ForEachStatementAst] }, $true)) { [void]$assigned.Add($fe.Variable.VariablePath.UserPath) }
    foreach ($p in $ast.FindAll({ param($n) $n -is [System.Management.Automation.Language.ParameterAst] }, $true)) { [void]$assigned.Add($p.Name.VariablePath.UserPath) }
    $auto = @('true', 'false', 'null', '_', 'args', 'PSItem', 'MyInvocation', 'ErrorActionPreference', 'LASTEXITCODE', 'PSScriptRoot', 'input', 'matches')
    $seen = @{}
    foreach ($v in $ast.FindAll({ param($n) $n -is [System.Management.Automation.Language.VariableExpressionAst] }, $true)) {
        $vp = $v.VariablePath
        if ($vp.IsDriveQualified) { continue }
        $n = $vp.UserPath -replace $strip, ''
        if ($auto -contains $n -or $assigned.Contains($n) -or $seen.ContainsKey($n)) { continue }
        $seen[$n] = $true
        $problems += "variable `$$n is read but never assigned"
    }
    $local = @($ast.FindAll({ param($n) $n -is [System.Management.Automation.Language.FunctionDefinitionAst] }, $true) | ForEach-Object { $_.Name })
    foreach ($c in $ast.FindAll({ param($n) $n -is [System.Management.Automation.Language.CommandAst] }, $true)) {
        $name = $c.GetCommandName()
        if (-not $name -or $local -contains $name) { continue }
        $cmd = Get-Command $name -ErrorAction SilentlyContinue
        if (-not $cmd) { if ($name -notin 'powershell', 'cmd') { $problems += "command $name does not resolve in this session" }; continue }
        if ($cmd.CommandType -eq 'Application') { continue }
        $known = New-Object System.Collections.Generic.HashSet[string] ([StringComparer]::OrdinalIgnoreCase)
        foreach ($k in $cmd.Parameters.Keys) { [void]$known.Add($k); foreach ($al in $cmd.Parameters[$k].Aliases) { [void]$known.Add($al) } }
        foreach ($el in $c.CommandElements) {
            if ($el -is [System.Management.Automation.Language.CommandParameterAst] -and -not $known.Contains($el.ParameterName)) { $problems += "$name has no parameter -$($el.ParameterName)" }
        }
    }
    $problems
}
$regText = [IO.File]::ReadAllText($reg)
$preText = [IO.File]::ReadAllText($pre)
$sr = @(Get-StaticProblems $regText)
Check ($sr.Count -eq 0) 'static: register-h40d.ps1 reads no unassigned variable and passes only parameters that exist (New-ScheduledTask*, Register-ScheduledTask, Get-ScheduledTask*, Select-String, ...)' ($sr -join ' | ')
$sp2 = @(Get-StaticProblems $preText)
Check ($sp2.Count -eq 0) 'static: h40d-precheck.ps1 reads no unassigned variable and passes only parameters that exist (Start-ScheduledTask, Get-ScheduledTask*, Get-NetTCPConnection, ...)' ($sp2 -join ' | ')
$m1 = @(Get-StaticProblems ($regText.Replace('$repo)', '$rep0)')))
Check ($m1.Count -ge 1 -and ($m1 -join ' ') -match 'rep0') 'known-bad static: a misspelled variable in the register script is named' ($m1 -join ' | ')
$m2 = @(Get-StaticProblems ($regText.Replace('-WakeToRun', '-WakeToRunX')))
Check ($m2.Count -ge 1 -and ($m2 -join ' ') -match 'WakeToRunX') 'known-bad static: a misspelled cmdlet parameter in the register script is named' ($m2 -join ' | ')
$m4 = @(Get-StaticProblems ($preText.Replace('$di.LastRunTime', '$dx.LastRunTime')))
Check ($m4.Count -ge 1 -and ($m4 -join ' ') -match 'dx') 'known-bad static: a misspelled variable in the precheck dry-twin loop is named' ($m4 -join ' | ')
$m5 = @(Get-StaticProblems ($preText.Replace('Start-ScheduledTask -TaskName $dry', 'Start-ScheduledTask -TaskNme $dry')))
Check ($m5.Count -ge 1 -and ($m5 -join ' ') -match 'TaskNme') 'known-bad static: a misspelled parameter on Start-ScheduledTask in the precheck is named' ($m5 -join ' | ')
"SUMMARY ps-cal: $($script:passes) PASS, $($script:fails) FAIL"
exit $script:fails
