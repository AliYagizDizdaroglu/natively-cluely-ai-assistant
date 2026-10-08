// Throwaway: the user's 2026-09-25 ask — full Flash models, DEFAULT thinking (no thinkingConfig), on the
// h40a questions the app's models failed, tiered by how often they failed. "Our models" = the app's
// Gemini models: 3.1-lite LOW ×3 and 3.5-lite HIGH ×3 (blind h40a grades) plus the live hour's answer,
// 7 verdicts per question. Gemma's grades are not counted (the app never runs it).
//   tier 1  ≥4 of 7 missed   → gemini-3.8-flash
//   tier 2  2–3 of 7 missed  → gemini-3.7-flash
//   tier 3  1 of 7 missed    → gemini-3.6-flash (the next full Flash the key serves)
// Each tier: 3 reps on the hour's captured prompts, through the paced scratchpad runner (thought
// filter, per-call cap, per-model pacing), answers into SP/flash-h40a — never the run folder. The three
// models draw on separate free-tier quotas, so the tiers run in parallel. A smoke call per model first.
//   node flash-h40a-tiers.mjs [--dry]
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const B = `${SP}/gemma-h40a/blind`;
const RD = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs/2026-09-24T08-20-12-h40a';
const OUT = `${SP}/flash-h40a`;
const dry = process.argv.includes('--dry');
const vOf = ({ correctness: c, on_topic: t, delivery: d }) => c === 0 || t === 0 ? 'wrong' : c === 2 && t === 2 && d >= 1 ? 'ok' : 'weak';

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
const P = JSON.parse(fs.readFileSync(`${RD}/interview60.prompts.json`, 'utf8'));
const captured = new Set(Array.isArray(P) ? P.map((p) => p.id) : Object.keys(P));
const tierOf = (m) => (m >= 4 ? 1 : m >= 2 ? 2 : m === 1 ? 3 : 0);
export const TIERS = {
    1: { model: 'gemini-3.8-flash', ids: [] },
    2: { model: 'gemini-3.7-flash', ids: [] },
    3: { model: 'gemini-3.6-flash', ids: [] },
};
const skipped = [];
for (const [id, m] of Object.entries(misses).sort()) {
    const t = tierOf(m);
    if (!t) continue;
    if (!captured.has(id)) { skipped.push(`${id} (${m}/7, no captured prompt)`); continue; }
    TIERS[t].ids.push(id);
}
for (const [t, { model, ids }] of Object.entries(TIERS)) console.log(`tier ${t}  ${model.padEnd(17)} ${ids.map((id) => `${id}(${misses[id]}/7)`).join(' ')}`);
if (skipped.length) console.log(`skipped: ${skipped.join(', ')}`);

// Pacing from the prompt size, as the Gemma sidecar did (free tier: 16,000 input tokens per model per minute).
const entries = Array.isArray(P) ? P : Object.values(P);
const sizes = entries.map((p) => JSON.stringify(p).length).sort((a, b) => a - b);
const estTokens = Math.ceil(sizes[Math.min(sizes.length - 1, Math.floor(sizes.length * 0.9))] / 4);
const gapMs = Math.max(20000, Math.ceil((60000 * estTokens) / 14000));
const REPS = ['def', 'def-r2', 'def-r3'];
const calls = Object.values(TIERS).reduce((a, t) => a + t.ids.length * REPS.length, 0);
console.log(`gap ${gapMs} ms per call per model; ${calls} calls in all; longest tier ≈ ${Math.round((Math.max(...Object.values(TIERS).map((t) => t.ids.length)) * REPS.length * gapMs) / 60000)} min`);
// Imported (the pairs builder wants TIERS): stop here without exiting the importer. Dry: stop here.
const isMain = process.argv[1].replace(/\\/g, '/') === `${SP}/flash-h40a-tiers.mjs`;
if (dry) process.exit(0);
if (isMain) {
fs.mkdirSync(OUT, { recursive: true });
const env = { ...process.env, GEMMA_ARMS_DIR: OUT, NATIVELY_ROSTER: 'holdout40', GEMMA_CALL_TIMEOUT_MS: '180000', GEMMA_MIN_GAP_MS: String(gapMs) };
delete env.NATIVELY_SCENARIOS;
const file = (model, tag) => `${OUT}/interview60.answers.${model}_${tag}.json`;
const run = (model, tag, only) => new Promise((resolve) => {
    const fd = fs.openSync(`${OUT}/${model}.log`, 'a');
    fs.writeSync(fd, `=== ${tag} ${new Date().toTimeString().slice(0, 8)} gap ${gapMs} ms only ${only}\n`);
    // No --thinking: the request carries no thinkingConfig, the model's own default.
    const args = [`${SP}/gemma-answers.mjs`, '--model', model, '--tag', tag, '--captured', `${RD}/interview60.prompts.json`, '--only', only];
    const c = spawn(process.execPath, args, { env, cwd: OUT, stdio: ['ignore', fd, fd] });
    c.on('exit', (code) => { fs.closeSync(fd); resolve(code); });
});
const stamp = () => new Date().toTimeString().slice(0, 8);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const answered = (model, tag) => (fs.existsSync(file(model, tag)) ? JSON.parse(fs.readFileSync(file(model, tag), 'utf8')) : {});
// 2026-09-25 17:02: every tier's smoke died on HTTP 503 "high demand" — a per-model capacity signal that
// outlasts the runner's own 4 tries (~80 s). So: the smoke is retried at 60 s spacing for up to ~20 min,
// and each rep is re-run (the runner resumes per question) until every id has an answer, 4 passes max.
const SMOKE_TRIES = 8, REP_PASSES = 4, WAIT_MS = 60000;
async function tier(t, model, ids) {
    if (!ids.length) return { ok: true, line: `tier ${t} ${model}: nothing to run` };
    let smoke = null;
    for (let a = 1; a <= SMOKE_TRIES; a++) {
        await run(model, 'smoke', ids[0]);
        smoke = answered(model, 'smoke')[ids[0]];
        if (smoke?.spoken) break;
        console.log(`${stamp()} tier ${t} ${model} smoke ${a}/${SMOKE_TRIES}: ${smoke?.transientError ?? 'no answer'}${a < SMOKE_TRIES ? `; again in ${WAIT_MS / 1000} s` : ''}`);
        if (a < SMOKE_TRIES) await sleep(WAIT_MS);
    }
    if (!smoke?.spoken) return { ok: false, line: `tier ${t} ${model}: SMOKE FAILED ${SMOKE_TRIES} times (${smoke?.transientError ?? 'no answer'}) — not run; see ${model}.log` };
    console.log(`${stamp()} tier ${t} ${model} smoke ok: ${ids[0]} ${smoke.words} words, first token ${smoke.ttft} ms, thoughts ${smoke.thoughts}`);
    const lines = [];
    for (const tag of REPS) {
        let none = ids;
        for (let p = 1; p <= REP_PASSES && none.length; p++) {
            if (p > 1) { console.log(`${stamp()} tier ${t} ${model} ${tag}: ${none.length} unanswered (${none.join(',')}); pass ${p} in ${WAIT_MS / 1000} s`); await sleep(WAIT_MS); }
            await run(model, tag, ids.join(','));
            const s = answered(model, tag);
            none = ids.filter((id) => !s[id]?.spoken);
        }
        lines.push(`${tag} ${ids.length - none.length}/${ids.length}${none.length ? ` (none: ${none.join(',')})` : ''}`);
        console.log(`${stamp()} tier ${t} ${model} ${tag}: answered ${ids.length - none.length}/${ids.length}`);
    }
    return { ok: true, line: `tier ${t} ${model}: ${lines.join('; ')}` };
}
console.log(`start ${stamp()}`);
const results = await Promise.all([1, 2, 3].map((t) => tier(t, TIERS[t].model, TIERS[t].ids)));
const final = Object.fromEntries(Object.entries(TIERS).map(([t, { model, ids }]) => [t, { model, ids, ok: results[t - 1].ok }]));
for (const r of results) console.log(r.line);
// The hardest tier's model never came up: run those questions on the next tier's model as a labeled
// stand-in, AFTER the parallel tiers (it shares that model's answer files, which the runner resumes).
if (!results[0].ok && TIERS[1].ids.length) {
    const sub = TIERS[2].model;
    console.log(`${stamp()} tier 1 stand-in: ${sub} on ${TIERS[1].ids.join(',')}`);
    const r = await tier('1-standin', sub, TIERS[1].ids);
    console.log(r.line);
    final[1] = { model: sub, ids: TIERS[1].ids, ok: r.ok, standInFor: TIERS[1].model };
}
fs.writeFileSync(`${OUT}/tiers.json`, JSON.stringify(final, null, 1));
console.log(`TIERS DONE ${stamp()}`);
}
