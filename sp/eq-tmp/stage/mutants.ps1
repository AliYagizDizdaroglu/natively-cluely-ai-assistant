$ErrorActionPreference = 'Stop'
$S = 'C:\Users\sotka\OneDrive\Masaüstü\natively-lab\sp\eq-tmp\stage'
$WT = 'C:\Users\sotka\OneDrive\Masaüstü\natively-cluely-ai-assistant\.claude\worktrees\eq-build'
$TMP = 'C:\Users\sotka\OneDrive\Masaüstü\natively-lab\sp\eq-tmp'
$B = 'C:\Users\sotka\OneDrive\Masaüstü\natively-lab\sp\followup-turn\build'
$target = "$WT\electron\llm\earlierQuestion.ts"
$orig = [IO.File]::ReadAllText("$S\earlierQuestion.ts")
$muts = @(
  @{ n = 1; from = 'if (turnId == null) return silent(''no-turn'', cue);'; to = 'if (!turnId) return silent(''no-turn'', cue);' },
  @{ n = 2; from = 'const rest = turnId != null ? ledger.filter((e) => e.turnId !== turnId) : ledger;
    return [...rest, { text, turnId, seq }].slice(-LEDGER_DEPTH);'; to = 'const rest = turnId != null ? ledger.map((e) => e.turnId === turnId ? { text, turnId, seq } : e) : [...ledger, { text, turnId, seq }];
    return (turnId != null && !ledger.some((e) => e.turnId === turnId) ? [...ledger, { text, turnId, seq }] : rest).slice(-LEDGER_DEPTH);' },
  @{ n = 3; from = 'export const CLIP_TAIL = 299;'; to = 'export const CLIP_TAIL = 300;' },
  @{ n = 4; from = 'if (m && m[1]) texts.push(m[1]);'; to = 'if (m) texts.push(m[1]);' }
)
$out = @()
foreach ($m in $muts) {
  if (-not $orig.Contains($m.from)) { throw "mutant $($m.n): anchor not found" }
  [IO.File]::WriteAllText($target, $orig.Replace($m.from, $m.to), (New-Object Text.UTF8Encoding($false)))
  Set-Location $TMP
  $log = "$B\task-2-mutant-$($m.n).txt"
  cmd /c "node ""C:\Users\sotka\OneDrive\Masaüstü\natively-cluely-ai-assistant\node_modules\vitest\vitest.mjs"" run electron/llm/earlierQuestion.test.ts --root ""$WT"" > ""$log"" 2>&1"
  $txt = Get-Content $log -Encoding UTF8
  $fails = $txt | Where-Object { $_ -match '^\s*(FAIL|×|✗)' -or $_ -match '^ *× ' }
  $summary = ($txt | Where-Object { $_ -match 'Tests ' }) -join ' | '
  $out += "mutant $($m.n): $summary"
  $out += ($txt | Where-Object { $_ -match '^ *(FAIL|×) ' } | ForEach-Object { '   ' + $_.Trim() })
}
[IO.File]::WriteAllText($target, $orig, (New-Object Text.UTF8Encoding($false)))
$out += 'restored hash: ' + (Get-FileHash $target).Hash + ' vs stage ' + (Get-FileHash "$S\earlierQuestion.ts").Hash
$out | Tee-Object "$B\task-2-mutants.txt"
