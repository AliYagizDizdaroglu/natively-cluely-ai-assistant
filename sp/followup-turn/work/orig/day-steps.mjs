// Runs named steps of the day (PREREGISTER-turn-followup.md section 12.6), appending each command line and its full output to run.log.
//   node day-steps.mjs blind            -> the 9 blind files, then keys OUT (move-keys.mjs out)
//   node day-steps.mjs back             -> keys BACK (after the last verdict exists)
//   node day-steps.mjs decide           -> the pre-registered decision, RESULT-front-back.txt (legs-decide.mjs)
//   node day-steps.mjs decide-rerun     -> the one allowed s50k re-run, pooled (legs-decide.mjs --rerun), RESULT-front-back-rerun.txt
// The grader steps (alias probe, 18 graders, memory check, audit, graders.json) need a live session: they are the controller's.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const R = path.dirname(fileURLToPath(import.meta.url));
const LOG = process.env.TURN_RUNLOG ?? path.join(R, 'run.log');
const stamp = () => new Date().toLocaleString('sv-SE', { hour12: false });
function run(step, args, saveAs) {
    let out, code = 0;
    try { out = execFileSync('node', args, { cwd: R, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 << 20 }); }
    catch (e) { out = `${e.stdout ?? ''}${e.stderr ?? ''}`; code = e.status ?? 1; }
    fs.appendFileSync(LOG, `\n[${stamp()}] step ${step} -- node ${args.join(' ')} -> exit ${code}\n${out.trimEnd()}\n`);
    if (saveAs) fs.writeFileSync(path.join(R, saveAs), out);
    console.log(`step ${step}: exit ${code}\n${out.trimEnd()}`);
    if (code !== 0) process.exit(code);
}
const what = process.argv[2];
if (what === 'blind') { run('blind', ['scripts/followup-turn-blind.mjs']); run('keys out', ['move-keys.mjs', 'out']); }
else if (what === 'back') run('keys back', ['move-keys.mjs', 'back']);
else if (what === 'blind-rerun') { run('blind --rerun', ['scripts/followup-turn-blind.mjs', '--rerun']); run('keys out --rerun', ['move-keys.mjs', 'out', '--rerun']); }
else if (what === 'back-rerun') run('keys back --rerun', ['move-keys.mjs', 'back', '--rerun']);
else if (what === 'decide') run('decide', ['legs-decide.mjs'], 'RESULT-front-back.txt');
else if (what === 'decide-rerun') run('decide --rerun', ['legs-decide.mjs', '--rerun'], 'RESULT-front-back-rerun.txt');
else { console.log('usage: blind | back | decide | blind-rerun | back-rerun | decide-rerun'); process.exit(2); }
