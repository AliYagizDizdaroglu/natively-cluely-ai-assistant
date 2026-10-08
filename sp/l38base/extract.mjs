// Base-rate pre-registration step 1: the two non-holdout rosters -> items.json + a blind, shuffled file + the key.
// Never reads holdout40. Refuses to overwrite an existing blind file (the graders may already hold it).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const G = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden';
const s50 = await import(pathToFileURL(path.join(G, 'scenario50.questions.mjs')).href);
const i60 = await import(pathToFileURL(path.join(G, 'interview60.questions.mjs')).href);
const items = [];
// Parents are looked up in the FULL roster: an interview60 follow-up can chain to a screenshot cue (C01F1).
for (const [set, list, full] of [['scenario50', s50.SPOKEN, s50.SCENARIO50], ['interview60', i60.SPOKEN, i60.INTERVIEW]]) {
    const byId = new Map(full.map((x) => [x.id, x]));
    for (const x of list) {
        const parent = x.chain ? byId.get(x.chain) : null;
        items.push({ id: x.id, set, kind: x.chain ? 'followup' : 'main', text: x.q, parentText: parent?.q ?? null, parentId: x.chain ?? null });
    }
}
const counts = {};
for (const it of items) counts[`${it.set}/${it.kind}`] = (counts[`${it.set}/${it.kind}`] ?? 0) + 1;
console.log(counts, 'total', items.length);
if (items.length !== 176) { console.log('REFUSED: expected 100 + 76 spoken items'); process.exit(2); }
if (items.some((it) => it.kind === 'followup' && !it.parentText)) { console.log('REFUSED: a follow-up without its parent text'); process.exit(2); }
fs.writeFileSync(path.join(HERE, 'items.json'), JSON.stringify(items, null, 1));
const blindPath = path.join(HERE, 'blind', 'blind.json');
if (fs.existsSync(blindPath)) { console.log('blind file exists, not rewritten'); process.exit(0); }
// Fisher-Yates with a fixed seed (mulberry32) so the shuffle is reproducible.
let s = 20261001; const rnd = () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const order = items.map((_, i) => i);
for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
const blind = [], key = {};
order.forEach((idx, n) => { const k = `B${String(n + 1).padStart(3, '0')}`; key[k] = items[idx].id; blind.push({ key: k, question: items[idx].text, earlierQuestion: items[idx].parentText }); });
fs.mkdirSync(path.dirname(blindPath), { recursive: true });
fs.mkdirSync(path.join(HERE, 'keyhold'), { recursive: true });
fs.writeFileSync(blindPath, JSON.stringify(blind, null, 1));
fs.writeFileSync(path.join(HERE, 'keyhold', 'key.json'), JSON.stringify(key, null, 1));
console.log('wrote items.json, blind/blind.json, keyhold/key.json');
