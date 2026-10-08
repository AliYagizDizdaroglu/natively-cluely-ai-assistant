$src = Get-Content -LiteralPath 'C:\Users\sotka\OneDrive\Masaüstü\natively-lab\sp\router-default\flight\rd-precheck.ps1' -Raw -Encoding UTF8
$gm = [regex]::Match($src, '\[regex\]::Match\(\$lastLine, ''(\^ARMING COMPLETE [^'']+)''\)')
if (-not $gm.Success) { Write-Output 'NOGATE'; exit 3 }
$m = [regex]::Match('ARMING COMPLETE 2026-10-07T22:30:00+03', $gm.Groups[1].Value)
Write-Output ('GATE ' + $m.Success)
$bad = [regex]::Match('ARMING COMPLETE 2026-10-07T22:08:17.455+03:00', $gm.Groups[1].Value)
Write-Output ('KNOWN-BAD ' + $bad.Success)
