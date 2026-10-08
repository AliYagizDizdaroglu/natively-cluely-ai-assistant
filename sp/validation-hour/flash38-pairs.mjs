// h40d 3.8 Flash sidecar (PREREGISTER-h40d-flash38-sidecar.md): blind pairs for the answered ids, four answers each
// (3.8 Flash, in-app, captured-high r1, captured-low r1), h40d's rubric, anonymous keys, shuffled; key to keyhold.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const G = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden';
const R = `${G}/interview60.runs/2026-10-02T11-39-41-h40d`;
const J = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const inapp = J(`${R}/interview60.judge.pairs.json`);
const arms = { inapp, high: J(`${R}/interview60.judge.pairs.gemini-3.5-flash-lite_captured-high.json`), low: J(`${R}/interview60.judge.pairs.gemini-3.1-flash-lite_captured-low.json`) };
const F = J(`${G}/interview60.answers.gemini-3.8-flash_flash38.json`);
const ids = Object.keys(F).filter((id) => F[id]?.spoken && !F[id]?.transientError);
const out = path.join(HERE, 'flash38-blind-pairs.json'), keyOut = path.join(HERE, 'keyhold-flash38-key.json');
if (fs.existsSync(out)) { console.log('REFUSED: exists'); process.exit(2); }
const entries = [];
for (const id of ids) {
    const q = inapp.items.find((x) => x.id === id)?.question;
    if (!q) throw new Error(`${id}: no question in the in-app pairs`);
    entries.push({ tag: `${id}|flash38`, q, a: F[id].spoken });
    for (const [arm, P] of Object.entries(arms)) { const it = P.items.filter((x) => x.id === id); if (!it.length) throw new Error(`${id}: missing in ${arm}`); entries.push({ tag: `${id}|${arm}`, q, a: it.at(-1).answer }); }
}
let seed = 20261002; const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
for (let i = entries.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [entries[i], entries[j]] = [entries[j], entries[i]]; }
const key = {}; const items = entries.map((e, n) => { const k = `k${String(n + 1).padStart(2, '0')}`; key[k] = e.tag; return { key: k, question: e.q, answer: e.a }; });
fs.writeFileSync(out, JSON.stringify({ model: 'anonymous', rubric: inapp.rubric, items }, null, 1));
fs.writeFileSync(keyOut, JSON.stringify(key, null, 1));
console.log(`${ids.length} ids (${ids.join(',')}), ${items.length} answers; rubric ${String(inapp.rubric).length} chars`);
