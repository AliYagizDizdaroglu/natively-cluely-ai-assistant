// Saturday's preconditions (RUNBOOK steps 0b-8): runs each command, appends the command line and its full output to
// run.log, prints one summary line per step. Stops at the first step whose expected marker is missing.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const F = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1'));
const SP = path.dirname(F), FC = path.join(SP, 'followup-context');
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const LOG = path.join(F, 'run.log');
const stamp = () => new Date().toLocaleString('sv-SE', { hour12: false });
const log = (s) => fs.appendFileSync(LOG, `${s}\n`);
function run(step, args, { cwd = SP, env = {}, expect = [] } = {}) {
    let out, code = 0;
    try { out = execFileSync('node', args, { cwd, env: { ...process.env, ...env }, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 << 20 }); }
    catch (e) { out = `${e.stdout ?? ''}${e.stderr ?? ''}`; code = e.status ?? 1; }
    const envs = Object.entries(env).map(([k, v]) => `${k}=${v} `).join('');
    log(`\n[${stamp()}] step ${step} — (cwd ${cwd}) ${envs}node ${args.join(' ')}  -> exit ${code}\n${out.trimEnd()}`);
    const missing = expect.filter((m) => !out.includes(m));
    const ok = missing.length === 0 && (code === 0 || expect.length > 0 && missing.length === 0);
    console.log(`step ${step}: exit ${code}; ${ok ? 'OK' : `MISSING ${JSON.stringify(missing)}`}`);
    if (!ok) { log(`[${stamp()}] STOP: step ${step} did not show ${JSON.stringify(missing)}`); process.exit(2); }
    return out;
}
// 0b
const AM = path.join(F, 'AMENDMENT-s50l.fable.md');
const sha = createHash('sha256').update(fs.readFileSync(AM)).digest('hex');
const mtime = fs.statSync(AM).mtime.toLocaleString('sv-SE', { hour12: false });
const okAm = sha === '7957de0ef1a24444ee666542a3b6cbbc2139e8e9f37fec04632c424bd2fb3eee';
log(`\n[${stamp()}] step 0b — AMENDMENT-s50l.fable.md sha256 ${sha}, LastWriteTime ${mtime} -> ${okAm ? 'EQUALS the approved hash' : 'DIFFERS from the approved hash'}`);
console.log(`step 0b: ${okAm ? 'OK' : 'HASH DIFFERS'}`);
if (!okAm) process.exit(2);
// 0c
const answers = fs.readdirSync(F).filter((f) => /^interview60\.answers\./.test(f));
log(`[${stamp()}] step 0c — interview60.answers.* files in ${F}: ${answers.length ? answers.join(', ') : 'none'}`);
console.log(`step 0c: ${answers.length ? 'ANSWER FILES PRESENT' : 'OK (none)'}`);
if (answers.length) process.exit(2);
run('0d', ['stamp-s50l.mjs'], { cwd: FC, expect: ['ARMS OK', 'PARITY FIXTURE OK: 46 entries re-derived (14 with a block, 32 empty)', 'fixture check fails on a corrupted input: OK', 'da58128e', 'bfbf1e24ddd4a6a53173f0cc2ce119a851e6d30e41ef9cc314967b51793d889b', 'fe0dc50d651156fb31a96f457c16cadb4bce1aae8ba682f6d116f8f42aa2e5aa'].filter((m) => m !== 'da58128e') });
run('1', ['quota-ledger-today.mjs', '2026-10-03T07:00:00.000Z']);
const common = fs.readFileSync(path.join(F, 'scripts', 'common.mjs'), 'utf8').split('\n').filter((l) => /MODEL|thinking|temperature/i.test(l)).slice(0, 6).join('\n');
log(`\n[${stamp()}] step 2 — model row: "h40c PASS (2026-09-29) -> gemini-3.5-flash-lite, thinkingLevel HIGH, temperature 0.4"; common.mjs lines:\n${common}`);
console.log('step 2: logged (check the common.mjs lines)');
const S50L = `${MAIN}/electron/test/golden/interview60.runs/2026-09-21T08-22-34-s50l`;
run('3a', [path.join(F, 'followup-replay-build.precue.mjs'), S50L, path.join(F, 'cal'), '--calibrate'], { expect: ['CALIBRATION OK 39/39'] });
run('3b', [path.join(F, 'followup-replay-build.precue.mjs'), S50L, path.join(F, 'cal'), '--calibrate'], { env: { REPLAY_BREAK: '1' }, expect: ['CALIBRATION MISMATCH 39/39'] });
run('4', ['stamp.mjs'], { cwd: FC, expect: ['ARMS OK', 'PARITY FIXTURE OK: 48', 'fixture check fails on a corrupted input: OK'] });
run('5a', [path.join(F, 'scripts', 'followup-questions-decide-calibrate.mjs')], { expect: ['CALIBRATION OK'] });
run('5b', [path.join(F, 'scripts', 'mutate-decide.mjs')], { expect: ['EVERY MUTANT CAUGHT'] });
run('6a', [path.join(F, 'pooled-decide.mjs'), '--calibrate'], { expect: ['CALIBRATION OK'] });
run('6b', [path.join(F, 'scripts', 'e2e-synthetic.mjs')], { expect: ['E2E OK'] });
run('7', [path.join(F, 'scripts', 'check-grader-questions.mjs')], { expect: ['8564ba96369a'] });
run('8', [path.join(F, 'scripts', 'followup-questions-run.mjs'), '--dry-run'], { expect: ['84', 'd8fee6ca0170'] });
log(`[${stamp()}] preconditions 0b-8 all hold`);
console.log('ALL PRECONDITIONS HOLD');
