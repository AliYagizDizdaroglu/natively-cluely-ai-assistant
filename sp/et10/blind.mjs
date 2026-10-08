// ET10: build the blinded grading packet. Per item, the 4 app answers (s50k in-app + 3 captured-low twins) and
// the 2 ET answers sit together under keys id#1..#6 in a seeded random order; the key file goes to a separate
// folder the graders are never pointed at. The rubric is the frozen one, verbatim from s50k's pairs file.
//   node blind.mjs            ET10: 6 arms  -> blind/grading-packet.json,  et10-key/key.json
//   node blind.mjs --batch2   ET10b: 8 arms -> blind2/grading-packet.json, et10-key/key2.json (PREREGISTER-et10b.md)
import fs from 'node:fs';

const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const HERE = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/et10';
const KEYDIR = `${HERE}-key`;
const B2 = process.argv.includes('--batch2');
const SEED = B2 ? 20260928 : 20260927;
const PACKET_DIR = B2 ? `${HERE}/blind2` : `${HERE}/blind`;
const KEY_FILE = B2 ? `${KEYDIR}/key2.json` : `${KEYDIR}/key.json`;
const ET_FILES = B2
    ? { 'et-low': 'et10-low', 'et-high': 'et10-high', 'et-medium': 'et10-medium', live38: 'et10-live38' }
    : { 'et-low': 'et10-low', 'et-high': 'et10-high' };
const rubric = JSON.parse(fs.readFileSync(`${MAIN}/electron/test/golden/interview60.runs/2026-09-20T11-22-43-s50k/interview60.judge.pairs.json`, 'utf8')).rubric;
const app = JSON.parse(fs.readFileSync(`${HERE}/app-baseline.json`, 'utf8'));
const et = Object.fromEntries(Object.entries(ET_FILES).map(([arm, f]) => [arm, JSON.parse(fs.readFileSync(`${HERE}/runs/${f}.answers.json`, 'utf8'))]));

let s = SEED; // mulberry32
const rand = () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const items = [], key = {};
for (const [id, row] of Object.entries(app.items)) {
    const ref = row.answers['app-inapp'];
    const entries = Object.entries(row.answers).map(([arm, a]) => ({ arm, heard: a.heard, answer: a.answer }));
    for (const [arm, E] of Object.entries(et)) {
        const a = E[id];
        if (!a?.played) throw new Error(`${arm} ${id}: not played — refuse to build a packet with a hole`);
        entries.push({ arm, heard: a.heard, answer: a.answer });
    }
    for (let i = entries.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [entries[i], entries[j]] = [entries[j], entries[i]]; }
    entries.forEach((e, i) => {
        const k = `${id}#${i + 1}`;
        key[k] = e.arm;
        items.push({ key: k, id, kind: ref.kind, level: ref.level, topic: ref.topic, question: ref.question, heard: e.heard, answer: e.answer });
    });
}
fs.mkdirSync(PACKET_DIR, { recursive: true });
fs.mkdirSync(KEYDIR, { recursive: true });
fs.writeFileSync(`${PACKET_DIR}/grading-packet.json`, JSON.stringify({ rubric, items }, null, 1));
fs.writeFileSync(KEY_FILE, JSON.stringify({ seed: SEED, key }, null, 1));
console.log(`packet ${items.length} items (${Object.keys(app.items).length} questions x ${items.length / Object.keys(app.items).length}) -> ${PACKET_DIR}/grading-packet.json; key -> ${KEY_FILE}`);
