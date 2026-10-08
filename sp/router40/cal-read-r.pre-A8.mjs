// Known-answer cases of P3 (read-r.mjs), A2.5 + A3.2 + A4: (a) 20 synthetic cases run with --variant B (each isolates its rule: the expected `why` is asserted too),
// one flipped expectation must be reported; (b) the real live40-r1 events: 46 answer + RH14 silent, 0 malformed/cut/early, max 79 words, every T byte-equal 46/46.
// Prints classes, counts and booleans only (the live40-r1 texts are compared in-process and never printed).
import { classify, recordFromEvents, readRun, CLASSES, confusion } from './read-r.mjs';
import { calRun } from './cal-util.mjs';
import { L40, BLOCK_B, normWords, readJson, loadItems } from './r40-common.mjs';

const C = calRun('read-r');
const filler = (n) => { const base = 'the quick brown fox jumps over a lazy dog'.split(' '); return Array.from({ length: n }, (_, i) => base[i % base.length]).join(' '); };
const neutral14 = 'alpha beta gamma delta epsilon the zeta eta theta iota kappa lambda mu nu';
/** events for one item: spec { play, early, turns: [{ text, end }], close, noOutput, cap } */
function events(id, s = {}) {
    const E = [];
    const add = (kind, extra = {}) => E.push({ item: id, kind, ...extra });
    add('clipStart');
    if (s.play === false) { add('close', { code: 1011 }); return E; }
    if (s.early) add('outputTx', { _text: `${s.early} ` });
    add('clipEnd');
    for (const t of s.turns ?? []) {
        add('outputTx', { _text: t.text });
        if (t.end === 'turnComplete') { add('generationComplete'); add('turnComplete'); }
        else if (t.end === 'interrupted') add('interrupted');
    }
    if (s.cap) add('cap');
    add('itemDone', { reason: s.cap ? 'cap' : s.noOutput ? 'noOutput' : 'quietAfterTurn' });
    add('close', { code: s.close ?? 1000 });
    return E;
}
const T1 = (text, end = 'turnComplete') => ({ turns: [{ text, end }] });
const CASES = [
    [1, '`hard`', T1('hard'), 'hard'],
    [2, '`Hard.`', T1('Hard.'), 'hard'],
    [3, '`HARD! A Docker image is …` (+tail)', T1('HARD! A Docker image is a packaged filesystem snapshot.'), 'hard', { hardTail: true }],
    [4, '`<system> hard </system>`', T1('<system> hard </system>'), 'malformed', { why: 'has < > or [' }],
    [5, '`This is hard to say …` (hard in the first 12, not first)', T1('This is hard to say but I would start with the basics.'), 'malformed', { why: 'hard among the first 12 words, not first' }],
    [6, '8 consecutive words of BLOCK_B (a recital)', T1(normWords(BLOCK_B).slice(8, 16).join(' ')), 'malformed', { why: 'recital: 8 consecutive words shared with INSTRUCTION/BLOCK' }],
    [7, 'a Spanish sentence of 12 words', T1('Un contenedor es una instancia ligera que se ejecuta desde una imagen'), 'malformed', { why: 'no common English function word in >= 8 words' }],
    [8, '14 neutral words + `so it is hard` (hard in the last 3 only)', T1(`${neutral14} so it is hard`), 'malformed', { why: 'hard among the last 3 words' }],
    [9, 'two completed turns: 14 neutral words, then `hard, because it needs a full design`', { turns: [{ text: neutral14, end: 'turnComplete' }, { text: 'hard, because it needs a full design', end: 'turnComplete' }] }, 'malformed', { why: 'a later completed turn starts with hard' }],
    [10, '151 words', T1(filler(151)), 'too-long'],
    [11, '150 words', T1(filler(150)), 'too-long'],
    [12, '81 words', T1(filler(81)), 'too-long'],
    [13, '80 words (the boundary)', T1(filler(80)), 'answer'],
    [14, '40 words', T1(filler(40)), 'answer'],
    [15, 'played, no output', { noOutput: true }, 'silent'],
    [16, '`system error`', T1('system error'), 'apology'],
    [17, 'not played', { play: false }, 'missing'],
    [18, 'a 40-word turn still open at the 90 s cap', { turns: [{ text: filler(40), end: 'open' }], cap: true }, 'cut', { why: 'the last output turn has no turnComplete/generationComplete' }],
    [19, '12 words then an abnormal close (1011)', { turns: [{ text: filler(12), end: 'open' }], close: 1011 }, 'cut'],
    [20, '3 words before clipEnd, then a complete 40-word turn', { early: 'um well so', ...T1(filler(40)) }, 'early'],
    // extras that isolate the remaining branches
    [21, 'played, abnormal close, no output', { noOutput: true, close: 1011 }, 'missing'],
    [22, 'a 40-word turn ended by `interrupted` (not complete)', { turns: [{ text: filler(40), end: 'interrupted' }] }, 'cut'],
    [23, 'negative control for rule 8: 14 neutral words + `so it is fine`', T1(`${neutral14} so it is fine`), 'answer'],
    [24, 'negative control for rule 9: 14 neutral words, then a second turn `fine, because it is easy`', { turns: [{ text: neutral14, end: 'turnComplete' }, { text: 'fine, because it is easy', end: 'turnComplete' }] }, 'answer'],
];
function runCases(flip = null) {
    const out = [];
    for (const [no, desc, spec, expected, extra = {}] of CASES) {
        const id = `X${no}`;
        const rec = recordFromEvents(events(id, spec), id, null);
        const c = classify(rec, { variant: 'B' });
        const exp = flip === no ? 'answer' : expected;
        const ok = c.cls === exp && (extra.hardTail === undefined || c.hardTail === extra.hardTail) && (extra.why === undefined || c.why === extra.why);
        out.push({ no, desc, exp, act: `${c.cls}${c.hardTail ? '+tail' : ''}${c.why && extra.why ? ` [${c.why.slice(0, 30)}]` : ''}`, ok });
    }
    return out;
}
for (const r of runCases()) C.check(`P3a-${r.no}`, r.desc, `${r.exp}${CASES[r.no - 1][4]?.hardTail ? '+tail' : ''}${CASES[r.no - 1][4]?.why ? ` [${CASES[r.no - 1][4].why.slice(0, 30)}]` : ''}`, r.act, r.ok);
const flipped = runCases(5).filter((r) => !r.ok);
C.check('P3a-flip', 'one flipped expectation (case 5 expected `answer`) must be reported as a mismatch', 'exactly 1 mismatch, case 5', `${flipped.length} mismatch(es): case ${flipped.map((r) => r.no).join(',')}`, flipped.length === 1 && flipped[0].no === 5);
// variant A reading of the boundary cases (150 -> answer, 151 -> too-long), proving the gate follows the variant
const aOf = (n) => classify(recordFromEvents(events('XA', T1(filler(n))), 'XA', null), { variant: 'A' }).cls;
C.check('P3a-A', 'variant A: 150 words -> answer, 151 -> too-long', 'answer, too-long', `${aOf(150)}, ${aOf(151)}`);

// (b) the real live40-r1 known answer
const run = readJson(`${L40}/runs/live40-r1.json`), ans = readJson(`${L40}/runs/live40-r1.answers.json`);
const { rows } = readRun(run, ans, { variant: 'B' });
const count = (c) => rows.filter((r) => r.rc === c).length;
const answers = rows.filter((r) => r.rc === 'answer');
const rh14 = rows.find((r) => r.id === 'RH14');
const equal = rows.filter((r) => r.rc === 'answer' && r.T === ans.answers[r.id].text.trim()).length;
const equalRaw = rows.filter((r) => r.rc === 'answer' && r.T === ans.answers[r.id].text).length;
C.check('P3b-1', 'live40-r1 real events + live40 itemDone: counts by class', '46 answer, RH14 silent, 0 malformed, 0 cut, 0 early, 0 hard, 0 missing, 0 too-long', `${count('answer')} answer, RH14 ${rh14.rc}, ${count('malformed')} malformed, ${count('cut')} cut, ${count('early')} early, ${count('hard')} hard, ${count('missing')} missing, ${count('too-long')} too-long`,
    count('answer') === 46 && rh14.rc === 'silent' && ['malformed', 'cut', 'early', 'hard', 'missing', 'too-long', 'apology'].every((c) => count(c) === 0));
C.check('P3b-2', 'max words over the 46 answers', '79', String(Math.max(...answers.map((r) => r.w))));
C.check('P3b-3', 'every T byte-equal to live40-r1.answers.json text (after the trim the registration specifies for T)', '46/46', `${equal}/46 (untrimmed raw equality ${equalRaw}/46)`, equal === 46 && equalRaw === 46);
const tbl = confusion(rows, (r) => r.cls, ['E', 'H', 'QF', 'AF']);
C.check('P3b-4', 'the confusion table has nine class columns and 4 live40-class rows summing to 47', '9 columns; rows E20 H11 QF9 AF7', `${CLASSES.length} columns; rows ${Object.entries(tbl).map(([k, v]) => `${k}${Object.values(v).reduce((a, b) => a + b, 0)}`).join(' ')}`, CLASSES.length === 9 && Object.entries(tbl).map(([k, v]) => `${k}${Object.values(v).reduce((a, b) => a + b, 0)}`).join(' ') === 'E20 H11 QF9 AF7');
C.finish();
