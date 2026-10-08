// live40 step 1b: clips for items.json. Reused clips (MAIN's tts-local folders, SP\l38m\clips) are READ from there and copied into
// SP\live40\clips\<id>.wav; the rest render with Windows SAPI exactly like MAIN's interview60.build-audio-local.mjs
// (voice 'Microsoft David Desktop', rate 0, 24 kHz mono 16-bit) into SP\live40\clips ONLY. A reused clip is accepted only when its
// stamped text (the .txt beside it) equals the item's text; otherwise it is rendered fresh and the rejection is recorded.
// Writes clips/manifest.json. Prints ids, seconds and counts only.
//   node make-clips.mjs
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const HERE = `${SP}/live40`, DIR = `${HERE}/clips`;
const FOLDER = { interview60: `${MAIN}/electron/test/golden/interview60-tts-local`, scenario50: `${MAIN}/electron/test/golden/scenario50-tts-local`, l38m: `${SP}/l38m/clips` };
fs.mkdirSync(DIR, { recursive: true });
const SR = 24000, VOICE = 'Microsoft David Desktop', RATE = 0;
const { items } = JSON.parse(fs.readFileSync(`${HERE}/items.json`, 'utf8'));
const norm = (s) => s.replace(/\s+/g, ' ').trim();
const sha12 = (b) => createHash('sha256').update(b).digest('hex').slice(0, 12);
const wavInfo = (b) => {
    if (b.toString('ascii', 0, 4) !== 'RIFF') throw new Error('not a RIFF wav');
    let off = 12, rate = 0, ch = 0, bits = 0;
    while (off < b.length - 8) {
        const idc = b.toString('ascii', off, off + 4), len = b.readUInt32LE(off + 4);
        if (idc === 'fmt ') { ch = b.readUInt16LE(off + 10); rate = b.readUInt32LE(off + 12); bits = b.readUInt16LE(off + 22); }
        if (idc === 'data') return { rate, ch, bits, seconds: Math.min(len, b.length - off - 8) / (rate * ch * (bits / 8)) };
        off += 8 + len;
    }
    throw new Error('no data chunk');
};
function render(id, q, out) {
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
}
const manifest = {}, rejected = [], suspect = [];
let reused = 0, rendered = 0;
for (const it of items) {
    const out = `${DIR}/${it.id}.wav`, stamp = `${DIR}/${it.id}.txt`;
    let origin = null, source = null, reuseRejected = null;
    if (it.sourceClip) {
        const [folder, cid] = it.sourceClip.split(':');
        const sw = `${FOLDER[folder]}/${cid}.wav`, st = `${FOLDER[folder]}/${cid}.txt`;
        if (!fs.existsSync(sw)) throw new Error(`${it.id}: source clip ${it.sourceClip} missing`);
        if (!fs.existsSync(st)) reuseRejected = 'no text stamp beside the source clip';
        else if (norm(fs.readFileSync(st, 'utf8')) !== norm(it.text)) reuseRejected = 'source clip text differs from the item text';
        if (!reuseRejected) { fs.copyFileSync(sw, out); fs.writeFileSync(stamp, it.text); origin = 'reused'; source = sw; }
        else rejected.push(`${it.id} (${it.sourceClip}): ${reuseRejected}`);
    }
    if (!origin) {
        const cachedOk = fs.existsSync(out) && fs.existsSync(stamp) && fs.readFileSync(stamp, 'utf8') === it.text;
        if (!cachedOk) { render(it.id, it.text, out); fs.writeFileSync(stamp, it.text); }
        origin = 'rendered';
    }
    const b = fs.readFileSync(out), info = wavInfo(b);
    if (info.bits !== 16 || info.ch < 1) throw new Error(`${it.id}: ${info.bits}-bit ${info.ch}ch`);
    if (info.seconds < 0.5) throw new Error(`${it.id}: clip under 0.5 s`);
    const wps = it.text.trim().split(/\s+/).length / info.seconds;
    if (wps < 1.6 || wps > 5.0) suspect.push(`${it.id} ${wps.toFixed(2)} w/s`);
    if (origin === 'reused') reused++; else rendered++;
    manifest[it.id] = { path: out, seconds: +info.seconds.toFixed(2), sampleRate: info.rate, sha12: sha12(b), origin, source, sourceClip: it.sourceClip, reuseRejected, textSha12: sha12(Buffer.from(it.text)) };
    console.log(`${it.id.padEnd(5)} ${origin.padEnd(8)} ${info.seconds.toFixed(1).padStart(5)}s ${wps.toFixed(2)} w/s`);
}
fs.writeFileSync(`${DIR}/manifest.json`, JSON.stringify({ voice: VOICE, rate: RATE, sampleRate: SR, reused, rendered, rejectedReuse: rejected, suspectRate: suspect, clips: manifest }, null, 1));
console.log(`reused ${reused}, rendered ${rendered}, rejected reuse ${rejected.length}${rejected.length ? ': ' + rejected.map((r) => r.split(':')[0]).join('; ') : ''}, suspect rate ${suspect.length ? suspect.join(', ') : 'none'}`);
