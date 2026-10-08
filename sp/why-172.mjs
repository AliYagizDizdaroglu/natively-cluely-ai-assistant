// THROWAWAY: where do the 171.9 minutes of the full scenario50 stimulus come from?
// Splits the hour into speech (clip audio) and answer gaps, per scenario and per level,
// and compares the pacing with interview60 so the two rosters can be judged alike.
import fs from 'node:fs';
import path from 'node:path';

const PROJ = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const G = PROJ + '/electron/test/golden';
const { SCENARIO50, GAP } = await import(`file:///${G}/scenario50.questions.mjs`);
const { INTERVIEW: I60 } = await import(`file:///${G}/interview60.questions.mjs`);

const BYTES_PER_SEC = 24000 * 2;
function clipSecs(dir, id) {
    const f = path.join(G, dir, `${id}.wav`);
    if (!fs.existsSync(f)) return null;
    const b = fs.readFileSync(f);
    const i = b.indexOf(Buffer.from('data', 'ascii'), 12);
    return b.readUInt32LE(i + 4) / BYTES_PER_SEC;
}

function summarise(items, dir) {
    let speech = 0, gap = 0, missing = 0;
    const byLevel = new Map();
    for (const it of items) {
        const c = clipSecs(dir, it.id);
        if (c == null) { missing++; continue; }
        speech += c; gap += it.gapMs / 1000;
        const l = byLevel.get(it.level) ?? { n: 0, speech: 0, gap: 0 };
        l.n++; l.speech += c; l.gap += it.gapMs / 1000;
        byLevel.set(it.level, l);
    }
    return { n: items.length, speech, gap, total: speech + gap, missing, byLevel };
}
const m = (s) => (s / 60).toFixed(1);

console.log('scenario50 — per scenario (mains + follow-ups)');
for (const key of ['S1', 'S2', 'S3', 'S4', 'S5']) {
    const s = summarise(SCENARIO50.filter((x) => x.scenario === key), 'scenario50-tts-local');
    console.log(`  ${key}: ${s.n} turns  speech ${m(s.speech)} min  gaps ${m(s.gap)} min  = ${m(s.total)} min${s.missing ? `  (${s.missing} clips missing)` : ''}`);
}
const all = summarise(SCENARIO50, 'scenario50-tts-local');
console.log(`  ALL: ${all.n} turns  speech ${m(all.speech)} min  gaps ${m(all.gap)} min  = ${m(all.total)} min`);
console.log(`  average turn: ${(all.speech / all.n).toFixed(0)} s of speech + ${(all.gap / all.n).toFixed(0)} s gap = ${(all.total / all.n).toFixed(0)} s`);

console.log('\nscenario50 — per level');
for (const [level, l] of [...all.byLevel].sort((a, b) => b[1].gap - a[1].gap)) {
    console.log(`  ${level.padEnd(12)} n=${String(l.n).padStart(3)}  gap each ${String(GAP[level] / 1000).padStart(3)} s  speech ${m(l.speech).padStart(5)} min  gaps ${m(l.gap).padStart(5)} min`);
}

const i60 = summarise(I60.filter((x) => x.kind !== 'screenshot'), 'interview60-tts-local');
console.log(`\ninterview60 for comparison: ${i60.n} spoken turns  speech ${m(i60.speech)} min  gaps ${m(i60.gap)} min  = ${m(i60.total)} min${i60.missing ? `  (${i60.missing} clips missing)` : ''}`);
console.log(`  average turn: ${(i60.speech / i60.n).toFixed(0)} s of speech + ${(i60.gap / i60.n).toFixed(0)} s gap = ${(i60.total / i60.n).toFixed(0)} s`);
