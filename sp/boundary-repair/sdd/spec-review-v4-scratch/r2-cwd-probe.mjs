// Runs MAIN's vitest binary (read-only use of MAIN's node_modules) on a probe test that lives in this scratch
// folder, from the OS temp dir with --root = the probe folder: the same shape as the plan's TEST command.
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const VITEST = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/node_modules/vitest/vitest.mjs';
const root = path.join(HERE, 'vt');
const r = spawnSync(process.execPath, [VITEST, 'run', '--root', root, '--globals', '--pool', 'forks'], { cwd: os.tmpdir(), encoding: 'utf8', timeout: 120000 });
const out = `${r.stdout}\n${r.stderr}`;
console.log(`caller cwd: ${os.tmpdir()}\nroot: ${root}\nexit ${r.status}`);
for (const l of out.split('\n')) if (/WORKER_|Tests |Test Files|Error/.test(l)) console.log(l.trim());
