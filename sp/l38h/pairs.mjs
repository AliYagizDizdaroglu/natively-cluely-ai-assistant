// Builds blind/l38h-pairs.json for the frozen grader prompt: s50m captured-high's pairs file as the template (model,
// rubric, question text per id), the variant-B 3.5-lite answers from runs/hard.json, keys anonymized and shuffled.
// The key map goes to keyhold/. Refuses to overwrite. Prints counts only.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const T = JSON.parse(fs.readFileSync('C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs/2026-09-22T08-22-50-s50m/interview60.judge.pairs.gemini-3.5-flash-lite_captured-high.json', 'utf8'));
const R = JSON.parse(fs.readFileSync(path.join(HERE, 'runs', 'hard.json'), 'utf8')).records;
const IDS = ['S1Q02', 'S1Q02F', 'S1Q04', 'S1Q04F', 'S1Q05', 'S1Q05F', 'S1Q07', 'S1Q07F', 'S2Q02', 'S2Q02F'];
const out = path.join(HERE, 'blind', 'l38h-pairs.json');
if (fs.existsSync(out)) { console.log('REFUSED: exists'); process.exit(2); }
fs.mkdirSync(path.dirname(out), { recursive: true }); fs.mkdirSync(path.join(HERE, 'keyhold'), { recursive: true });
let seed = 20261001; const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const ids = [...IDS]; for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
const key = {}, items = [];
ids.forEach((id, n) => {
    const t = T.items.find((x) => x.id === id), r = R[`${id}-lite`];
    if (!t || !r?.spoken) throw new Error(`${id}: template or answer missing`);
    const k = `k${String(n + 1).padStart(2, '0')}`; key[k] = id;
    items.push({ key: k, question: t.question, answer: r.spoken });
});
fs.writeFileSync(out, JSON.stringify({ model: 'anonymous', rubric: T.rubric, items }, null, 1));
fs.writeFileSync(path.join(HERE, 'keyhold', 'l38h-key.json'), JSON.stringify(key, null, 1));
console.log(`${items.length} items; rubric ${T.rubric.length} chars from s50m captured-high's pairs file`);
