// THROWAWAY: wait for the baseline recording to finish, then record the six long
// clips again against the rebuilt router (new LIVE_LISTENER_PROMPT).
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const baseline = path.join(here, 'long-recording', 'events.json');
const t0 = Date.now();
while (!fs.existsSync(baseline)) {
    if (Date.now() - t0 > 15 * 60 * 1000) { console.log('baseline never appeared'); process.exit(1); }
    await new Promise((r) => setTimeout(r, 5000));
}
console.log(`baseline present after ${Math.round((Date.now() - t0) / 1000)}s; starting prompt2 run`);
const r = spawnSync(process.execPath, [path.join(here, 'record-long.mjs'), '--only', 'long', '--tag', 'prompt2'], { stdio: 'inherit' });
process.exit(r.status ?? 1);
