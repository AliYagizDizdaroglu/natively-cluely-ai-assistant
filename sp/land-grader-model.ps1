# Throwaway: lands the grader-model commit into MAIN's shared checkout (memory: commit-shared-index,
# "Variant for whole files"): preconditions, checkout the paths FIRST, then update-ref CAS, then
# postconditions. -DryRun runs the preconditions only.
param([switch]$DryRun, [string]$Commit)
$m = 'C:\Users\sotka\OneDrive\Masaüstü\natively-cluely-ai-assistant'
if (-not (Test-Path -LiteralPath "$m\.git")) { "MAIN does not resolve (script encoding?): $m"; exit 1 }
if (-not $Commit) { 'pass -Commit <sha>'; exit 1 }
$branch = 'fix/coding-style-suffix-all-gemini'
$old = 'a50fd098ba8cd47bd368f5a9c688cf2c4b044022'
$new = (git -C $m rev-parse --verify "$Commit^{commit}").Trim()
$paths = @('electron/test/golden/README.md', 'electron/test/golden/interview60.flight.mjs', 'electron/test/golden/interview60.judge.mjs', 'electron/test/golden/interview60.judge.test.ts', 'electron/test/golden/interview60.pass-record.mjs', 'electron/test/golden/interview60.pass-record.test.ts')

# preconditions
$cur = (git -C $m symbolic-ref --short HEAD).Trim(); if ($cur -ne $branch) { "PRE FAIL: MAIN is on $cur"; exit 2 }
$head = (git -C $m rev-parse HEAD).Trim(); if ($head -ne $old) { "PRE FAIL: MAIN HEAD moved to $head"; exit 2 }
$parent = (git -C $m rev-parse "$new^").Trim(); if ($parent -ne $old) { "PRE FAIL: $new's parent is $parent, not $old"; exit 2 }
$touched = @(git -C $m diff --name-only $old $new); if (Compare-Object $touched $paths) { "PRE FAIL: the commit touches $($touched -join ', ')"; exit 2 }
$dirty = @(git -C $m status --porcelain -- $paths); if ($dirty.Count) { "PRE FAIL: paths dirty in MAIN: $($dirty -join '; ')"; exit 2 }
$staged = @(git -C $m diff --cached --name-only); if ($staged.Count) { "PRE FAIL: MAIN's shared index has staged changes: $($staged -join ', ')"; exit 2 }
"PRE OK: $branch at $($old.Substring(0,7)); $($new.Substring(0,7)) is its child touching only its $($paths.Count) paths; paths clean; nothing staged"
if ($DryRun) { 'DRY RUN: not landing'; exit 0 }

$before = @(git -C $m status --porcelain)
git -C $m checkout $new -- $paths
if ($LASTEXITCODE) { 'LAND FAIL: checkout of the paths failed; branch untouched'; exit 3 }
git -C $m update-ref -m 'commit: fix(judge): a merged pass records the model that graded it' "refs/heads/$branch" $new $old
if ($LASTEXITCODE) { 'LAND FAIL: compare-and-swap refused (a peer moved the branch); paths are checked out at the new commit - investigate before anything else'; exit 4 }

# postconditions
$headTree = (git -C $m rev-parse 'HEAD^{tree}').Trim(); $newTree = (git -C $m rev-parse "$new^{tree}").Trim()
"POST: HEAD is $((git -C $m rev-parse --short HEAD).Trim()); tree equals the verified commit's tree: $($headTree -eq $newTree)"
$pd = @(git -C $m status --porcelain -- $paths); "POST: the 4 paths are clean: $($pd.Count -eq 0)"
$after = @(git -C $m status --porcelain); $d = Compare-Object $before $after
"POST: every other status line identical before and after: $(-not $d)"
if ($d) { $d | ForEach-Object { "  $($_.SideIndicator) $($_.InputObject)" } }
