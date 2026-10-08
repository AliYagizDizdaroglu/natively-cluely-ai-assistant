// L20d: build the ONE blinded grading batch (PREREGISTER-l20d.md, "Grading"). 38 items; per item the answers of ten
// arms sit together under keys id#1..#n in a seeded random order (seed 20261003):
//   l20d-r1..r3    = the new Live reps (runs/l20d-rN.answers.json: 3.8 Live with the short instruction);
//   app35-inapp    = s50m in-app (3.5-flash-lite HIGH first);   app35-twin1..3 = s50m captured-high, -r2, -r3;
//   live38-r1..r3  = the ANCHOR (reported only): L20c's own old Live, L20b rN for l20b/items.json's 20 items, L20c rN
//                    for l20c/items.json's 18.
// The 19 pairs are split by a seeded shuffle into 4 packets (5, 5, 5, 4 pairs) so every question's answers go to the same
// two graders. A HOLE is not sent: a Live item not played or with an empty extracted answer, or an app answer that is
// missing/empty (the app's captured-high-r2 S2Q06 is absent from its pairs file). A spoken system-error apology IS
// sent and graded (L20c's treatment). The rubric is the frozen one, verbatim from s50k's pairs file. The key goes to
// l20d-key/, a folder no grader is pointed at. REFUSES to rebuild a batch whose key exists, and REFUSES unless all three
// new reps have answers files (a batch is built once). The registered holes of the app and the anchor are asserted.
//   node blind.mjs [--dry] [--dir <folder with items.json and runs/>] [--keydir <folder>]
//   --dry prints the counts and writes nothing (it may run with fewer than three reps).
import fs from 'node:fs';

const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const RUNS = `${MAIN}/electron/test/golden/interview60.runs`;
const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const HERE = arg('--dir', `${SP}/l20d`), KEYDIR = arg('--keydir', `${SP}/l20d-key`);
const DRY = process.argv.includes('--dry');
const SEED = 20261003;
const REGISTERED_HOLES = ['app35-twin1 S1Q01', 'app35-twin2 S2Q06', 'live38-r1 S1Q02', 'live38-r1 S1Q02F', 'live38-r1 S1Q09F'];   // PREREGISTER-l20d.md, "Comparator"

const rubric = JSON.parse(fs.readFileSync(`${RUNS}/2026-09-20T11-22-43-s50k/interview60.judge.pairs.json`, 'utf8')).rubric;
const PAIRS = JSON.parse(fs.readFileSync(`${HERE}/items.json`, 'utf8')).pairs;
const IDS = PAIRS.flat();
if (IDS.length !== 38 || new Set(IDS).size !== 38) throw new Error(`expected 38 distinct items, got ${IDS.length}`);
const oldIds = new Set(JSON.parse(fs.readFileSync(`${SP}/l20b/items.json`, 'utf8')).pairs.flat());
const c20Ids = new Set(JSON.parse(fs.readFileSync(`${SP}/l20c/items.json`, 'utf8')).pairs.flat());
if (oldIds.size !== 20 || c20Ids.size !== 18 || IDS.some((id) => oldIds.has(id) === c20Ids.has(id))) throw new Error('l20b/items.json (20) and l20c/items.json (18) do not partition the 38 items');

const J = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const pairsOf = (f) => Object.fromEntries(J(f).items.map((x) => [x.key, x]));
// the new Live reps
const NEW = {};
for (const r of [1, 2, 3]) { const f = `${HERE}/runs/l20d-r${r}.answers.json`; if (fs.existsSync(f)) NEW[`l20d-r${r}`] = J(f); }
const missing = [1, 2, 3].filter((r) => !NEW[`l20d-r${r}`]);
if (missing.length && !DRY) { console.log(`REFUSED: no answers file for l20d r${missing.join(', r')}: the batch is built once, with all three reps`); process.exit(2); }
if (!Object.keys(NEW).length) { console.log('no l20d rep with an answers file'); process.exit(2); }
// the anchor: L20c's old Live
const oldLive = {};
for (const r of [1, 2, 3]) oldLive[`live38-r${r}`] = { ...J(`${SP}/l20b/runs/live38-r${r}.answers.json`), ...J(`${SP}/l20c/runs/live38-r${r}.answers.json`) };
// the app's four samples
const s50m = `${RUNS}/2026-09-22T08-22-50-s50m`;
const APP = {
    'app35-inapp': pairsOf(`${s50m}/interview60.judge.pairs.json`),
    'app35-twin1': pairsOf(`${s50m}/interview60.judge.pairs.gemini-3.5-flash-lite_captured-high.json`),
    'app35-twin2': pairsOf(`${s50m}/interview60.judge.pairs.gemini-3.5-flash-lite_captured-high-r2.json`),
    'app35-twin3': pairsOf(`${s50m}/interview60.judge.pairs.gemini-3.5-flash-lite_captured-high-r3.json`),
};
const isLiveHole = (a) => !a?.played || !a.answer?.trim();   // an apology is NOT a hole here

let s = SEED; // mulberry32, as l20c/blind.mjs
const rand = () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

const pairs = shuffle([...PAIRS]);
const packets = { A: pairs.slice(0, 5).flat(), B: pairs.slice(5, 10).flat(), C: pairs.slice(10, 15).flat(), D: pairs.slice(15).flat() };
const key = {}, holes = [], out = { A: [], B: [], C: [], D: [] };
for (const [name, ids] of Object.entries(packets)) for (const id of ids) {
    const ref = APP['app35-inapp'][id];
    if (!ref) throw new Error(`${id}: not in s50m's in-app pairs file`);
    const entries = [];
    for (const [arm, P] of Object.entries(APP)) {
        const a = P[id];
        if (!a?.answer?.trim()) { holes.push(`${arm} ${id}`); continue; }
        entries.push({ arm, heard: a.heard ?? null, answer: a.answer });
    }
    for (const [arm, A] of [...Object.entries(NEW), ...Object.entries(oldLive)]) {
        const a = A[id];
        if (isLiveHole(a)) { holes.push(`${arm} ${id}`); continue; }
        entries.push({ arm, heard: a.heard ?? null, answer: a.answer });
    }
    shuffle(entries).forEach((e, i) => {
        const k = `${id}#${i + 1}`;
        key[k] = e.arm;
        out[name].push({ key: k, id, kind: ref.kind, level: ref.level, topic: ref.topic, question: ref.question, heard: e.heard, answer: e.answer });
    });
}
const arms = [...Object.keys(NEW), 'app35-inapp', 'app35-twin1', 'app35-twin2', 'app35-twin3', 'live38-r1', 'live38-r2', 'live38-r3'];
// the registered holes of the comparator and the anchor are facts of old data: they must be exactly these
const oldHoles = holes.filter((h) => /^(app35|live38)-/.test(h));
if (JSON.stringify([...oldHoles].sort()) !== JSON.stringify([...REGISTERED_HOLES].sort())) throw new Error(`the app's and the anchor's holes are not the registered ones: ${oldHoles.join(', ')}`);
for (const name of Object.keys(out)) console.log(`packet ${name}: ${out[name].length} answers (${packets[name].join(' ')})`);
console.log(`arms: ${arms.join(', ')}; answers ${Object.keys(key).length}; per arm: ${arms.map((a) => `${a} ${Object.values(key).filter((x) => x === a).length}`).join(', ')}`);
console.log(`holes (not graded): ${holes.length ? holes.join(', ') : 'none'}`);
if (missing.length) console.log(`(missing reps: ${missing.map((r) => `l20d-r${r}`).join(', ')}; dry run only)`);
if (DRY) { console.log('dry run: nothing written'); process.exit(0); }
if (fs.existsSync(`${KEYDIR}/key.json`)) { console.log(`REFUSED: ${KEYDIR}/key.json exists (never rebuild a batch that may be graded)`); process.exit(3); }
fs.mkdirSync(`${HERE}/blind`, { recursive: true });
fs.mkdirSync(KEYDIR, { recursive: true });
for (const name of Object.keys(out)) fs.writeFileSync(`${HERE}/blind/packet-${name}.json`, JSON.stringify({ rubric, items: out[name] }, null, 1));
fs.writeFileSync(`${KEYDIR}/key.json`, JSON.stringify({ seed: SEED, arms, packets, holes, key }, null, 1));
console.log(`key -> ${KEYDIR}/key.json`);
