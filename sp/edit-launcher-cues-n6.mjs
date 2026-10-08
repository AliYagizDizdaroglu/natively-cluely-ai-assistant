// One-off, CRLF-preserving edit of launch-smoke-cues.cmd for re-review N6: the comment names the hedge default, and
// the gate waits for BOTH lites. Refuses unless each old line occurs exactly once; checks CRLF, ASCII and line count.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const file = path.join(path.dirname(fileURLToPath(import.meta.url)), 'launch-smoke-cues.cmd');
const src = fs.readFileSync(file, 'latin1');
const EDITS = [
    ['rem default of this checkout, gemini-3.1-flash-lite LOW, no hedge, no follow-up parent',
     'rem default of this checkout: the verbal hedge, 3.5-lite HIGH first and 3.1-lite LOW after about 5 s, no follow-up parent'],
    ['rem gemini-3.1-flash-lite to answer, retrying every 15 min until the deadline below, and gives up after that.',
     'rem BOTH lites to answer, retrying every 15 min until the deadline below, and gives up after that.'],
    ['%NODE% "%~dp0wait-for-gemini.mjs" --deadline 18:30 --every 15 >> %LOG% 2>&1',
     '%NODE% "%~dp0wait-for-gemini.mjs" --models "gemini-3.1-flash-lite,gemini-3.5-flash-lite" --deadline 18:30 --every 15 >> %LOG% 2>&1'],
];
let out = src;
for (const [from, to] of EDITS) {
    const n = out.split(`${from}\r\n`).length - 1;
    if (n !== 1) { console.log(`REFUSED: "${from.slice(0, 60)}" occurs ${n} times as a whole CRLF line`); process.exit(3); }
    out = out.replace(`${from}\r\n`, () => `${to}\r\n`);
}
const lines = out.split('\n').length - 1, crs = (out.match(/\r/g) ?? []).length;
if (/[^\x00-\x7f]/.test(out) || crs !== lines || lines !== src.split('\n').length - 1) { console.log(`REFUSED: ascii/CRLF/line-count check failed (lines ${lines}, CR ${crs})`); process.exit(3); }
fs.writeFileSync(file, out, 'latin1');
console.log(`edited ${EDITS.length} lines; lines ${lines}, CR ${crs}, ASCII only`);
