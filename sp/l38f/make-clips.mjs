// L38F: render items.json "text" to 24 kHz mono 16-bit WAV with scenario50's local voice (Windows SAPI, Microsoft
// David Desktop, rate 0) into THIS folder's clips/ only. Cached by text stamp. Prints ids and durations only.
//   node make-clips.mjs
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.join(HERE, 'clips');
fs.mkdirSync(DIR, { recursive: true });
const SR = 24000, VOICE = 'Microsoft David Desktop', RATE = 0;
const { text } = JSON.parse(fs.readFileSync(path.join(HERE, 'items.json'), 'utf8'));
for (const [id, q] of Object.entries(text)) {
    const out = path.join(DIR, `${id}.wav`), stamp = path.join(DIR, `${id}.txt`);
    if (fs.existsSync(out) && fs.existsSync(stamp) && fs.readFileSync(stamp, 'utf8') === q) { console.log(`${id}: cached`); continue; }
    const ps = `
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$s = New-Object System.Speech.Synthesis.SpeechSynthesizer
$s.SelectVoice(${JSON.stringify(VOICE)})
$s.Rate = ${RATE}
$fmt = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(${SR}, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono)
$s.SetOutputToWaveFile(${JSON.stringify(out)}, $fmt)
$s.Speak(${JSON.stringify(q)})
$s.SetOutputToNull()
$s.Dispose()
`;
    execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', ps], { stdio: 'pipe' });
    fs.writeFileSync(stamp, q);
    const bytes = fs.statSync(out).size - 44;
    if (bytes < SR) throw new Error(`${id}: clip under 0.5 s`);
    console.log(`${id}: rendered, ${(bytes / (SR * 2)).toFixed(1)} s`);
}
