// Throwaway: the 2026-09-26 h40b SIDECAR — full-size Gemini Flash models, DEFAULT thinking (no
// thinkingConfig), replayed on the h40b run folder's captured prompts. Tier derivation is VERBATIM from
// flash-h40a-tiers.mjs (misses from h40a's blind verdicts + h40a-verdicts-inapp.json; R09 has no captured
// prompt in h40a and is skipped) — which questions get which Flash model is FIXED from h40a's own miss
// evidence, never recomputed from h40b. A fourth key, 3b, reruns tier 3's questions on a second full
// Flash model (gemini-3.5-flash) for comparison — same ids, one rep, a distinct daily quota.
// Hard free-tier cap measured today (2026-09-25): HTTP 429 GenerateRequestsPerDayPerProjectPerModel-
// FreeTier, value 20 requests/model/day. Budget 18/model, leaving 2 of the 20 for the runner's own
// stream-cut re-ask. GEMMA_MAX_TRIES is set to 1: a 429/503 is recorded once, never retried by the
// runner itself — the sidecar's own per-tier pass loop below is the retry, paced 60 s apart.
//   node flash-h40b-sidecar.mjs [--plan] [--dry]
//   --plan: print the tiers (from h40a evidence) and the per-model request count against budget; exit 0.
//           Needs no h40b run folder — this is the only mode that works before the flight.
//   --dry: run everything up to spawning the runner (find the run folder, compute capturedIds, the
//          per-tier captured/skipped ids, the pacing gap) and print the exact args it would spawn; exit
//          0. Still requires an h40b run folder to exist — NOT READY (exit 2) without one, same gate a
//          real run hits.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const B = `${SP}/gemma-h40a/blind`;
const RD = `${MAIN}/electron/test/golden/interview60.runs/2026-09-24T08-20-12-h40a`;   // h40a: fixed evidence for the tier derivation, never the h40b run
const OUT = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/sdd/2026-09-25-flight-h40b/rr-task4-fix2/sidecar-out';
// GEMMA_RUNNER_PATH: which runner file to guard-check and spawn. Override exists ONLY to prove the
// I4 guard below against a broken copy without touching the real runner; unset in every normal use.
// Resolved to an absolute path ONCE (fix round 2, M5): the guard reads it in this process (cwd = wherever
// the sidecar was invoked from) but run()'s spawn uses `cwd: OUT` — a relative override would resolve
// against two different directories and could let the guard vouch for a file that isn't what gets spawned.
const RUNNER = path.resolve(process.env.GEMMA_RUNNER_PATH ?? `${SP}/gemma-answers.mjs`);
const plan = process.argv.includes('--plan');
const dry = process.argv.includes('--dry');
const vOf = ({ correctness: c, on_topic: t, delivery: d }) => c === 0 || t === 0 ? 'wrong' : c === 2 && t === 2 && d >= 1 ? 'ok' : 'weak';

// ── Tier derivation (verbatim from flash-h40a-tiers.mjs): fixed from h40a's own evidence ─────────────
// Misses per question from the app's models only.
const misses = {};
for (const f of fs.readdirSync(B).filter((x) => /^key\.blind-\d+\.json$/.test(x))) {
    const n = f.match(/\d+/)[0], K = JSON.parse(fs.readFileSync(`${B}/${f}`, 'utf8')), V = JSON.parse(fs.readFileSync(`${B}/verdicts.blind-${n}.json`, 'utf8'));
    for (const [k, { arm, id }] of Object.entries(K)) {
        if (!/^3\.[15]-lite/.test(arm)) continue;
        misses[id] ??= 0;
        if (vOf(V[k]) !== 'ok') misses[id]++;
    }
}
const inV = JSON.parse(fs.readFileSync(`${SP}/h40a-verdicts-inapp.json`, 'utf8'));
for (const [id, v] of Object.entries(inV)) { misses[id] ??= 0; if (vOf(v) !== 'ok') misses[id]++; }
const P0 = JSON.parse(fs.readFileSync(`${RD}/interview60.prompts.json`, 'utf8'));
const capturedH40a = new Set(Array.isArray(P0) ? P0.map((p) => p.id) : Object.keys(P0));
const tierOf = (m) => (m >= 4 ? 1 : m >= 2 ? 2 : m === 1 ? 3 : 0);
const TIERS = {
    1: { model: 'gemini-3.8-flash', ids: [] },
    2: { model: 'gemini-3.7-flash', ids: [] },
    3: { model: 'gemini-3.6-flash', ids: [] },
};
const skipped0 = [];
for (const [id, m] of Object.entries(misses).sort()) {
    const t = tierOf(m);
    if (!t) continue;
    if (!capturedH40a.has(id)) { skipped0.push(`${id} (${m}/7, no captured prompt)`); continue; }
    TIERS[t].ids.push(id);
}
for (const [t, { model, ids }] of Object.entries(TIERS)) console.log(`tier ${t}  ${model.padEnd(17)} ${ids.map((id) => `${id}(${misses[id]}/7)`).join(' ')}`);
if (skipped0.length) console.log(`skipped (h40a evidence): ${skipped0.join(', ')}`);

// ── The h40b plan: tier 3b reruns tier 3's questions on a second full-Flash model ──────────────────
const PLAN = {                                             // 20 requests per model per day (2026-09-25)
    '1':  { model: 'gemini-3.8-flash', ids: TIERS[1].ids, reps: ['def', 'def-r2', 'def-r3'] },
    '2':  { model: 'gemini-3.7-flash', ids: TIERS[2].ids, reps: ['def', 'def-r2', 'def-r3'] },
    '3':  { model: 'gemini-3.6-flash', ids: TIERS[3].ids, reps: ['def'] },
    '3b': { model: 'gemini-3.5-flash', ids: TIERS[3].ids, reps: ['def'] },
};
const BUDGET = 18;   // HTTP requests per model today, leaving 2 of the 20 for the runner's own stream-cut re-ask
console.log(`\nplan (budget ${BUDGET}/model/day):`);
let overBudget = false;
for (const [t, { model, ids, reps }] of Object.entries(PLAN)) {
    const requests = ids.length * reps.length;   // computed from the tiers, never typed in
    if (requests > BUDGET) overBudget = true;
    console.log(`  tier ${t.padEnd(2)} ${model.padEnd(17)} ${ids.length} ids x ${reps.length} rep${reps.length > 1 ? 's' : ''} = ${requests} requests (budget ${BUDGET})`);
}
if (overBudget) { console.log('REFUSED: a tier exceeds its daily budget'); process.exit(2); }
if (plan) process.exit(0);

// The whole budget above rests on the runner honoring GEMMA_MAX_TRIES (it is what makes a 429/503
// cost exactly 1 request instead of up to 4). That change lives only in this generated scratchpad
// copy, not in gemma-answers-gen.mjs, so a regeneration would silently drop it. This is a property of
// the TOOLING, independent of whether the h40b run folder exists yet, so it is checked before the
// readiness gate below (and so a `--dry` the moment the runner is (re)built catches it without waiting
// on the flight): refuse rather than spend quota on an assumption nothing checks (rule 11). Checks for
// the literal READ expression, not the bare token (fix round 2, M4) — a comment or a header sentence
// that merely names GEMMA_MAX_TRIES (as this file's own header does) must not satisfy the guard; only
// the runner's code actually reading `process.env.GEMMA_MAX_TRIES` does.
if (!fs.readFileSync(RUNNER, 'utf8').includes('process.env.GEMMA_MAX_TRIES')) {
    console.log(`RUNNER LACKS GEMMA_MAX_TRIES: ${RUNNER} — regenerate or re-apply the one-try limit`);
    process.exit(3);
}

// ── Readiness: the h40b run folder (both files written when the hour ends) ────────────────────────
const RUNS = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/sdd/2026-09-25-flight-h40b/rr-task4-fix2/runs';
const h40bDir = fs.readdirSync(RUNS).filter((x) => /-h40b$/.test(x)).sort().pop();
if (!h40bDir) { console.log('NOT READY: no *-h40b run folder yet'); process.exit(2); }
const runDir = `${RUNS}/${h40bDir}`;
for (const f of ['interview60.prompts.json', 'interview60.timeline.json']) if (!fs.existsSync(`${runDir}/${f}`)) { console.log(`NOT READY: ${f} missing`); process.exit(2); }

const promptsPath = `${runDir}/interview60.prompts.json`;
const Ph = JSON.parse(fs.readFileSync(promptsPath, 'utf8'));
const entriesH = Array.isArray(Ph) ? Ph.map((p) => [p.id, p]) : Object.entries(Ph);
const capturedIds = new Set(entriesH.map(([id]) => id));

// Pacing from the prompt size (free tier: 16,000 input tokens per model per minute; floor 20 s — same
// method as flash-h40a-tiers.mjs / gemma-h40a-sidecar.mjs).
const sizes = entriesH.map(([, p]) => JSON.stringify(p).length).sort((a, b) => a - b);
const estTokens = Math.ceil(sizes[Math.min(sizes.length - 1, Math.floor(sizes.length * 0.9))] / 4);
const gapMs = Math.max(20000, Math.ceil((60000 * estTokens) / 14000));

fs.mkdirSync(OUT, { recursive: true });
const env = { ...process.env, GEMMA_ARMS_DIR: OUT, NATIVELY_ROSTER: 'holdout40', GEMMA_CALL_TIMEOUT_MS: '180000', GEMMA_MIN_GAP_MS: String(gapMs), GEMMA_MAX_TRIES: '1' };
delete env.NATIVELY_SCENARIOS;
const file = (model, tag) => `${OUT}/interview60.answers.${model}_${tag}.json`;
const run = (model, tag, only) => new Promise((resolve) => {
    const fd = fs.openSync(`${OUT}/${model}.log`, 'a');
    fs.writeSync(fd, `=== ${tag} ${new Date().toTimeString().slice(0, 8)} gap ${gapMs} ms only ${only}\n`);
    // No --thinking: the request carries no thinkingConfig, the model's own default.
    const args = [RUNNER, '--model', model, '--tag', tag, '--captured', promptsPath, '--only', only];
    const c = spawn(process.execPath, args, { env, cwd: OUT, stdio: ['ignore', fd, fd] });
    c.on('exit', (code) => { fs.closeSync(fd); resolve(code); });
});
const stamp = () => new Date().toTimeString().slice(0, 8);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const answered = (model, tag) => (fs.existsSync(file(model, tag)) ? JSON.parse(fs.readFileSync(file(model, tag), 'utf8')) : {});

async function tier(t, { model, ids, reps }) {
    let used = 0;
    const captured = ids.filter((id) => capturedIds.has(id));   // the hour may not have captured every tier id
    for (const tag of reps) {
        let todo = captured;
        for (let pass = 1; todo.length && used + todo.length <= BUDGET; pass++) {
            if (pass > 1) await sleep(60000);
            await run(model, tag, todo.join(','));
            used += todo.length;
            const s = answered(model, tag);
            used += todo.filter((id) => s[id]?.cutRetried).length;
            todo = todo.filter((id) => !s[id]?.spoken);
        }
        console.log(`${stamp()} tier ${t} ${model} ${tag}: ${captured.length - todo.length}/${captured.length} answered, ${used}/${BUDGET} requests used${todo.length ? ` (unanswered: ${todo.join(',')})` : ''}`);
    }
    return { model, ids: captured, skipped: ids.filter((id) => !capturedIds.has(id)), requests: used };
}

if (dry) {
    console.log(`\n[dry] run folder ${h40bDir}; ${capturedIds.size} captured prompts; call gap ${gapMs} ms`);
    for (const [t, { model, ids, reps }] of Object.entries(PLAN)) {
        const captured = ids.filter((id) => capturedIds.has(id));
        const skipped = ids.filter((id) => !capturedIds.has(id));
        for (const tag of reps) {
            const args = [RUNNER, '--model', model, '--tag', tag, '--captured', promptsPath, '--only', captured.join(',')];
            console.log(`[dry] tier ${t} ${tag}: spawn ${process.execPath} ${args.map((a) => (/[ ,]/.test(a) ? `"${a}"` : a)).join(' ')}`);
        }
        if (skipped.length) console.log(`[dry] tier ${t}: skipped (not captured this run): ${skipped.join(',')}`);
    }
    console.log(`[dry] env: GEMMA_ARMS_DIR=${OUT} NATIVELY_ROSTER=holdout40 GEMMA_CALL_TIMEOUT_MS=180000 GEMMA_MIN_GAP_MS=${gapMs} GEMMA_MAX_TRIES=1`);
    process.exit(0);
}

console.log(`start ${stamp()}`);
// Tiers 1, 2, 3 draw on separate models (separate free-tier quotas), so they run in parallel; 3b shares
// tier 3's questions on a fourth model and runs after, so the console stays readable (it could run
// alongside the others too — a distinct model again — but nothing depends on that).
const [r1, r2, r3] = await Promise.all(['1', '2', '3'].map((t) => tier(t, PLAN[t])));
const final = { 1: r1, 2: r2, 3: r3 };
final['3b'] = await tier('3b', PLAN['3b']);
fs.writeFileSync(`${OUT}/tiers.json`, JSON.stringify(final, null, 1));
console.log(`TIERS DONE ${stamp()}`);
