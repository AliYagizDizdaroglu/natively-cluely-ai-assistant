// The day's preconditions 6.1-6.8 (PREREGISTER-turn-followup.md section 6), adapted from followup-questions-s50l/day-pre.mjs: runs each
// command, appends the command line and its full output to run.log, prints one summary line per step, stops at the first step whose
// expected marker is missing. Nothing here makes a model call. The run.log is R/run.log (TURN_RUNLOG overrides it, tests only).
//
//   node day-pre.mjs --approved <sha256 of the OK'd PREREGISTER-turn-followup.md> --quota-start 2026-10-04T07:00:00.000Z
//
// Step 6.1 (the user's explicit OK, quoted with its time) is the controller's: this script logs the file's sha256 + LastWriteTime and
// refuses unless the sha256 equals --approved. 6.7 prints the quota ledger's lines for the controller to read against headroom
// >= 290 on gemini-3.5-flash-lite and >= 98 on gemini-3.1-flash-lite (the ledger's output format is not parsed here: GAP, read it).
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const R = path.dirname(fileURLToPath(import.meta.url));
const FT = path.dirname(R), SP = path.dirname(FT);
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const LOG = process.env.TURN_RUNLOG ?? path.join(R, 'run.log');
const argv = process.argv.slice(2);
const arg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
const approved = arg('--approved'), quotaStart = arg('--quota-start');
if (!approved || !quotaStart) { console.log('usage: node day-pre.mjs --approved <sha256> --quota-start <ISO, 10:00 local of the quota day = 07:00Z>'); process.exit(2); }
const stamp = () => new Date().toLocaleString('sv-SE', { hour12: false });
const log = (s) => fs.appendFileSync(LOG, `${s}\n`);
function run(step, args, { cwd = FT, env = {}, expect = [], notExpect = [] } = {}) {
    let out, code = 0;
    try { out = execFileSync('node', args, { cwd, env: { ...process.env, ...env }, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 << 20 }); }
    catch (e) { out = `${e.stdout ?? ''}${e.stderr ?? ''}`; code = e.status ?? 1; }
    const envs = Object.entries(env).map(([k, v]) => `${k}=${v} `).join('');
    log(`\n[${stamp()}] step ${step} -- (cwd ${cwd}) ${envs}node ${args.join(' ')}  -> exit ${code}\n${out.trimEnd()}`);
    const missing = expect.filter((m) => !out.includes(m)).concat(notExpect.filter((m) => out.includes(m)).map((m) => `(must not contain) ${m}`));
    const ok = missing.length === 0 && (code === 0 || expect.length > 0);
    console.log(`step ${step}: exit ${code}; ${ok ? 'OK' : `MISSING ${JSON.stringify(missing)}`}`);
    if (!ok) { log(`[${stamp()}] STOP: step ${step} did not show ${JSON.stringify(missing)}`); process.exit(2); }
    return out;
}
// 6.1
const PRE = path.join(FT, 'PREREGISTER-turn-followup.md');
const sha = createHash('sha256').update(fs.readFileSync(PRE)).digest('hex');
const mtime = fs.statSync(PRE).mtime.toLocaleString('sv-SE', { hour12: false });
const equal = sha === approved;
log(`\n[${stamp()}] step 6.1 -- PREREGISTER-turn-followup.md sha256 ${sha}, LastWriteTime ${mtime} -> ${equal ? 'EQUALS the approved hash' : 'DIFFERS from the approved hash'}`);
console.log(`step 6.1: ${equal ? 'OK' : 'HASH DIFFERS'}`);
if (!equal) process.exit(2);
const answers = fs.readdirSync(R).filter((f) => /^interview60\.answers\./.test(f));
log(`[${stamp()}] step 6.1 -- interview60.answers.* files in ${R}: ${answers.length ? answers.join(', ') : 'none'}`);
console.log(`step 6.1 (no answer files): ${answers.length ? 'ANSWER FILES PRESENT' : 'OK (none)'}`);
if (answers.length) process.exit(2);
// 6.2
run('6.2', [path.join(FT, 'earlierQuestion.ref.test.mjs')], { expect: ['EARLIER-QUESTION REF TESTS: ', ' passed'], notExpect: ['FAILED'] });
// 6.3 -- calibration on all three hours, against the pre-cue snapshot
const BUILD = path.join(SP, 'followup-questions-s50l', 'followup-replay-build.precue.mjs');
for (const [hour, dir] of [['s50m', '2026-09-22T08-22-50-s50m'], ['s50l', '2026-09-21T08-22-34-s50l'], ['s50k', '2026-09-20T11-22-43-s50k']]) {
    const RUN = `${MAIN}/electron/test/golden/interview60.runs/${dir}`;
    run(`6.3 ${hour}`, [BUILD, RUN, path.join(R, 'cal'), '--calibrate'], { expect: ['CALIBRATION OK 39/39'] });
    run(`6.3 ${hour} REPLAY_BREAK`, [BUILD, RUN, path.join(R, 'cal'), '--calibrate'], { env: { REPLAY_BREAK: '1' }, expect: ['CALIBRATION MISMATCH 39/39'] });
}
// 6.4
run('6.4', [path.join(FT, 'stamp-turn.mjs')], { expect: ['ARMS OK (primary run, s50m + s50l): 8 roster + 6 D', 'PARITY FIXTURE OK: 42 entries re-derived (7 with a block = 4 roster + 3 D, 35 empty)', 'fixture check fails on a corrupted input: OK', 'corrupted replaces= refused: OK', 'STAMP OK', 's50m:S2Q09F ->', 's50l:S1Q08 ->', 's50k:S2Q01F ->'] });
// 6.5
run('6.5a', [path.join(R, 'legs-decide.mjs'), '--calibrate'], { expect: ['CALIBRATION OK'] });
run('6.5b', [path.join(R, 'scripts', 'mutate-decide.mjs')], { expect: ['EVERY MUTANT CAUGHT'] });
run('6.5c', [path.join(R, 'scripts', 'e2e-synthetic.mjs')], { expect: ['E2E OK'] });
run('6.5d (extra: mock-fetch runner self-test)', [path.join(R, 'scripts', 'runner-selftest.mjs')], { expect: ['RUNNER SELF-TEST OK'] });
run('6.5e (extra: grader-session instruments)', [path.join(R, 'scripts', 'grader-session-calibrate.mjs')], { expect: ['GRADER-SESSION CALIBRATION OK'] });
// 6.6
run('6.6', [path.join(R, 'scripts', 'check-grader-questions.mjs')], { expect: ['8564ba96369a', 'OK'] });
// 6.7 -- the quota ledger, read by the controller
const ledger = run('6.7 (READ the headroom lines yourself)', [path.join(SP, 'quota-ledger-today.mjs'), quotaStart], {});
console.log(ledger.split('\n').filter((l) => /headroom|lite/i.test(l)).slice(0, 12).join('\n'));
// 6.8
run('6.8 front', [path.join(R, 'scripts', 'followup-turn-run.mjs'), '--leg', 'front', '--dry-run'], { expect: ['model=gemini-3.5-flash-lite  thinkingLevel=HIGH', '= 140 calls', 'DRY RUN: 140 calls on gemini-3.5-flash-lite HIGH', 'd8fee6ca0170'] });
run('6.8 back', [path.join(R, 'scripts', 'followup-turn-run.mjs'), '--leg', 'back', '--dry-run'], { expect: ['model=gemini-3.1-flash-lite  thinkingLevel=LOW', '= 48 calls', 'DRY RUN: 48 calls on gemini-3.1-flash-lite LOW', 'd8fee6ca0170'] });
log(`[${stamp()}] preconditions 6.1-6.8 all hold (6.7: the quota headroom line is read by the controller)`);
console.log('ALL PRECONDITIONS HOLD (read the 6.7 headroom lines)');
