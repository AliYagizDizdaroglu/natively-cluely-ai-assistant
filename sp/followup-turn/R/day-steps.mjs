// Runs named steps of the day (PREREGISTER-turn-followup.md section 12.6), appending each command line and its full output to run.log.
//   node day-steps.mjs blind            -> the 9 blind files, then keys OUT (move-keys.mjs out)
//   node day-steps.mjs back             -> keys BACK (after the last verdict exists)
//   node day-steps.mjs decide           -> the pre-registered decision, RESULT-front-back.txt (legs-decide.mjs)
//   node day-steps.mjs decide-rerun     -> the one allowed s50k re-run, pooled (legs-decide.mjs --rerun), RESULT-front-back-rerun.txt
//   node day-steps.mjs stop-archive     -> A1.7 / A2 point 3: after a pass hit the hard stop (or an incomplete pass is abandoned), moves every
//                                          interview60.answers.*_fturn-* file, R/STOPPED-*.txt and the saved pass stdout (R/pass-*.txt|log) into
//                                          R/stopped-<YYYYMMDD-HHMM>/, so R holds no answer file again (precondition 6.1) before the fresh passes
// The grader steps (alias probe, 18 graders, memory check, audit, graders.json) need a live session: they are the controller's.
//
// `decide` and `decide-rerun` first list R/ and R/scripts/ against section 2 of the registered file and REFUSE (exit 3, no legs-decide run, no
// VOID, nothing saved) when a *.mjs is there that the table does not list: a stray file would turn the decision into an irreversible VOID (A2 M4).
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
const R = path.dirname(fileURLToPath(import.meta.url));
const LOG = process.env.TURN_RUNLOG ?? path.join(R, 'run.log');
const stamp = () => new Date().toLocaleString('sv-SE', { hour12: false });
function run(step, args, saveAs) {
    let out, code = 0;
    try { out = execFileSync('node', args, { cwd: R, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 << 20 }); }
    catch (e) { out = `${e.stdout ?? ''}${e.stderr ?? ''}`; code = e.status ?? 1; }
    fs.appendFileSync(LOG, `\n[${stamp()}] step ${step} -- node ${args.join(' ')} -> exit ${code}\n${out.trimEnd()}\n`);
    if (saveAs) {
        // A2 M5: a result file that already holds a DECISION line is never overwritten (a later INCIDENT / refusal goes beside it)
        const target = path.join(R, saveAs);
        const holds = fs.existsSync(target) && /^DECISION:/m.test(fs.readFileSync(target, 'utf8'));
        const dest = holds ? target.replace(/\.txt$/, `.again-${stamp().replace(/[: ]/g, '')}.txt`) : target;
        fs.writeFileSync(dest, out);
        if (holds) fs.appendFileSync(LOG, `[${stamp()}] ${saveAs} already holds a DECISION line: this output was saved to ${path.basename(dest)} instead\n`);
    }
    console.log(`step ${step}: exit ${code}\n${out.trimEnd()}`);
    if (code !== 0) process.exit(code);
}
/** Refuses (exit 3) before a decision runs when a script under R/ or R/scripts/ is not listed in section 2 of the registered file. */
async function refuseOnUnlisted(step) {
    let un;
    try { un = (await import(pathToFileURL(path.join(R, 'scripts', 'common.mjs')).href)).unlistedScripts(); } catch (e) { un = [`(section 2 unreadable: ${e.message})`]; }
    if (!un.length) return;
    const line = `[${stamp()}] step ${step} REFUSED: not listed in section 2 of the registered file: ${un.join(', ')} -- the decision is not run, VOID is not printed, nothing is saved`;
    fs.appendFileSync(LOG, `\n${line}\n`);
    console.log(line.slice(line.indexOf('step')));
    process.exit(3);
}
const what = process.argv[2];
if (what === 'blind') { run('blind', ['scripts/followup-turn-blind.mjs']); run('keys out', ['move-keys.mjs', 'out']); }
else if (what === 'back') run('keys back', ['move-keys.mjs', 'back']);
else if (what === 'blind-rerun') { run('blind --rerun', ['scripts/followup-turn-blind.mjs', '--rerun']); run('keys out --rerun', ['move-keys.mjs', 'out', '--rerun']); }
else if (what === 'back-rerun') run('keys back --rerun', ['move-keys.mjs', 'back', '--rerun']);
else if (what === 'decide') { await refuseOnUnlisted('decide'); run('decide', ['legs-decide.mjs'], 'RESULT-front-back.txt'); }
else if (what === 'decide-rerun') { await refuseOnUnlisted('decide --rerun'); run('decide --rerun', ['legs-decide.mjs', '--rerun'], 'RESULT-front-back-rerun.txt'); }
else if (what === 'stop-archive') {
    const moving = fs.readdirSync(R).filter((f) => /^interview60\.answers\..*_fturn-/.test(f) || /^STOPPED-.+\.txt$/.test(f) || /^pass-.*\.(?:txt|log)$/.test(f));
    if (!moving.length) { console.log('stop-archive: nothing to archive (no answer file, no STOPPED marker, no pass stdout in R)'); process.exit(2); }
    const d = new Date();
    const p2 = (n) => String(n).padStart(2, '0');
    const dir = path.join(R, `stopped-${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}-${p2(d.getHours())}${p2(d.getMinutes())}`);
    if (fs.existsSync(dir)) { console.log(`stop-archive: ${dir} already exists; wait a minute or move it first`); process.exit(2); }
    fs.mkdirSync(dir);
    for (const f of moving) fs.renameSync(path.join(R, f), path.join(dir, f));
    const line = `[${stamp()}] step stop-archive -- moved ${moving.length} file(s) to ${path.basename(dir)}/: ${moving.join(', ')}`;
    fs.appendFileSync(LOG, `\n${line}\n`);
    console.log(line.slice(line.indexOf('step')));
} else { console.log('usage: blind | back | decide | blind-rerun | back-rerun | decide-rerun | stop-archive'); process.exit(2); }
