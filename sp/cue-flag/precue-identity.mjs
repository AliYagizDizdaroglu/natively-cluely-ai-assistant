// Is the CURRENT typed prompt (MAIN's built dist) byte-identical to the PRE-cue hands-free prompt (dist snapshot
// main-precue-73d7f01)? Prints lengths, sha256/12 and the first differing offset only (no prompt text).
// Calibration: also compares current hands-free (typed + CUE_RULE) against pre-cue, which MUST differ.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const SP = path.dirname(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')));
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const snapRoot = path.join(SP, 'dist-snapshots', 'main-precue-73d7f01');
const find = (root) => {
    const stack = [root];
    while (stack.length) {
        const d = stack.pop();
        for (const e of fs.readdirSync(d, { withFileTypes: true })) {
            const p = path.join(d, e.name);
            if (e.isDirectory()) stack.push(p);
            else if (e.name === 'prompts.js' && p.replace(/\\/g, '/').includes('/llm/')) return p;
        }
    }
    return null;
};
const prePath = find(snapRoot), curPath = path.join(MAIN, 'dist-electron/electron/llm/prompts.js');
console.log('pre-cue prompts.js:', prePath ? path.relative(SP, prePath) : 'NOT FOUND');
if (!prePath) process.exit(2);
const pre = require(prePath), cur = require(curPath);
const h = (s) => crypto.createHash('sha256').update(s).digest('hex').slice(0, 12);
const diffAt = (a, b) => { let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++; return i === a.length && i === b.length ? -1 : i; };
const show = (name, a, b) => console.log(`${name}: len ${a.length} vs ${b.length}, sha ${h(a)} vs ${h(b)}, identical ${a === b}${a === b ? '' : `, first diff at ${diffAt(a, b)}`}`);
const preP = pre.VERBAL_WHAT_TO_ANSWER_PROMPT;
console.log('pre-cue exports CUE_RULE:', 'CUE_RULE' in pre, '| current CUE_RULE sha', h(cur.CUE_RULE));
show('current VERBAL_TYPED_PROMPT vs pre-cue VERBAL_WHAT_TO_ANSWER_PROMPT', cur.VERBAL_TYPED_PROMPT, preP);
show('CALIBRATION current VERBAL_WHAT_TO_ANSWER_PROMPT vs pre-cue (must differ)', cur.VERBAL_WHAT_TO_ANSWER_PROMPT, preP);
if ('VERBAL_TYPED_PROMPT' in pre) show('current VERBAL_TYPED_PROMPT vs pre-cue VERBAL_TYPED_PROMPT', cur.VERBAL_TYPED_PROMPT, pre.VERBAL_TYPED_PROMPT);
// dist freshness: the current dist must carry the current source's CUE_RULE (built from HEAD)
const dm = fs.statSync(curPath).mtime.toISOString();
console.log('current dist prompts.js mtime', dm);
