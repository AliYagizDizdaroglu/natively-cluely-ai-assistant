// Paced 3.8 Flash re-ask: waits until a start time, then runs pipeline.mjs once per id (one try each, tag sat2) with
// GAP_MS between calls, so a burst no longer trips the free tier's per-minute limit (sat's 1.2 s spacing got 3 x 429
// after 5 x 503). Quota: 3.8 Flash is 20/day; sat sent 9, so at most 11 remain if refused calls count.
//   node reask-paced.mjs <HH:MM local start> <id,id,...>
import { execFileSync } from 'node:child_process';
import path from 'node:path';
const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1'));
const [start, idsArg] = process.argv.slice(2);
if (!/^\d\d:\d\d$/.test(start ?? '') || !idsArg) { console.log('usage: <HH:MM> <ids>'); process.exit(2); }
const ids = idsArg.split(',');
if (ids.length > 8) { console.log('REFUSED: more than 8 ids would risk the day\'s quota'); process.exit(2); }
const GAP_MS = 30_000;
const t = new Date(); const [h, m] = start.split(':').map(Number); t.setHours(h, m, 0, 0);
const wait = t - Date.now();
console.log(`${new Date().toLocaleTimeString('sv-SE')}: waiting ${Math.max(0, Math.round(wait / 1000))} s until ${start}`);
if (wait > 0) await new Promise((r) => setTimeout(r, wait));
for (const [i, id] of ids.entries()) {
    if (i) await new Promise((r) => setTimeout(r, GAP_MS));
    let out;
    try { out = execFileSync('node', ['pipeline.mjs', '--model', 'gemini-3.8-flash', '--ids', id, '--tag', 'sat2'], { cwd: HERE, encoding: 'utf8' }); }
    catch (e) { out = `${e.stdout ?? ''}${e.stderr ?? ''}`; }
    console.log(`${new Date().toLocaleTimeString('sv-SE')} ${out.trim().split('\n').filter((l) => l.startsWith(id)).join(' | ') || out.trim().slice(0, 120)}`);
}
console.log('done');
