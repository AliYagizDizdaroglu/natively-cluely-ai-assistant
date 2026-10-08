// ET38: build the blinded grading packets (PREREGISTER-et38.md). Per item, the answers of every ET run that was
// played (et-low-r1..r3, et-medium-r1..r3, as far as they exist) and br1's in-app answer (the anchor) sit together
// under keys id#1..#n in a seeded random order. The 19 pairs are split by a seeded shuffle into 4 packets (5, 5, 5,
// 4 pairs) so every question's answers go to the same graders. A HOLE is not sent: an ET item that did not play, has
// an empty answer or is a spoken system-error apology (ET38's rule; L20c sent apologies), or an empty br1 answer.
// The rubric is the frozen one, verbatim from s50k's pairs file. The key goes to et38-key/, a folder no grader is
// pointed at. Refuses to rebuild a batch whose key exists. `--dry` prints the counts and writes nothing.
//   node blind.mjs [--dry] [--dir <folder with items.json and runs/>] [--keydir <folder>]
import fs from 'node:fs';

const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const RUNS = `${MAIN}/electron/test/golden/interview60.runs`;
const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const HERE = arg('--dir', `${SP}/et38`), KEYDIR = arg('--keydir', `${SP}/et38-key`);
const DRY = process.argv.includes('--dry');
const SEED = 20261001;
const BR1 = `${RUNS}/2026-09-30T11-45-30-br1`;

const rubric = JSON.parse(fs.readFileSync(`${RUNS}/2026-09-20T11-22-43-s50k/interview60.judge.pairs.json`, 'utf8')).rubric;
const PAIRS = JSON.parse(fs.readFileSync(`${HERE}/items.json`, 'utf8')).pairs;
const IDS = PAIRS.flat();
if (IDS.length !== 38 || new Set(IDS).size !== 38) throw new Error(`expected 38 distinct items, got ${IDS.length}`);
const pairsOf = (f) => Object.fromEntries(JSON.parse(fs.readFileSync(f, 'utf8')).items.map((x) => [x.key, x]));
// the question's text, kind, level and topic come from s50m's in-app pairs file, as in L20c (not an arm here)
const REF = pairsOf(`${RUNS}/2026-09-22T08-22-50-s50m/interview60.judge.pairs.json`);
const br1 = pairsOf(`${BR1}/interview60.judge.pairs.json`);
const ET = {};
for (const level of ['low', 'medium']) for (const r of [1, 2, 3]) {
    const f = `${HERE}/runs/et-${level}-r${r}.answers.json`;
    if (fs.existsSync(f)) ET[`et-${level}-r${r}`] = JSON.parse(fs.readFileSync(f, 'utf8'));
}
if (!Object.keys(ET).length) { console.log('no ET run with an answers file'); process.exit(2); }
const isEtHole = (a) => !a?.played || !a.answer?.trim() || /system error/i.test(a.answer);

let s = SEED; // mulberry32, as l20c/blind.mjs
const rand = () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

const pairs = shuffle([...PAIRS]);
const packets = { A: pairs.slice(0, 5).flat(), B: pairs.slice(5, 10).flat(), C: pairs.slice(10, 15).flat(), D: pairs.slice(15).flat() };
const key = {}, holes = [], out = { A: [], B: [], C: [], D: [] };
for (const [name, ids] of Object.entries(packets)) for (const id of ids) {
    const ref = REF[id];
    if (!ref) throw new Error(`${id}: not in s50m's in-app pairs file`);
    const entries = [];
    const b = br1[id];
    if (!b?.answer?.trim()) holes.push(`br1-inapp ${id}`); else entries.push({ arm: 'br1-inapp', heard: b.heard ?? null, answer: b.answer });
    for (const [arm, A] of Object.entries(ET)) {
        const a = A[id];
        if (isEtHole(a)) { holes.push(`${arm} ${id}`); continue; }
        entries.push({ arm, heard: a.heard ?? null, answer: a.answer });
    }
    shuffle(entries).forEach((e, i) => {
        const k = `${id}#${i + 1}`;
        key[k] = e.arm;
        out[name].push({ key: k, id, kind: ref.kind, level: ref.level, topic: ref.topic, question: ref.question, heard: e.heard, answer: e.answer });
    });
}
const arms = ['br1-inapp', ...Object.keys(ET)];
for (const name of Object.keys(out)) console.log(`packet ${name}: ${out[name].length} answers (${packets[name].join(' ')})`);
console.log(`arms: ${arms.join(', ')}; answers ${Object.keys(key).length}; per arm: ${arms.map((a) => `${a} ${Object.values(key).filter((x) => x === a).length}`).join(', ')}`);
console.log(`holes (not graded): ${holes.length ? holes.join(', ') : 'none'}`);
if (DRY) { console.log('dry run: nothing written'); process.exit(0); }
if (fs.existsSync(`${KEYDIR}/key.json`)) { console.log(`REFUSED: ${KEYDIR}/key.json exists (never rebuild a batch that may be graded)`); process.exit(3); }
fs.mkdirSync(`${HERE}/blind`, { recursive: true });
fs.mkdirSync(KEYDIR, { recursive: true });
for (const name of Object.keys(out)) fs.writeFileSync(`${HERE}/blind/packet-${name}.json`, JSON.stringify({ rubric, items: out[name] }, null, 1));
fs.writeFileSync(`${KEYDIR}/key.json`, JSON.stringify({ seed: SEED, arms, packets, holes, key }, null, 1));
console.log(`key -> ${KEYDIR}/key.json`);
