// E\window-eq.mjs  (AMENDMENT-A2 A2.3/A2.10 P4, window bounds per AMENDMENT-A3 A3.2 m14 / A3.7)
// The flight-eq "Start" window, judged on absolute UTC instants, never on the machine's clock or time zone:
//   in  <=>  2026-10-05T16:30:00.000Z <= startedAt <= 2026-10-05T22:30:00.000Z   (19:30:00 .. 01:30:00 at +03:00)
//
//   node window-eq.mjs <run-dir>        reads <run-dir>\interview60.timeline.json, field startedAt
//   node window-eq.mjs --at <ISO>       judges the given instant
//
// One line, ids/instants only. Exit: 0 IN WINDOW | 3 OUT OF WINDOW | 4 UNREADABLE | 2 usage (incl. a run-dir that is not a directory).
// Local time is shown by a fixed +03:00 offset (no Date local getters, so TZ=UTC prints the same bytes).
// startedAt must be a full ISO-8601 date-time with an explicit Z or +hh:mm offset and at most 3 fractional digits
// (the harness writes toISOString()); anything else, an impossible calendar date included, is UNREADABLE and cannot PASS.
import fs from 'node:fs';
import path from 'node:path';

const LO = Date.UTC(2026, 9, 5, 16, 30, 0, 0);
const HI = Date.UTC(2026, 9, 5, 22, 30, 0, 0);
const WINDOW_TEXT = 'IN WINDOW 2026-10-05 19:30 .. 2026-10-06 01:30';

const usage = (why = '') => { console.error(`usage: node window-eq.mjs <run-dir> | --at <ISO instant>${why ? `  (${why})` : ''}`); process.exit(2); };
const unreadable = () => { console.log('WINDOW-EQ UNREADABLE (startedAt missing or unparseable) - cannot PASS'); process.exit(4); };

/** ISO-8601 date-time with explicit zone -> epoch ms, or null. Rejects 2026-02-30 style roll-overs and >3 fraction digits. */
function parseInstant(s) {
    if (typeof s !== 'string') return null;
    const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z|([+-])(\d{2}):(\d{2}))$/.exec(s);
    if (!m) return null;
    const [Y, Mo, D, h, mi, sec] = m.slice(1, 7).map(Number);
    const ms = m[7] ? Number(m[7].padEnd(3, '0')) : 0;
    const wall = new Date(Date.UTC(Y, Mo - 1, D, h, mi, sec, ms));
    if (wall.getUTCFullYear() !== Y || wall.getUTCMonth() !== Mo - 1 || wall.getUTCDate() !== D
        || wall.getUTCHours() !== h || wall.getUTCMinutes() !== mi || wall.getUTCSeconds() !== sec) return null;   // 24:00, Feb 30, ...
    let offMin = 0;
    if (m[8] !== 'Z') {
        const oh = Number(m[10]), om = Number(m[11]);
        if (oh > 23 || om > 59) return null;
        offMin = (m[9] === '-' ? -1 : 1) * (oh * 60 + om);
    }
    return wall.getTime() - offMin * 60000;
}

const pad = (n, w = 2) => String(n).padStart(w, '0');
function local03(t) {
    const d = new Date(t + 3 * 3600000);
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}+03`;
}

const argv = process.argv.slice(2);
let raw;
if (argv.length === 2 && argv[0] === '--at') raw = argv[1];
else if (argv.length === 1 && !argv[0].startsWith('--')) {
    // A mistyped run-dir is a usage error (exit 2), never UNREADABLE: that line means "the hour cannot PASS" (A3.2 m2).
    // A missing or corrupt timeline INSIDE an existing dir stays UNREADABLE.
    if (!fs.existsSync(argv[0]) || !fs.statSync(argv[0]).isDirectory()) usage('run-dir is not an existing directory');
    try { raw = JSON.parse(fs.readFileSync(path.join(argv[0], 'interview60.timeline.json'), 'utf8')).startedAt; }
    catch { unreadable(); }
} else usage();

const t = parseInstant(raw);
if (t === null) unreadable();
const head = `WINDOW-EQ startedAt=${new Date(t).toISOString()} local=${local03(t)}`;
if (t >= LO && t <= HI) { console.log(`${head} ${WINDOW_TEXT}`); process.exit(0); }
console.log(`${head} OUT OF WINDOW (cannot PASS; NO LATENCY VERDICT)`);
process.exit(3);
