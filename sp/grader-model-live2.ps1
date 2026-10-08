# Throwaway: live exercise v2 for the reviewed grader-model change, on a COPY of s50m inside the
# private worktree, plus INDEX rendered over ALL of MAIN's real run folders into a temp dir.
#   1. refusal text (no --model): points at the transcript, offers no literal id
#   2. --export prints the next: hint with --model
#   3. IN-APP merge with --model claude-opus-5 -> the record header h40a will print
#   4. one ARM merge with --model claude-opus-5
#   5. regenerated s50m record vs the committed one: only grader text (+ folder path) may differ
#   6. INDEX over all real MAIN runs (read-only on MAIN), written to a temp dir
# Cleans up: restores passes/, deletes the copy and the temp index.
$m = 'C:\Users\sotka\OneDrive\Masaüstü\natively-cluely-ai-assistant'
$wt = "$m\.claude\worktrees\grader-model"
$src = "$m\electron\test\golden\interview60.runs\2026-09-22T08-22-50-s50m"
$runs = "$wt\electron\test\golden\interview60.runs"
$dst = "$runs\2026-09-22T08-22-50-s50m"
$judge = "$wt\electron\test\golden\interview60.judge.mjs"
$arm = 'gemini-3.1-flash-lite_captured-low'
$tmpIndex = 'C:\Users\sotka\OneDrive\Masaüstü\natively-lab\sp\grader-model-index-check'
foreach ($p in @($m, $wt, $src, $judge)) { if (-not (Test-Path -LiteralPath $p)) { "path does not resolve (script encoding?): $p"; exit 1 } }
if (Test-Path -LiteralPath $dst) { 'copy already exists - stopping'; exit 1 }
New-Item -ItemType Directory -Force $runs | Out-Null
Copy-Item -LiteralPath $src -Destination $runs -Recurse
"copied $((Get-ChildItem -LiteralPath $dst -File).Count) files"
function Show($label, [string[]]$argv) {
    $out = & node $judge $dst @argv 2>&1 | ForEach-Object { "$_" }
    "--- $label : exit $LASTEXITCODE"
    $out | Where-Object { $_ -match 'JUDGE|grader model|next:|written ' } | ForEach-Object { '  ' + $_.Substring(0, [Math]::Min(330, $_.Length)) }
}
Show '1. in-app merge without --model' @('--verdicts', "$dst\interview60.judge.verdicts.json")
Show '2. in-app --export (hint)' @('--export')
$inAppBefore = (Get-FileHash -LiteralPath "$dst\interview60.judge.json").Hash
Show '3. in-app merge --model claude-opus-5' @('--verdicts', "$dst\interview60.judge.verdicts.json", '--model', 'claude-opus-5')
Show '4. arm merge --model claude-opus-5' @('--answers', "$dst\interview60.answers.$arm.json", '--verdicts', "$dst\interview60.judge.verdicts.$arm.json", '--model', 'claude-opus-5')
'--- judge files after the merges'
node -e "const fs=require('fs');for(const [a,b] of [[process.argv[1],process.argv[2]],[process.argv[3],process.argv[4]]]){const x=JSON.parse(fs.readFileSync(a,'utf8')),y=JSON.parse(fs.readFileSync(b,'utf8'));console.log('  '+require('path').basename(b)+': graderModel',y.graderModel,'| model',y.model,'| stamp',y.graderPrompt,'| items identical to 09-22:',JSON.stringify(x.items)===JSON.stringify(y.items),'('+Object.keys(y.items).length+')')}" "$src\interview60.judge.json" "$dst\interview60.judge.json" "$src\interview60.judge.$arm.json" "$dst\interview60.judge.$arm.json"
'--- 5. regenerated s50m record vs the committed one'
node 'C:\Users\sotka\OneDrive\Masaüstü\natively-lab\sp\record-diff-check.mjs' $wt 'electron/test/golden/passes/2026-09-22T08-22-50-s50m.md'
'--- 6. INDEX over all real MAIN runs (temp output)'
if (Test-Path -LiteralPath $tmpIndex) { Remove-Item -LiteralPath $tmpIndex -Recurse -Force }
New-Item -ItemType Directory -Force $tmpIndex | Out-Null
$pr = ("file:///" + ("$wt\electron\test\golden\interview60.pass-record.mjs" -replace '\\', '/'))
node --input-type=module -e "const m=await import(process.argv[1]);console.log('  index written:',m.writePassIndex({passesDir:process.argv[2],runsDir:process.argv[3]}))" $pr $tmpIndex "$m\electron\test\golden\interview60.runs" 2>&1 | Select-Object -First 3
node -e "const t=require('fs').readFileSync(process.argv[1],'utf8').split('\n');const rows=t.filter(l=>l.startsWith('| 20'));const parts=l=>l.split(/(?<!\\)\|/);const hdr=t.find(l=>l.startsWith('| pass |'));console.log('  rows',rows.length,'| header cells',parts(hdr).length,'| rows with a different cell count',rows.filter(r=>parts(r).length!==parts(hdr).length).length,'| unreadable rows',rows.filter(r=>r.includes('unreadable:')).length);const g={};for(const r of rows){const c=parts(r).slice(-2)[0].trim();g[c]=(g[c]||0)+1}console.log('  grader cells:',JSON.stringify(g));console.log('  preface ends:',t[2].slice(-150))" "$tmpIndex\INDEX.md"
'--- cleanup'
git -C $wt checkout -- electron/test/golden/passes/
Remove-Item -LiteralPath $dst -Recurse -Force
if (-not (Get-ChildItem -LiteralPath $runs -Force)) { Remove-Item -LiteralPath $runs -Force }
Remove-Item -LiteralPath $tmpIndex -Recurse -Force
'  passes/ and runs/ state in the worktree (expect only the 6 intended files):'
git -C $wt status --short
'  leftovers under golden/ (expect none):'
git -C $wt status --short --ignored -- electron/test/golden/ | Where-Object { $_ -match '^!!|^\?\?' }
'(end)'
