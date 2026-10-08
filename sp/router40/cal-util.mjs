// Calibration helper shared by the router40 known-answer scripts: one table row per case (case -> expected -> actual), written to cal-out/<name>.cal.txt.
import fs from 'node:fs';
import { R40 } from './r40-common.mjs';

/** A genuine real invocation of a run script is only safe to make when its date gate must refuse: the real clock is OUTSIDE tonight's window [21:45, 23:15) on 2026-10-05 and before the grade gate (2026-10-06 04:15 under A8; `before` below still tests 10:00, which only widens the safe side for R and L: their tonight window refuses anyway). Inside the window a real call would be a real run (a network or model call): such a case is SKIPPED, never run. */
export function realClockRefuses(now = new Date()) {
    if (process.env.R40_MUTATION_RUN) return { safe: false, inWin: false, before: false, at: 'mutation run' }; // a mutated copy never makes a real-clock invocation (its gate may be the very thing broken)
    const inWin = +now >= +new Date(2026, 9, 5, 21, 45, 0) && +now < +new Date(2026, 9, 5, 23, 15, 0);
    const before = +now < +new Date(2026, 9, 6, 10, 0, 0);
    return { safe: !inWin && before, inWin, before, at: now.toTimeString().slice(0, 5) };
}
export function calRun(name) {
    let skipped = 0;
    const rows = [];
    const lines = [];
    const say = (s) => { console.log(s); lines.push(s); };
    return {
        say,
        /** expected / actual are short strings (no prompt or answer text). */
        check(id, desc, expected, actual, ok = String(expected) === String(actual)) {
            rows.push(ok);
            say(`${ok ? 'PASS' : 'FAIL'}  ${id} | ${desc} | expected: ${expected} | actual: ${actual}`);
        },
        /** A case that is NOT run (precondition absent); named in the summary, never counted as PASS. */
        skip(id, desc, why) { skipped++; say(`SKIP  ${id} | ${desc} | not run: ${why}`); },
        finish() {
            const pass = rows.filter(Boolean).length;
            say(`${name}: ${pass}/${rows.length} cases PASS${pass === rows.length ? '' : ' -- FAILURES ABOVE'}${skipped ? ` (${skipped} SKIPPED: real-clock cases not run inside the window)` : ''}`);
            fs.mkdirSync(`${R40}/cal-out`, { recursive: true });
            fs.writeFileSync(`${R40}/cal-out/${name}.cal.txt`, `${lines.join('\n')}\n`, 'utf8');
            process.exit(pass === rows.length ? 0 : 1);
        },
    };
}
