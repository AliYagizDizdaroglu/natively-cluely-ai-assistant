// Rule-8 calibration of mechanics-et38.mjs on runs whose numbers are already recorded:
//   L20c r1-r3 (mechanics.out.txt): answered 17/18 with the hole S1Q09F, 18/18, 18/18; first word p50 1.3, 1.3, 1.9 s;
//   ET10 low (RESULT.md): 10 answered, no system error, first word p50 6.2 s, p90 9.4 s, a holding line on 5 of 10;
//   ET10 medium (RESULT2.md): system-error apologies on S1Q02F, S1Q04, S1Q05, S1Q07F, S2Q02F;
// and the early-stop rule on made-up counts. Prints counts and times only.
import fs from 'node:fs';
import { repMechanics, armState, isAnswered, pct } from './mechanics-et38.mjs';
const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
let ok = true;
const check = (name, got, want) => { const good = JSON.stringify(got) === JSON.stringify(want); if (!good) ok = false; console.log(`${good ? 'OK ' : 'BAD'} ${name}: ${JSON.stringify(got)}${good ? '' : ` (want ${JSON.stringify(want)})`}`); };
const J = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const srt = (a) => [...a].sort((x, y) => x - y);
const s1 = (ms) => +(ms / 1000).toFixed(1);

const idsC = J(`${SP}/l20c/items.json`).pairs.flat();
const want = [[17, ['S1Q09F'], 1.3], [18, [], 1.3], [18, [], 1.9]];
for (const r of [1, 2, 3]) {
    const m = repMechanics(idsC, J(`${SP}/l20c/runs/live38-r${r}.answers.json`), J(`${SP}/l20c/runs/live38-r${r}.json`));
    // L20c's per-run p50 is over the answered items only (mechanics-l20c.mjs: `fin`), as `first` is here
    check(`L20c r${r}: answered, holes, first word p50 (s) over the answered`, [m.answered.length, m.holes, s1(pct(srt(m.first), 0.5))], want[r - 1]);
    console.log(`     slow feed: ${m.slow.join(' ') || 'none'}; abnormal sessions ${m.abnormal} of ${m.sessions}`);
}
const idsE = J(`${SP}/et10/runs/et10-low.json`).pairs.flat();
const low = repMechanics(idsE, J(`${SP}/et10/runs/et10-low.answers.json`), J(`${SP}/et10/runs/et10-low.json`));
check('ET10 low: answered 10, no apology, first word p50 6.2 s and p90 9.4 s, a holding line on 5', [low.answered.length, low.apologies, s1(pct(srt(low.first), 0.5)), s1(pct(srt(low.first), 0.9)), low.holding], [10, [], 6.2, 9.4, 5]);
console.log(`     ET10 low last word p50 ${s1(pct(srt(low.last), 0.5))} s, p90 ${s1(pct(srt(low.last), 0.9))} s (RESULT.md: 29.8 and 56.4, by its own percentile rule); slow feed: ${low.slow.join(' ') || 'none'}`);
const med = repMechanics(idsE, J(`${SP}/et10/runs/et10-medium.answers.json`), J(`${SP}/et10/runs/et10-medium.json`));
check('ET10 medium: the five system-error apologies are holes', srt(med.apologies.map(String)).join(' '), 'S1Q02F S1Q04 S1Q05 S1Q07F S2Q02F');
check('ET10 medium: answered = 10 minus the five apologies', [med.answered.length, med.holes.length], [5, 5]);

check('isAnswered: not played', isAnswered({ played: false, answer: 'x' }), false);
check('isAnswered: an empty answer', isAnswered({ played: true, answer: '  ' }), false);
check('isAnswered: a spoken system-error apology', isAnswered({ played: true, answer: 'I ran into a System Error, sorry.' }), false);
check('isAnswered: a real answer', isAnswered({ played: true, answer: 'I would shard by tenant.' }), true);
check('armState: medium, 4 holes after rep 1 can still reach 110 of 114', armState('medium', 4, 1), 'CONTINUE');
check('armState: medium, 5 holes after rep 1 cannot', armState('medium', 5, 1), 'STOP');
check('armState: medium, 5 holes after rep 2 cannot', armState('medium', 5, 2), 'STOP');
check('armState: medium, 9 holes after rep 3 is done (the rule reads it then)', armState('medium', 9, 3), 'DONE');
check('armState: low never stops early: 5 holes after rep 1', armState('low', 5, 1), 'CONTINUE');
check('armState: low, 20 holes after rep 2', armState('low', 20, 2), 'CONTINUE');
check('armState: low, 0 holes after rep 3', armState('low', 0, 3), 'DONE');
console.log(ok ? 'ET38 MECHANICS CALIBRATION OK' : 'ET38 MECHANICS CALIBRATION FAILED');
process.exit(ok ? 0 : 1);
