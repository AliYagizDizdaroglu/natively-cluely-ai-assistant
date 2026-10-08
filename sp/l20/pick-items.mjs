// L20 (3.8 Live bare replication): the 20 items. HARD = the ET10 set (the s50l focused five mains + their
// follow-ups). NORMAL = five more main+follow-up pairs drawn with a fixed seed from the other scenario50 S1+S2
// pairs, among those the harness can run and the app comparator covers (clips on disk, the main's captured s50k
// prompt with its CONTEXT block, both ids in all four s50k app arms and the s50k timeline). Writes items.json.
//   node pick-items.mjs
import fs from 'node:fs';
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const HERE = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/l20';
const RUN = `${MAIN}/electron/test/golden/interview60.runs/2026-09-20T11-22-43-s50k`;
const SEED = 20260928;
const HARD = [['S1Q02', 'S1Q02F'], ['S1Q04', 'S1Q04F'], ['S1Q05', 'S1Q05F'], ['S1Q07', 'S1Q07F'], ['S2Q02', 'S2Q02F']];
const hardMains = new Set(HARD.map((p) => p[0]));
const P = JSON.parse(fs.readFileSync(`${RUN}/interview60.prompts.json`, 'utf8'));
const timeline = JSON.parse(fs.readFileSync(`${RUN}/interview60.timeline.json`, 'utf8'));
const arms = ['', '.gemini-3.1-flash-lite_captured-low', '.gemini-3.1-flash-lite_captured-low-r2', '.gemini-3.1-flash-lite_captured-low-r3']
    .map((s) => JSON.parse(fs.readFileSync(`${RUN}/interview60.judge.pairs${s}.json`, 'utf8')).items.map((x) => x.key));
const mains = [];
for (const s of ['S1', 'S2']) for (let q = 1; q <= 10; q++) mains.push(`${s}Q${String(q).padStart(2, '0')}`);
const eligible = [], excluded = [];
for (const m of mains.filter((x) => !hardMains.has(x))) {
    const ids = [m, `${m}F`];
    const why = [];
    for (const id of ids) {
        if (!fs.existsSync(`${MAIN}/electron/test/golden/scenario50-tts-local/${id}.wav`)) why.push(`${id} no clip`);
        if (!timeline.items.some((i) => i.id === id)) why.push(`${id} not in timeline`);
        if (!arms.every((keys) => keys.includes(id))) why.push(`${id} missing from an app arm`);
    }
    const u = P[m]?.user ?? '';
    if (!P[m]?.system || u.indexOf('CONTEXT:') < 0 || u.indexOf('USER QUESTION:') < u.indexOf('CONTEXT:')) why.push(`${m} no usable captured prompt`);
    (why.length ? excluded : eligible).push(why.length ? `${m}: ${why.join('; ')}` : ids);
}
let s = SEED; // mulberry32
const rand = () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const pool = [...eligible];
for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
const NORMAL = pool.slice(0, 5).sort((a, b) => a[0].localeCompare(b[0]));
fs.mkdirSync(HERE, { recursive: true });
fs.writeFileSync(`${HERE}/items.json`, JSON.stringify({ seed: SEED, hard: HARD, normal: NORMAL, pairs: [...HARD, ...NORMAL] }, null, 1));
console.log(`eligible normal pairs: ${eligible.length} (${eligible.map((p) => p[0]).join(' ')})`);
if (excluded.length) console.log(`excluded: ${excluded.join(' | ')}`);
console.log(`NORMAL (seed ${SEED}): ${NORMAL.map((p) => p.join('+')).join(', ')}`);
