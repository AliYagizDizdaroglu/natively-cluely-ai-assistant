// Builds blind/l38p-blind.json (items under anonymous keys, W/E shuffled, seeded) and keyhold/l38p-key.json (outside
// the grader's folder). Refuses to overwrite. Prints counts only.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const S = JSON.parse(fs.readFileSync(path.join(HERE, 'runs', 'l38p.json'), 'utf8'));
const T = JSON.parse(fs.readFileSync(path.join(HERE, '..', 'l38f', 'items.json'), 'utf8')).text;
const B = path.join(HERE, 'blind'), K = path.join(HERE, 'keyhold');
if (fs.existsSync(path.join(B, 'l38p-blind.json'))) { console.log('REFUSED: blind file exists'); process.exit(2); }
fs.mkdirSync(B, { recursive: true }); fs.mkdirSync(K, { recursive: true });
let seed = 20261001; const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const items = [];
for (const rep of [1, 2, 3]) for (let k = 1; k <= 6; k++) for (const s of ['W', 'E']) {
    const p = S.records[`P${k}-r${rep}`], f = S.records[`${s}${k}-r${rep}`];
    if (!p?.spoken || !f || f.error || !f.spoken) continue;
    items.push({ shape: s, chain: k, rep, parentQuestion: T[`AP${k}`], parentAnswer: p.spoken, followupQuestion: T[`AF${k}`], followupAnswer: f.spoken });
}
for (let i = items.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [items[i], items[j]] = [items[j], items[i]]; }
const blind = {}, key = {};
items.forEach((it, i) => { const id = `q${String(i + 1).padStart(2, '0')}`; key[id] = { shape: it.shape, chain: it.chain, rep: it.rep }; blind[id] = { parentQuestion: it.parentQuestion, parentAnswer: it.parentAnswer, followupQuestion: it.followupQuestion, followupAnswer: it.followupAnswer }; });
fs.writeFileSync(path.join(B, 'l38p-blind.json'), JSON.stringify(blind, null, 1));
fs.writeFileSync(path.join(K, 'l38p-key.json'), JSON.stringify(key, null, 1));
console.log(`${items.length} items: W ${items.filter((x) => x.shape === 'W').length}, E ${items.filter((x) => x.shape === 'E').length}`);
