// Builder B: copy Thursday's bench cue answer files (WT\electron\test\golden\interview60.answers.gemini-3.5-flash-lite_cues-r{1,2,3}.json)
// under the FLIGHT's naming into VH\instruments\twins-bench\, with fs.copyFileSync (never cpSync: the source path holds
// non-ASCII letters), then check every copy byte for byte against its source and print sha256/12 of both. The bench
// calls its rep 1 `_cues-r1`; the flight names rep 1 with no suffix and later reps `-r2`, `-r3`, so the family here is
// `gemini-3.5-flash-lite_cues`: cues-r1 -> <family>.json, cues-r2 -> <family>-r2.json, cues-r3 -> <family>-r3.json.
// Reads two folders and writes three new files in the second; nothing else.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const UE = String.fromCharCode(0xfc);   // the u-umlaut of the folder name, made at run time (no non-ASCII literal, no escape in the source)
const MAIN = path.join(os.homedir(), 'OneDrive', `Masa${UE}st${UE}`, 'natively-cluely-ai-assistant');
const SRC = path.join(MAIN, '.claude', 'worktrees', 'whole-turn', 'electron', 'test', 'golden');
const DEST = path.join(path.dirname(fileURLToPath(import.meta.url)), 'twins-bench');
const FAMILY = 'gemini-3.5-flash-lite_cues';
const sha12 = (buf) => crypto.createHash('sha256').update(buf).digest('hex').slice(0, 12);

fs.mkdirSync(DEST, { recursive: true });
const present = new Set(fs.readdirSync(SRC));
let bad = 0;
for (const [bench, flight] of [[1, `interview60.answers.${FAMILY}.json`], [2, `interview60.answers.${FAMILY}-r2.json`], [3, `interview60.answers.${FAMILY}-r3.json`]]) {
    const srcName = `interview60.answers.gemini-3.5-flash-lite_cues-r${bench}.json`;
    if (!present.has(srcName)) { console.log(`MISSING source ${srcName}`); bad++; continue; }
    // never overwrites: a copy that already exists is only verified against its source
    const existed = fs.existsSync(path.join(DEST, flight));
    if (!existed) fs.copyFileSync(path.join(SRC, srcName), path.join(DEST, flight), fs.constants.COPYFILE_EXCL);
    const a = fs.readFileSync(path.join(SRC, srcName)), b = fs.readFileSync(path.join(DEST, flight));
    const same = a.length === b.length && a.equals(b);
    if (!same) bad++;
    console.log(`${same ? (existed ? 'BYTE-IDENTICAL (copy already present, verified)' : 'BYTE-IDENTICAL') : 'DIFFERENT'}  ${srcName} (${a.length} bytes, sha256/12 ${sha12(a)})  ->  twins-bench/${flight} (${b.length} bytes, sha256/12 ${sha12(b)})`);
}
console.log(bad ? `COPY FAILED (${bad})` : 'COPY OK: three files, byte-checked');
process.exit(bad ? 1 : 0);
