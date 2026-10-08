// Re-review 2 probe (throwaway): after a regeneration, the guard says "regenerate or re-apply the one-try
// limit". The only written recipe for that limit is task-4-brief.md Step 1. Build that runner
// (regenerated pre-Task-4 text + Step 1's two lines, exact single match), then (a) does the guard pass it?
// (b) what does its loop do at one try, and what does the sidecar charge? No API call: the sidecar runs
// with --dry; the loop runs as sliced text against a fake pacedAnswer.
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const HERE = `${SP}/sdd/2026-09-25-flight-h40b/rr-task4-fix2`;
const pre = fs.readFileSync(`${HERE}/gen/gemma-answers.mjs`, 'utf8');
const from = '    for (let a = 0; a < 4; a++) {';
if (pre.split(from).length !== 2) throw new Error('loop head not found exactly once');
const brief = pre.replace(from, () => "    const MAX_TRIES = Math.max(1, Number(process.env.GEMMA_MAX_TRIES ?? 4));   // the capped Flash sidecar sets 1: a 429 or 503 is recorded, never retried\n    for (let a = 0; a < MAX_TRIES; a++) {");
const out = `${HERE}/brief-runner.mjs`; fs.writeFileSync(out, brief);
const env = { ...process.env, GEMMA_RUNNER_PATH: out }; delete env.GEMMA_MAX_TRIES;
const r = spawnSync(process.execPath, [`${SP}/flash-h40b-sidecar.mjs`, '--dry'], { cwd: HERE, env, encoding: 'utf8' });
console.log(`(a) sidecar --dry with the brief-Step-1 runner: EXIT ${r.status}; ${(r.stdout + r.stderr).trim().split('\n').filter((l) => /RUNNER LACKS|NOT READY/.test(l)).join(' / ')}`);

const t = brief.replace(/\r\n/g, '\n');
const a = t.indexOf('for (const item of todo) {'), b = t.indexOf('\n}\n\n// ── summary');
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const F = new AsyncFunction('todo', 'store', 'pacedAnswer', 'sleep', 'CAPTURED', 'CALL_TIMEOUT_MS', 'ARM', 'P', 'VERBAL_CHECKS', 'fs', 'OUT', 'IS_GROQ', 'groqLimits', 'console', 'process', t.slice(a, b + 2));
const make = (o) => ({ CLEAN: { spoken: 'full answer', finish: 'STOP', words: 2 }, CUT: { spoken: 'partial', finish: null, words: 1 }, T429: { transient: 'HTTP 429' }, T503: { transient: 'HTTP 503' } })[o] ?? (() => { const e = new Error(o === 'TIMEOUT' ? 'cap' : 'fetch failed'); if (o === 'TIMEOUT') e.name = 'TimeoutError'; throw e; })();
for (const seq of [['CUT', 'CLEAN'], ['CUT', 'T429'], ['T429'], ['CLEAN']]) {
    let calls = 0; const store = {};
    await F([{ id: 'R01', q: 'q' }], store, async () => make(seq[calls++]), async () => {}, null, 180000, 'arm', {}, {}, { writeFileSync() {} }, 'o', false, null, { log() {}, error() {} }, { env: { GEMMA_MAX_TRIES: '1' } });
    const rec = store.R01, charge = 1 + (rec.cutRetried ? 1 : 0);
    console.log(`(b) one try, script [${seq}]: calls ${calls}, sidecar charges ${charge}, record ${rec.transientError !== undefined ? `transientError=${rec.transientError}` : `spoken=${JSON.stringify(rec.spoken)} cutRetried=${rec.cutRetried}`}${charge !== calls ? '  <-- charge != calls' : ''}`);
}
