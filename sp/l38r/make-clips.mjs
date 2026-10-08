// L38R (the Live router probe): render the 12 simple questions (X1-X6 from spike 6, F1-F6 from the probe) to
// 24 kHz mono 16-bit WAV with the SAME local voice and settings as scenario50's clips
// (interview60.build-audio-local.mjs: Windows SAPI, Microsoft David Desktop, rate 0), into THIS folder's clips/,
// never into the golden folder. Cached by id + text stamp, like the builder. Prints ids and durations only.
//   node make-clips.mjs
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { SPIKE, FRESH } from '../cue-group/probe-shipped.mjs';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.join(HERE, 'clips');
fs.mkdirSync(DIR, { recursive: true });
const SR = 24000, VOICE = 'Microsoft David Desktop', RATE = 0;
const items = [...SPIKE, ...FRESH].filter(([id]) => id !== 'M1');   // the 12 simple ones; M1 is medium, not simple
for (const [id, q] of items) {
    const out = path.join(DIR, `${id}.wav`), stamp = path.join(DIR, `${id}.txt`);
    if (fs.existsSync(out) && fs.existsSync(stamp) && fs.readFileSync(stamp, 'utf8') === q) { console.log(`${id}: cached`); continue; }
    const ps = `
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$s = New-Object System.Speech.Synthesis.SpeechSynthesizer
try { $s.SelectVoice(${JSON.stringify(VOICE)}) } catch { }
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
    console.log(`${id}: rendered, ${(bytes / (SR * 2)).toFixed(1)} s`);
}
console.log(`${items.length} simple clips in ${DIR}`);
