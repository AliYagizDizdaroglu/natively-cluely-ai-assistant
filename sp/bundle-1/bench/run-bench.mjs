// bench step 4 (SPEC 8 "Arms"/"Total: 252 calls"): the six replay runs, through MAIN's runner as it stands in the bundle worktree (interview60.answers.mjs --captured ... --thinking HIGH).
// THIS CALLS THE GEMINI API (gemini-3.5-flash-lite) when run for real. --plan calls nothing. Reads no key itself: the key reaches the runner through `node --env-file=<MAIN .env>` (the runner
// reads process.env.GEMINI_API_KEY first and never prints it). Order interleaves the arms so quota/time drift hits C and T alike: C1 T1 C2 T2 C3 T3, 42 calls each = 252 (+ the runner's own
// retries of transient 429/5xx, at most 3 per call, normally 0).
//   node run-bench.mjs --plan                 preflight + the six commands, no spawn
//   node run-bench.mjs                        the six runs (resumable: a finished run is skipped, a partial one resumes)
//   node run-bench.mjs --tag b1t2             just one
// The runner writes interview60.answers.gemini-3.5-flash-lite_<tag>.json INTO THE BUNDLE WORKTREE's golden folder; this wrapper moves it to bench/runs/<tag>.json after the run, so the
// worktree is left clean, and refuses to start if a stale file of that name sits there (the runner would silently resume it).
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { BENCH, RUNS_DIR, BUNDLE, GOLDEN_BUNDLE, MAIN, readJson, sha12, loadLive40, expectedIds, bundlePrompts } from './common.mjs';

export const MODEL = 'gemini-3.5-flash-lite', THINKING = 'HIGH';
export const RUNS = [['C', 1], ['T', 1], ['C', 2], ['T', 2], ['C', 3], ['T', 3]].map(([arm, rep]) => ({ arm, rep, tag: `b1${arm.toLowerCase()}${rep}`, captured: path.join(BENCH, 'arms', `captured.${arm}.json`) }));
export const outInGolden = (tag) => path.join(GOLDEN_BUNDLE, `interview60.answers.${MODEL}_${tag}.json`);
export const outInRuns = (tag) => path.join(RUNS_DIR, `${tag}.json`);
/** why a run file is not complete: ids missing a spoken answer, or holding a transient error. [] = complete. Pure. */
export function incomplete(store, ids) {
    return ids.filter((id) => !store?.[id]?.spoken || store[id].transientError);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const argv = process.argv.slice(2);
    const refuse = (m) => { console.log(`REFUSED: ${m}`); process.exit(2); };
    const plan = argv.includes('--plan');
    const only = argv.includes('--tag') ? argv[argv.indexOf('--tag') + 1] : null;
    const CAL = process.env.B1_CAL === '1';
    const script = CAL && process.env.B1_ANSWERS_SCRIPT ? process.env.B1_ANSWERS_SCRIPT : `${GOLDEN_BUNDLE}/interview60.answers.mjs`;
    if (!CAL && process.env.B1_ANSWERS_SCRIPT) refuse('B1_ANSWERS_SCRIPT is a calibration seam; it needs B1_CAL=1');
    const envFile = CAL && process.env.B1_ENV_FILE ? process.env.B1_ENV_FILE : `${MAIN}/.env`;
    const ids = expectedIds(await loadLive40());
    // ---- preflight (no network)
    for (const r of RUNS) if (!fs.existsSync(r.captured)) refuse(`${r.captured} missing: run build-arms.mjs`);
    const manifest = readJson(path.join(BENCH, 'arms', 'manifest.json'));
    if (sha12(fs.readFileSync(RUNS[0].captured)) !== manifest.capturedSha12 || sha12(fs.readFileSync(RUNS[1].captured)) !== manifest.transformedSha12) refuse('an arms file differs from its manifest sha');
    if (!CAL) {
        const P = bundlePrompts();
        if (typeof P.cueRuleApplies !== 'function') refuse('the bundle dist is not the bundle build (no cueRuleApplies)');
        // the T file was built from this dist's constants; a rebuild since then (a different constant) makes T stale: rebuild the arms
        if (sha12(P.SPOKEN_LENGTH_AND_DEPTH) !== manifest.newSpoken.sha12 || sha12(P.VERBAL_TYPED_PROMPT) !== manifest.newTyped || sha12(P.CUE_RULE) !== manifest.cueRule) refuse('the bundle dist constants differ from the arms manifest (SPOKEN_LENGTH_AND_DEPTH / VERBAL_TYPED_PROMPT / CUE_RULE): the dist was rebuilt after build-arms; delete bench/arms and rerun build-arms.mjs');
        const ri = fs.readFileSync(`${BUNDLE}/dist-electron/electron/audio/LiveRouterSession.js`, 'utf8');
        if (!ri.includes('e29bf3810128')) refuse('the bundle dist does not carry router instruction sha e29bf3810128');
        if (!fs.existsSync(envFile)) refuse(`${envFile} not found (the key file; only its path is used)`);
    }
    for (const r of RUNS) if (fs.existsSync(outInGolden(r.tag))) refuse(`a stale ${path.basename(outInGolden(r.tag))} sits in the bundle golden folder: the runner would silently resume it; move it away`);
    const todo = RUNS.filter((r) => !only || r.tag === only);
    if (!todo.length) refuse(`no such tag ${only}`);
    const cmd = (r) => ['--env-file=' + envFile, script, '--model', MODEL, '--thinking', THINKING, '--tag', r.tag, '--captured', r.captured, '--only', ids.join(',')];
    console.log(`bench: ${todo.length} run(s) x ${ids.length} calls = ${todo.length * ids.length} requests to ${MODEL} (thinking ${THINKING}); runner ${path.basename(script)}; key file path only (${path.basename(envFile)})`);
    for (const r of todo) console.log(`  ${r.tag}: arm ${r.arm} rep ${r.rep}  ${fs.existsSync(outInRuns(r.tag)) ? `existing file, missing ${incomplete(readJson(outInRuns(r.tag)), ids).length}` : 'new'}`);
    if (plan) { console.log('PLAN only: nothing spawned'); process.exit(0); }
    fs.mkdirSync(RUNS_DIR, { recursive: true });
    for (const r of todo) {
        const have = fs.existsSync(outInRuns(r.tag)) ? readJson(outInRuns(r.tag)) : null;
        if (have && incomplete(have, ids).length === 0) { console.log(`${r.tag}: complete, skipped`); continue; }
        if (have) fs.copyFileSync(outInRuns(r.tag), outInGolden(r.tag));   // resume
        let left = ids;
        for (let pass = 0; pass < 3 && left.length; pass++) {
            const p = spawnSync(process.execPath, cmd(r), { cwd: BUNDLE, encoding: 'utf8', maxBuffer: 64 << 20, env: { ...process.env, NATIVELY_ROSTER: 'live40' } });
            const store = fs.existsSync(outInGolden(r.tag)) ? readJson(outInGolden(r.tag)) : {};
            left = incomplete(store, ids);
            console.log(`${r.tag}: pass ${pass + 1} exit ${p.status}; ${ids.length - left.length}/${ids.length} answered${left.length ? `; missing ${left.length}` : ''}`);
            if (p.status !== 0 && p.status !== null) { console.log(`${r.tag}: runner exit ${p.status}; stopping (stderr last line: ${(p.stderr || '').trim().split('\n').pop().slice(0, 160)})`); break; }
            // transient entries are re-asked on the next pass: the runner skips only records that hold `spoken`
        }
        if (fs.existsSync(outInGolden(r.tag))) { fs.copyFileSync(outInGolden(r.tag), outInRuns(r.tag)); fs.rmSync(outInGolden(r.tag)); }
        if (left.length) { console.log(`${r.tag}: STILL INCOMPLETE (${left.length}); the chain stops here`); process.exit(1); }
    }
    console.log('bench: all requested runs complete');
}
