// THROWAWAY: the TRUE pause structure of the scenario50 S1+S2 main-question clips, from the
// audio itself (24 kHz 16-bit mono WAV, 20 ms RMS frames). A pause is a run of frames under
// the threshold lasting ≥ 250 ms, excluding the clip's lead-in and tail. For the 13 doubled
// mains, the first pause is where the head sentence ended and the early answer fired.
// Also: what a hold of T ms after speech stops would have done on THIS stimulus.
import fs from 'node:fs';
import path from 'node:path';
const G = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden';
const { SCENARIO50 } = await import(`file:///${G}/scenario50.questions.mjs`);
const DOUBLED = new Set(['S1Q02', 'S1Q03', 'S1Q04', 'S1Q05', 'S1Q06', 'S1Q08', 'S1Q09', 'S1Q10', 'S2Q02', 'S2Q03', 'S2Q05', 'S2Q07', 'S2Q09']);
const SR = 24000, FRAME = 480; // 20 ms
const THRESH = 300;             // RMS on 16-bit samples; TTS silence is near digital zero, speech is thousands

function pauses(file) {
    const b = fs.readFileSync(file);
    const i = b.indexOf(Buffer.from('data', 'ascii'), 12);
    const len = b.readUInt32LE(i + 4);
    const pcm = b.subarray(i + 8, i + 8 + len);
    const n = Math.floor(pcm.length / 2 / FRAME);
    const rms = new Array(n);
    for (let f = 0; f < n; f++) { let s = 0; for (let k = 0; k < FRAME; k++) { const v = pcm.readInt16LE((f * FRAME + k) * 2); s += v * v; } rms[f] = Math.sqrt(s / FRAME); }
    const speech = rms.map((r) => r >= THRESH);
    const first = speech.indexOf(true), last = speech.lastIndexOf(true);
    const runs = [];
    let start = null;
    for (let f = first; f <= last; f++) {
        if (!speech[f]) { if (start === null) start = f; }
        else if (start !== null) { const ms = (f - start) * 20; if (ms >= 250) runs.push({ atS: (start * 20) / 1000, ms }); start = null; }
    }
    return { secs: (pcm.length / 2) / SR, speechSecs: ((last - first + 1) * 20) / 1000, runs };
}

const all = [], heads = [];
const pct = (a, p) => { const s = [...a].sort((x, y) => x - y); return s.length ? (s[Math.min(s.length - 1, Math.floor(p * s.length))] / 1000).toFixed(2) : '—'; };
console.log('main   doubled  clip    pauses ≥ 250 ms inside the clip (s each), in order');
for (const it of SCENARIO50.filter((x) => ['S1', 'S2'].includes(x.scenario) && x.level !== 'followup')) {
    const p = pauses(path.join(G, 'scenario50-tts-local', `${it.id}.wav`));
    all.push(...p.runs.map((r) => r.ms));
    if (DOUBLED.has(it.id) && p.runs.length) heads.push(p.runs[0].ms);
    console.log(`${it.id.padEnd(6)} ${DOUBLED.has(it.id) ? 'DOUBLED' : '       '} ${p.secs.toFixed(1).padStart(5)}s  ${p.runs.map((r) => (r.ms / 1000).toFixed(2)).join(' ')}`);
}
console.log(`\ninternal pauses: n=${all.length}  p50 ${pct(all, .5)}s  p90 ${pct(all, .9)}s  max ${pct(all, 1)}s`);
console.log(`first pause of the 13 doubled mains (the head boundary): min ${pct(heads, 0)}s  p50 ${pct(heads, .5)}s  max ${pct(heads, 1)}s`);
for (const t of [300, 500, 700, 900, 1100]) console.log(`  hold ${t} ms after speech stops: ${all.filter((ms) => ms >= t).length} of ${all.length} internal pauses would still release an answer early; ${heads.filter((ms) => ms >= t).length} of ${heads.length} head boundaries`);
