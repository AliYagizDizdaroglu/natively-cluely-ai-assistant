// The cue bench's three treatment reps (SP\PREREGISTER-cuebench.md; RUNBOOK-bench.md §1), one after another, from the
// whole-turn worktree with MAIN's .env (run-with-main-env.mjs; keys never printed). A rep is not STARTED after the
// cutoff (default 09:48 local) so its calls cannot cross the 10:00 quota reset; a rep not started is logged and the
// runbook's fallback applies. Each rep's output goes to cuebench/bench-<R>.log; this script prints timings and exits only.
//   node go-bench.mjs [--cutoff HH:MM]
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SP = path.dirname(HERE);
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const WT = `${MAIN}/.claude/worktrees/whole-turn`;
const RUN = `${MAIN}/electron/test/golden/interview60.runs/2026-09-22T08-22-50-s50m`;
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const [ch, cm] = arg('--cutoff', '09:48').split(':').map(Number);
const LOG = path.join(HERE, 'go-bench.log');
const log = (s) => { const line = `${new Date().toISOString()} ${s}`; console.log(line); fs.appendFileSync(LOG, line + '\n'); };

const prompts = JSON.parse(fs.readFileSync(`${RUN}/interview60.prompts.json`, 'utf8'));
const IDS = Object.entries(prompts).filter(([, v]) => v?.system && v?.user).map(([k]) => k);
if (IDS.length !== 39) { log(`REFUSED: expected s50m's 39 captured ids, found ${IDS.length}`); process.exit(2); }
log(`ids ${IDS.length}; cutoff ${String(ch).padStart(2, '0')}:${String(cm).padStart(2, '0')} local`);

for (const R of ['r1', 'r2', 'r3']) {
    const out = `${WT}/electron/test/golden/interview60.answers.gemini-3.5-flash-lite_cues-${R}.json`;
    if (fs.existsSync(out)) { log(`${R}: output exists, skipped (${path.basename(out)})`); continue; }
    const now = new Date();
    if (now.getHours() > ch || (now.getHours() === ch && now.getMinutes() >= cm)) { log(`${R}: NOT STARTED, past the cutoff (quota-day boundary); the runbook's fallback applies`); process.exit(4); }
    log(`${R}: start`);
    const r = spawnSync(process.execPath, [`${SP}/run-with-main-env.mjs`, 'electron/test/golden/interview60.answers.mjs',
        '--model', 'gemini-3.5-flash-lite', '--thinking', 'HIGH', '--captured', `${RUN}/interview60.prompts.json`,
        '--only', IDS.join(','), '--cues', '--tag', `cues-${R}`], {
        cwd: WT, env: { ...process.env, NATIVELY_ROSTER: 'scenario50', NATIVELY_SCENARIOS: 'S1,S2' }, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    });
    fs.writeFileSync(path.join(HERE, `bench-${R}.log`), (r.stdout ?? '') + '\n--- stderr ---\n' + (r.stderr ?? ''));
    log(`${R}: exit ${r.status}${fs.existsSync(out) ? `; wrote ${path.basename(out)}` : '; NO OUTPUT FILE'}`);
    if (r.status !== 0) { log(`STOPPED after ${R}: non-zero exit`); process.exit(5); }
}
log('DONE');
