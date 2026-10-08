import { cutAtWordBudget } from './mB.mjs';

const cw = s => (s.match(/\S+/g) ?? []).length;
async function* chunked(t, n) { for (let i = 0; i < t.length; i += n) yield t.slice(i, i + n); }
async function run(text, size, opts = {}) {
    const done = [];
    let out = '';
    for await (const c of cutAtWordBudget(chunked(text, size), { limit: 80, floor: 40, ...opts, onDone: r => done.push(r) })) out += c;
    return { out, done };
}
let fails = 0;
const check = (name, ok, extra = '') => { if (!ok) { fails++; console.log('FAIL:', name, extra); } };

// --- CALIBRATION: known answer from the brief's test 1 ---
const s = (n, i) => Array.from({ length: n }, (_, k) => `w${i}x${k}`).join(' ') + '.';
{
    const text = [1,2,3,4,5,6].map(i => s(20, i)).join(' ');
    const { out, done } = await run(text, 7);
    check('calib: 80 words', cw(out) === 80, cw(out));
    check('calib: cut true', done[0].cut === true, JSON.stringify(done));
}

// --- INVARIANT SWEEP: output must always be a PREFIX of the input ---
const corpus = [
    [1,2,3,4,5,6].map(i => s(20, i)).join(' '),
    [1,2,3,4,5].map(i => s(20, i)).join(' '),
    s(30,1) + ' ' + s(60,2),
    s(95,1) + ' ' + s(10,2),
    s(25,1) + ' ' + s(30,2),
    s(22,1) + ' ' + s(23,2) + ' The p99 is 3.5 seconds on the old path and 1.2 on the new one.',
    // uncovered by the suite:
    'Is it fast? ' + s(38,1) + ' Wow! ' + s(30,2) + ' He said "yes." ' + s(30,3),          // ! ? and closing quote
    s(20,1) + '\n' + s(25,2) + '\n\n' + s(50,3),                                            // newline separators
    s(19,1) + ' (See the note.) ' + s(25,2) + ' [Ref.] ' + s(40,3),                          // closing bracket
    'One two three.',                                                                        // tiny
    '',                                                                                      // empty
    '   ',                                                                                   // whitespace only
    s(45,1),                                                                                 // single sentence, no trailing space
    s(45,1) + ' ',                                                                           // single sentence + trailing space
    'e.g. this is a clause. ' + s(50,1) + ' ' + s(30,2),                                     // abbreviation
    'The rate is 99.9% and 1,000.5 units. ' + s(45,1) + ' ' + s(40,2),                       // decimals
];
for (const text of corpus) {
    for (const size of [1, 2, 3, 5, 7, 13, 50, 1000]) {
        const { out, done } = await run(text, size);
        check('prefix', text.startsWith(out), JSON.stringify({ size, out: out.slice(0, 60), text: text.slice(0, 60) }));
        check('onDone once', done.length === 1, JSON.stringify(done));
        check('words match output', done[0].words === cw(out), JSON.stringify({ size, reported: done[0].words, actual: cw(out) }));
        check('cut flag consistent', done[0].cut === (out.trim() !== text.trim()), JSON.stringify({ size, cut: done[0].cut, same: out === text }));
        check('allowance flag', done[0].allowance === (done[0].words > 80), JSON.stringify(done));
    }
    // chunk-size invariance against the whole-text-in-one-chunk result
    const ref = (await run(text, 100000)).out;
    for (const size of [1, 2, 3, 5, 7, 13, 50]) {
        const o = (await run(text, size)).out;
        check('chunk invariance', o === ref, JSON.stringify({ size, o: o.slice(-50), ref: ref.slice(-50) }));
    }
}
console.log(fails === 0 ? 'ALL PROBES PASS' : `${fails} PROBE FAILURES`);
