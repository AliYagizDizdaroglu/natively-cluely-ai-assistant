// Copies one scratchpad folder into MAIN's git-ignored .superpowers/<dest>/, so it survives a %TEMP% sweep.
// readdirSync + copyFileSync (fs.cpSync exits silently on the Masaüstü path). Refuses to overwrite; verifies every byte.
//   node preserve-folder.mjs <scratchpad folder> <dest folder name under MAIN/.superpowers>
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const [srcName, destName] = process.argv.slice(2);
if (!srcName || !destName || /[\\/]|\.\./.test(srcName + destName)) { console.log('usage: node preserve-folder.mjs <folder> <dest name> (plain names)'); process.exit(1); }
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), srcName);
const DEST = path.join(MAIN, '.superpowers', destName);
if (!fs.existsSync(path.join(MAIN, '.git'))) { console.log('MAIN does not resolve'); process.exit(1); }
if (!fs.existsSync(path.join(MAIN, '.superpowers'))) { console.log('MAIN/.superpowers does not exist'); process.exit(1); }
if (!fs.existsSync(SRC) || !fs.statSync(SRC).isDirectory()) { console.log(`REFUSED: ${SRC} is not a folder`); process.exit(2); }
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
    if (Buffer.compare(fs.readFileSync(path.join(SRC, rel)), fs.readFileSync(to)) !== 0) { console.log(`COPY MISMATCH ${rel}`); bad++; }
    bytes += fs.statSync(to).size;
}
console.log(`copied ${files.length} files (${bytes} bytes), ${bad} mismatches, to ${DEST}`);
process.exit(bad ? 3 : 0);
