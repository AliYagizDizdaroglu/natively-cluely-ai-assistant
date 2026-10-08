// Throwaway: copy the follow-up replay's evidence into MAIN's passes/2026-09-26-followup-replay/ (LF-normalised
// text, never the prompts.*.json files: they carry the app's full system prompt with the resume-derived
// context), and restore PREREGISTER-followup-replay.md to the registered original's bytes. Prints the
// repo-relative paths for the commit, one per line, to SP/replay-evidence-paths.txt.
import fs from 'node:fs';
import path from 'node:path';

const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const REL_DIR = 'electron/test/golden/passes/2026-09-26-followup-replay';
const R = `${SP}/followup-replay`;
const pairs = [];
for (const f of fs.readdirSync(R).filter((f) => /^interview60\.answers\..*\.json$/.test(f) || f === 'RESULT.txt')) pairs.push([`${R}/${f}`, `${REL_DIR}/${f}`]);
for (const f of fs.readdirSync(`${R}/blind`)) pairs.push([`${R}/blind/${f}`, `${REL_DIR}/blind/${f}`]);
for (const f of fs.readdirSync(SP).filter((f) => /^followup-replay-.*\.mjs$/.test(f))) pairs.push([`${SP}/${f}`, `${REL_DIR}/scripts/${f}`]);
if (pairs.some(([s]) => /prompts\./.test(s))) { console.error('REFUSED: a prompts file is in the list'); process.exit(1); }
const out = [];
for (const [src, rel] of pairs) {
    const dst = `${MAIN}/${rel}`;
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    const text = fs.readFileSync(src, 'utf8').replace(/\r\n/g, '\n');
    fs.writeFileSync(dst, text);
    if (fs.readFileSync(dst, 'utf8') !== text) { console.error(`WRITE MISMATCH ${rel}`); process.exit(1); }
    out.push(rel);
}
// The registered original of the pre-registration (mtime 18:28:12 local) replaces the double-encoded copy.
const orig = fs.readFileSync(`${R}/PREREGISTER-followup-replay.md`);
const preRel = 'electron/test/golden/passes/PREREGISTER-followup-replay.md';
if (orig.includes(13)) { console.error('REFUSED: the original has CR bytes'); process.exit(1); }
fs.writeFileSync(`${MAIN}/${preRel}`, orig);
if (!fs.readFileSync(`${MAIN}/${preRel}`).equals(orig)) { console.error('WRITE MISMATCH pre-registration'); process.exit(1); }
out.push(preRel);
fs.writeFileSync(`${SP}/replay-evidence-paths.txt`, out.join('\n') + '\n');
console.log(`${out.length} paths written; pre-registration restored to ${orig.length} bytes (registered original)`);
