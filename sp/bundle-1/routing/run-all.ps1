# Throwaway: the routing replay chain B0 -> B1 r1 -> B1 r2 -> V with the user-ruled substitute context, then the score.
# ASCII only; folder by wildcard. Stops at the first non-zero exit (B1/V refuse if B0 fails the calibration gate).
$dir = (Resolve-Path 'C:\Users\sotka\OneDrive\Masa*\natively-lab\sp\bundle-1\routing').Path
Set-Location -LiteralPath $dir
$ctx = Join-Path $dir 'substitute-context.txt'
foreach ($step in @(@('B0','1'), @('B1','1'), @('B1','2'), @('V','1'))) {
  node run.mjs --arm $step[0] --rep $step[1] --substitute-context $ctx
  "STEP $($step[0]) rep $($step[1]) exit $LASTEXITCODE"
  if ($LASTEXITCODE -ne 0) { "CHAIN STOPPED"; exit 1 }
}
node score-routing.mjs
"score exit $LASTEXITCODE"
