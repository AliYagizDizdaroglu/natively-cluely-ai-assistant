# observe-session.ps1 (bundle-1 smoke, observability row). READ-ONLY sampler: every -EverySec seconds it appends ONE line to -Out:
#   <ISO utc> console=<id> self=<id> electron=<pid>:<sessionId>[,..] windows=<pid>:<WxH>[,..]
# console = WTSGetActiveConsoleSessionId (the session whose desktop the user is looking at), self = this sampler's own session,
# electron = every electron.exe with its SessionId, windows = every VISIBLE top-level window of those processes with its size.
# It stops when -Stop exists or after -MaxMin minutes (a hard ceiling: it must never outlive the run as an orphan). It writes no window title
# and reads no window content. Started by the launcher with `start "" /b powershell ...`; the launcher writes -Stop when the run ends.
#   powershell -NoProfile -ExecutionPolicy Bypass -File observe-session.ps1 -Out <file> -Stop <file> [-EverySec 20] [-MaxMin 120] [-Once]
# -Once: take one sample, print it and exit (calibration). ASCII only; saved with a UTF-8 BOM (the folder name holds a non-ASCII character).
param(
    [string]$Out = '',
    [string]$Stop = '',
    [int]$EverySec = 20,
    [int]$MaxMin = 120,
    [switch]$Once,
    [string]$ProcName = 'electron'   # calibration only: the real run never passes it
)
$ErrorActionPreference = 'Stop'
if (-not $Once -and ($Out -eq '' -or $Stop -eq '')) { Write-Output 'usage: observe-session.ps1 -Out <file> -Stop <file> [-EverySec n] [-MaxMin n] [-Once]'; exit 2 }
Add-Type -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
public static class ObsNative {
    [DllImport("kernel32.dll")] public static extern uint WTSGetActiveConsoleSessionId();
    delegate bool EnumProc(IntPtr h, IntPtr l);
    [DllImport("user32.dll")] static extern bool EnumWindows(EnumProc p, IntPtr l);
    [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
    [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr h);
    [DllImport("user32.dll")] static extern bool GetWindowRect(IntPtr h, out RECT r);
    [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L, T, R, B; }
    public static string[] Visible(uint[] pids) {
        var set = new HashSet<uint>(pids); var res = new List<string>();
        EnumWindows((h, l) => {
            uint pid; GetWindowThreadProcessId(h, out pid);
            if (set.Contains(pid) && IsWindowVisible(h)) { RECT r; GetWindowRect(h, out r); int w = r.R - r.L, hh = r.B - r.T; if (w > 0 && hh > 0) res.Add(pid + ":" + w + "x" + hh); }
            return true;
        }, IntPtr.Zero);
        return res.ToArray();
    }
}
'@
function Take-Sample {
    $console = [ObsNative]::WTSGetActiveConsoleSessionId()
    $self = (Get-Process -Id $PID).SessionId
    $el = @(Get-Process -Name $ProcName -ErrorAction SilentlyContinue)
    $elTxt = 'none'
    $winTxt = 'none'
    if ($el.Count -gt 0) {
        $elTxt = ($el | ForEach-Object { [string]$_.Id + ':' + [string]$_.SessionId }) -join ','
        $w = [ObsNative]::Visible([uint32[]]@($el | ForEach-Object { [uint32]$_.Id }))
        if ($w.Count -gt 0) { $winTxt = $w -join ',' }
    }
    return ((Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ss.fffZ') + ' console=' + $console + ' self=' + $self + ' electron=' + $elTxt + ' windows=' + $winTxt)
}
if ($Once) { Write-Output (Take-Sample); exit 0 }
$deadline = (Get-Date).AddMinutes($MaxMin)
[System.IO.File]::AppendAllText($Out, ((Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ss.fffZ') + ' observe-start pid=' + $PID + "`r`n"))
while ((Get-Date) -lt $deadline -and -not (Test-Path -LiteralPath $Stop)) {
    try { [System.IO.File]::AppendAllText($Out, ((Take-Sample) + "`r`n")) } catch { }
    Start-Sleep -Seconds $EverySec
}
[System.IO.File]::AppendAllText($Out, ((Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ss.fffZ') + ' observe-end ' + $(if (Test-Path -LiteralPath $Stop) { 'stop-file' } else { 'max-minutes' }) + "`r`n"))
exit 0
