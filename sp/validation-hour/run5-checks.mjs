// Run 5 (21:00 prestart, READY): the r4 section 7.3 required readings on its debug log. Copies the saved log into a
// folder named like a run so check-smoke-cues finds it, then runs check-smoke-cues and h40d-clocks --whole-log.
// Prints only the instruments' own lines (ids, counts, verdicts) and the knowledge-line ORDER in runs 1, 3 and 5.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const VH = path.dirname(fileURLToPath(import.meta.url));
const SP = path.resolve(VH, '..');
const SAVED = path.join(VH, '2026-10-01-prestart-h40d');
const RUNS = path.join(SP, 'prestart-run5');
const R = path.join(RUNS, '2026-10-01T21-00-prestart-h40d');
fs.mkdirSync(R, { recursive: true });
fs.copyFileSync(path.join(SAVED, 'natively_debug.run5.log'), path.join(R, 'natively_debug.log'));
const run = (args, cwd) => { try { return execFileSync('node', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); } catch (e) { return `${e.stdout ?? ''}${e.stderr ?? ''}[exit ${e.status}]`; } };
console.log('== check-smoke-cues prestart-h40d (run 5)');
console.log(run([path.join(SP, 'check-smoke-cues.mjs'), 'prestart-h40d', '--runs', RUNS], SP).trim().split('\n').slice(-8).join('\n'));
console.log('== h40d-clocks --whole-log (run 5)');
console.log(run([path.join(VH, 'h40d-clocks.mjs'), R, '--whole-log'], VH).trim().split('\n').slice(-6).join('\n'));
console.log('== knowledge lines order (line numbers) in runs 1, 3, 5');
for (const f of ['natively_debug.log', 'natively_debug.run3.log', 'natively_debug.run5.log']) {
    const lines = fs.readFileSync(path.join(SAVED, f), 'utf8').split('\n');
    const idx = (s) => lines.findIndex((l) => l.includes(s)) + 1;
    console.log(`${f}: ENABLED line ${idx('Knowledge mode ENABLED')}, restored-from-settings line ${idx('Knowledge mode restored from settings')}, DISABLED count ${lines.filter((l) => l.includes('Knowledge mode DISABLED')).length}, won-by ${lines.filter((l) => l.includes('verbal hedge: won by')).length}, cues lines ${lines.filter((l) => l.includes('[Answer] cues:')).length}, 1011/internal ${lines.filter((l) => /1011|Internal error/i.test(l)).length}`);
}
console.log('== rule3 calibration tail');
const r3 = path.join(VH, 'instruments', 'h40d-rule3-cal.txt');
console.log(fs.existsSync(r3) ? fs.readFileSync(r3, 'utf8').trim().split('\n').slice(-6).join('\n') : `${r3} missing; instruments dir has: ${fs.readdirSync(path.join(VH, 'instruments')).filter((n) => /rule3/i.test(n)).join(', ') || 'no rule3 file'}; VH has: ${fs.readdirSync(VH).filter((n) => /rule3/i.test(n)).join(', ')}`);
