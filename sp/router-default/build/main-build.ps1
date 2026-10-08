$R = (Get-ChildItem 'C:\Users\sotka\OneDrive' -Directory | Where-Object { Test-Path (Join-Path $_.FullName 'natively-lab\sp\router-default') }).FullName
$M = "$R\natively-cluely-ai-assistant"
$LABDIR = "$R\natively-lab\sp\router-default"
Set-Location $M
cmd /c "npm run build:electron > ""$LABDIR\build\main-build.txt"" 2>&1"
$code = $LASTEXITCODE
$head = (git -C $M rev-parse --short HEAD).Trim()
$out = @("MAIN HEAD $head", "build exit $code", "built at $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')")
foreach ($f in 'dist-electron\electron\audio\LiveRouterSession.js', 'dist-electron\electron\services\routerArbiter.js', 'dist-electron\electron\main.js') {
  $h = (Get-FileHash -Algorithm SHA256 "$M\$f").Hash.ToLower().Substring(0, 12)
  $out += "$f $h $((Get-Item "$M\$f").LastWriteTime.ToString('HH:mm:ss'))"
}
foreach ($s in 'ROUTER_SHAS_OK', 'gemini-3.8-live', '[Router] flag NATIVELY_LIVE_ROUTER=', 'stripUnknownMarkers', 'generation !== this.generation', 'routerArbiter.forward') {
  $hits = (Get-ChildItem "$M\dist-electron" -Recurse -Filter *.js | Select-String -SimpleMatch $s -List).Count
  $out += "grep '$s' files=$hits"
}
$out | Out-File -Encoding utf8 "$LABDIR\build-marker.txt"
$out
