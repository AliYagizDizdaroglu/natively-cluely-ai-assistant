# Throwaway: copy the two replay documents into MAIN (LF, UTF-8 no BOM) and commit only them.
$sp = 'C:\Users\sotka\OneDrive\Masaüstü\natively-lab\sp'
$m = (Resolve-Path (Join-Path $env:USERPROFILE 'OneDrive\Masa*\natively-cluely-ai-assistant') | Where-Object { Test-Path (Join-Path $_.Path '.git') } | Select-Object -First 1).Path
$rel = @('electron/test/golden/passes/PREREGISTER-followup-replay.md', 'electron/test/golden/passes/2026-09-26-followup-replay-result.md')
$enc = New-Object System.Text.UTF8Encoding($false)
foreach ($r in $rel) {
    $src = Join-Path "$sp\stage" ($r -replace '/', '\')
    $dst = Join-Path $m ($r -replace '/', '\')
    if (Test-Path -LiteralPath $dst) { "EXISTS already: $r"; exit 1 }
    $t = [IO.File]::ReadAllText($src)
    [IO.File]::WriteAllText($dst, $t.Replace("`r`n", "`n"), $enc)
    "copied $r"
}
& "$sp\commit-main-paths.ps1" -Expected da28f25 -Paths $rel -MessageFile "$sp\replay-docs-msg.txt" -RefMessage 'docs(passes): follow-up parent replay FAIL' -IndexName replaydocs
