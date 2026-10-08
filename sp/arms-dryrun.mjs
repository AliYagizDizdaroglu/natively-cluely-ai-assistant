// Throwaway: the flight's own --dry-run at MAIN HEAD on holdout40 (h40c's roster) — executes nothing, only
// logs the commands it would run. Prints the answers.mjs RUN lines this run appended and counts Groq ids.
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const LOG = `${MAIN}/electron/test/golden/interview60.run.flight.log`;
const from = fs.existsSync(LOG) ? fs.statSync(LOG).size : 0;
const env = { ...process.env, NATIVELY_ROSTER: 'holdout40' };
delete env.NATIVELY_SCENARIOS;
const r = spawnSync(process.execPath, [`${MAIN}/electron/test/golden/interview60.flight.mjs`, 'h40c-armcheck', '--dry-run'], { cwd: MAIN, env, encoding: 'utf8' });
const fd = fs.openSync(LOG, 'r');
const buf = Buffer.alloc(fs.statSync(LOG).size - from);
fs.readSync(fd, buf, 0, buf.length, from);
fs.closeSync(fd);
const lines = buf.toString('utf8').split('\n');
const runs = lines.filter((l) => /RUN\s+node electron[\\/]test[\\/]golden[\\/]interview60\.answers\.mjs/.test(l));
for (const l of lines.filter((l) => /FLIGHT|ROSTER|FOCUSED|DONE/.test(l))) console.log(l.slice(25));
for (const l of runs) console.log(l.slice(25).replace(/--captured \S+/, '--captured <prompts>'));
const groq = runs.filter((l) => /--model \S*\//.test(l));
console.log(`exit ${r.status}; answers.mjs RUN lines ${runs.length}; with a Groq ("/") model ${groq.length}`);
