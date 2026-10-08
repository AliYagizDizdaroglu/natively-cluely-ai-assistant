// Builder B scratch (read-only, no API): an INDEPENDENT tally of the known cases, written before the adapter and
// sharing no code with it, so the adapter's counts can be compared with numbers that did not come from the adapter.
// Reads only the merged judge files (verdict field) and the answers files' hole / empty-prose fields. Prints ids and
// counts; never an answer, a reason, a prompt or a raw text.
//   node B-expected-counts.mjs <run-dir> <cue family> <control family>
import fs from 'node:fs';
import path from 'node:path';
const [dir, CUE, CTL] = process.argv.slice(2);
const EXCL = new Set(['R02F', 'R04F', 'R09F', 'R11F', 'R13F']);
const J = (f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
for (const [side, fam] of [['control', CTL], ['cue', CUE]]) {
    for (const [i, suf] of ['', '-r2', '-r3'].entries()) {
        const a = J(`interview60.answers.${fam}${suf}.json`);
        const j = J(`interview60.judge.${fam}${suf}.json`);
        const recs = Object.values(a);
        const holes = recs.filter((v) => v.transientError).map((v) => v.id);
        const empties = recs.filter((v) => !v.transientError && !v.spoken).map((v) => v.id);
        const items = Object.values(j.items);
        const acc = items.filter((v) => v.verdict === 'acceptable').length;
        const wrong = items.filter((v) => v.verdict === 'wrong').map((v) => v.id);
        const wrongGated = wrong.filter((id) => !EXCL.has(id));
        console.log(`${side.padEnd(7)} rep ${i + 1}: records ${recs.length}, holes [${holes.join(' ')}], empty prose [${empties.join(' ')}], acceptable ${acc}, verdict-wrong all ${wrong.length} [${wrong.join(' ')}], gated ${wrongGated.length} [${wrongGated.join(' ')}]`);
    }
}
