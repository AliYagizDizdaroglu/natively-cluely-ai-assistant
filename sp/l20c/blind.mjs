// L20c: build the blinded grading packets (PREREGISTER-l20c.md). 38 items = L20's 20 (l20b/items.json) + L20c's
// 18 (l20c/items.json). Per item, the answers of 7 arms sit together under keys id#1..#n in a seeded random order:
//   live38-r1..r3  = L20b rN for L20's items, L20c rN for the new ones (3.8 Live bare);
//   app35-inapp    = s50m in-app (the app with 3.5-flash-lite HIGH first);
//   app35-twin1..3 = s50m captured-high, -r2, -r3 (3.5-lite HIGH on the app's captured prompts);
//   [br1-inapp]    = only with --br1 <run dir>: tonight's app hour, a reported-only eighth arm.
// The 19 pairs are split by a seeded shuffle into 4 packets (5, 5, 5, 4 pairs) so every question's answers are
// graded by the same graders. A HOLE (a Live item never played or with no answer text; an app answer that is
// empty) is not sent to the graders: it is listed in key.json `holes`. A spoken system-error apology IS sent.
// The rubric is the frozen one, verbatim from s50k's pairs file. The key goes to l20c-key/.
//   node blind.mjs [--br1 <run dir>]
import fs from 'node:fs';

const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const RUNS = `${MAIN}/electron/test/golden/interview60.runs`;
const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const HERE = `${SP}/l20c`, KEYDIR = `${SP}/l20c-key`;
const SEED = 20260930;
const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : undefined; };
const BR1 = arg('--br1');

const rubric = JSON.parse(fs.readFileSync(`${RUNS}/2026-09-20T11-22-43-s50k/interview60.judge.pairs.json`, 'utf8')).rubric;
const oldItems = JSON.parse(fs.readFileSync(`${SP}/l20b/items.json`, 'utf8'));
const newItems = JSON.parse(fs.readFileSync(`${HERE}/items.json`, 'utf8'));
const PAIRS = [...oldItems.pairs, ...newItems.pairs];
const IDS = PAIRS.flat();
if (IDS.length !== 38 || new Set(IDS).size !== 38) throw new Error(`expected 38 distinct items, got ${IDS.length}`);
const oldIds = new Set(oldItems.pairs.flat());

const liveFile = (r, id) => `${SP}/${oldIds.has(id) ? 'l20b' : 'l20c'}/runs/live38-r${r}.answers.json`;
const liveCache = {};
const liveAnswer = (r, id) => { const f = liveFile(r, id); liveCache[f] ??= JSON.parse(fs.readFileSync(f, 'utf8')); return liveCache[f][id]; };
const s50m = `${RUNS}/2026-09-22T08-22-50-s50m`;
const pairsOf = (f) => Object.fromEntries(JSON.parse(fs.readFileSync(f, 'utf8')).items.map((x) => [x.key, x]));
const APP = {
    'app35-inapp': pairsOf(`${s50m}/interview60.judge.pairs.json`),
    'app35-twin1': pairsOf(`${s50m}/interview60.judge.pairs.gemini-3.5-flash-lite_captured-high.json`),
    'app35-twin2': pairsOf(`${s50m}/interview60.judge.pairs.gemini-3.5-flash-lite_captured-high-r2.json`),
    'app35-twin3': pairsOf(`${s50m}/interview60.judge.pairs.gemini-3.5-flash-lite_captured-high-r3.json`),
};
if (BR1) APP['br1-inapp'] = pairsOf(`${BR1}/interview60.judge.pairs.json`);

let s = SEED; // mulberry32, as l20/blind.mjs
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
    for (const r of [1, 2, 3]) {
        const a = liveAnswer(r, id);
        if (!a?.played || !a.answer?.trim()) { holes.push(`live38-r${r} ${id}`); continue; }
        entries.push({ arm: `live38-r${r}`, heard: a.heard ?? null, answer: a.answer });
    }
    shuffle(entries).forEach((e, i) => {
        const k = `${id}#${i + 1}`;
        key[k] = e.arm;
        out[name].push({ key: k, id, kind: ref.kind, level: ref.level, topic: ref.topic, question: ref.question, heard: e.heard, answer: e.answer });
    });
}
if (fs.existsSync(`${KEYDIR}/key.json`)) { console.log(`REFUSED: ${KEYDIR}/key.json exists (never rebuild a batch that may be graded)`); process.exit(3); }
fs.mkdirSync(`${HERE}/blind`, { recursive: true });
fs.mkdirSync(KEYDIR, { recursive: true });
for (const name of Object.keys(out)) fs.writeFileSync(`${HERE}/blind/packet-${name}.json`, JSON.stringify({ rubric, items: out[name] }, null, 1));
fs.writeFileSync(`${KEYDIR}/key.json`, JSON.stringify({ seed: SEED, arms: [...Object.keys(APP), 'live38-r1', 'live38-r2', 'live38-r3'], packets, holes, key }, null, 1));
for (const name of Object.keys(out)) console.log(`packet ${name}: ${out[name].length} answers (${packets[name].join(' ')})`);
console.log(`holes (not graded): ${holes.length ? holes.join(', ') : 'none'}\nkey -> ${KEYDIR}/key.json`);
