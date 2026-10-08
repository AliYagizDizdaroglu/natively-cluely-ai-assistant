// The day's preconditions 6.1-6.8 (PREREGISTER-turn-followup.md section 6), adapted from followup-questions-s50l/day-pre.mjs: runs each
// command, appends the command line and its full output to run.log, prints one summary line per step, stops at the first step whose
// expected marker is missing OR whose exit code is not what the step expects (0, except the REPLAY_BREAK control, which must fail).
// Nothing here makes a model call (the passes are dry runs). The run.log is R/run.log (TURN_RUNLOG overrides it, tests only).
//
//   node day-pre.mjs --approved <sha256 of the OK'd PREREGISTER-turn-followup.md> [--quota-start <ISO>]
//
// A2 changes: every step that verifies section 2 gets TURN_PREREG = the REGISTERED file, explicitly (the self-tests no longer fall back to a
// copy); the quota day starts at the latest 07:00Z not after now (tonight 2026-10-03T07:00:00.000Z; --quota-start, if given, must equal it: a
// future start reads 0 used); 6.7 computes the headroom per model from the ledger and STOPS below 290 (gemini-3.5-flash-lite) / 98
// (gemini-3.1-flash-lite); 6.4 needs all three per-hour PARITY lines.
// Step 6.1 (the user's explicit OK, quoted with its time) is the controller's: this script logs the file's sha256 + LastWriteTime and
// refuses unless the sha256 equals --approved.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const R = path.dirname(fileURLToPath(import.meta.url));
const FT = path.dirname(R), SP = path.dirname(FT);
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';

export const CAP = 500;                                                       // lite requests per model per quota day (free tier, measured 2026-09-25)
export const NEED = { 'gemini-3.5-flash-lite': 290, 'gemini-3.1-flash-lite': 98 };   // section 6.7: 150 margin + the 140-call front pass; the 48-call back pass + 50 retries
/** The latest 07:00Z (10:00 local) at or before `now` (ms), as an ISO string. */
export function quotaStartFor(now) {
    const d = new Date(now);
    const t = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 7);
    return new Date(t <= now ? t : t - 86400000).toISOString();
}
/**
 * Headroom per model from quota-ledger-today.mjs's output: lite mentions in the app logs (an upper bound) + the records in the answer files the
 * ledger lists (each file counted once however many copies of it exist: dedupe by name + size). `read(path)` returns a file's text.
 */
export function headroomFrom(ledgerText, read, roots = { SP, MAIN, WT: `${MAIN}/.claude/worktrees/whole-turn` }) {
    const used = Object.fromEntries(Object.keys(NEED).map((m) => [m, { log: 0, files: 0 }]));
    for (const line of ledgerText.split('\n')) {
        const lm = /lite mentions (\{.*\})\s*$/.exec(line);
        if (lm) for (const [m, n] of Object.entries(JSON.parse(lm[1]))) if (used[m]) used[m].log += n;
    }
    const seen = new Set();
    for (const line of ledgerText.split('\n')) {
        const fm = /^\s+\S+\s+(\d+)\s+((?:SP|MAIN|WT)\/\S*interview60\.answers\.(gemini-3\.[15]-flash-lite)_\S+\.json)\s*$/.exec(line);
        if (!fm) continue;
        const key = `${path.posix.basename(fm[2])}|${fm[1]}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const abs = fm[2].replace(/^(SP|MAIN|WT)/, (k) => roots[k]);
        let n = 0;
        try { n = Object.keys(JSON.parse(read(abs))).length; } catch { n = 0; }
        if (used[fm[3]]) used[fm[3]].files += n;
    }
    return Object.fromEntries(Object.entries(used).map(([m, u]) => [m, { ...u, used: u.log + u.files, headroom: CAP - u.log - u.files, need: NEED[m], ok: CAP - u.log - u.files >= NEED[m] }]));
}

function main() {
    const LOG = process.env.TURN_RUNLOG ?? path.join(R, 'run.log');
    const argv = process.argv.slice(2);
    const arg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
    const approved = arg('--approved'), quotaArg = arg('--quota-start');
    if (!approved) { console.log('usage: node day-pre.mjs --approved <sha256> [--quota-start <ISO, 07:00Z of the quota day: derived when omitted>]'); process.exit(2); }
    const stamp = () => new Date().toLocaleString('sv-SE', { hour12: false });
    const log = (s) => fs.appendFileSync(LOG, `${s}\n`);
    const PRE = path.join(FT, 'PREREGISTER-turn-followup.md');
    const quotaStart = quotaStartFor(Date.now());
    if (quotaArg && quotaArg !== quotaStart) { console.log(`REFUSED: --quota-start ${quotaArg} is not the current quota day's start ${quotaStart} (a later start reads 0 used); omit the flag`); process.exit(2); }
    /** One step. `code`: the exit code the step must have (0 unless the step is a control that must FAIL: 'nonzero'). */
    function run(step, args, { cwd = FT, env = {}, expect = [], notExpect = [], code: wantCode = 0 } = {}) {
        let out, code = 0;
        const stepEnv = { TURN_PREREG: PRE, ...env };                            // A2 C1: the registered file, explicitly
        try { out = execFileSync('node', args, { cwd, env: { ...process.env, ...stepEnv }, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 << 20 }); }
        catch (e) { out = `${e.stdout ?? ''}${e.stderr ?? ''}`; code = e.status ?? 1; }
        const envs = Object.entries(stepEnv).map(([k, v]) => `${k}=${v} `).join('');
        log(`\n[${stamp()}] step ${step} -- (cwd ${cwd}) ${envs}node ${args.join(' ')}  -> exit ${code}\n${out.trimEnd()}`);
        const missing = expect.filter((m) => !out.includes(m)).concat(notExpect.filter((m) => out.includes(m)).map((m) => `(must not contain) ${m}`));
        if (wantCode === 0 ? code !== 0 : code === 0) missing.push(wantCode === 0 ? `(exit 0 expected, got ${code})` : '(a non-zero exit expected, got 0)');
        const ok = missing.length === 0;
        console.log(`step ${step}: exit ${code}; ${ok ? 'OK' : `MISSING ${JSON.stringify(missing)}`}`);
        if (!ok) { log(`[${stamp()}] STOP: step ${step} did not show ${JSON.stringify(missing)}`); process.exit(2); }
        return out;
    }
    // 6.1
    const sha = createHash('sha256').update(fs.readFileSync(PRE)).digest('hex');
    const mtime = fs.statSync(PRE).mtime.toLocaleString('sv-SE', { hour12: false });
    const equal = sha === approved;
    log(`\n[${stamp()}] step 6.1 -- PREREGISTER-turn-followup.md sha256 ${sha}, LastWriteTime ${mtime} -> ${equal ? 'EQUALS the approved hash' : 'DIFFERS from the approved hash'}`);
    console.log(`step 6.1: ${equal ? 'OK' : 'HASH DIFFERS'}`);
    if (!equal) process.exit(2);
    const answers = fs.readdirSync(R).filter((f) => /^interview60\.answers\./.test(f));
    const stopped = fs.readdirSync(R).filter((f) => /^STOPPED-.+\.txt$/.test(f));
    log(`[${stamp()}] step 6.1 -- interview60.answers.* files in ${R}: ${answers.length ? answers.join(', ') : 'none'}; STOPPED-*.txt markers: ${stopped.length ? stopped.join(', ') : 'none'}; quota day start ${quotaStart}`);
    console.log(`step 6.1 (no answer files, no stop marker): ${answers.length || stopped.length ? 'ANSWER FILES OR A STOP MARKER PRESENT (day-steps.mjs stop-archive moves them out)' : 'OK (none)'}`);
    if (answers.length || stopped.length) process.exit(2);
    // 6.2
    run('6.2', [path.join(FT, 'earlierQuestion.ref.test.mjs')], { expect: ['EARLIER-QUESTION REF TESTS: ', ' passed'], notExpect: ['FAILED'] });
    // 6.3 -- calibration on all three hours, against the pre-cue snapshot
    const BUILD = path.join(SP, 'followup-questions-s50l', 'followup-replay-build.precue.mjs');
    for (const [hour, dir] of [['s50m', '2026-09-22T08-22-50-s50m'], ['s50l', '2026-09-21T08-22-34-s50l'], ['s50k', '2026-09-20T11-22-43-s50k']]) {
        const RUN = `${MAIN}/electron/test/golden/interview60.runs/${dir}`;
        run(`6.3 ${hour}`, [BUILD, RUN, path.join(R, 'cal'), '--calibrate'], { expect: ['CALIBRATION OK 39/39'] });
        run(`6.3 ${hour} REPLAY_BREAK`, [BUILD, RUN, path.join(R, 'cal'), '--calibrate'], { env: { REPLAY_BREAK: '1' }, expect: ['CALIBRATION MISMATCH 39/39'], code: 'nonzero' });
    }
    // 6.4 -- all three per-hour PARITY lines (not any one of them)
    const parity = ['s50m', 's50l', 's50k'].map((h) => `${h}: PARITY FIXTURE OK: 42 entries re-derived (7 with a block = 4 roster + 3 D, 35 empty)`);
    run('6.4', [path.join(FT, 'stamp-turn.mjs')], { expect: ['ARMS OK (primary run, s50m + s50l): 8 roster + 6 D', ...parity, 'fixture check fails on a corrupted input: OK', 'corrupted replaces= refused: OK', 'STAMP OK', 's50m:S2Q09F ->', 's50l:S1Q08 ->', 's50k:S2Q01F ->'] });
    // 6.5
    run('6.5a', [path.join(R, 'legs-decide.mjs'), '--calibrate'], { expect: ['CALIBRATION OK'] });
    run('6.5b', [path.join(R, 'scripts', 'mutate-decide.mjs')], { expect: ['EVERY MUTANT CAUGHT'] });
    run('6.5c', [path.join(R, 'scripts', 'e2e-synthetic.mjs')], { expect: ['E2E OK'] });
    run('6.5d (extra: mock-fetch runner self-test)', [path.join(R, 'scripts', 'runner-selftest.mjs')], { expect: ['RUNNER SELF-TEST OK'] });
    run('6.5e (extra: grader-session instruments)', [path.join(R, 'scripts', 'grader-session-calibrate.mjs')], { expect: ['GRADER-SESSION CALIBRATION OK'] });
    // 6.6
    run('6.6', [path.join(R, 'scripts', 'check-grader-questions.mjs')], { expect: ['instrument 8564ba96369a (pre-registered 8564ba96369a) OK', 'section 2 row OK', 'f8d64670...81cd, 9064 bytes: OK'] });
    // 6.7 -- the quota ledger; the headroom per model is COMPUTED here and stops the run below 290 / 98
    const ledger = run('6.7 (quota ledger)', [path.join(SP, 'quota-ledger-today.mjs'), quotaStart], {});
    const hr = headroomFrom(ledger, (f) => fs.readFileSync(f, 'utf8'));
    for (const [m, h] of Object.entries(hr)) {
        const line = `step 6.7 headroom ${m}: ${CAP} - used ${h.used} (app-log mentions ${h.log} + answer-file records ${h.files}) = ${h.headroom}, needs >= ${h.need}: ${h.ok ? 'OK' : 'SHORT'}`;
        console.log(line); log(`[${stamp()}] ${line}`);
    }
    if (Object.values(hr).some((h) => !h.ok)) { log(`[${stamp()}] STOP: step 6.7 quota headroom below the required 290 / 98`); console.log('STOP: quota headroom below 290 / 98'); process.exit(2); }
    // 6.8
    run('6.8 front', [path.join(R, 'scripts', 'followup-turn-run.mjs'), '--leg', 'front', '--dry-run'], { expect: ['model=gemini-3.5-flash-lite  thinkingLevel=HIGH', '= 140 calls', 'DRY RUN: 140 calls on gemini-3.5-flash-lite HIGH', 'd8fee6ca0170'] });
    run('6.8 back', [path.join(R, 'scripts', 'followup-turn-run.mjs'), '--leg', 'back', '--dry-run'], { expect: ['model=gemini-3.1-flash-lite  thinkingLevel=LOW', '= 48 calls', 'DRY RUN: 48 calls on gemini-3.1-flash-lite LOW', 'd8fee6ca0170'] });
    log(`[${stamp()}] preconditions 6.1-6.8 all hold (6.7: headroom computed above)`);
    console.log('ALL PRECONDITIONS HOLD (6.7 headroom computed above)');
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
