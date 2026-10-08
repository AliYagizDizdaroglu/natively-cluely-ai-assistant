// Throwaway check (registration section 6.6): the grader question for each frozen item of the primary hours, shown as ids
// and shapes ONLY (m10: no question text, no parent text), the sha256 of h40d's grader dispatch text, and the instrument stamp.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { MAIN, SP, PREREG, PRIMARY_HOURS, INSTRUMENT, sha, loadGated, parseSection2, JUDGE_REL, DISPATCH_REL, DISPATCH_SHA, DISPATCH_BYTES } from './common.mjs';
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
// A2 point 6 (M1): the judge module (questionForGrader, verdictOf, the instrument stamp) and the dispatch text are pinned by their section 2 rows
const rows = parseSection2(fs.readFileSync(PREREG, 'utf8')).files;
const judgeSha = sha(fs.readFileSync(path.join(MAIN, JUDGE_REL.slice(5))));
const dispBuf = fs.readFileSync(dispatch);
const judgeRow = rows.get(JUDGE_REL), dispRow = rows.get(DISPATCH_REL);
const judgeOk = !!judgeRow && judgeRow.sha === judgeSha;
const dispOk = !!dispRow && dispRow.sha === sha(dispBuf) && sha(dispBuf) === DISPATCH_SHA && dispRow.bytes === dispBuf.length && dispBuf.length === DISPATCH_BYTES;
console.log(`interview60.judge.mjs sha256 ${judgeSha.slice(0, 12)}...: section 2 row ${judgeOk ? 'OK' : 'MISMATCH (or missing)'}`);
console.log(`h40d-grader-dispatch.txt sha256 ${sha(dispBuf).slice(0, 12)}...: section 2 row and the pinned f8d64670...81cd, 9064 bytes: ${dispOk ? 'OK' : 'MISMATCH (or missing)'}`);
const stamp = J.graderPromptVersion();
const allOk = stamp === INSTRUMENT && shapesOk && judgeOk && dispOk;
console.log(`instrument ${stamp} (pre-registered ${INSTRUMENT}) ${allOk ? 'OK' : 'MISMATCH'}`);
process.exitCode = allOk ? 0 : 1;
