// THROWAWAY BENCH: run every question SHAPE through the real Gemini Live detector and
// report what it heard, how many times it fired, and whether the facts survived.
//
// This is the loop that generalises past any particular question set: minutes per run,
// one axis per row, and a fix can be re-measured immediately.
//
// CALIBRATION: 'plain' is the control. It is the easiest possible shape — one sentence,
// ask and facts together. If 'plain' does not come back clean, the bench is measuring
// the voice or the connection, not the shape, and no other row means anything.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { SHAPES, ENTITIES, INTENDED } from './shapes.mjs';

const PROJ = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const SCRATCH = path.dirname(new URL(import.meta.url).pathname.replace(/^\//, ''));
const TTS = path.join(SCRATCH, 'shape-tts');
fs.mkdirSync(TTS, { recursive: true });

const require = createRequire(PROJ + '/package.json');
const { GeminiLiveRouter, LIVE_ROUTER_MODEL } = require(PROJ + '/dist-electron/electron/audio/GeminiLiveRouter.js');
const KEY = fs.readFileSync(PROJ + '/.env', 'utf8').match(/^GEMINI_API_KEY=(.+)$/m)[1].trim();

const SR = 24000, FRAME_MS = 20, FRAME_BYTES = (SR / 1000) * FRAME_MS * 2;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Render via SAPI, re-rendering when the text changes (same trap as the roster builder). */
function speak(id, text) {
    const wav = path.join(TTS, `${id}.wav`), stamp = path.join(TTS, `${id}.txt`);
    if (fs.existsSync(wav) && fs.existsSync(stamp) && fs.readFileSync(stamp, 'utf8') === text) return wav;
    const ps = `
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Speech
$s=New-Object System.Speech.Synthesis.SpeechSynthesizer
try{$s.SelectVoice("Microsoft David Desktop")}catch{}
$fmt=New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(${SR},[System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen,[System.Speech.AudioFormat.AudioChannel]::Mono)
$s.SetOutputToWaveFile(${JSON.stringify(wav)},$fmt)
$s.Speak(${JSON.stringify(text)})
$s.SetOutputToNull();$s.Dispose()`;
    execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', ps], { stdio: 'pipe' });
    fs.writeFileSync(stamp, text);
    return wav;
}
const pcmOf = (f) => { const b = fs.readFileSync(f); const i = b.indexOf(Buffer.from('data', 'ascii'), 12); return b.subarray(i + 8, i + 8 + b.readUInt32LE(i + 4)); };

const norm = (s) => new Set((s.toLowerCase().match(/[a-z]+/g) || []).filter((w) => w.length > 3));
function overlap(a, b) { const A = norm(a), B = norm(b); if (!A.size) return 0; let h = 0; for (const w of A) if (B.has(w)) h++; return h / A.size; }

const router = new GeminiLiveRouter(() => KEY);
let state = 'idle';
const events = [];
router.on('status', (s) => { state = s.state; if (s.state !== 'connected') console.log(`   [${s.state}]${s.reason ? ' ' + s.reason : ''}`); });
router.on('question', (q) => events.push({ ...q, at: Date.now() }));
void router.start();
for (let i = 0; i < 200 && state !== 'connected'; i++) await sleep(200);
if (state !== 'connected') { console.log('FAILED to connect'); process.exit(1); }

console.log(`listener: ${LIVE_ROUTER_MODEL}   voice: Microsoft David (en-US)\n`);
console.log('shape         fires  covers  keeps-ask  entities lost');
const silence = Buffer.alloc(FRAME_BYTES);
const rows = [];
for (const s of SHAPES) {
    const before = events.length;
    const pcm = pcmOf(speak(s.id, s.text));
    for (let o = 0; o < pcm.length; o += FRAME_BYTES) { router.write(pcm.subarray(o, o + FRAME_BYTES), SR); await sleep(FRAME_MS); }
    const spokeEnd = Date.now();
    for (let t = 0; t < 6000; t += FRAME_MS) { router.write(silence, SR); await sleep(FRAME_MS); }
    const fired = events.slice(before).map((e) => ({ ...e, text: e.question ?? e.text ?? '' }));
    // Best hearing across every fire — a shape that fires twice is judged on its best.
    const best = fired.map((f) => ({ f, ov: overlap(s.text, f.text) })).sort((a, b) => b.ov - a.ov)[0];
    const heard = best?.f.text ?? '';
    const keepsAsk = overlap(INTENDED, heard) >= 0.75;
    const lost = Object.entries(ENTITIES).filter(([, re]) => !re.test(heard)).map(([n]) => n);
    const early = fired.length ? Math.round((spokeEnd - fired[0].at) / 100) / 10 : null;
    rows.push({ s, fired: fired.length, ov: best?.ov ?? 0, keepsAsk, lost, heard, early });
    console.log(`${s.id.padEnd(13)} ${String(fired.length).padStart(3)}   ${String(Math.round((best?.ov ?? 0) * 100)).padStart(4)}%   ${(keepsAsk ? 'yes' : 'NO ').padEnd(9)} ${lost.length ? lost.join(', ') : '-'}`);
}
await router.stop?.();

const control = rows.find((r) => r.s.id === 'plain');
console.log('\nCALIBRATION');
console.log(`  control 'plain': ${control.fired} fire(s), ${Math.round(control.ov * 100)}% coverage, keeps the ask: ${control.keepsAsk}, entities lost: ${control.lost.join(', ') || 'none'}`);
const valid = control.fired === 1 && control.keepsAsk;
console.log(`  => the bench ${valid ? 'is measuring SHAPE' : 'is NOT valid — the control itself failed, so every row below could be voice or connection'}`);

if (valid) {
    const bad = rows.filter((r) => r.s.id !== 'plain' && (r.fired !== 1 || !r.keepsAsk || r.lost.length));
    console.log(`\n${bad.length} of ${rows.length - 1} shapes degrade:`);
    for (const r of bad) console.log(`  ${r.s.id.padEnd(13)} ${r.s.why}\n      fires=${r.fired} keepsAsk=${r.keepsAsk} lost=[${r.lost.join(', ')}]\n      heard: ${JSON.stringify(r.heard.slice(0, 150))}`);
}
fs.writeFileSync(path.join(SCRATCH, 'bench-shapes-out.json'), JSON.stringify(rows.map((r) => ({ id: r.s.id, why: r.s.why, fired: r.fired, ov: r.ov, keepsAsk: r.keepsAsk, lost: r.lost, heard: r.heard, firedEarlyBySec: r.early })), null, 1));
process.exit(0);
