// longest run of all-zero 60 ms chunks inside each clip (16k PCM, same decimation as run.mjs), and the trailing zero run
import fs from 'node:fs';
const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const man = JSON.parse(fs.readFileSync(`${SP}/live40/clips/manifest.json`, 'utf8')).clips;
let worst = 0; const rows = [];
for (const [id, m] of Object.entries(man)) {
    const wav = fs.readFileSync(m.path); const rate = wav.readUInt32LE(24);
    const di = wav.indexOf(Buffer.from('data'), 12); const n = Math.floor(wav.readUInt32LE(di + 4) / 2);
    const f = rate / 16000, out = new Int16Array(Math.floor(n / f));
    for (let i = 0; i < out.length; i++) out[i] = wav.readInt16LE(di + 8 + 2 * Math.floor(i * f) * 2 / 2 * 1);
    let run = 0, max = 0, tail = 0;
    for (let off = 0; off + 960 <= out.length; off += 960) { let z = true; for (let i = off; i < off + 960; i++) if (out[i] !== 0) { z = false; break; } if (z) { run++; max = Math.max(max, run); } else run = 0; }
    tail = run; worst = Math.max(worst, max); rows.push(`${id}:${max}/${tail}`);
}
console.log('internal-or-tail max zero chunks, tail zero chunks:', rows.join(' '));
console.log('worst', worst);
