# Throwaway: commits ONLY the named paths in MAIN (memory: commit-shared-index): private GIT_INDEX_FILE,
# commit-tree, update-ref compare-and-swap against -Expected, then sync the shared index for those
# paths only. Nothing else staged or changed in MAIN can ride along. ASCII only; the repo path is the
# wildcard match that holds .git (a stray mojibake tree also matches the wildcard).
#   powershell -NoProfile -ExecutionPolicy Bypass -File commit-main-paths.ps1 -Expected <sha> -Paths a/b.ts,c/d.ts -MessageFile <txt> -RefMessage '<short>' -IndexName <name>
param(
    [Parameter(Mandatory = $true)][string]$Expected,
    [Parameter(Mandatory = $true)][string[]]$Paths,
    [Parameter(Mandatory = $true)][string]$MessageFile,
    [Parameter(Mandatory = $true)][string]$RefMessage,
    [Parameter(Mandatory = $true)][string]$IndexName
)
$sp = 'C:\Users\sotka\OneDrive\Masaüstü\natively-lab\sp'
$m = (Resolve-Path (Join-Path $env:USERPROFILE 'OneDrive\Masa*\natively-cluely-ai-assistant') | Where-Object { Test-Path (Join-Path $_.Path '.git') } | Select-Object -First 1).Path
if (-not $m -or -not (Test-Path -LiteralPath "$m\.git")) { "MAIN does not resolve"; exit 1 }
$branch = 'fix/coding-style-suffix-all-gemini'
$expected = (git -C $m rev-parse --verify "$Expected^{commit}").Trim()
if (-not (Test-Path -LiteralPath $MessageFile)) { "PRE FAIL: message file missing: $MessageFile"; exit 2 }

$cur = (git -C $m symbolic-ref --short HEAD).Trim(); if ($cur -ne $branch) { "PRE FAIL: MAIN is on $cur"; exit 2 }
$old = (git -C $m rev-parse HEAD).Trim(); if ($old -ne $expected) { "PRE FAIL: MAIN HEAD is $old, expected $expected"; exit 2 }
$staged = @(git -C $m diff --cached --name-only); if ($staged.Count) { "PRE FAIL: the shared index has staged changes: $($staged -join ', ')"; exit 2 }
foreach ($p in $Paths) { if (-not (Test-Path -LiteralPath (Join-Path $m $p))) { "PRE FAIL: missing $p"; exit 2 } }
$before = @(git -C $m status --porcelain | Where-Object { $p = $_.Substring(3); $Paths -notcontains $p })
"PRE OK: $branch at $($old.Substring(0,7)); nothing staged; $($Paths.Count) path(s) present"

$idx = "$sp\$IndexName.index"
if (Test-Path -LiteralPath $idx) { Remove-Item -LiteralPath $idx -Force }
$env:GIT_INDEX_FILE = $idx
git -C $m read-tree HEAD
git -C $m update-index --add -- $Paths
$tree = (git -C $m write-tree).Trim()
Remove-Item Env:GIT_INDEX_FILE
foreach ($p in $Paths) { $blob = (git -C $m rev-parse "${tree}:$p").Trim(); $cr = node -e "const b=require('child_process').execFileSync('git',['-C',process.argv[1],'cat-file','-p',process.argv[2]]);console.log(b.includes(13))" $m $blob; if ($cr -ne 'false') { "BLOB HAS CR: $p - normalise the file to LF and rerun"; Remove-Item -LiteralPath $idx -Force; exit 3 } }
"tree $($tree.Substring(0,7)) built; no CR in the blobs"

$new = (git -C $m commit-tree $tree -p $old -F $MessageFile).Trim()
git -C $m update-ref -m "commit: $RefMessage" "refs/heads/$branch" $new $old
if ($LASTEXITCODE) { 'CAS REFUSED: a peer moved the branch; nothing committed'; exit 4 }
git -C $m reset -q -- $Paths
Remove-Item -LiteralPath $idx -Force

"POST: HEAD $((git -C $m rev-parse --short HEAD).Trim()) is the new commit: $(((git -C $m rev-parse HEAD).Trim()) -eq $new)"
"POST: HEAD tree equals the built tree: $(((git -C $m rev-parse 'HEAD^{tree}').Trim()) -eq $tree)"
"POST: the paths are clean: $(-not (git -C $m status --porcelain -- $Paths))"
$after = @(git -C $m status --porcelain | Where-Object { $p = $_.Substring(3); $Paths -notcontains $p })
"POST: every other status line identical: $(-not (Compare-Object $before $after))"
git -C $m show --stat --format='%h %s' HEAD
