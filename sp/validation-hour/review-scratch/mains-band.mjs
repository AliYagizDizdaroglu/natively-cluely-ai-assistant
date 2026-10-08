// Review scratch (read-only): the holdout protocol's band test on mains (draft rule 3e) for one run folder:
// in-app acceptable mains (best per item) vs each captured twin's acceptable mains, on the ids both captured.
// Numbers and ids only.
//   node mains-band.mjs <run-dir>
import fs from 'node:fs';
import path from 'node:path';
const dir = process.argv[2];
const read = (f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
const isFollow = (id) => /F\d*$/.test(id);
const inApp = read('interview60.judge.json');
const best = new Map();
for (const [k, v] of Object.entries(inApp.items)) {
    const id = v.id ?? k.replace(/#\d+$/, '');
    const r = { acceptable: 2, weak: 1, wrong: 0 }[v.verdict] ?? -1;
    best.set(id, Math.max(best.get(id) ?? -1, r));
}
const arms = fs.readdirSync(dir).filter((f) => /^interview60\.judge\.gemini.*captured-(high|low)(-r\d)?\.json$/.test(f)).sort();
const capturedMains = new Set();
const armAcc = {};
for (const f of arms) {
    const j = read(f);
    const mains = Object.values(j.items).filter((v) => !isFollow(v.id));
    for (const v of mains) capturedMains.add(v.id);
    armAcc[f] = new Set(mains.filter((v) => v.verdict === 'acceptable').map((v) => v.id));
}
const ids = [...capturedMains];
const inAppMains = ids.filter((id) => best.get(id) === 2).length;
console.log(`${path.basename(dir)}: mains captured ${ids.length}; in-app acceptable on them ${inAppMains}`);
for (const [f, s] of Object.entries(armAcc)) console.log(`  ${f.replace('interview60.judge.', '').replace('.json', '').padEnd(40)} ${[...s].filter((id) => ids.includes(id)).length}`);
