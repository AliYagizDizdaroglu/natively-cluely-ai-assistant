// Snapshot a checkout's dist-electron folder into the scratchpad BEFORE a rebuild, byte-verified, so a later replay
// calibration can import the exact pre-rebuild build (the follow-up replay's §6.2 needs the pre-cue dist
// d8fee6ca0170 after cue mode is merged into MAIN). readdirSync + copyFileSync (fs.cpSync fails silently on the
// non-ASCII MAIN path). Refuses to overwrite an existing destination.
//   node snapshot-dist.mjs <checkout root> <destination folder>
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
const [root, dest] = process.argv.slice(2);
if (!root || !dest) { console.log('usage: snapshot-dist.mjs <checkout root> <destination>'); process.exit(2); }
const src = path.join(root, 'dist-electron');
if (!fs.existsSync(src)) { console.log(`no dist-electron under ${root}`); process.exit(2); }
if (fs.existsSync(dest)) { console.log(`REFUSED: ${dest} exists`); process.exit(2); }
let files = 0, bytes = 0;
const copy = (from, to) => {
    fs.mkdirSync(to, { recursive: true });
    for (const e of fs.readdirSync(from, { withFileTypes: true })) {
        const a = path.join(from, e.name), b = path.join(to, e.name);
        if (e.isDirectory()) { copy(a, b); continue; }
        const buf = fs.readFileSync(a);
        fs.writeFileSync(b, buf);
        if (Buffer.compare(buf, fs.readFileSync(b)) !== 0) { console.log(`COPY MISMATCH ${a}`); process.exit(3); }
        files++; bytes += buf.length;
    }
};
copy(src, path.join(dest, 'dist-electron'));
const filter = path.join(dest, 'dist-electron', 'electron', 'llm', 'verbalStreamFilter.js');
const sha = fs.existsSync(filter) ? createHash('sha256').update(fs.readFileSync(filter)).digest('hex').slice(0, 12) : 'absent';
fs.writeFileSync(path.join(dest, 'SNAPSHOT.txt'), `source ${src}\ntaken ${new Date().toISOString()}\nfiles ${files} bytes ${bytes}\nverbalStreamFilter.js sha256/12 ${sha}\n`);
console.log(`snapshot ${files} files, ${bytes} bytes -> ${dest}; verbalStreamFilter.js sha256/12 ${sha}`);
