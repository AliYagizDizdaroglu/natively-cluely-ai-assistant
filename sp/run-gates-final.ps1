# Throwaway (Task 9 gates, same method as the 18:0x baseline and the 18:45 T5 run): real cwd = MAIN,
# the three NATIVELY_* flags removed from this process, the two live logs fingerprinted before and after
# (the suite must not write them), then vitest full, tsc root, tsc electron. ASCII only; MAIN resolved by
# the wildcard that holds .git.
param([Parameter(Mandatory = $true)][string]$OutDir)
$m = (Resolve-Path (Join-Path $env:USERPROFILE 'OneDrive\Masa*\natively-cluely-ai-assistant') | Where-Object { Test-Path (Join-Path $_.Path '.git') } | Select-Object -First 1).Path
if (-not $m) { 'MAIN does not resolve'; exit 1 }
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
foreach ($k in 'NATIVELY_VERBAL_HEDGE', 'NATIVELY_VERBAL_HEDGE_TRIGGER_MS', 'NATIVELY_FOLLOWUP_PARENT', 'NATIVELY_VERBAL_PRIMARY_MODEL', 'NATIVELY_GEMINI_THINKING_LEVEL') { Remove-Item "Env:$k" -ErrorAction SilentlyContinue }
function Fp($f) { $i = Get-Item -LiteralPath (Join-Path $m $f); $h = (Get-FileHash -LiteralPath $i.FullName -Algorithm SHA256).Hash.Substring(0, 12); "$f $($i.Length) $($i.LastWriteTime.ToString('HH:mm:ss')) $h" }
$before = @((Fp 'verbal-diag.log'), (Fp 'natively_debug.log'))
"HEAD $((git -C $m rev-parse --short HEAD).Trim())"
Push-Location $m
try {
    $t0 = Get-Date
    node node_modules/vitest/vitest.mjs run --reporter=dot *> (Join-Path $OutDir 'vitest-full.txt')
    "vitest exit $LASTEXITCODE in $([int]((Get-Date) - $t0).TotalSeconds) s"
    node node_modules/typescript/bin/tsc --noEmit *> (Join-Path $OutDir 'tsc-root.txt')
    "tsc root exit $LASTEXITCODE"
    node node_modules/typescript/bin/tsc -p electron/tsconfig.json --noEmit *> (Join-Path $OutDir 'tsc-electron.txt')
    "tsc electron exit $LASTEXITCODE"
} finally { Pop-Location }
$after = @((Fp 'verbal-diag.log'), (Fp 'natively_debug.log'))
Select-String -Path (Join-Path $OutDir 'vitest-full.txt') -Pattern 'Test Files|Tests  |FAIL' | ForEach-Object { $_.Line.Trim() } | Select-Object -First 12
"tsc root error lines: $(@(Select-String -Path (Join-Path $OutDir 'tsc-root.txt') -Pattern 'error TS').Count)"
"tsc electron error lines: $(@(Select-String -Path (Join-Path $OutDir 'tsc-electron.txt') -Pattern 'error TS').Count)"
Select-String -Path (Join-Path $OutDir 'tsc-electron.txt') -Pattern 'error TS' | ForEach-Object { ($_.Line -split ':')[0] }
"logs before: $($before -join ' | ')"
"logs after:  $($after -join ' | ')"
"logs unchanged: $(($before -join '|') -eq ($after -join '|'))"
