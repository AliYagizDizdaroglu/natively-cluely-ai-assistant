param([Parameter(Mandatory=$true)][string]$Id, [Parameter(Mandatory=$true)][string]$Text)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$dir = Join-Path $PSScriptRoot 'clips'; New-Item -ItemType Directory -Force $dir | Out-Null
$s = New-Object System.Speech.Synthesis.SpeechSynthesizer
try { $s.SelectVoice('Microsoft David Desktop') } catch { }
$s.Rate = 0
$fmt = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(24000, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono)
$s.SetOutputToWaveFile((Join-Path $dir "$Id.wav"), $fmt)
$s.Speak($Text)
$s.SetOutputToNull(); $s.Dispose()
[System.IO.File]::WriteAllText((Join-Path $dir "$Id.txt"), $Text, (New-Object System.Text.UTF8Encoding($false)))
"$Id.wav $((Get-Item (Join-Path $dir "$Id.wav")).Length) bytes"
