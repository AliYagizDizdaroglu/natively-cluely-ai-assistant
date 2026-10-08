// Rule-8 calibration of mechanics-l20d.mjs on cases whose answers are already known.
//   Real runs: L20c r1-r3 (mechanics.out.txt: answered 17/18 with hole S1Q09F, 18/18, 18/18; first word p50 1.3, 1.3,
//   1.9 s) and the old Live arm as L20d will see it, L20b rN + L20c rN merged to 38 items: 111 answered (holes r1 S1Q02,
//   S1Q02F, S1Q09F), and RESULT-l20c.md's "first word over 114 (a hole = no first word): p50 1.8 s, p90 6.4 s".
//   Synthetic cases at the edges of clause 4 (110 / 109 / retry rule) and clause 5 (p50 3000 / 3001, p90 6600 / 6601,
//   11 vs 12 holes at the top, the slow-feed exclusion on and off), and words-by-6.6-s with a hand-counted answer.
//   Then the command line on a folder of three stand-in reps.
// Prints counts and times only.
//   node cal-mechanics-l20d.mjs
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { repMechanics, clause4, clause5, armState, isAnswered, wordsBy, pct, SLOW_FEED } from './mechanics-l20d.mjs';
const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
let ok = true;
const check = (name, got, want) => { const good = JSON.stringify(got) === JSON.stringify(want); if (!good) ok = false; console.log(`${good ? 'OK ' : 'BAD'} ${name}: ${JSON.stringify(got)}${good ? '' : ` (want ${JSON.stringify(want)})`}`); };
const J = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const srt = (a) => [...a].sort((x, y) => x - y);
const s1 = (ms) => +(ms / 1000).toFixed(1);

// ---- real runs ------------------------------------------------------------------------------------------------
const idsC = J(`${SP}/l20c/items.json`).pairs.flat();
const want = [[17, ['S1Q09F'], 1.3], [18, [], 1.3], [18, [], 1.9]];
for (const r of [1, 2, 3]) {
    const m = repMechanics(idsC, J(`${SP}/l20c/runs/live38-r${r}.answers.json`), J(`${SP}/l20c/runs/live38-r${r}.json`));
    check(`L20c r${r}: answered, holes, first word p50 (s) over the answered`, [m.answered.length, m.holes, s1(pct(srt(m.first), 0.5))], want[r - 1]);
}
const ids = J(`${SP}/et38/items.json`).pairs.flat();
const mergedAnswers = (r) => ({ ...J(`${SP}/l20b/runs/live38-r${r}.answers.json`), ...J(`${SP}/l20c/runs/live38-r${r}.answers.json`) });
const mergedRun = (r) => { const b = J(`${SP}/l20b/runs/live38-r${r}.json`), c = J(`${SP}/l20c/runs/live38-r${r}.json`); return { t0Iso: b.t0Iso, sessions: [...b.sessions, ...c.sessions], events: [...b.events, ...c.events] }; };
const old = [1, 2, 3].map((r) => repMechanics(ids, mergedAnswers(r), mergedRun(r)));
check('old Live arm, 38 items per rep: answered 35, 38, 38; r1 holes S1Q02 S1Q02F S1Q09F', [old.map((m) => m.answered.length), old[0].holes], [[35, 38, 38], ['S1Q02', 'S1Q02F', 'S1Q09F']]);
const c4 = clause4(old, 38), c5 = clause5(old);
check('old Live arm: clause 4 reads 111/114 -> PASS', [c4.answered, c4.of, c4.state], [111, 114, 'PASS']);
check('old Live arm: clause 5 over 114 (3 holes = no first word, no slow feed): p50 1.8 s, p90 6.4 s (RESULT-l20c.md), n 114 -> PASS', [s1(c5.p50), s1(c5.p90), c5.n, c5.noFirstWord, c5.slow, c5.state], [1.8, 6.4, 114, 3, 0, 'PASS']);
// L20b's own record (l20b/mechanics.out.txt): r1 had 3 abnormal sessions of 12, the pairs S1Q02 and S1Q04 each retried once; r2, r3 and L20c's three runs none
check('old Live arm: retried pairs, pairs retried more than once, abnormal sessions, per rep = L20b\'s record', [old.map((m) => [m.retried, m.overRetried, m.abnormal])], [[[['S1Q02', 'S1Q04'], [], 3], [[], [], 0], [[], [], 0]]]);

// ---- predicates -----------------------------------------------------------------------------------------------
check('isAnswered: not played', isAnswered({ played: false, answer: 'x' }), false);
check('isAnswered: an empty answer', isAnswered({ played: true, answer: '  ' }), false);
check('isAnswered: a spoken system-error apology', isAnswered({ played: true, answer: 'I ran into a System Error, sorry.' }), false);
check('isAnswered: a real answer', isAnswered({ played: true, answer: 'I would shard by tenant.' }), true);
check('armState: 2 reps -> CONTINUE, 3 -> DONE', [armState(2), armState(3)], ['CONTINUE', 'DONE']);

// ---- clause 4 -------------------------------------------------------------------------------------------------
const fake = (n, over = []) => ({ answered: Array(n).fill('x'), overRetried: over });
check('clause 4: 38 + 36 + 36 = 110 answered -> PASS (the edge)', clause4([fake(38), fake(36), fake(36)], 38).state, 'PASS');
check('clause 4: 38 + 36 + 35 = 109 answered -> FAIL', clause4([fake(38), fake(36), fake(35)], 38).state, 'FAIL');
check('clause 4: 114 answered but a pair retried more than once -> INVALID, never PASS', clause4([fake(38), fake(38, ['S1Q04']), fake(38)], 38), { state: 'INVALID', answered: 114, of: 114, over: ['S1Q04'] });
check('clause 4: two reps, 4 holes so far -> NOT READABLE (110 still reachable)', clause4([fake(38), fake(34)], 38).state, 'NOT READABLE');
check('clause 4: two reps, 5 holes so far -> FAIL (110 of 114 is out of reach)', clause4([fake(38), fake(33)], 38).state, 'FAIL');
check('clause 4: a broken-window rep (18 answered) leaves 20 holes -> FAIL by arithmetic', clause4([fake(38), fake(18)], 38).state, 'FAIL');

// ---- clause 5 -------------------------------------------------------------------------------------------------
const lat = (arr) => [{ latency: arr.slice(0, 38), slow: [] }, { latency: arr.slice(38, 76), slow: [] }, { latency: arr.slice(76), slow: [] }];
const fill = (n, v) => Array(n).fill(v);
const c = (arr) => clause5(lat(arr)).state;
check('clause 5: 114 at 1 s -> PASS', c(fill(114, 1000)), 'PASS');
check('clause 5: p50 exactly 3000 ms (57 at 1000, 57 at 3000) -> PASS (<=)', c([...fill(57, 1000), ...fill(57, 3000)]), 'PASS');
check('clause 5: p50 3001 ms -> FAIL', c([...fill(57, 1000), ...fill(57, 3001)]), 'FAIL');
check('clause 5: p90 exactly 6600 (102 at 1000, 12 at 6600) -> PASS', c([...fill(102, 1000), ...fill(12, 6600)]), 'PASS');
check('clause 5: p90 6601 -> FAIL', c([...fill(102, 1000), ...fill(12, 6601)]), 'FAIL');
check('clause 5: 11 holes (no first word) at the top, 103 at 1 s -> PASS', c([...fill(103, 1000), ...fill(11, Infinity)]), 'PASS');
check('clause 5: 12 holes -> FAIL (a hole is a slow item, not a missing one)', c([...fill(102, 1000), ...fill(12, Infinity)]), 'FAIL');
check('clause 5: one rep only -> NOT READABLE', clause5([{ latency: fill(38, 1000), slow: [] }]).state, 'NOT READABLE');
check('clause 5: an empty population -> FAIL, never a pass', clause5([{ latency: [], slow: [] }, { latency: [], slow: [] }, { latency: [], slow: [] }]).state, 'FAIL');

// ---- slow feed, retries, words by 6.6 s on a synthetic run ----------------------------------------------------
// items A1 (ratio 1.30), A2 (1.31), A3 (1.29), A4 (1.50, no answer: a hole that is also slow-feed)
const mkRun = (ratios, sessions) => {
    const events = []; let t = 1000;
    for (const [id, ratio] of Object.entries(ratios)) { events.push({ t, item: id, kind: 'clipStart', seconds: 10 }); t += Math.round(10000 * ratio); events.push({ t, item: id, kind: 'clipEnd' }); t += 2000; }
    return { t0Iso: 'synthetic', sessions, events };
};
const sess = (n, ids) => Array.from({ length: n }, (_, i) => ({ pair: ids, attempt: i + 1, abnormal: i < n - 1 }));
const A = { A1: { played: true, answer: 'one', ttftMs: 20000, words: 1, thoughts: 0 }, A2: { played: true, answer: 'two', ttftMs: 20000, words: 1, thoughts: 0 }, A3: { played: true, answer: 'three', ttftMs: 2000, words: 1, thoughts: 0 }, A4: { played: true, answer: '', ttftMs: null, words: 0, thoughts: 0 } };
const m = repMechanics(['A1', 'A2', 'A3', 'A4'], A, mkRun({ A1: 1.30, A2: 1.31, A3: 1.29, A4: 1.50 }, sess(1, ['A1', 'A2'])));
check(`slow feed: ratio 1.30 is not slow (> ${SLOW_FEED} is), 1.31 and 1.50 are`, m.slow, ['A2', 'A4']);
check('slow feed: the latency population leaves the slow ANSWERED item A2 out and keeps the slow HOLE A4 as Infinity (A1 20 s, A3 2 s, A4 none)', [m.latency, m.slowAnswered], [[20000, 2000, Infinity], ['A2']]);
check('slow feed: A2 stays answered (its answer is graded and counts for clause 4)', [m.answered, m.holes], [['A1', 'A2', 'A3'], ['A4']]);
const m2 = repMechanics(['A1', 'A2', 'A3', 'A4'], A, mkRun({ A1: 1.30, A2: 1.0, A3: 1.29, A4: 1.0 }, sess(1, ['A1', 'A2'])));
check('same items with normal feeds: nothing is left out and the hole A4 is Infinity (the exclusion is what differed)', m2.latency, [20000, 20000, 2000, Infinity]);
const m3 = repMechanics(['A1', 'A2'], A, mkRun({ A1: 1, A2: 1 }, [...sess(2, ['A1', 'A2']), ...sess(3, ['B1', 'B2'])]));
check('retries: a pair with two sessions is retried; a pair with three is over-retried; abnormal sessions counted', [m3.retried, m3.overRetried, m3.abnormal], [['A1'], ['B1'], 3]);

// quota closes (Opus review M8): a close whose reason names quota or RESOURCE_EXHAUSTED is recorded distinctly and, pending the amendment, is a hole.
const qrun = mkRun({ A1: 1, A2: 1, A3: 1, A4: 1 }, sess(1, ['A1', 'A2']));
qrun.events.push({ t: 1, item: 'A1', kind: 'close', code: 1011, reason: 'You exceeded your current quota (RESOURCE_EXHAUSTED)' },   // final attempt, quota: A1 becomes a hole although its text exists
    { t: 2, item: 'A2', kind: 'close', code: 1011, reason: 'Internal error encountered.' },                                                    // not quota
    { t: 3, item: 'A3~a1', kind: 'close', code: 1011, reason: 'Quota exceeded for metric' },                                                  // quota in a FAILED attempt: recorded, not a hole
    { t: 4, item: null, kind: 'close', code: 1000, reason: '' });                                                                             // a normal close
const mq = repMechanics(['A1', 'A2', 'A3', 'A4'], A, qrun);
check('quota close: two quota closes recorded (A1 final, A3 in a failed attempt); the internal-error close and the normal close are not', mq.quota, [{ item: 'A1', final: true }, { item: 'A3', final: false }]);
check('quota close: A1 (a final-attempt quota close) is a hole although its text exists; A3 stays answered; its latency is Infinity', [mq.quotaHoles, mq.answered, mq.latency[0]], [['A1'], ['A2', 'A3'], Infinity]);
const mq2 = repMechanics(['A1', 'A2', 'A3', 'A4'], A, qrun, { quotaIsHole: false });
check('quota close, the constant flipped: A1 is answered again, the closes are still recorded', [mq2.quotaHoles, mq2.answered.includes('A1'), mq2.quota.length], [[], true, 2]);

// words by 6.6 s: hand-counted. Answer turn starts 1500 ms after the question; a holding chunk at 500 and a premature one (null) are not part of it.
const ev = (kind, since, text) => ({ item: 'W1', kind, sinceClipEnd: since, text });
const R = { events: [ev('outputTx', null, 'early '), ev('outputTx', 500, 'Hold on'), ev('turnComplete', 600), ev('outputTx', 1500, 'I would'), ev('outputTx', 3000, ' use a queue'), ev('turnComplete', 3100), ev('outputTx', 6600, 'and retry'), ev('outputTx', 6601, ' later today'), { item: 'W2', kind: 'outputTx', sinceClipEnd: 2000, text: 'other item' }] };
check('words by 6.6 s: "I would use a queue" + "and retry" (6600 included) = 7 words; the holding line, the premature chunk, 6601 and another item are not counted', wordsBy(R, 'W1', 1500), 7);
check('words by 6.6 s: a turn boundary is a space ("queue" | "and" stay two words, not "queueand")', wordsBy({ events: [ev('outputTx', 1000, 'foo'), ev('turnComplete', 1100), ev('outputTx', 1200, 'bar')] }, 'W1', 1000), 2);
check('words by 3 s only: "I would use a queue" = 5', wordsBy(R, 'W1', 1500, 3000), 5);

// ---- the command line on a folder of three stand-in reps ------------------------------------------------------
const D = `${SP}/l20d/cal-mechanics`;
fs.rmSync(D, { recursive: true, force: true });
fs.mkdirSync(`${D}/runs`, { recursive: true });
fs.copyFileSync(`${SP}/l20d/items.json`, `${D}/items.json`);
const cli = () => { const r = spawnSync(process.execPath, [`${SP}/l20d/mechanics-l20d.mjs`, '--dir', D], { encoding: 'utf8' }); return r.stdout + r.stderr; };
const put = (r) => { fs.writeFileSync(`${D}/runs/l20d-r${r}.answers.json`, JSON.stringify(mergedAnswers(r))); fs.writeFileSync(`${D}/runs/l20d-r${r}.json`, JSON.stringify(mergedRun(r))); };
put(1);
let out = cli();
check('CLI, one rep: the ARM line says reps 1, answered 35/38, holes 3, last run answered 35 -> CONTINUE', out.match(/^ARM .*$/m)?.[0], 'ARM l20d: reps 1, answered 35/38, holes 3, last run answered 35 -> CONTINUE');
check('CLI, one rep: clause 4 and 5 read NOT READABLE', [/clause 4 .*-> NOT READABLE$/m.test(out), /clause 5 .*-> NOT READABLE$/m.test(out)], [true, true]);
put(2); put(3);
out = cli();
check('CLI, three reps: ARM line', out.match(/^ARM .*$/m)?.[0], 'ARM l20d: reps 3, answered 111/114, holes 3, last run answered 38 -> DONE');
check('CLI, three reps: clause 4 111/114 PASS; clause 5 p50 1.8 s, p90 6.4 s PASS', [out.match(/^clause 4 .*$/m)?.[0], out.match(/^clause 5 .*$/m)?.[0]], ['clause 4 (reliability): answered 111/114, need >= 110 -> PASS', 'clause 5 (speed): first word p50 1.8 s <= 3.0 s and p90 6.4 s <= 6.6 s over 114 slots -> PASS']);
// a manual retry appended to a pair that already retried: three sessions -> INVALID through the CLI
const R1 = JSON.parse(fs.readFileSync(`${D}/runs/l20d-r1.json`, 'utf8'));
const pair = R1.sessions[0].pair;
R1.sessions.push({ pair, attempt: 2, abnormal: true }, { pair, attempt: 3, abnormal: false });
fs.writeFileSync(`${D}/runs/l20d-r1.json`, JSON.stringify(R1));
out = cli();
check('CLI: a pair with three sessions -> clause 4 INVALID and the pair is named', [/clause 4 .*-> INVALID$/m.test(out), out.includes(pair[0])], [true, true]);
console.log(ok ? 'L20D MECHANICS CALIBRATION OK' : 'L20D MECHANICS CALIBRATION FAILED');
process.exit(ok ? 0 : 1);
