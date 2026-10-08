// Calibrates read.mjs on made-up answers with known outcomes, before any real reading.
import { readAll, classify, TERMS } from './read.mjs';
const rec = (answer, ttftMs = 1000) => ({ played: true, answer, ttftMs });
const good = {
    QP1: rec('O(1).'), QF1: rec('O(n).', 900), AP1: rec('hard'), AF1: rec('Hard.'),
    QP2: rec('Yes.'), QF2: rec('No, tuples are immutable.', 800), AP2: rec('hard'), AF2: rec('hard'),
    QP3: rec('404'), QF3: rec('500 Internal Server Error.', 700), AP3: rec('hard'), AF3: rec('hard'),
    QP4: rec('Yes, O(log n).'), QF4: rec('O of n', 1200), AP4: rec('hard'), AF4: rec('hard'),
    QP5: rec('Yes.'), QF5: rec('No.', 600), AP5: rec('hard'), AF5: rec('hard'),
    QP6: rec('L1.'), QF6: rec('L2 regularization.', 1100), AP6: rec('hard'), AF6: rec(''),
};
let fails = 0;
const check = (name, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) fails++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}: got ${JSON.stringify(got)} want ${JSON.stringify(want)}`); };
let a = readAll([good, good]);
check('all good -> met', a.allMet, true);
check('QF carries 6', a.R[0].sets.QF.carries, 6);
check('AF nothing counted', a.R[0].sets.AF.nothing, 1);
check('p50 of QF times', a.firstWordP50, 900);
// AF answered twice -> bar fails
const b = { ...good, AF1: rec('O(n log n).'), AF3: rec('I would use Redis with a TTL keyed on the event id because it is fast and simple to operate.') };
a = readAll([good, b]);
check('AF 2 answered -> rep2 fails', a.R[1].bars.afAnswered, false);
check('AF long counted', a.R[1].sets.AF.long, 1);
check('not all met', a.allMet, false);
// QF misses: wrong terms
const c = { ...good, QF1: rec('O(log n).'), QF4: rec('O(log n).') };
a = readAll([c, good]);
check('QF O(log n) is not O(n)', a.R[0].sets.QF.carries, 4);
check('carry bar fails at 4', a.R[0].bars.qfCarry, false);
// QF holes
const d = { ...good, QF2: rec(''), QF3: { played: true, answer: 'Sorry, a system error occurred.' } };
a = readAll([d, good]);
check('QF holes 2 -> fail', a.R[0].bars.qfHoles, false);
// slow
const e = Object.fromEntries(Object.entries(good).map(([k, v]) => [k, { ...v, ttftMs: 3000 }]));
a = readAll([e, e]);
check('slow -> time bar fails', a.timeBar, false);
// spoken big-O forms (amendment): counted by TERMS, not by the registered terms
const f = { ...good, QP1: rec('Order of one.'), QF1: rec('Order of n.'), QF4: rec('Order of n log n.') };
a = readAll([f, good]);
check('order-of forms carry (QF4 n log n does not)', a.R[0].sets.QF.carries, 5);
check('registered terms miss order-of', a.R[0].sets.QF.carriesOriginal, 4);
check('QP1 order of one carries', a.R[0].sets.QP.carries, 6);
// terms sanity
check('immutable not "mutable" yes', TERMS.QP2.test('They are immutable'), false);
check('L2 not L1', TERMS.QP6.test('L2.'), false);
check('classify hard', classify(rec('Hard.')), 'hard');
check('classify not played', classify({ played: false }), 'notPlayed');
console.log(fails ? `CALIBRATION FAILED: ${fails}` : 'CALIBRATION OK');
