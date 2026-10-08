// ad hoc rule 8 for the generator's T rule: each mutant must flip at least one edge case. Output saved to flight\gen-t-mutants.txt
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
const FL = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/router-default/flight';
const src = fs.readFileSync(path.join(FL, 'gen-launchers-rd.mjs'), 'utf8');
const NOW = '2026-10-07T00:00:00+03:00';
// [T, accepted?]
const CASES = [['2026-10-07 00:14', 0], ['2026-10-07 00:15', 1], ['2026-10-07 00:00', 0], ['2026-10-06 23:00', 0], ['2026-10-08 00:00', 1], ['2026-10-08 00:01', 0], ['2026-10-07 08:44', 1], ['2026-10-07 08:45', 0], ['2026-10-07 09:59', 0], ['2026-10-07 10:00', 1], ['2026-10-07 23:00', 1]];
const MUT = [
    ['REAL (control)', null, null],
    ['lead-exclusive', 'tm < NOW_MS + LEAD_MIN * 60000', 'tm <= NOW_MS + LEAD_MIN * 60000'],
    ['lead-14', 'LEAD_MIN = 15', 'LEAD_MIN = 14'],
    ['lead-16', 'LEAD_MIN = 15', 'LEAD_MIN = 16'],
    ['lead-removed', 'if (tm < NOW_MS + LEAD_MIN * 60000)', 'if (false)'],
    ['horizon-exclusive', 'tm > NOW_MS + HORIZON_H * 3600000', 'tm >= NOW_MS + HORIZON_H * 3600000'],
    ['horizon-23', 'HORIZON_H = 24', 'HORIZON_H = 23'],
    ['horizon-removed', 'if (tm > NOW_MS + HORIZON_H * 3600000)', 'if (false)'],
    ['run-60', 'RUN_MIN = 75', 'RUN_MIN = 60'],
    ['run-90', 'RUN_MIN = 75', 'RUN_MIN = 90'],
    ['reset-06', '(ms - 7 * 3600000)', '(ms - 6 * 3600000)'],
    ['quota-removed', 'sameQuotaDay(tInstant(v))', 'true'],
];
const out = [];
let bad = 0;
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'genmut-'));
for (const [name, a, b] of MUT) {
    let s = src;
    if (a) { if (!s.includes(a)) throw new Error('missing ' + a); s = s.replace(a, () => b); }
    const gf = path.join(FL, 'gen-launchers-rd.mut.mjs');
    fs.writeFileSync(gf, s);
    const flipped = [];
    try {
        for (const [t, want] of CASES) {
            const od = fs.mkdtempSync(path.join(dir, 'o-'));
            const r = spawnSync(process.execPath, [gf, '--t', t, '--now', NOW, '--out', od], { encoding: 'utf8' });
            const got = r.status === 0 ? 1 : 0;
            if (got !== want) flipped.push(t);
        }
    } finally { fs.rmSync(gf, { force: true }); }
    const ok = a ? flipped.length > 0 : flipped.length === 0;
    if (!ok) bad++;
    out.push(`${ok ? 'ok  ' : 'BAD '} ${name}: cases that read differently from the expected answer: [${flipped.join(', ')}]`);
}
out.push(bad ? `GEN T MUTANTS: FAILED (${bad})` : `GEN T MUTANTS OK ${MUT.length}/${MUT.length}`);
fs.writeFileSync(path.join(FL, 'gen-t-mutants.txt'), out.join('\n') + '\n');
console.log(out.join('\n'));
fs.rmSync(dir, { recursive: true, force: true });
process.exit(bad ? 1 : 0);
