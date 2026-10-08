// Throwaway: the 2026-09-24 h40a SIDECAR arm — Gemma 4 26B at MINIMAL (level chosen on s50m, never on
// the holdout) answering the flight's own captured holdout40 prompts, 3 reps, beside the flight and
// never inside it: nothing is written into the run folder, so the pass record and the flight's arms
// are exactly the shipped baseline. Runs tonight's paced runner (gemma-answers.mjs: thought filter,
// 180 s per-call cap, empty-cut retry) from the scratchpad as cwd.
//   node gemma-h40a-sidecar.mjs [--dry] [--run <run-dir>]
//   --dry: check readiness and print the plan, make no calls. --run: a run folder other than the newest *-h40a.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const RUNS = `${MAIN}/electron/test/golden/interview60.runs`;
const OUT = `${SP}/gemma-h40a`;
const MODEL = 'gemma-4-26b-a4b-it';
const dry = process.argv.includes('--dry');
const ri = process.argv.indexOf('--run');

const runDir = ri >= 0 ? path.resolve(process.argv[ri + 1]) : (() => {
    const d = fs.readdirSync(RUNS).filter((x) => /-h40a$/.test(x)).sort().pop();
    if (!d) { console.log('NOT READY: no *-h40a run folder yet'); process.exit(2); }
    return `${RUNS}/${d}`;
})();
// The live hour writes its timeline and captured prompts when it ends; both present = the hour is over.
const prompts = `${runDir}/interview60.prompts.json`, timeline = `${runDir}/interview60.timeline.json`;
for (const f of [prompts, timeline]) if (!fs.existsSync(f)) { console.log(`NOT READY: ${path.basename(f)} missing in ${path.basename(runDir)}`); process.exit(2); }

const P = JSON.parse(fs.readFileSync(prompts, 'utf8'));
const entries = Array.isArray(P) ? P.map((p) => [p.id, p]) : Object.entries(P);
const ids = entries.map(([id]) => id);
if (!ids.length) { console.log('NOT READY: the captured prompts file is empty'); process.exit(2); }
// Call spacing from the prompt size: the free tier allows 16,000 input tokens per model per minute
// (429 GenerateContentInputTokensPerModelPerMinute-FreeTier, 2026-09-24). ~4 chars per token over the
// whole captured entry overestimates a little (s50m: 21.9 kB per entry vs ~5.1k measured tokens), and
// 14,000 of the 16,000 leaves headroom. Floor 20 s.
const sizes = entries.map(([, p]) => JSON.stringify(p).length).sort((a, b) => a - b);
const p90 = sizes[Math.min(sizes.length - 1, Math.floor(sizes.length * 0.9))];
const estTokens = Math.ceil(p90 / 4);
const gapMs = Math.max(20000, Math.ceil((60000 * estTokens) / 14000));
const reps = ['min', 'min-r2', 'min-r3'];
console.log(`${dry ? 'DRY ' : ''}run ${path.basename(runDir)}: ${ids.length} captured prompts (${ids.slice(0, 3).join(',')}…); p90 entry ${p90} chars ≈ ${estTokens} tokens → call gap ${gapMs} ms; ${reps.length} reps ≈ ${Math.round((ids.length * reps.length * gapMs) / 60000)} min of pacing`);
if (dry) process.exit(0);

fs.mkdirSync(OUT, { recursive: true });
const env = { ...process.env, GEMMA_ARMS_DIR: OUT, NATIVELY_ROSTER: 'holdout40', GEMMA_CALL_TIMEOUT_MS: '180000', GEMMA_MIN_GAP_MS: String(gapMs) };
delete env.NATIVELY_SCENARIOS;
const LOG = `${OUT}/sidecar.log`;
const answersOf = (tag) => JSON.parse(fs.readFileSync(`${OUT}/interview60.answers.${MODEL}_${tag}.json`, 'utf8'));
const run = (tag, only) => new Promise((resolve) => {
    const fd = fs.openSync(LOG, 'a');
    fs.writeSync(fd, `=== ${tag} ${new Date().toTimeString().slice(0, 8)} gap ${gapMs} ms${only ? ` only ${only}` : ''}\n`);
    const args = [`${SP}/gemma-answers.mjs`, '--model', MODEL, '--tag', tag, '--thinking', 'MINIMAL', '--captured', prompts, ...(only ? ['--only', only] : [])];
    const c = spawn(process.execPath, args, { env, cwd: OUT, stdio: ['ignore', fd, fd] });
    c.on('exit', (code) => { fs.closeSync(fd); resolve(code); });
});

console.log(`start ${new Date().toTimeString().slice(0, 8)}`);
const smokeCode = await run('smoke', ids[0]);
const smoke = fs.existsSync(`${OUT}/interview60.answers.${MODEL}_smoke.json`) ? answersOf('smoke')[ids[0]] : null;
if (smokeCode !== 0 || !smoke?.spoken) { console.log(`SMOKE FAILED (exit ${smokeCode}): ${smoke?.transientError ?? 'no answer'} — the full arm was NOT started`); process.exit(1); }
console.log(`smoke ok: ${ids[0]} ${smoke.words} words, first answer ${smoke.ttft} ms`);
// The flight points its captured arms at exactly the ids the hour captured a prompt for (flight.mjs
// capturedOnly, passed as --only); an hour rarely captures every roster item (h40a: R09 went to the
// coaching path, so no verbal prompt) and answers.mjs --captured refuses the rest. Same ids here,
// checked against the flight's own captured-low arm so the pairing is exact.
const flightIds = Object.keys(JSON.parse(fs.readFileSync(`${runDir}/interview60.answers.gemini-3.1-flash-lite_captured-low.json`, 'utf8'))).sort();
if (flightIds.join(',') !== [...ids].sort().join(',')) { console.log(`REFUSED: the captured prompt ids differ from the flight's captured-low ids — prompts ${ids.length}, flight ${flightIds.length}`); process.exit(1); }
for (const tag of reps) {
    const code = await run(tag, ids.join(','));
    if (!fs.existsSync(`${OUT}/interview60.answers.${MODEL}_${tag}.json`)) { console.log(`${tag}: exit ${code}, wrote NO answers file — stopping; see ${LOG}`); process.exit(1); }
    const s = answersOf(tag);
    const none = ids.filter((id) => !s[id]?.spoken);
    console.log(`${tag}: exit ${code}, answered ${ids.length - none.length}/${ids.length}${none.length ? ` (no answer: ${none.join(',')})` : ''} ${new Date().toTimeString().slice(0, 8)}`);
}
console.log(`SIDECAR DONE ${new Date().toTimeString().slice(0, 8)}`);
