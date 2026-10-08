// Rule-8 calibration of benchDecide() and blockShape(): known cases on every rule and its edge.
import { benchDecide, blockShape } from './cuebench-score.mjs';
const rep = (r, c, q) => ({ rep: r, control: { acc: c[0], wrong: c[1] }, cue: { acc: q[0], wrong: q[1], n: 39, present: q[2] ?? 39, shape: q[3] ?? 39, ttftP90: 0 }, controlTtftP90: 0 });
const cases = [
    ['cue band equal to control', [rep(1, [30, 0], [30, 0]), rep(2, [28, 0], [28, 0]), rep(3, [32, 0], [32, 0])], 'PASS'],
    ['cue band overlaps at its top edge (cue max = control min)', [rep(1, [30, 0], [26, 0]), rep(2, [28, 0], [27, 0]), rep(3, [32, 0], [28, 0])], 'PASS'],
    ['cue band entirely below by half a point', [rep(1, [30, 0], [26, 0]), rep(2, [28, 0], [27, 0]), rep(3, [32, 0], [27.5, 0])], 'STOP'],
    ['cue band exceeds control', [rep(1, [25, 0], [33, 0]), rep(2, [26, 0], [34, 0]), rep(3, [27, 0], [35, 0])], 'PASS'],
    ['cue wrong equal to the worst control rep', [rep(1, [30, 0], [30, 2]), rep(2, [30, 2], [30, 1]), rep(3, [30, 1], [30, 0])], 'PASS'],
    ['one cue rep with one more wrong than the worst control rep', [rep(1, [30, 0], [30, 3]), rep(2, [30, 2], [30, 1]), rep(3, [30, 1], [30, 0])], 'STOP'],
    ['present and shape exactly 90% (35.1 of 39 needs 36)', [rep(1, [30, 0], [30, 0, 36, 36]), rep(2, [30, 0], [30, 0, 39, 39]), rep(3, [30, 0], [30, 0, 39, 39])], 'PASS'],
    ['lines-only overrun: shape 35 of 39 in one rep', [rep(1, [30, 0], [30, 0, 39, 35]), rep(2, [30, 0], [30, 0, 39, 39]), rep(3, [30, 0], [30, 0, 39, 39])], 'STOP'],
    ['present 35 of 39 in one rep', [rep(1, [30, 0], [30, 0, 39, 39]), rep(2, [30, 0], [30, 0, 35, 39]), rep(3, [30, 0], [30, 0, 39, 39])], 'STOP'],
    // words are reported, never gated: a rep whose every block has a 6-word line still passes on shape
    ['words-only overrun (long lines are not part of the gate)', [rep(1, [30, 0], [30, 0, 39, 39]), rep(2, [30, 0], [30, 0, 39, 39]), rep(3, [30, 0], [30, 0, 39, 39])].map((x) => ({ ...x, cue: { ...x.cue, longBlocks: 39 } })), 'PASS'],
];
let ok = true;
for (const [name, reps, want] of cases) {
    const d = benchDecide(reps);
    const good = d.outcome === want;
    ok &&= good;
    console.log(`${good ? 'OK ' : 'BAD'} ${name}: ${d.outcome}${d.reasons.length ? ` (${d.reasons.join('; ')})` : ''}`);
}
let threw = false; try { benchDecide([rep(1, [1, 0], [1, 0])]); } catch { threw = true; }
ok &&= threw; console.log(`${threw ? 'OK ' : 'BAD'} refuses a bench without 3 reps`);
// blockShape at the shipped limits 3 x 5
const SHAPES = [
    ['one line of one word', ['Parquet'], { present: true, shape: true, longLines: 0 }],
    ['exactly 3 lines of 5 words (the boundary)', ['a b c d e', 'f g h i j', 'k l m n o'], { present: true, shape: true, longLines: 0 }],
    ['4 short lines (over the line limit)', ['a', 'b', 'c', 'd'], { present: true, shape: false, longLines: 0 }],
    ['a 6-word line: shaped, word overrun reported', ['a b c d e f'], { present: true, shape: true, longLines: 1 }],
    ['a question', ['Why Parquet?'], { present: true, shape: false, longLines: 0 }],
    ['addresses the listener', ['As you know'], { present: true, shape: false, longLines: 0 }],
    ['an empty line', ['Parquet', ''], { present: true, shape: false, longLines: 0 }],
    ['absent block', [], { present: false, shape: false, longLines: 0 }],
    ['no cues field at all', undefined, { present: false, shape: false, longLines: 0 }],
];
for (const [name, cues, want] of SHAPES) {
    const s = blockShape(cues, 3, 5);
    const good = s.present === want.present && s.shape === want.shape && s.longLines === want.longLines;
    ok &&= good;
    console.log(`${good ? 'OK ' : 'BAD'} blockShape ${name}: ${JSON.stringify(s)}`);
}
console.log(ok ? 'CUEBENCH CALIBRATION OK' : 'CUEBENCH CALIBRATION FAILED');
process.exit(ok ? 0 : 1);
