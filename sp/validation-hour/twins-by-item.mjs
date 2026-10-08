// h40d: for the in-app not-acceptable items, every graded draw per arm, split by model and prompt (judge classes:
// A = correctness 2, on-topic 2, delivery >= 1; X = correctness 0 or on-topic 0; w otherwise). Also prints the
// in-app pair's own field names once, and any model/winner field it carries, to say which model the app shown.
// Prints ids, classes and field NAMES only: never an answer, never a prompt.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const VH = path.dirname(fileURLToPath(import.meta.url));
const R = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs/2026-10-02T11-39-41-h40d';
const J = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const IDS = ['R33', 'R11F', 'R02F', 'R07F', 'R08', 'R12', 'R13', 'R22F'];
const ARMS = [
    ['in-app', 'interview60.judge.pairs.json', 'h40d-verdicts-inapp.json'],
    ['HIGH r1', 'interview60.judge.pairs.gemini-3.5-flash-lite_captured-high.json', 'h40d-verdicts-captured-high.json'],
    ['HIGH r2', 'interview60.judge.pairs.gemini-3.5-flash-lite_captured-high-r2.json', 'h40d-verdicts-captured-high-r2.json'],
    ['HIGH r3', 'interview60.judge.pairs.gemini-3.5-flash-lite_captured-high-r3.json', 'h40d-verdicts-captured-high-r3.json'],
    ['noCue r1', 'interview60.judge.pairs.gemini-3.5-flash-lite_captured-no-cues-high.json', 'h40d-verdicts-captured-no-cues-high.json'],
    ['noCue r2', 'interview60.judge.pairs.gemini-3.5-flash-lite_captured-no-cues-high-r2.json', 'h40d-verdicts-captured-no-cues-high-r2.json'],
    ['noCue r3', 'interview60.judge.pairs.gemini-3.5-flash-lite_captured-no-cues-high-r3.json', 'h40d-verdicts-captured-no-cues-high-r3.json'],
    ['LOW r1', 'interview60.judge.pairs.gemini-3.1-flash-lite_captured-low.json', 'h40d-verdicts-captured-low.json'],
    ['LOW r2', 'interview60.judge.pairs.gemini-3.1-flash-lite_captured-low-r2.json', 'h40d-verdicts-captured-low-r2.json'],
    ['LOW r3', 'interview60.judge.pairs.gemini-3.1-flash-lite_captured-low-r3.json', 'h40d-verdicts-captured-low-r3.json'],
    ['bare H', 'interview60.judge.pairs.gemini-3.5-flash-lite_high.json', 'h40d-verdicts-high.json'],
    ['bare L', 'interview60.judge.pairs.gemini-3.1-flash-lite_low.json', 'h40d-verdicts-low.json'],
];
const cls = (v) => (!v ? '-' : v.correctness === 2 && v.on_topic === 2 && v.delivery >= 1 ? 'A' : v.correctness === 0 || v.on_topic === 0 ? 'X' : 'w');
const G = {};
for (const [arm, pf, vf] of ARMS) {
    const pp = path.join(R, pf), vp = path.join(VH, vf);
    if (!fs.existsSync(pp) || !fs.existsSync(vp)) { console.log(`${arm}: MISSING ${!fs.existsSync(pp) ? pf : vf}`); continue; }
    const P = J(pp), V = J(vp); G[arm] = {};
    for (const it of P.items) { if (!IDS.includes(it.id)) continue; const c = cls(V[it.key]); if (!G[arm][it.id] || c === 'A') G[arm][it.id] = c; }
}
const inapp = J(path.join(R, 'interview60.judge.pairs.json')).items;
console.log('in-app pair field names:', Object.keys(inapp[0]).join(', '));
const mf = Object.keys(inapp[0]).filter((k) => /model|won|winner|leg|arm/i.test(k));
console.log('model-like fields:', mf.join(', ') || '(none)');
console.log('\nid     ' + ARMS.map((a) => a[0].padEnd(9)).join(''));
for (const id of IDS) {
    console.log(id.padEnd(7) + ARMS.map(([a]) => (G[a]?.[id] ?? '-').padEnd(9)).join('') + (mf.length ? '  ' + mf.map((k) => `${k}=${inapp.find((x) => x.id === id)?.[k] ?? '?'}`).join(' ') : ''));
}
const count = (arms, id) => { const c = arms.map((a) => G[a]?.[id]).filter((x) => x && x !== '-'); return `${c.filter((x) => x === 'A').length}/${c.length}`; };
console.log('\nacceptable per item: HIGH same-bytes draws (r1-r3) | HIGH no-cue draws | LOW same-bytes draws | all 9 captured');
for (const id of IDS) console.log(`  ${id.padEnd(5)} ${count(['HIGH r1', 'HIGH r2', 'HIGH r3'], id).padEnd(6)} ${count(['noCue r1', 'noCue r2', 'noCue r3'], id).padEnd(6)} ${count(['LOW r1', 'LOW r2', 'LOW r3'], id).padEnd(6)} ${count(ARMS.slice(1, 10).map((a) => a[0]), id)}`);
