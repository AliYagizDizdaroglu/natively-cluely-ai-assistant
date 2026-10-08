// Throwaway (Task 2): rebuild the wired DeepgramStreamingSTT.ts from MAIN's ORIGINAL by applying the brief's
// Step 3 edits straight out of the brief's fenced blocks, then compare with the staged file.
//   node t2-apply-brief.mjs <staged file>
// Also writes the original and the expected text next to this script so `diff -u` can show the change.
// Calibration: the same comparison with edit (c) skipped must say DIFFERENT.
import fs from 'node:fs';
import { createHash } from 'node:crypto';
const SDD = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/boundary-repair/sdd';
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const brief = fs.readFileSync(`${SDD}/task-2-brief.md`, 'utf8');
const blocks = [];
{
    let cur = null;
    for (const ln of brief.split('\n')) {
        if (ln.startsWith('```')) { if (cur === null) cur = []; else { blocks.push(cur.join('\n') + '\n'); cur = null; } }
        else if (cur !== null) cur.push(ln);
    }
}
// blocks: 0 test, 1 import, 2 per-socket const, 3 OLD handler, 4 NEW handler
const [importLine, perSocket, oldHandler, newHandler] = [blocks[1], blocks[2], blocks[3], blocks[4]];
const original = fs.readFileSync(`${MAIN}/electron/audio/DeepgramStreamingSTT.ts`, 'utf8');

const once = (hay, needle, what) => {
    const first = hay.indexOf(needle);
    if (first < 0 || hay.indexOf(needle, first + 1) >= 0) throw new Error(`${what}: anchor found ${first < 0 ? 0 : 'more than 1'} times`);
    return first;
};
function applyBrief({ skipC }) {
    let t = original;
    const a1 = "import { keytermsFor } from './deepgramKeyterms';\n";
    let i = once(t, a1, 'edit (a) anchor') + a1.length;
    t = t.slice(0, i) + importLine + t.slice(i);
    const b1 = '            const stale = (): boolean => this.live !== live;\n';
    i = once(t, b1, 'edit (b) anchor') + b1.length;
    t = t.slice(0, i) + perSocket + t.slice(i);
    if (!skipC) {
        i = once(t, oldHandler, 'edit (c) old block');
        t = t.slice(0, i) + newHandler + t.slice(i + oldHandler.length);
    }
    return t;
}
const sha = (s) => createHash('sha256').update(s).digest('hex').slice(0, 16);
const expected = applyBrief({ skipC: false });
const skipped = applyBrief({ skipC: true });
fs.writeFileSync(`${SDD}/t2-original.ts`, original);
fs.writeFileSync(`${SDD}/t2-expected-from-brief.ts`, expected);
const staged = fs.readFileSync(process.argv[2], 'utf8');
console.log(`original            ${original.length} chars ${sha(original)}`);
console.log(`expected-from-brief ${expected.length} chars ${sha(expected)}`);
console.log(`staged              ${staged.length} chars ${sha(staged)}`);
console.log(`staged vs expected-from-brief:                 ${staged === expected ? 'IDENTICAL' : 'DIFFERENT'}`);
console.log(`calibration, staged vs brief-without-edit-(c): ${staged === skipped ? 'IDENTICAL (BAD: the check cannot fail)' : 'DIFFERENT (good: the check can fail)'}`);
