// throwaway: node work/run-daypre.mjs <approved-sha> -- runs followup-turn-proof/R/day-pre.mjs (the day's script, DRY RUNS ONLY inside) with TURN_RUNLOG in the temp folder
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const FT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const PROOF = path.join(path.dirname(FT), 'followup-turn-proof');
const log = path.join(os.tmpdir(), `daypre-proof-${Date.now()}.log`);
const r = spawnSync(process.execPath, [path.join(PROOF, 'R', 'day-pre.mjs'), '--approved', process.argv[2], ...process.argv.slice(3)], { encoding: 'utf8', env: { ...process.env, TURN_RUNLOG: log }, maxBuffer: 256 << 20, cwd: PROOF });
fs.writeFileSync(path.join(FT, 'work', 'daypre-proof.out.txt'), `${r.stdout}${r.stderr}`);
fs.copyFileSync(log, path.join(FT, 'work', 'daypre-proof.runlog.txt'));
console.log(`exit ${r.status}`);
console.log(`${r.stdout}${r.stderr}`.split('\n').slice(-40).join('\n'));
