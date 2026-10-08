// Copies scratchpad files into MAIN's working tree (Write/Edit refuse MAIN paths; PowerShell mangles the non-ASCII
// path without a BOM). Refuses a source with a CR byte (the MAIN commit helper refuses CR blobs) and refuses to
// overwrite an existing file unless --overwrite is given.
//   node copy-to-main.mjs [--overwrite] <source>=<path relative to MAIN> ...
import fs from 'node:fs';
import path from 'node:path';
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
if (!fs.existsSync(path.join(MAIN, '.git'))) { console.log('MAIN does not resolve'); process.exit(1); }
const overwrite = process.argv.includes('--overwrite');
let bad = 0;
const jobs = process.argv.slice(2).filter((a) => a !== '--overwrite').map((a) => { const i = a.lastIndexOf('='); return [a.slice(0, i), a.slice(i + 1)]; });
for (const [src, rel] of jobs) {
    const buf = fs.readFileSync(src);
    const dest = path.join(MAIN, rel);
    if (buf.includes(13)) { console.log(`REFUSED ${rel}: the source has a CR byte`); bad++; continue; }
    if (!fs.existsSync(path.dirname(dest))) { console.log(`REFUSED ${rel}: the folder does not exist in MAIN`); bad++; continue; }
    if (fs.existsSync(dest) && !overwrite) { console.log(`REFUSED ${rel}: exists in MAIN (pass --overwrite to replace it)`); bad++; continue; }
}
if (bad) { console.log('nothing copied'); process.exit(2); }
for (const [src, rel] of jobs) {
    fs.copyFileSync(src, path.join(MAIN, rel));
    const same = Buffer.compare(fs.readFileSync(src), fs.readFileSync(path.join(MAIN, rel))) === 0;
    console.log(`${same ? 'copied' : 'COPY MISMATCH'} ${rel}  (${fs.statSync(path.join(MAIN, rel)).size} bytes)`);
    if (!same) bad++;
}
process.exit(bad ? 3 : 0);
