// Reads the calibration: simple items called EASY (need >= 10/12), hard items called HARD (need 10/10).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const J = (p) => JSON.parse(fs.readFileSync(path.join(HERE, p), 'utf8'));
const key = J('keyhold/cal-key.json'), v = J('blind/cal-verdicts.json');
if (Object.keys(v).length !== 22) { console.log('REFUSED: not 22 verdicts'); process.exit(2); }
let se = 0, sn = 0, hh = 0, hn = 0; const miss = [];
for (const [k, { id, cls }] of Object.entries(key)) {
    const easy = v[k].v === 'EASY';
    if (cls === 'simple') { sn++; se += easy; if (!easy) miss.push(`${id} called HARD: ${v[k].r}`); }
    else { hn++; hh += !easy; if (easy) miss.push(`${id} called EASY: ${v[k].r}`); }
}
console.log(`simple called EASY ${se}/${sn} (need >= 10); hard called HARD ${hh}/${hn} (need 10)`);
console.log(miss.length ? miss.join('\n') : 'no misses');
console.log(se >= 10 && hh === hn ? 'CALIBRATION OK' : 'CALIBRATION FAILED');
