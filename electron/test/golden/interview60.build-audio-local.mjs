/**
 * Same output as interview60.build-audio.mjs, but the voice is rendered LOCALLY
 * with Windows SAPI instead of Gemini TTS.
 *
 * Why: Gemini TTS hit a hard daily quota wall ("exceeded your current quota")
 * after 3 of 55 clips, while the models actually under test — flash-lite and the
 * 3.5 fallback — were still answering fine. Spending the remaining Gemini budget
 * on the STIMULUS rather than on the SYSTEM UNDER TEST is the wrong trade, and
 * local TTS is free and unmetered.
 *
 * The voice is more robotic than Gemini's, which is a real risk to detection
 * accuracy — so interview60.calibrate-audio.mjs must confirm the live detector
 * actually hears these clips BEFORE an hour is spent on them.
 *
 *   node electron/test/golden/interview60.build-audio-local.mjs
 *
 * Output: electron/test/golden/<roster>.wav  (24 kHz mono 16-bit); the roster and
 * its audio directory come from roster.mjs (NATIVELY_ROSTER).
 */
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import { INTERVIEW, TTS_LOCAL_DIR, WAV_NAME, TTS_NO_RENDER, rosterLabel } from './roster.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJ = path.resolve(HERE, '../../..');
const TTS_DIR = path.join(HERE, TTS_LOCAL_DIR);
const OUT_WAV = path.join(HERE, WAV_NAME);
const SR = 24000;
const BYTES_PER_SEC = SR * 2;
const VOICE = process.env.SAPI_VOICE || 'Microsoft David Desktop';
const RATE = Number(process.env.SAPI_RATE || 0);   // -10..10, 0 = normal

fs.mkdirSync(TTS_DIR, { recursive: true });
const words = (s) => (s.trim().match(/\S+/g) || []).length;

/**
 * Render one question to a 24 kHz mono 16-bit WAV via System.Speech.
 *
 * Clips are cached by id, so EDITING A QUESTION would otherwise keep speaking the old
 * wording for a whole hour with nothing to show for it — the run log, the timeline and
 * the judge would all carry the new text while the audio said the old. The rendered
 * text is written beside each clip and re-rendered whenever it differs. (Measured
 * 2026-09-08: merging the opening sentence of 44 scenario50 questions changed their
 * text without changing a single id.)
 */
function speak(item) {
    const out = path.join(TTS_DIR, `${item.id}.wav`);
    const stamp = path.join(TTS_DIR, `${item.id}.txt`);
    const cachedText = fs.existsSync(stamp) ? fs.readFileSync(stamp, 'utf8') : null;
    if (fs.existsSync(out) && cachedText === item.q) return out;
    if (TTS_NO_RENDER) throw new Error(`would re-render ${item.id} — refused (live40 reuses router40's clips)`);
    if (fs.existsSync(out)) console.log(`  ${item.id.padEnd(6)} text changed — re-rendering`);
    const ps = `
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$s = New-Object System.Speech.Synthesis.SpeechSynthesizer
try { $s.SelectVoice(${JSON.stringify(VOICE)}) } catch { }
$s.Rate = ${RATE}
$fmt = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(${SR}, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono)
$s.SetOutputToWaveFile(${JSON.stringify(out)}, $fmt)
$s.Speak(${JSON.stringify(item.q)})
$s.SetOutputToNull()
$s.Dispose()
`;
    execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', ps], { stdio: 'pipe' });
    fs.writeFileSync(stamp, item.q);
    return out;
}

/** WAV -> raw PCM body (SAPI writes a standard 44-byte header, but find 'data' to be safe). */
function pcmOf(wavPath) {
    const b = fs.readFileSync(wavPath);
    const i = b.indexOf(Buffer.from('data', 'ascii'), 12);
    if (i < 0) throw new Error(`no data chunk in ${wavPath}`);
    const len = b.readUInt32LE(i + 4);
    return b.subarray(i + 8, i + 8 + len);
}

function wavHeader(dataBytes) {
    const h = Buffer.alloc(44);
    h.write('RIFF', 0); h.writeUInt32LE(36 + dataBytes, 4); h.write('WAVE', 8);
    h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
    h.writeUInt32LE(SR, 24); h.writeUInt32LE(BYTES_PER_SEC, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34);
    h.write('data', 36); h.writeUInt32LE(dataBytes, 40);
    return h;
}

const parts = [];
const suspect = [];
console.log(`voice: ${VOICE}   rate: ${RATE}\nroster: ${rosterLabel()}\nBuilding ${INTERVIEW.length} items -> ${path.relative(PROJ, OUT_WAV)}\n`);

for (const item of INTERVIEW) {
    const pcm = pcmOf(speak(item));
    const secs = pcm.length / BYTES_PER_SEC;
    const wps = words(item.q) / secs;
    // Same guard as the Gemini builder: an implausible rate means a truncated or
    // padded clip, which would look like a detection bug an hour downstream.
    if (wps < 1.6 || wps > 5.0) suspect.push(`${item.id} ${wps.toFixed(2)} w/s`);
    parts.push(pcm, Buffer.alloc(Math.round((item.gapMs / 1000) * BYTES_PER_SEC)));
    const tag = item.kind === 'screenshot' ? '  [SCREENSHOT CUE]' : '';
    console.log(`  ${item.id.padEnd(4)} ${secs.toFixed(1).padStart(5)}s ${wps.toFixed(2)} w/s  +${(item.gapMs / 1000).toFixed(0)}s${tag}`);
}

const data = Buffer.concat(parts);
fs.writeFileSync(OUT_WAV, Buffer.concat([wavHeader(data.length), data]));
console.log(`\n  items      ${INTERVIEW.length}/${INTERVIEW.length}`);
if (suspect.length) console.log(`  SUSPECT    ${suspect.join(', ')}`);
console.log(`  duration   ${(data.length / BYTES_PER_SEC / 60).toFixed(1)} min`);
console.log(`  wrote      ${OUT_WAV}`);
