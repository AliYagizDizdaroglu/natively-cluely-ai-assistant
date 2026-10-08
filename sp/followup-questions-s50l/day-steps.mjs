// Runs named RUNBOOK steps, appending each command line and its full output to run.log.
//   node day-steps.mjs blind      -> steps 10 (blind) and 11 (keys out)
//   node day-steps.mjs back       -> step 14a (keys back)
//   node day-steps.mjs decide     -> step 15 (pooled decision + s50l alone, REPORTED ONLY)
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const F = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1'));
const LOG = path.join(F, 'run.log');
const stamp = () => new Date().toLocaleString('sv-SE', { hour12: false });
function run(step, args, saveAs) {
    let out, code = 0;
    try { out = execFileSync('node', args, { cwd: F, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 << 20 }); }
    catch (e) { out = `${e.stdout ?? ''}${e.stderr ?? ''}`; code = e.status ?? 1; }
    fs.appendFileSync(LOG, `\n[${stamp()}] step ${step} — node ${args.join(' ')} -> exit ${code}\n${out.trimEnd()}\n`);
    if (saveAs) fs.writeFileSync(path.join(F, saveAs), out);
    console.log(`step ${step}: exit ${code}\n${out.trimEnd()}`);
    if (code !== 0) process.exit(code);
}
const what = process.argv[2];
if (what === 'blind') { run('10', ['scripts/followup-questions-blind.mjs']); run('11', ['move-keys.mjs', 'out']); }
else if (what === 'back') run('14a', ['move-keys.mjs', 'back']);
else if (what === 'decide') { run('15a', ['pooled-decide.mjs'], 'RESULT-pooled.txt'); run('15b (REPORTED ONLY)', ['scripts/followup-questions-decide.mjs'], 'RESULT-s50l-alone.txt'); }
else { console.log('usage: blind | back | decide'); process.exit(2); }
