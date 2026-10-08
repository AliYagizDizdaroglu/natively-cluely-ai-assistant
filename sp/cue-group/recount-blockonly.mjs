// Final review I1 (2026-09-30): spike 6's primary measure counted a one-line block that carries the answer, and never
// looked at the prose under it. A response that is ONLY a block (cue lines, no spoken answer) would count as a success
// there, while in the app it shows "Could you repeat that?" and no cue. This recount reads the two counted row files
// and prints COUNTS ONLY (no cue text, no prose, no prompt): per model x arm x kind, the rows whose block has at least
// one line and whose prose has zero words. No model call.
//   node recount-blockonly.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FILES = ['spike6-2026-09-30T07-04-03-320Z.json', 'spike6-2026-09-30T07-04-05-912Z.json'];

export const blockOnly = (r) => r.n >= 1 && r.proseWords === 0;
export function tally(rows) {
    const by = new Map();
    for (const r of rows) {
        const k = `${r.model} | ${r.arm} | ${r.kind}`;
        const t = by.get(k) ?? { rows: 0, blockOnly: 0, noBlock: 0, badField: 0, prose: [] };
        t.rows++;
        if (typeof r.proseWords !== 'number' || typeof r.n !== 'number') t.badField++;
        else { if (blockOnly(r)) t.blockOnly++; if (r.n === 0) t.noBlock++; t.prose.push(r.proseWords); }
        by.set(k, t);
    }
    return by;
}

// Calibration on rows whose answer is known: the count must move when the effect is present.
const cal = tally([
    { model: 'm', arm: 'a', kind: 'simple', n: 1, proseWords: 0 },     // block-only
    { model: 'm', arm: 'a', kind: 'simple', n: 1, proseWords: 40 },    // block + prose
    { model: 'm', arm: 'a', kind: 'simple', n: 0, proseWords: 40 },    // no block
    { model: 'm', arm: 'a', kind: 'simple', n: 0, proseWords: 0 },     // nothing at all: not block-only
    { model: 'm', arm: 'a', kind: 'simple', n: 1 },                    // field missing: must be reported, not counted
]).get('m | a | simple');
if (cal.rows !== 5 || cal.blockOnly !== 1 || cal.noBlock !== 2 || cal.badField !== 1) { console.log('CALIBRATION FAILED', JSON.stringify({ ...cal, prose: undefined })); process.exit(2); }
console.log('calibration ok: 5 known rows -> 1 block-only, 2 without a block, 1 with a missing field');

const med = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : null; };
let total = 0, totalBlockOnly = 0, totalBad = 0;
for (const f of FILES) {
    const rows = JSON.parse(fs.readFileSync(path.join(HERE, f), 'utf8'));
    console.log(`\n${f}: ${rows.length} rows`);
    console.log('  model | arm | kind'.padEnd(44) + 'rows  block-only  no-block  field-missing  prose words min/p50');
    for (const [k, t] of [...tally(rows)].sort(([a], [b]) => a.localeCompare(b))) {
        total += t.rows; totalBlockOnly += t.blockOnly; totalBad += t.badField;
        console.log(`  ${k.padEnd(42)}${String(t.rows).padStart(4)}  ${String(t.blockOnly).padStart(10)}  ${String(t.noBlock).padStart(8)}  ${String(t.badField).padStart(13)}  ${t.prose.length ? Math.min(...t.prose) : '-'}/${med(t.prose) ?? '-'}`);
    }
}
console.log(`\nTOTAL rows ${total}; block-only ${totalBlockOnly}; rows with a missing field ${totalBad}`);
