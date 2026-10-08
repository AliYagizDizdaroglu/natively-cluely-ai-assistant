$R = (Get-ChildItem 'C:\Users\sotka\OneDrive' -Directory | Where-Object { Test-Path (Join-Path $_.FullName 'natively-lab\sp\router-default') }).FullName
$LABDIR = "$R\natively-lab\sp\router-default"
$list = Get-Content -Encoding UTF8 "$LABDIR\land-paths.txt" | Where-Object { $_ -ne '' }
& "$R\natively-lab\sp\commit-main-paths.ps1" -Expected 4511f20 -Paths $list -MessageFile "$LABDIR\land-msg-pad.txt" -RefMessage 'router silence padding' -IndexName live-router-pad
