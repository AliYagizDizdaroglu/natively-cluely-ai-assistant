// Throwaway (Task 3, fix round 1): derive the EXPECTED staged files = the round-1 starting files (BR\sdd\t3-r1-orig: the
// module 10262 B / 8aca65e4 and the test 13159 B / 10d8040a, as seeded from MAIN) + exactly the coordinator's requested
// edits I1, M1, M2, M3, M4 (M5 is deliberately NOT applied), then compare the staged files byte for byte. Every anchor
// must match exactly once in the starting file, or this throws. Also checks the M1 requirement on the test file: the
// decomposed accent is spelled with literal \u0301 escapes and NO U+0301 character is present (the file stays NFC).
//   node t3-r1-verify-stage.mjs              compare the staged files with the derived expectation
//   node t3-r1-verify-stage.mjs --selftest   calibration: the expectation equals itself, a one-character mutation and the
//                                            unedited starting files are DIFFERENT; prints the delta against the start
import fs from 'node:fs';
import { createHash } from 'node:crypto';

const BR = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/boundary-repair';
const STAGE = `${BR}/stage/electron/audio`;
const START = `${BR}/sdd/t3-r1-orig`;
const sha16 = (b) => createHash('sha256').update(b).digest('hex').slice(0, 16);

const startModuleBuf = fs.readFileSync(`${START}/deepgramBoundaryRepair.ts`);
const startTestBuf = fs.readFileSync(`${START}/deepgramBoundaryRepair.test.ts`);
if (startModuleBuf.length !== 10262 || sha16(startModuleBuf) !== '8aca65e47f33039a') throw new Error('the round-1 starting module is not the 10262 B / 8aca65e4 file');
if (startTestBuf.length !== 13159 || sha16(startTestBuf) !== '10d8040ad1debde6') throw new Error('the round-1 starting test is not the 13159 B / 10d8040a file');
const startModule = startModuleBuf.toString('utf8');
const startTest = startTestBuf.toString('utf8');

const once = (label, text, oldS, newS) => {
    const n = text.split(oldS).length - 1;
    if (n !== 1) throw new Error(`edit "${label}": expected exactly 1 occurrence of its anchor in the starting file, found ${n}`);
    return text.replace(oldS, () => newS);
};

// ---------------------------------------------------------------- the test file
// I1: the digit rule's own pin, after the "twenty five" test's existing expect (verbatim from the coordinator)
const I1_ANCHOR = [
    "        expect(play([at('we cut latency by twenty five last quarter', false, 0), at('We cut latency by 25', true, 100), at('last quarter. What changed?', true, 2100)]))",
    "            .toBe('last quarter. What changed?');",
].join('\n');
const I1_ADD = [
    '        // "92" and "25" also fail the first-letter test; "v2" keeps "version"\'s first letter and is shorter, so only',
    '        // the digit test refuses it (synthetic, like "put" for "cut"; v3 restored "two").',
    "        expect(play([at('we shipped version two last week', false, 0), at('We shipped v2', true, 100), at('last week, then rolled it back.', true, 2100)]))",
    "            .toBe('last week, then rolled it back.');",
].join('\n');
let expTest = once('I1 digit pin', startTest, I1_ANCHOR, `${I1_ANCHOR}\n${I1_ADD}`);

// M1: the DECOMPOSED resume, after the resume test's existing expect; the escape is the six characters \u0301 in the source
const M1_ANCHOR = [
    "        expect(play([at('tell me about your résumé and your last role', false, 0), at('Tell me about your', true, 100), at('and your last role.', true, 2100)]))",
    "            .toBe('and your last role.');",
].join('\n');
const M1_ADD = [
    '        // The same word DECOMPOSED ("e" + U+0301, escaped so no editor can normalise it): the \\p{M} half of the guard.',
    "        expect(play([at('tell me about your re\\u0301sume\\u0301 and your last role', false, 0), at('Tell me about your', true, 100), at('and your last role.', true, 2100)]))",
    "            .toBe('and your last role.');",
].join('\n');
expTest = once('M1 decomposed resume', expTest, M1_ANCHOR, `${M1_ANCHOR}\n${M1_ADD}`);

// M3: the describe title
expTest = once('M3 describe title', expTest,
    'a re-spelling only at the tolerant cut, aligned interims only, pauses',
    'a re-spelling only at the tolerant cut, ASCII-lettered interims only, pauses');

// M4: the 5852 ms is F2's time after the INTERIM; the window counts from F1 (5164 ms). Re-wrapped to the file's ~122 columns.
expTest = once('M4 gap comment', expTest,
    [
        '    // Negative #28 as logged has the interim stopping at "percent" and a 5852 ms gap. With the interim running on and',
        '    // F2 inside the window, v3 restored "two percent" — a FALSE insertion (probe-inputs.out.txt): smart_format wrote',
        '    // "ninety two percent" as the one token "92%", so T was shifted by two words.',
    ].join('\n'),
    [
        '    // Negative #28 as logged has the interim stopping at "percent" and F2 5164 ms after F1 (outside the window). With the',
        '    // interim running on and F2 inside the window, v3 restored "two percent" — a FALSE insertion (probe-inputs.out.txt):',
        '    // smart_format wrote "ninety two percent" as the one token "92%", so T was shifted by two words.',
    ].join('\n'));

// ---------------------------------------------------------------- the module
// M2: the header no longer claims a line-for-line port
let expModule = once('M2 header', startModule,
    [
        ' * This is rule v4 of the design brief (scratchpad boundary-repair/DESIGN-v4.md), a line-for-line',
        ' * port of its reference rule-v4.mjs; the two must agree event for event (check-v4.mjs proves the',
        ' * reference on every recorded stream; the controller replays the built module the same way).',
    ].join('\n'),
    [
        ' * This is rule v4 of the design brief (scratchpad boundary-repair/DESIGN-v4.md), a port of',
        " * rule-v4.mjs, line for line except v2's alignment guard (rule-v4.mjs:64), which the non-ASCII",
        ' * guard makes unreachable (re-review M-a); the two must agree event for event (check-v4.mjs',
        ' * proves the reference on every recorded stream; the controller replays the built module the',
        ' * same way).',
    ].join('\n'));

// I1 (comment half): the "1 digit, 0 first letter" split only reflects the order the rules are tested in
expModule = once('I1 tally comment', expModule,
    [
        ' * 1 for a digit ("ninety" -> "92"), none of them followed by a repair; 0 refused for the first',
        ' * letter — that rule rests only on the synthetic "put" for "cut" case. KNOWN RECALL COST: an',
    ].join('\n'),
    [
        ' * 1 for a digit ("ninety" -> "92"), none of them followed by a repair; 0 refused for the first',
        ' * letter, but check-v4 counts each cut under the FIRST rule that refuses it (digit, longer, first',
        ' * letter), and a spelled-out number never shares its first character with its digits, so',
        ' * "ninety" -> "92" fails the first-letter rule too: "1 digit, 0 first letter" only reflects that',
        ' * order. The data isolates neither rule; the digit rule rests on the synthetic "v2" for "version"',
        ' * case, the first-letter rule on the synthetic "put" for "cut" case. KNOWN RECALL COST: an',
    ].join('\n'));

// ---------------------------------------------------------------- a small LCS line diff (what changed against the start)
function lineDiff(a, b) {
    const A = a.split('\n'), B = b.split('\n');
    const L = Array.from({ length: A.length + 1 }, () => new Int32Array(B.length + 1));
    for (let i = A.length - 1; i >= 0; i--) for (let j = B.length - 1; j >= 0; j--) L[i][j] = A[i] === B[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    const out = [];
    let i = 0, j = 0;
    while (i < A.length && j < B.length) {
        if (A[i] === B[j]) { i++; j++; } else if (L[i + 1][j] >= L[i][j + 1]) out.push(`- ${A[i++]}`); else out.push(`+ ${B[j++]}`);
    }
    while (i < A.length) out.push(`- ${A[i++]}`);
    while (j < B.length) out.push(`+ ${B[j++]}`);
    return out;
}
const firstDiff = (want, have) => {
    let i = 0; while (i < want.length && i < have.length && want[i] === have[i]) i++;
    return `first difference at char ${i} (line ${want.slice(0, i).split('\n').length}): want=${JSON.stringify(want.slice(i, i + 50))} have=${JSON.stringify(have.slice(i, i + 50))}`;
};

if (process.argv.includes('--selftest')) {
    let bad = 0;
    const check = (label, cond) => { console.log(`${cond ? 'ok  ' : 'FAIL'} ${label}`); if (!cond) bad++; };
    check('expected module equals itself', expModule === expModule);
    const mut = expModule.slice(0, 900) + (expModule[900] === 'a' ? 'b' : 'a') + expModule.slice(901);
    check('a one-character mutation of the expected module is DIFFERENT', mut !== expModule);
    check('the unedited starting module is DIFFERENT from the expected one', startModule !== expModule);
    check('the unedited starting test is DIFFERENT from the expected one', startTest !== expTest);
    check('expected test: literal \\u0301 escapes present (2), no U+0301 character, file is NFC', (expTest.match(/re\\u0301sume\\u0301/g) || []).length === 1 && !/\u0301/.test(expTest) && expTest === expTest.normalize('NFC'));
    for (const [label, a, b] of [['module', startModule, expModule], ['test', startTest, expTest]]) {
        const d = lineDiff(a, b);
        console.log(`\ndelta on the ${label} (start -> expected): ${d.length} changed lines`);
        d.forEach((l) => console.log(`  ${l}`));
    }
    process.exit(bad ? 1 : 0);
}

let allSame = true;
for (const [label, want, file] of [['test  ', expTest, `${STAGE}/deepgramBoundaryRepair.test.ts`], ['module', expModule, `${STAGE}/deepgramBoundaryRepair.ts`]]) {
    const buf = fs.readFileSync(file);
    const have = buf.toString('utf8');
    const cr = buf.filter((x) => x === 13).length;
    const combining = (have.match(/\u0301/g) || []).length;
    const same = want === have && cr === 0 && combining === 0;
    if (!same) allSame = false;
    console.log(`${label}: ${same ? 'IDENTICAL' : 'DIFFERENT'} to the derived expectation — staged ${buf.length} bytes, CR=${cr}, U+0301 characters=${combining}, sha256 ${sha16(buf)}; expected ${Buffer.byteLength(want)} bytes, sha256 ${sha16(Buffer.from(want))}`);
    if (want !== have) console.log(`        ${firstDiff(want, have)}`);
}
process.exit(allSame ? 0 : 1);
