// Re-review 2 probe (throwaway): does the I4 guard notice a runner that has the one-try limit but has
// LOST N2 (cutRetried on the transient record)? That is the runner an operator gets by following the
// guard's own message after a regeneration: "regenerate or re-apply the one-try limit".
// Builds rr-task4-fix2/non2.mjs = the current runner minus N2's field (exact single match), then runs the
// REAL sidecar with --dry and GEMMA_RUNNER_PATH=non2.mjs. No API call: --dry.
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const HERE = `${SP}/sdd/2026-09-25-flight-h40b/rr-task4-fix2`;
const cur = fs.readFileSync(`${SP}/gemma-answers.mjs`, 'utf8');
const from = 'store[item.id] = { ...item, model: ARM, transientError: lastErr, cutRetried: dropRetried };';
if (cur.split(from).length !== 2) throw new Error('N2 line not found exactly once');
const non2 = `${HERE}/non2.mjs`;
fs.writeFileSync(non2, cur.replace(from, () => 'store[item.id] = { ...item, model: ARM, transientError: lastErr };'));
const t = fs.readFileSync(non2, 'utf8');
console.log(`non2.mjs: "process.env.GEMMA_MAX_TRIES" x${t.split('process.env.GEMMA_MAX_TRIES').length - 1}; "transientError: lastErr, cutRetried" x${t.split('transientError: lastErr, cutRetried').length - 1}`);
const env = { ...process.env, GEMMA_RUNNER_PATH: non2 }; delete env.GEMMA_MAX_TRIES;
const r = spawnSync(process.execPath, [`${SP}/flash-h40b-sidecar.mjs`, '--dry'], { cwd: HERE, env, encoding: 'utf8' });
console.log(`sidecar --dry with the N2-less runner: EXIT ${r.status}; ${(r.stdout + r.stderr).trim().split('\n').filter((l) => /RUNNER LACKS|NOT READY/.test(l)).join(' / ')}`);
