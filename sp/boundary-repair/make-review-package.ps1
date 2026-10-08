# Builds an SDD review package from MAIN's WORKING TREE against a base commit (implementers here do not
# commit; the controller commits after review). New files appear as full additions, modified files as
# git diff -U10. -Summarize lists paths whose content is only stat + sha256 (large data files).
#   powershell -NoProfile -File make-review-package.ps1 -Base e78f7c7 -Paths a,b -Summarize c -Out <file>
# ASCII-only on purpose (PowerShell 5.1 reads BOM-less scripts in the ANSI code page).
param(
    [Parameter(Mandatory = $true)][string]$Base,
    [Parameter(Mandatory = $true)][string[]]$Paths,
    [string[]]$Summarize = @(),
    [Parameter(Mandatory = $true)][string]$Out
)
$ErrorActionPreference = 'Stop'
# powershell -File passes an array argument as ONE comma-joined string: split it back.
$Paths = @($Paths | ForEach-Object { $_ -split ',' } | Where-Object { $_ })
$Summarize = @($Summarize | ForEach-Object { $_ -split ',' } | Where-Object { $_ })
$m =(Resolve-Path (Join-Path $env:USERPROFILE 'OneDrive\Masa*\natively-cluely-ai-assistant') | Where-Object { Test-Path (Join-Path $_.Path '.git') } | Select-Object -First 1).Path
if (-not $m) { throw 'MAIN not found' }
$lines = New-Object System.Collections.Generic.List[string]
$lines.Add("# Review package: MAIN working tree vs $Base")
$lines.Add("HEAD: " + (git -C $m rev-parse --short HEAD) + "   branch: " + (git -C $m rev-parse --abbrev-ref HEAD))
$lines.Add('')
foreach ($p in ($Paths + $Summarize)) {
    $full = Join-Path $m $p
    if (-not (Test-Path -LiteralPath $full)) { $lines.Add("MISSING: $p"); continue }
    $bytes = [IO.File]::ReadAllBytes($full)
    $sha = [BitConverter]::ToString((New-Object Security.Cryptography.SHA256Managed).ComputeHash($bytes)).Replace('-', '').ToLower().Substring(0, 16)
    $tracked = git -C $m ls-files -- $p
    $state = 'new'
    if ($tracked) {
        git -C $m diff --quiet $Base -- $p
        $state = if ($LASTEXITCODE -eq 0) { "unchanged since $Base" } else { 'modified' }
    }
    $lines.Add("STAT $state $p  $($bytes.Length) bytes  sha256 $sha")
}
$lines.Add('')
foreach ($p in $Paths) {
    $tracked = git -C $m ls-files -- $p
    if ($tracked) { $d = git -C $m diff -U10 $Base -- $p }
    else { $d = git -C $m diff --no-index -U10 -- /dev/null $p }
    $lines.Add("===== $p =====")
    foreach ($l in $d) { $lines.Add($l) }
    $lines.Add('')
}
[IO.File]::WriteAllLines($Out, $lines, (New-Object Text.UTF8Encoding($false)))
Write-Output ("wrote " + $Out + " (" + $lines.Count + " lines)")
