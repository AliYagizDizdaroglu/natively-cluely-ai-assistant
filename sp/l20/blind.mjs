// L20: build the blinded grading packets (PREREGISTER-l20.md). Per item, the 4 app answers (s50k in-app + 3
// captured-low twins) and the 3 live38 answers sit together under keys id#1..#7 in a seeded random order. The 10
// pairs are split by a seeded shuffle into packet A (5 pairs) and packet B (5 pairs), 70 answers each, so every
// question's answers are graded by the same grader. The key goes to l20-key/, a folder no grader is pointed at.
// The rubric is the frozen one, verbatim from s50k's pairs file.
// A HOLE — a live38 item never played, or played with no answer text (a dropped connection after the one retry) —
// is not sent to the graders: it is listed in key.json `holes`, and score.mjs counts it as not acceptable and as a
// safety failure, which is what PREREGISTER-l20.md's "no-answer item" means.
//   node blind.mjs
import fs from 'node:fs';

const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const HERE = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/l20';
const KEYDIR = `${HERE}-key`;
const SEED = 20260929;
const rubric = JSON.parse(fs.readFileSync(`${MAIN}/electron/test/golden/interview60.runs/2026-09-20T11-22-43-s50k/interview60.judge.pairs.json`, 'utf8')).rubric;
const items = JSON.parse(fs.readFileSync(`${HERE}/items.json`, 'utf8'));
const app = JSON.parse(fs.readFileSync(`${HERE}/app-baseline.json`, 'utf8'));
const live = Object.fromEntries([1, 2, 3].map((r) => [`live38-r${r}`, JSON.parse(fs.readFileSync(`${HERE}/runs/live38-r${r}.answers.json`, 'utf8'))]));

let s = SEED; // mulberry32
const rand = () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

const pairs = shuffle([...items.pairs]);
const packets = { A: pairs.slice(0, 5).flat(), B: pairs.slice(5).flat() };
const key = {};
const holes = [];
const out = { A: [], B: [] };
for (const [name, ids] of Object.entries(packets)) for (const id of ids) {
    const row = app.items[id];
    const ref = row.answers['app-inapp'];
    const entries = Object.entries(row.answers).map(([arm, a]) => ({ arm, heard: a.heard, answer: a.answer }));
    for (const [arm, L] of Object.entries(live)) {
        const a = L[id];
        if (!a?.played || !a.answer?.trim()) { holes.push(`${arm} ${id}`); continue; }
        entries.push({ arm, heard: a.heard, answer: a.answer });
    }
    shuffle(entries).forEach((e, i) => {
        const k = `${id}#${i + 1}`;
        key[k] = e.arm;
        out[name].push({ key: k, id, kind: ref.kind, level: ref.level, topic: ref.topic, question: ref.question, heard: e.heard, answer: e.answer });
    });
}
fs.mkdirSync(`${HERE}/blind`, { recursive: true });
fs.mkdirSync(KEYDIR, { recursive: true });
for (const name of ['A', 'B']) fs.writeFileSync(`${HERE}/blind/packet-${name}.json`, JSON.stringify({ rubric, items: out[name] }, null, 1));
fs.writeFileSync(`${KEYDIR}/key.json`, JSON.stringify({ seed: SEED, packets, holes, key }, null, 1));
console.log(`packet A: ${out.A.length} answers (${packets.A.join(' ')})\npacket B: ${out.B.length} answers (${packets.B.join(' ')})\nholes (not graded): ${holes.length ? holes.join(', ') : 'none'}\nkey -> ${KEYDIR}/key.json`);
