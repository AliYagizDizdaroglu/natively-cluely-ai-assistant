# Throwaway: commits ONLY the two regenerated passes/ files in MAIN (memory: commit-shared-index):
# build the tree in a private GIT_INDEX_FILE, commit-tree, update-ref compare-and-swap, then sync the
# shared index for these two paths only. Nothing else staged in MAIN can ride along.
$sp = 'C:\Users\sotka\OneDrive\Masaüstü\natively-lab\sp'
$m = 'C:\Users\sotka\OneDrive\Masaüstü\natively-cluely-ai-assistant'
if (-not (Test-Path -LiteralPath "$m\.git")) { "MAIN does not resolve (script encoding?): $m"; exit 1 }
$branch = 'fix/coding-style-suffix-all-gemini'
$expected = (git -C $m rev-parse --verify '5c97b11^{commit}').Trim()
$paths = @('electron/test/golden/passes/2026-09-22T08-22-50-s50m.md', 'electron/test/golden/passes/INDEX.md')
$msg = "$sp\s50m-passes-commit-msg.txt"

$cur = (git -C $m symbolic-ref --short HEAD).Trim(); if ($cur -ne $branch) { "PRE FAIL: MAIN is on $cur"; exit 2 }
$old = (git -C $m rev-parse HEAD).Trim(); if ($old -ne $expected) { "PRE FAIL: MAIN HEAD is $old, expected $expected"; exit 2 }
$staged = @(git -C $m diff --cached --name-only); if ($staged.Count) { "PRE FAIL: the shared index has staged changes: $($staged -join ', ')"; exit 2 }
$changed = @(git -C $m status --porcelain -- electron/test/golden/passes/ | ForEach-Object { $_.Substring(3) }); if (Compare-Object $changed $paths) { "PRE FAIL: passes/ changes are $($changed -join ', ')"; exit 2 }
$before = @(git -C $m status --porcelain | Where-Object { $p = $_.Substring(3); $paths -notcontains $p })
"PRE OK: $branch at $($old.Substring(0,7)); exactly the 2 passes/ files changed; nothing staged"

$idx = "$sp\passes-commit.index"
if (Test-Path -LiteralPath $idx) { Remove-Item -LiteralPath $idx -Force }
$env:GIT_INDEX_FILE = $idx
git -C $m read-tree HEAD
git -C $m update-index --add -- $paths
$tree = (git -C $m write-tree).Trim()
Remove-Item Env:GIT_INDEX_FILE
foreach ($p in $paths) { $blob = (git -C $m rev-parse "${tree}:$p").Trim(); $cr = node -e "const b=require('child_process').execFileSync('git',['-C',process.argv[1],'cat-file','-p',process.argv[2]]);console.log(b.includes(13))" $m $blob; if ($cr -ne 'false') { "BLOB HAS CR: $p"; exit 3 } }
"tree $($tree.Substring(0,7)) built; no CR in the blobs"

$new = (git -C $m commit-tree $tree -p $old -F $msg).Trim()
git -C $m update-ref -m 'commit: passes: record s50m''s grader, verified as claude-opus-5' "refs/heads/$branch" $new $old
if ($LASTEXITCODE) { 'CAS REFUSED: a peer moved the branch; nothing committed'; exit 4 }
git -C $m reset -q -- $paths
Remove-Item -LiteralPath $idx -Force

"POST: HEAD $((git -C $m rev-parse --short HEAD).Trim()) is the new commit: $(((git -C $m rev-parse HEAD).Trim()) -eq $new)"
"POST: HEAD tree equals the built tree: $(((git -C $m rev-parse 'HEAD^{tree}').Trim()) -eq $tree)"
"POST: the 2 paths are clean: $(-not (git -C $m status --porcelain -- $paths))"
$after = @(git -C $m status --porcelain | Where-Object { $p = $_.Substring(3); $paths -notcontains $p })
"POST: every other status line identical: $(-not (Compare-Object $before $after))"
git -C $m show --stat --format='%h %s' HEAD
