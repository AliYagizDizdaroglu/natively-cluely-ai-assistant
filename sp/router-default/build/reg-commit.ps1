$R = (Get-ChildItem 'C:\Users\sotka\OneDrive' -Directory | Where-Object { Test-Path (Join-Path $_.FullName 'natively-lab\sp\router-default') }).FullName
$LABDIR = "$R\natively-lab\sp\router-default"
$list = Get-Content -Encoding UTF8 "$LABDIR\build\reg-paths.txt" | Where-Object { $_ -ne '' }
& "$R\natively-lab\sp\commit-main-paths.ps1" -Expected 19937ab -Paths $list -MessageFile "$LABDIR\reg-msg.txt" -RefMessage 'router-default registration' -IndexName live-router-reg
