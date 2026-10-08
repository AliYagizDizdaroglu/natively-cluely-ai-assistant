// Runs a node script in the CURRENT working directory (the worktree, set by the scheduled task) with MAIN's .env
// loaded through node's own --env-file, so a checkout without a .env still gets the keys and nothing is copied.
// The accented MAIN path lives here (UTF-8 source), never in an ASCII-only .cmd.
//   node run-with-main-env.mjs <script> [args...]
import { spawnSync } from 'node:child_process';
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const [script, ...args] = process.argv.slice(2);
if (!script) { console.log('usage: run-with-main-env.mjs <script> [args...]'); process.exit(2); }
const r = spawnSync(process.execPath, [`--env-file=${MAIN}/.env`, script, ...args], { cwd: process.cwd(), stdio: 'inherit' });
process.exit(r.status ?? 1);
