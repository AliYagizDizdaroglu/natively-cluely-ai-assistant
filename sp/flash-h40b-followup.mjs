// Throwaway (2026-09-26): ONE follow-up pass over the h40b sidecar's HTTP 503 holes, after the
// overload window. Same runner, env, captured prompts and per-model logs as flash-h40b-sidecar.mjs;
// one try per id (GEMMA_MAX_TRIES=1; a cut stream is still re-asked once); answers MERGE into the
// existing interview60.answers.<model>_def.json files (the runner keeps answered records — the
// sidecar's own pass loop relies on that). Asks only the ids still unanswered when it starts.
// Server cap 20 requests/model/day: gemini-3.5-flash 11 used + 9 = 20, gemini-3.7-flash 18 + 1 = 19,
// counting every 503 as a request (unknown whether the server does). A 429 is recorded, never retried.
import fs from 'node:fs';
import { spawn } from 'node:child_process';

const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const OUT = `${SP}/flash-h40b`;
const RUNNER = `${SP}/gemma-answers.mjs`;
const PROMPTS = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs/2026-09-26T11-39-51-h40b/interview60.prompts.json';
const TIER3 = ['R01', 'R11F', 'R12', 'R17F', 'R23', 'R26F', 'R27', 'R28', 'R30', 'R31F', 'R32'];

const runnerText = fs.readFileSync(RUNNER, 'utf8');
for (const m of ['process.env.GEMMA_MAX_TRIES', 'dropRetried']) {
    if (!runnerText.includes(m)) { console.log(`RUNNER LACKS ${m}: ${RUNNER}`); process.exit(3); }
}
if (!fs.existsSync(PROMPTS)) { console.log(`NO CAPTURED PROMPTS: ${PROMPTS}`); process.exit(2); }

const stamp = () => new Date().toTimeString().slice(0, 8);
const answersFile = (model) => `${OUT}/interview60.answers.${model}_def.json`;
function missing(model, ids) {
    const f = answersFile(model);
    if (!fs.existsSync(f)) { console.log(`NO ANSWERS FILE: ${f}`); process.exit(2); }
    const s = JSON.parse(fs.readFileSync(f, 'utf8'));
    return ids.filter((id) => !s[id]?.spoken);
}
const env = { ...process.env, GEMMA_ARMS_DIR: OUT, NATIVELY_ROSTER: 'holdout40', GEMMA_CALL_TIMEOUT_MS: '180000', GEMMA_MIN_GAP_MS: '23550', GEMMA_MAX_TRIES: '1' };

function run(model, only) {
    return new Promise((resolve) => {
        const fd = fs.openSync(`${OUT}/${model}.log`, 'a');
        fs.writeSync(fd, `=== def follow-up ${stamp()} gap 23550 ms only ${only.join(',')}\n`);
        const args = [RUNNER, '--model', model, '--tag', 'def', '--captured', PROMPTS, '--only', only.join(',')];
        const c = spawn(process.execPath, args, { env, cwd: OUT, stdio: ['ignore', fd, fd] });
        c.on('exit', (code) => { fs.closeSync(fd); resolve(code); });
    });
}

const JOBS = [
    { model: 'gemini-3.5-flash', ids: TIER3 },
    { model: 'gemini-3.7-flash', ids: ['R03', 'R09F', 'R16'] },
];
console.log(`follow-up start ${stamp()}`);
for (const { model, ids } of JOBS) {
    const todo = missing(model, ids);
    if (!todo.length) { console.log(`${stamp()} ${model}: nothing unanswered`); continue; }
    const code = await run(model, todo);
    const left = missing(model, todo);
    console.log(`${stamp()} ${model} follow-up: ${todo.length - left.length}/${todo.length} answered, ${todo.length} requests plus any cut re-asks${left.length ? ` (unanswered: ${left.join(',')})` : ''}; runner exit ${code}`);
}
console.log(`FOLLOW-UP DONE ${stamp()}`);
