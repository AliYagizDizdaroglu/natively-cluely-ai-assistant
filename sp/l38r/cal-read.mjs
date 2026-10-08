// Rule-8 calibration of read.mjs on a made-up extracted-answers file with known answers (never a real run).
//   node cal-read.mjs
import { readRep, classify } from './read.mjs';
let ok = true;
const check = (name, got, want) => { const g = JSON.stringify(got), w = JSON.stringify(want); const good = g === w; ok &&= good; console.log(`${good ? 'OK ' : 'BAD'} ${name}: ${g}${good ? '' : ` (want ${w})`}`); };
const A = {
    X1: { played: true, answer: 'Boosting.', ttftMs: 1500 },                       // routed, carries
    X2: { played: true, answer: 'Hard.', ttftMs: 1200 },                           // simple marked hard (a miss)
    X3: { played: true, answer: '', ttftMs: null },                                // nothing
    X4: { played: true, answer: 'Parquet for the snapshots.', ttftMs: 2100 },      // routed, carries
    X5: { played: true, answer: 'Constant time.', ttftMs: 1900 },                  // routed, MISSES (X5 wants log)
    X6: { played: true, answer: 'I am sorry, there was a system error.', ttftMs: 900 },  // apology
    F1: { played: false },                                                         // not played
    F2: { played: true, answer: 'L1, lasso.', ttftMs: 1700 },                      // routed, carries
    F3: { played: true, answer: 'O(1) on average, O(n) worst case, with a good hash function and load factor kept low.', ttftMs: 2000 }, // long (> 12 words)
    F4: { played: true, answer: 'No, immutable.', ttftMs: 1300 },                  // routed, carries
    F5: { played: true, answer: 'UDP.', ttftMs: 1100 },                            // routed, carries
    F6: { played: true, answer: '404.', ttftMs: 1000 },                            // routed, carries
    S1Q02: { played: true, answer: 'hard', ttftMs: 1400 },
    S1Q02F: { played: true, answer: 'Hard.', ttftMs: 1300 },
    S1Q04: { played: true, answer: 'Use a heap.', ttftMs: 1600 },                  // MISROUTED
    S1Q04F: { played: true, answer: '', ttftMs: null },                            // nothing
    S1Q05: { played: true, answer: 'HARD', ttftMs: 1000 },
    S1Q05F: { played: true, answer: 'Hard', ttftMs: 1000 },
    S1Q07: { played: true, answer: 'Hard.', ttftMs: 1000 },
    S1Q07F: { played: true, answer: 'Hard.', ttftMs: 1000 },
    S2Q02: { played: true, answer: 'Hard.', ttftMs: 1000 },
    S2Q02F: { played: true, answer: 'Hard.', ttftMs: 1000 },
};
check('classify', ['Boosting.', 'Hard.', '', 'system error inside', 'one two three four five six seven eight nine ten eleven twelve thirteen'].map((a) => classify({ played: true, answer: a })), ['routed', 'hard', 'nothing', 'apology', 'long']);
check('classify not played', classify({ played: false }), 'notPlayed');
const R = readRep(A, { X1: 'Boosting method', X5: 'O(log n)', S1Q04: 'Min-heap of size k' });
// routed simple = X1, X4, X5, F2, F4, F5, F6 (7); carrying the term = those minus X5 (6). The first version of this
// file expected 6 and 5: a miscount in the EXPECTED values, caught by the first run (cal-read.out.txt), not an
// instrument fault; corrected here before any real reading.
check('simple counts', [R.simple.routed, R.simple.hard, R.simple.nothing, R.simple.apology, R.simple.long, R.simple.notPlayed], [7, 1, 1, 1, 1, 1]);
check('simple carries', R.simple.carries, 6);
check('simple first word p50/p90 over the 7 routed (sorted 1000,1100,1300,1500,1700,1900,2100)', [R.simple.firstWordP50, R.simple.firstWordP90], [1500, 2100]);
check('simple words p50', R.simple.wordsP50, 2);
check('hard counts', [R.hard.routed, R.hard.hard, R.hard.nothing, R.hard.apology], [1, 8, 1, 0]);
check('hard misroute line', R.hard.lines.S1Q04, { cls: 'routed', answer: 'Use a heap.', ttftMs: 1600, pipelineCue: 'Min-heap of size k', sharesWord: true });
check('shares-a-word false', R.simple.lines.X5.sharesWord, false);
check('X2 marked hard is not routed', R.simple.lines.X2.cls, 'hard');
console.log(ok ? 'L38R READ CALIBRATION OK' : 'L38R READ CALIBRATION FAILED');
process.exit(ok ? 0 : 1);
