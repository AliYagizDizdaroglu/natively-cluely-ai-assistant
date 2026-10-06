/**
 * Copies router40's clips into live40-tts-local, verified.
 *
 *   node electron/test/golden/live40.clips.mjs [--src <live40\clips dir>] [--dest <dir>]
 *
 * Per clip: 24 kHz, mono, 16-bit PCM from the header, and the sha12 of the WHOLE FILE
 * (what make-clips.mjs:71 hashes, not the PCM alone; plan correction of spec 7.4) equal to
 * manifest.json's. The manifest's `path` fields point into an old Temp folder and are not used.
 * Everything is checked before anything is copied, so a refused run leaves the folder untouched.
 * Each clip gets an <id>.txt stamp equal to `q`, which is what the builder compares.
 * Exit 1 on any problem, naming the clip.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { LIVE40 } from './live40.questions.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const flag = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const src = flag('--src') ?? 'C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-lab\\sp\\live40\\clips';
const dest = flag('--dest') ?? path.join(HERE, 'live40-tts-local');

const manifest = JSON.parse(fs.readFileSync(path.join(src, 'manifest.json'), 'utf8'));
const problems = [];
let totalSecs = 0;

/** Walks the RIFF chunks; returns { fmt, dataLen } or throws a reason. */
function parseWav(b) {
    if (b.length < 12 || b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WAVE') throw new Error('not a RIFF/WAVE file');
    let fmt = null;
    for (let i = 12; i + 8 <= b.length;) {
        const id = b.toString('ascii', i, i + 4);
        const len = b.readUInt32LE(i + 4);
        if (id === 'fmt ') fmt = { tag: b.readUInt16LE(i + 8), ch: b.readUInt16LE(i + 10), rate: b.readUInt32LE(i + 12), bits: b.readUInt16LE(i + 22) };
        if (id === 'data') {
            if (!fmt) throw new Error('data chunk before fmt');
            return { fmt, dataLen: Math.min(len, b.length - i - 8) };
        }
        i += 8 + len + (len & 1);
    }
    throw new Error('no data chunk');
}

const loaded = [];
for (const item of LIVE40) {
    const file = path.join(src, `${item.id}.wav`);
    const entry = manifest.clips?.[item.id];
    if (!fs.existsSync(file)) { problems.push(`${item.id}: clip missing (${file})`); continue; }
    if (!entry?.sha12) { problems.push(`${item.id}: not in manifest.json`); continue; }
    const bytes = fs.readFileSync(file);
    let w;
    try { w = parseWav(bytes); } catch (e) { problems.push(`${item.id}: format — ${e.message}`); continue; }
    const { tag, ch, rate, bits } = w.fmt;
    if (tag !== 1 || ch !== 1 || rate !== 24000 || bits !== 16) {
        problems.push(`${item.id}: format ${rate} Hz ${ch} ch ${bits}-bit tag ${tag}, need 24000 Hz 1 ch 16-bit PCM`);
        continue;
    }
    const sha12 = crypto.createHash('sha256').update(bytes).digest('hex').slice(0, 12);
    if (sha12 !== entry.sha12) { problems.push(`${item.id}: sha12 ${sha12} differs from manifest ${entry.sha12}`); continue; }
    totalSecs += w.dataLen / 48000;
    loaded.push({ item, file });
}

if (problems.length) {
    console.error(`live40 clips refused (${problems.length}):\n  ${problems.join('\n  ')}`);
    process.exit(1);
}

fs.mkdirSync(dest, { recursive: true });
for (const { item, file } of loaded) {
    fs.copyFileSync(file, path.join(dest, `${item.id}.wav`));
    fs.writeFileSync(path.join(dest, `${item.id}.txt`), item.q);
}
console.log(`copied ${loaded.length} clips to ${dest}  ${totalSecs.toFixed(1)} s of audio, all 24 kHz mono 16-bit, sha12 matches the manifest`);
