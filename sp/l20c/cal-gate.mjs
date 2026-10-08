// Throwaway (2026-09-29): calibrate gate.mjs on known answers, in a temp copy of the health folder.
//   (a) the real files, "now" = today 21:30  -> PENDING (day 1 PASS x3)
//   (b) one day-1 result turned into a spoken system-error apology -> FAIL
//   (c) one day-1 result flagged abnormal -> FAIL
//   (d) the real files, "now" = 2 Oct 12:00 (every slot past, days 2-3 missing) -> FAIL
//   (e) all nine slots present and clean (day 1 copied to days 2-3), "now" = 2 Oct -> PASS
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { gateStatus } from './gate.mjs';

const SRC = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/l20/health';
const day1 = ['2026-09-29T01-30-04-215Z.json', '2026-09-29T07-00-01-345Z.json', '2026-09-29T17-00-01-280Z.json'];
const mk = (edit) => {
    const d = fs.mkdtempSync(path.join(os.tmpdir(), 'gate-cal-'));
    for (const f of day1) fs.copyFileSync(`${SRC}/${f}`, `${d}/${f}`);
    edit?.(d);
    return d;
};
const tonight = Date.parse('2026-09-29T18:30:00Z'), later = Date.parse('2026-10-02T09:00:00Z');
const cases = [
    ['(a) real, tonight', mk(), tonight, 'PENDING'],
    ['(b) apology', mk((d) => { const f = `${d}/${day1[1]}`; const J = JSON.parse(fs.readFileSync(f, 'utf8')); J.results[2].text = "I'm sorry, but a system error occurred while processing your request, please try again later so I can help you with that question in a moment okay thanks a lot friend"; fs.writeFileSync(f, JSON.stringify(J)); }), tonight, 'FAIL'],
    ['(c) abnormal', mk((d) => { const f = `${d}/${day1[0]}`; const J = JSON.parse(fs.readFileSync(f, 'utf8')); J.results[0].abnormal = true; fs.writeFileSync(f, JSON.stringify(J)); }), tonight, 'FAIL'],
    ['(d) days 2-3 missing, later', mk(), later, 'FAIL'],
    ['(e) all nine clean, later', mk((d) => { for (const day of ['2026-09-30', '2026-10-01']) for (const f of day1) fs.copyFileSync(`${d}/${f}`, `${d}/${f.replace('2026-09-29', day)}`); }), later, 'PASS'],
];
let bad = 0;
for (const [name, dir, now, want] of cases) { const g = gateStatus(now, dir); if (g.status !== want) bad++; console.log(`${g.status === want ? 'ok ' : 'BAD'} ${name}: ${g.status} (want ${want})`); }
process.exit(bad ? 1 : 0);
