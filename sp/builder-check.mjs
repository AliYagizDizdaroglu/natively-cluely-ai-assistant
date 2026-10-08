// Throwaway: run the SHIPPED prompts builder over the smoke's real capture, with a timeline
// synthesised from the smoke log's own play times. Proves the builder pairs real captures to
// real question ids end to end before a flight depends on it.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const DIR = path.join('C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp', 'builder-check-run');
fs.rmSync(DIR, { recursive: true, force: true });
fs.mkdirSync(DIR, { recursive: true });

fs.copyFileSync(path.join(MAIN, 'verbal-prompts.log'), path.join(DIR, 'verbal-prompts.log'));
fs.copyFileSync(path.join(MAIN, 'natively_debug.log'), path.join(DIR, 'natively_debug.log'));

// Play times read off the smoke log's own "playing <id>…" lines — the clock the clips ran on.
const smokeLog = fs.readFileSync(path.join(MAIN, 'electron/test/golden/interview60.runs/smoke-turn3.log'), 'utf8');
const day = '2026-09-13T';
const played = [...smokeLog.matchAll(/^(\d\d:\d\d:\d\d)\s+playing (\S+)…/gm)].map((m) => ({
    id: m[2],
    playedAt: Date.parse(`${day}${m[1]}.000Z`),
}));
if (played.length === 0) throw new Error('no "playing" lines in the smoke log');
fs.writeFileSync(path.join(DIR, 'interview60.timeline.json'), JSON.stringify({ startedMs: played[0].playedAt, items: played.map((p) => ({ ...p, kind: 'spoken' })) }, null, 1));
console.log(`timeline: ${played.map((p) => `${p.id}@${new Date(p.playedAt).toISOString().slice(11, 19)}`).join('  ')}`);

const out = execFileSync(process.execPath, [path.join(MAIN, 'electron/test/golden/interview60.prompts.mjs'), DIR], { encoding: 'utf8' });
console.log(out.trim());

const built = JSON.parse(fs.readFileSync(path.join(DIR, 'interview60.prompts.json'), 'utf8'));
for (const [id, p] of Object.entries(built)) {
    const tail = p.user.replace(/\s+/g, ' ').slice(-150);
    console.log(`  ${id}  system ${p.system.length}  user ${p.user.length}  …${tail}`);
}
