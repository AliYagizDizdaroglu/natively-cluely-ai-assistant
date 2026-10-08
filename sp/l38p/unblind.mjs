// Joins the grader's labels with the key: counts per shape and per chain. Prints labels and ids only.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const V = JSON.parse(fs.readFileSync(path.join(HERE, 'blind', 'l38p-verdicts.json'), 'utf8'));
const K = JSON.parse(fs.readFileSync(path.join(HERE, 'keyhold', 'l38p-key.json'), 'utf8'));
if (Object.keys(V).sort().join() !== Object.keys(K).sort().join()) { console.log('REFUSED: verdict ids differ from key ids'); process.exit(2); }
const L = ['CONSISTENT', 'CONTRADICTS', 'GUESS', 'DEFLECT'];
for (const s of ['W', 'E']) {
    const ids = Object.keys(K).filter((id) => K[id].shape === s);
    console.log(`${s}: n ${ids.length}  ` + L.map((l) => `${l} ${ids.filter((id) => V[id] === l).length}`).join('  '));
}
for (let k = 1; k <= 6; k++) {
    const row = (s) => [1, 2, 3].map((r) => { const id = Object.keys(K).find((x) => K[x].shape === s && K[x].chain === k && K[x].rep === r); return id ? { CONSISTENT: 'ok', CONTRADICTS: 'CONTRA', GUESS: 'guess', DEFLECT: 'defl' }[V[id]] : '-'; }).join(' ');
    console.log(`AF${k}  W: ${row('W')}   E: ${row('E')}`);
}
