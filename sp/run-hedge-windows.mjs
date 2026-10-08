// Throwaway: starts the hedge probe's three windows at their local times, one detached process for
// the evening. Each window: node --env-file=.env electron/test/golden/hedge-live.probe.mjs Hn from
// MAIN's root; stdout+stderr to interview60.runs/latency-probe/<date>-hedge-Hn.log. A window whose
// time has passed at launch starts at once. The key never touches this process: --env-file loads it
// in the child.
import fs from 'node:fs';
import { spawn } from 'node:child_process';
const M = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const LOGS = `${M}/electron/test/golden/interview60.runs/latency-probe`;
const WINDOWS = [['H1', '19:30'], ['H2', '21:30'], ['H3', '23:30']];
const stamp = () => new Date().toTimeString().slice(0, 8);
const at = (hhmm) => { const d = new Date(); const [h, mi] = hhmm.split(':').map(Number); d.setHours(h, mi, 0, 0); return d; };
fs.mkdirSync(LOGS, { recursive: true });
for (const [w, hhmm] of WINDOWS) {
    const wait = Math.max(0, at(hhmm) - Date.now());
    console.log(`${stamp()} ${w} at ${hhmm}: waiting ${Math.round(wait / 60000)} min`);
    await new Promise((r) => setTimeout(r, wait));
    const log = `${LOGS}/${new Date().toISOString().slice(0, 10)}-hedge-${w}.log`;
    const fd = fs.openSync(log, 'a');
    const code = await new Promise((resolve) => {
        const c = spawn(process.execPath, ['--env-file=.env', 'electron/test/golden/hedge-live.probe.mjs', w], { cwd: M, stdio: ['ignore', fd, fd] });
        c.on('exit', resolve);
    });
    fs.closeSync(fd);
    console.log(`${stamp()} ${w} exit ${code}`);
}
console.log(`${stamp()} WINDOWS DONE`);
