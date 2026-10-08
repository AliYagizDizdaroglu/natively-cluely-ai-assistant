$R = (Get-ChildItem 'C:\Users\sotka\OneDrive' -Directory | Where-Object { Test-Path (Join-Path $_.FullName 'natively-lab\sp\router-default') }).FullName
$I = "$R\natively-cluely-ai-assistant\.claude\worktrees\live-router"
$OUT = "$R\natively-lab\sp\router-default\build\gates"
New-Item -ItemType Directory -Force $OUT | Out-Null
"HEAD " + (git -C $I log --oneline -1) | Out-File -Encoding utf8 "$OUT\head.txt"
"dirty: " + ((git -C $I status --porcelain) -join ',') | Out-File -Encoding utf8 -Append "$OUT\head.txt"
Set-Location $I
cmd /c "npx tsc --noEmit -p . > ""$OUT\tsc-root.txt"" 2>&1"
"tsc root exit $LASTEXITCODE" | Out-File -Encoding utf8 -Append "$OUT\head.txt"
cmd /c "npx tsc --noEmit -p electron/tsconfig.json > ""$OUT\tsc-electron.txt"" 2>&1"
"tsc electron exit $LASTEXITCODE errors " + (Select-String -Path "$OUT\tsc-electron.txt" -Pattern 'error TS').Count | Out-File -Encoding utf8 -Append "$OUT\head.txt"
cmd /c "npm run build:electron > ""$OUT\build.txt"" 2>&1"
"build exit $LASTEXITCODE" | Out-File -Encoding utf8 -Append "$OUT\head.txt"
foreach ($s in 'ROUTER_SHAS_OK', 'gemini-3.8-live', '[Router] flag NATIVELY_LIVE_ROUTER=', 'stripUnknownMarkers', 'generation !== this.generation', 'routerArbiter.forward') {
  $hits = (Get-ChildItem "$I\dist-electron" -Recurse -Filter *.js | Select-String -SimpleMatch $s -List).Count
  "grep '$s' files=$hits" | Out-File -Encoding utf8 -Append "$OUT\head.txt"
}
$T = Join-Path $env:TEMP 'rd-suite'
New-Item -ItemType Directory -Force $T | Out-Null
Set-Location $T
cmd /c "node ""$I\node_modules\vitest\vitest.mjs"" run --root ""$I"" > ""$OUT\suite.txt"" 2>&1"
"suite exit $LASTEXITCODE" | Out-File -Encoding utf8 -Append "$OUT\head.txt"
Select-String -Path "$OUT\suite.txt" -Pattern 'Test Files|Tests  ' | ForEach-Object { $_.Line } | Out-File -Encoding utf8 -Append "$OUT\head.txt"
'DONE' | Out-File -Encoding utf8 -Append "$OUT\head.txt"
