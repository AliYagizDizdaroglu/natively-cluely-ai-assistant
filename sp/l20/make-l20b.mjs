// Throwaway (2026-09-29): set up l20b/ as an exact copy of the L20 harness whose ONLY change is the folder
// constant (HERE = .../l20 -> .../l20b), so the 28 Sep L20 record stays untouched. Refuses when any other
// line differs, or when l20b/runs already exists (never overwrite a run).
import fs from 'node:fs';
const SRC = new URL('./', import.meta.url), DST = new URL('../l20b/', import.meta.url);
if (fs.existsSync(new URL('runs/', DST))) { console.log('REFUSED: l20b/runs exists'); process.exit(3); }
fs.mkdirSync(DST, { recursive: true });
for (const f of ['items.json', 'app-baseline.json']) {
    fs.copyFileSync(new URL(f, SRC), new URL(f, DST));
    console.log(`copied ${f} (byte-identical)`);
}
for (const f of ['run.mjs', 'mechanics.mjs', 'drops.mjs']) {
    const a = fs.readFileSync(new URL(f, SRC), 'utf8');
    const b = a.replace(/(scratchpad\/l20)(['"])/g, '$1b$2');
    const al = a.split('\n'), bl = b.split('\n');
    const changed = al.map((l, i) => (l !== bl[i] ? i + 1 : 0)).filter(Boolean);
    if (changed.length !== 1 || !/^const HERE = /.test(bl[changed[0] - 1])) { console.log(`REFUSED: ${f} changed lines ${changed.join(',')} (want exactly the HERE line)`); process.exit(3); }
    fs.writeFileSync(new URL(f, DST), b);
    console.log(`copied ${f}: only line ${changed[0]} differs -> ${bl[changed[0] - 1].slice(-40)}`);
}
