# Throwaway: the 6 calibration grader launches in two lanes (at most 2 at once), then the calibration score.
# ASCII only; the folder is resolved by wildcard (memory: PowerShell BOM + non-ASCII paths).
$dir = (Resolve-Path 'C:\Users\sotka\OneDrive\Masa*\natively-lab\sp\cue-grader').Path
Set-Location -LiteralPath $dir
$lane = { param($d, $tags) Set-Location -LiteralPath $d; foreach ($t in $tags) { node launch-grader-cue.mjs $t --model-id claude-opus-5-5 *> (Join-Path $d "grading\$t.log"); "$t exit $LASTEXITCODE" } }
$a = Start-Job -ScriptBlock $lane -ArgumentList $dir, @('cal-1.g1','cal-2.g1','cal-3.g1')
$b = Start-Job -ScriptBlock $lane -ArgumentList $dir, @('cal-1.g2','cal-2.g2','cal-3.g2')
Wait-Job $a, $b | Out-Null
Receive-Job $a; Receive-Job $b
node score-cue.mjs --cal
"score exit $LASTEXITCODE"
