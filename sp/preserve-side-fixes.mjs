// Copies scratchpad/side-fixes (the landing notes and the five fixes' patches) into MAIN's git-ignored
// .superpowers/side-fixes-2026-10-01/, so the fixes survive a worktree cleanup or a %TEMP% sweep.
// readdirSync + copyFileSync (fs.cpSync exits silently on the Masaüstü path). Refuses to overwrite; verifies every byte.
//   node preserve-side-fixes.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), 'side-fixes');
const DEST = path.join(MAIN, '.superpowers', 'side-fixes-2026-10-01');
if (!fs.existsSync(path.join(MAIN, '.git'))) { console.log('MAIN does not resolve'); process.exit(1); }
if (!fs.existsSync(path.join(MAIN, '.superpowers'))) { console.log('MAIN/.superpowers does not exist'); process.exit(1); }
if (fs.existsSync(DEST)) { console.log(`REFUSED: ${DEST} exists`); process.exit(2); }

const files = [];
const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p);
        else if (e.isFile()) files.push(path.relative(SRC, p));
        else { console.log(`REFUSED: ${p} is neither a file nor a folder`); process.exit(2); }
    }
};
walk(SRC);

let bad = 0, bytes = 0;
for (const rel of files) {
    const to = path.join(DEST, rel);
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(path.join(SRC, rel), to);
    const same = Buffer.compare(fs.readFileSync(path.join(SRC, rel)), fs.readFileSync(to)) === 0;
    if (!same) { console.log(`COPY MISMATCH ${rel}`); bad++; }
    bytes += fs.statSync(to).size;
}
const patches = files.filter((f) => !f.includes(path.sep) && f.endsWith('.patch')).sort();
console.log(`copied ${files.length} files (${bytes} bytes), ${bad} mismatches, to ${DEST}`);
console.log(`top-level patches: ${patches.join(', ')}`);
process.exit(bad ? 3 : 0);
