// Throwaway check (registration section 6.6): the grader question for each frozen item of the primary hours, shown as ids
// and shapes ONLY (m10: no question text, no parent text), the sha256 of h40d's grader dispatch text, and the instrument stamp.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { MAIN, SP, PRIMARY_HOURS, INSTRUMENT, sha, loadGated } from './common.mjs';
import { graderQuestion } from './followup-turn-blind.mjs';
const J = await import(pathToFileURL(path.join(MAIN, 'electron/test/golden/interview60.judge.mjs')).href);
const { G } = await loadGated(PRIMARY_HOURS);
let shapesOk = true;
for (const [key, o] of Object.entries(G)) {
    const q = graderQuestion(o);
    const cut = q.indexOf(' [Follow-up to: ');
    const shape = cut >= 0 ? `follow-up WITH its parent (question ${cut} chars + parent ${q.length - cut - 16} chars)` : 'bare main';
    const wantParent = !!o.chain;
    if ((cut >= 0) !== wantParent) shapesOk = false;
    console.log(`${key.padEnd(11)} ${o.kind.padEnd(8)} chain ${String(o.chain).padEnd(7)} ${shape}`);
}
const dispatch = path.join(SP, 'validation-hour/h40d-grader-dispatch.txt');
console.log(`h40d grader dispatch text: validation-hour/${path.basename(dispatch)} sha256 ${sha(fs.readFileSync(dispatch))} (${fs.statSync(dispatch).size} bytes)`);
const stamp = J.graderPromptVersion();
console.log(`instrument ${stamp} (pre-registered ${INSTRUMENT}) ${stamp === INSTRUMENT && shapesOk ? 'OK' : 'MISMATCH'}`);
process.exitCode = stamp === INSTRUMENT && shapesOk ? 0 : 1;
