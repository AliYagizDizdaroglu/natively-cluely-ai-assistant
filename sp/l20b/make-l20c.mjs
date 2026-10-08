// Throwaway (2026-09-29): set up l20c/ (PREREGISTER-l20c.md) as an exact copy of the L20b harness whose ONLY
// change is the folder constant (HERE = .../l20b -> .../l20c), with the 9 new S1+S2 pairs as items.json.
// Refuses when any other line differs, or when l20c/runs already exists (never overwrite a run).
//   node make-l20c.mjs
import fs from 'node:fs';
const SRC = new URL('./', import.meta.url), DST = new URL('../l20c/', import.meta.url);
if (fs.existsSync(new URL('runs/', DST))) { console.log('REFUSED: l20c/runs exists'); process.exit(3); }
fs.mkdirSync(DST, { recursive: true });
const pairs = [['S1Q08', 'S1Q08F'], ['S1Q09', 'S1Q09F'], ['S1Q10', 'S1Q10F'], ['S2Q03', 'S2Q03F'], ['S2Q04', 'S2Q04F'],
    ['S2Q05', 'S2Q05F'], ['S2Q06', 'S2Q06F'], ['S2Q07', 'S2Q07F'], ['S2Q10', 'S2Q10F']];
fs.writeFileSync(new URL('items.json', DST), JSON.stringify({ seed: null, note: 'L20c: the S1+S2 pairs not in L20, minus S1Q01 (no captured s50k prompt)', hard: [], normal: pairs, pairs }, null, 1));
console.log(`wrote items.json: ${pairs.length} pairs`);
for (const f of ['run.mjs', 'drops.mjs']) {
    const a = fs.readFileSync(new URL(f, SRC), 'utf8');
    const b = a.replace(/(scratchpad\/l20)b(['"])/g, '$1c$2');
    const al = a.split('\n'), bl = b.split('\n');
    const changed = al.map((l, i) => (l !== bl[i] ? i + 1 : 0)).filter(Boolean);
    if (changed.length !== 1 || !/^const HERE = /.test(bl[changed[0] - 1])) { console.log(`REFUSED: ${f} changed lines ${changed.join(',')} (want exactly the HERE line)`); process.exit(3); }
    fs.writeFileSync(new URL(f, DST), b);
    console.log(`copied ${f}: only line ${changed[0]} differs -> ${bl[changed[0] - 1].slice(-40)}`);
}
