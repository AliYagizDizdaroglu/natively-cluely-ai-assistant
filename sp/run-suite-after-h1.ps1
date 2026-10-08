# Throwaway: wait until the H1 hedge window is over (19:56 local), then run MAIN's full vitest
# suite once and record the result. ASCII-only on purpose: the repo path is resolved by wildcard
# plus a .git filter (a stray mojibake OneDrive tree also matches the wildcard).
$ErrorActionPreference = 'Continue'
$sp = 'C:\Users\sotka\OneDrive\Masaüstü\natively-lab\sp'
$log = Join-Path $sp 'suite-after-h1.log'
$repo = Get-Item 'C:\Users\sotka\OneDrive\Masa*\natively-cluely-ai-assistant' | Where-Object { Test-Path (Join-Path $_.FullName '.git') } | Select-Object -First 1
if (-not $repo) { "$(Get-Date -Format HH:mm:ss) NO REPO" | Out-File $log -Encoding utf8; exit 3 }
$startAt = Get-Date -Hour 19 -Minute 57 -Second 0
"$(Get-Date -Format HH:mm:ss) waiting until $($startAt.ToString('HH:mm:ss')) for H1 to end; repo $($repo.FullName)" | Out-File $log -Encoding utf8
while ((Get-Date) -lt $startAt) { Start-Sleep -Seconds 15 }
"$(Get-Date -Format HH:mm:ss) SUITE START" | Out-File $log -Append -Encoding utf8
Push-Location $repo.FullName
& node node_modules/vitest/vitest.mjs run 2>&1 | Out-File $log -Append -Encoding utf8
$code = $LASTEXITCODE
Pop-Location
"$(Get-Date -Format HH:mm:ss) SUITE EXIT $code" | Out-File $log -Append -Encoding utf8
exit $code
