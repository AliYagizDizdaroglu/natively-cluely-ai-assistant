// Validates L20d verdict files against their packets, as each grader's own step 4 would have: parses, the key set
// equals the packet's item keys exactly, every score an integer 0-2, every reason a non-empty string. Prints counts
// only, never reasons or answers. Used for verdict files whose grader stopped (session limit) after writing.
//   node validate-verdicts.mjs A-g2 B-g2 C-g1 ...
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const BLIND = path.join(path.dirname(fileURLToPath(import.meta.url)), 'blind');
let bad = 0;
for (const slot of process.argv.slice(2)) {
    const [p] = slot.split('-');
    const vf = path.join(BLIND, `verdicts-${slot}.json`);
    if (!fs.existsSync(vf)) { console.log(`${slot}: MISSING`); bad++; continue; }
    let v;
    try { v = JSON.parse(fs.readFileSync(vf, 'utf8')); } catch (e) { console.log(`${slot}: DOES NOT PARSE (${e.message.slice(0, 80)})`); bad++; continue; }
    const items = JSON.parse(fs.readFileSync(path.join(BLIND, `packet-${p}.json`), 'utf8')).items;
    const want = new Set(items.map((x) => x.key)), got = new Set(Object.keys(v));
    const missing = [...want].filter((k) => !got.has(k)), extra = [...got].filter((k) => !want.has(k));
    const malformed = Object.entries(v).filter(([, x]) => !x || !['correctness', 'on_topic', 'delivery'].every((f) => Number.isInteger(x[f]) && x[f] >= 0 && x[f] <= 2) || typeof x.reason !== 'string' || !x.reason.trim()).map(([k]) => k);
    const ok = !missing.length && !extra.length && !malformed.length;
    if (!ok) bad++;
    const acc = Object.values(v).filter((x) => x.correctness === 2 && x.on_topic === 2).length;
    const low = Object.values(v).filter((x) => x.correctness === 0 || x.on_topic === 0).length;
    console.log(`${slot}: ${ok ? 'VALID' : 'INVALID'}  keys ${got.size}/${want.size}  missing ${missing.length}  extra ${extra.length}  malformed ${malformed.length}  (c2&o2 ${acc}, c0|o0 ${low})`);
}
process.exit(bad ? 1 : 0);
