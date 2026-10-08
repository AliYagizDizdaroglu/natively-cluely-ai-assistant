# Throwaway: the live exercise for 67efa84 — the real judge CLI on a COPY of s50m inside the
# private worktree (the CLI writes into the run folder, and its recordPass rewrites passes/).
#   1. no --model          -> refused, judge file untouched
#   2. --model opus        -> refused, judge file untouched
#   3. --model claude-opus-5 (verified 09-22 grader) -> merged; items identical; graderModel set;
#      the regenerated pass record differs from the committed one only in grader text + folder path
# Cleans up after itself: restores passes/ and deletes the copy.
$m = 'C:\Users\sotka\OneDrive\Masaüstü\natively-cluely-ai-assistant'
$wt = "$m\.claude\worktrees\grader-model"
$src = "$m\electron\test\golden\interview60.runs\2026-09-22T08-22-50-s50m"
$runs = "$wt\electron\test\golden\interview60.runs"
$dst = "$runs\2026-09-22T08-22-50-s50m"
$judge = "$wt\electron\test\golden\interview60.judge.mjs"
$arm = 'gemini-3.1-flash-lite_captured-low'
$jf = "$dst\interview60.judge.$arm.json"
$answers = "$dst\interview60.answers.$arm.json"
$verdicts = "$dst\interview60.judge.verdicts.$arm.json"

# Windows PowerShell 5.1 reads a BOM-less script as ANSI and mangles "Masaüstü" into a path that
# New-Item -Force would happily create under OneDrive. Refuse before touching anything.
foreach ($p in @($m, $wt, $src, $judge)) { if (-not (Test-Path -LiteralPath $p)) { "path does not resolve (script encoding?): $p"; exit 1 } }
if (Test-Path -LiteralPath $dst) { 'copy already exists - stopping'; exit 1 }
New-Item -ItemType Directory -Force $runs | Out-Null
Copy-Item -LiteralPath $src -Destination $runs -Recurse
"copied {0} files; judge file sha before {1}" -f (Get-ChildItem -LiteralPath $dst -File).Count, (Get-FileHash -LiteralPath $jf).Hash.Substring(0, 12)

function Invoke-Merge($label, [string[]]$extra) {
    $out = & node $judge $dst --answers $answers --verdicts $verdicts @extra 2>&1 | Out-String
    $code = $LASTEXITCODE
    "--- $label : exit $code"
    $out -split "`r?`n" | Where-Object { $_ -match 'JUDGE|grader model|PASS-RECORD|written ' } | ForEach-Object { '  ' + $_.Substring(0, [Math]::Min(240, $_.Length)) }
    '  judge file sha now ' + (Get-FileHash -LiteralPath $jf).Hash.Substring(0, 12)
}
Invoke-Merge 'no --model' @()
Invoke-Merge '--model opus' @('--model', 'opus')
Invoke-Merge '--model claude-opus-5' @('--model', 'claude-opus-5')

'--- judge file after the accepted merge'
node -e "const fs=require('fs');const a=JSON.parse(fs.readFileSync(process.argv[1],'utf8')),b=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));console.log('  model',b.model,'| graderModel',b.graderModel,'| effort',b.effort,'| graderPrompt',b.graderPrompt,'(09-22 file:',a.graderPrompt+')');console.log('  items identical to the 09-22 file:',JSON.stringify(a.items)===JSON.stringify(b.items),'('+Object.keys(b.items).length+' items)');console.log('  09-22 file had graderModel:',a.graderModel===undefined?'no':a.graderModel)" "$src\interview60.judge.$arm.json" $jf

'--- regenerated pass record vs the committed one (changed lines only)'
git -C $wt diff --stat -- electron/test/golden/passes/2026-09-22T08-22-50-s50m.md
git -C $wt diff -U0 -- electron/test/golden/passes/2026-09-22T08-22-50-s50m.md | Select-String -Pattern '^[-+]' | Where-Object { $_.Line -notmatch '^(---|\+\+\+) ' } | ForEach-Object { '  ' + $_.Line.Substring(0, [Math]::Min(200, $_.Line.Length)) }
'--- INDEX row for the copy (index refreshed over the worktree runs folder)'
Get-Content "$wt\electron\test\golden\passes\INDEX.md" | Select-String -Pattern '\| pass \||s50m' | ForEach-Object { '  ' + $_.Line }

'--- cleanup'
git -C $wt checkout -- electron/test/golden/passes/
Remove-Item -LiteralPath $dst -Recurse -Force
if (-not (Get-ChildItem -LiteralPath $runs -Force)) { Remove-Item -LiteralPath $runs -Force }
'  worktree status (expect nothing):'
git -C $wt status --short
'  untracked or ignored leftovers under golden/:'
git -C $wt status --short --ignored -- electron/test/golden/
'(end)'
