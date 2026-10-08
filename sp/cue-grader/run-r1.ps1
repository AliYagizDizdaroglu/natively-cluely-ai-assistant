# Throwaway: export r1, the 4 r1 grader launches in two lanes, then the real score. ASCII only; folder by wildcard.
$dir = (Resolve-Path 'C:\Users\sotka\OneDrive\Masa*\natively-lab\sp\cue-grader').Path
Set-Location -LiteralPath $dir
node export.mjs real r1
"export exit $LASTEXITCODE"
if ($LASTEXITCODE -ne 0) { exit 3 }
$lane = { param($d, $tags) Set-Location -LiteralPath $d; foreach ($t in $tags) { node launch-grader-cue.mjs $t --model-id claude-opus-5-5 *> (Join-Path $d "grading\$t.log"); "$t exit $LASTEXITCODE" } }
$a = Start-Job -ScriptBlock $lane -ArgumentList $dir, @('r1-inapp.g1','r1-high')
$b = Start-Job -ScriptBlock $lane -ArgumentList $dir, @('r1-inapp.g2','r1-low')
Wait-Job $a, $b | Out-Null
Receive-Job $a; Receive-Job $b
node score-cue.mjs --real --write
"score exit $LASTEXITCODE"
