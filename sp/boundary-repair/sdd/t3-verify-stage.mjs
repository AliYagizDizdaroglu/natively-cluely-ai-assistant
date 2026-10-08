// Throwaway (Task 3): derive the EXPECTED staged files = the fenced blocks of task-3-brief.md + the controller's
// ruling (the alignment guard dropped; three comments and one test title changed), then compare the staged files
// byte for byte. Every replacement must match exactly once, so a drift in the brief fails loudly.
//   node t3-verify-stage.mjs              compare the staged test + module with the derived expectation
//   node t3-verify-stage.mjs --selftest   the comparison must say IDENTICAL for the expectation itself and DIFFERENT for
//                                         a one-character mutation and for the UNMODIFIED brief blocks (calibration)
import fs from 'node:fs';
import { createHash } from 'node:crypto';

const BR = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/boundary-repair';
const STAGE = `${BR}/stage/electron/audio`;
const ORIG = `${BR}/sdd/t3-orig`;
const sha = (s) => createHash('sha256').update(s).digest('hex').slice(0, 16);

const briefRaw = fs.readFileSync(`${BR}/sdd/task-3-brief.md`, 'utf8');
const crInBrief = (briefRaw.match(/\r/g) || []).length;
const brief = briefRaw.replace(/\r\n/g, '\n');
const blocks = [...brief.matchAll(/^[ ]*```(\w*)\n([\s\S]*?)^[ ]*```/gm)].map((m) => m[2]);
const pickOne = (label, pred) => {
    const hits = blocks.filter(pred);
    if (hits.length !== 1) throw new Error(`${label}: expected exactly 1 matching fenced block, found ${hits.length}`);
    return hits[0];
};
const testBlock = pickOne('Step 1 test block', (b) => b.startsWith("describe('deepgramBoundaryRepair v4"));
const modBlock = pickOne('Step 3 module block', (b) => b.startsWith('/**') && b.includes('Puts back the word(s)'));

const once = (label, text, oldS, newS) => {
    const n = text.split(oldS).length - 1;
    if (n !== 1) throw new Error(`replacement "${label}": expected exactly 1 occurrence in the brief, found ${n}`);
    return text.replace(oldS, () => newS);
};

// ---- the ruling, item by item
// item 4: the Turkish test keeps its body; new title; the comment's last clause changes
let expTestBlock = once('item 4 comment clause', testBlock,
    "this is the module's own floor (v2's guard).",
    "the non-ASCII guard refuses it (it subsumes v2's alignment guard).");
expTestBlock = once('item 4 title', expTestBlock,
    "it('an interim whose comparison tokens do not line up with its spelled tokens is no cut', () => {",
    "it('an interim with a non-ASCII letter that splits the tokenisers (\"İ\") is no cut', () => {");

// item 1: drop the alignment guard from the cut condition (raw = rawTok(lastInterim) stays: Traw needs it)
let expMod = once('item 1 guard', modBlock,
    'if (fw.length > 0 && fw.length < iw.length && raw.length === iw.length) {',
    'if (fw.length > 0 && fw.length < iw.length) {');
// item 3: the rawTok doc comment
expMod = once('item 3 rawTok doc', expMod,
    'index-aligned with tok() on the same text WHEN both have the same length (see createBoundaryRepair).',
    'index-aligned with tok() on any text without a non-ASCII letter — the NON_ASCII_LETTER guard in createBoundaryRepair is what guarantees it.');
// item 2: the header's CUT paragraph
const OLD_HEADER = [
    ' *          S2Q07) — see isRespelling(). I must be longer than F1, ASCII-LETTERED (the tokens are',
    ' *          ASCII: accented English such as "résumé" stays aligned but tokenises as fragments, and a',
    " *          lost \"résumé\" came back as \"r sum\" in the 2026-09-29 review's probe; 0 such interims in",
    ' *          the 28 English logs and the seam recordings) and ALIGNED (its spelled tokens count the',
    " *          same as its comparison tokens). T = I's tokens after F1; Traw = the same words in I's",
    ' *          own spelling.',
].join('\n');
const NEW_HEADER = [
    ' *          S2Q07) — see isRespelling(). I must be longer than F1 and ASCII-LETTERED (the tokens',
    ' *          are ASCII: accented English such as "résumé" stays aligned but tokenises as fragments,',
    " *          and a lost \"résumé\" came back as \"r sum\" in the 2026-09-29 review's probe; 0 such",
    ' *          interims in the 28 English logs and the seam recordings). The ASCII-letter condition',
    ' *          is also what keeps rawTok() index-aligned with tok(): no character it admits changes',
    " *          the token count, checked on every code point in the 2026-09-29 v4 re-review. T = I's",
    " *          tokens after F1; Traw = the same words in I's own spelling.",
].join('\n');
expMod = once('item 2 header', expMod, OLD_HEADER, NEW_HEADER);

const pristineTest = fs.readFileSync(`${ORIG}/deepgramBoundaryRepair.test.ts`, 'utf8');
const expTest = `${pristineTest}\n${expTestBlock}`;

// ---- a small LCS line diff, to print exactly what the ruling changed against the brief
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
    const line = want.slice(0, i).split('\n').length;
    return `first difference at char ${i} (line ${line}): want=${JSON.stringify(want.slice(i, i + 50))} have=${JSON.stringify(have.slice(i, i + 50))}`;
};

if (process.argv.includes('--selftest')) {
    let bad = 0;
    const check = (label, cond) => { console.log(`${cond ? 'ok  ' : 'FAIL'} ${label}`); if (!cond) bad++; };
    check('expected module equals itself', expMod === expMod);
    const mut = expMod.slice(0, 900) + (expMod[900] === 'a' ? 'b' : 'a') + expMod.slice(901);
    check('a one-character mutation of the expected module is DIFFERENT', mut !== expMod);
    check('the UNMODIFIED brief module block is DIFFERENT from the expected one (the ruling is what differs)', modBlock !== expMod);
    check('the UNMODIFIED brief test block is DIFFERENT from the expected one', testBlock !== expTestBlock);
    const dm = lineDiff(modBlock, expMod), dt = lineDiff(testBlock, expTestBlock);
    console.log(`\nruling delta on the module block (brief -> expected): ${dm.length} changed lines`);
    dm.forEach((l) => console.log(`  ${l}`));
    console.log(`\nruling delta on the test block (brief -> expected): ${dt.length} changed lines`);
    dt.forEach((l) => console.log(`  ${l}`));
    console.log(`\nbrief CR chars: ${crInBrief}; blocks found: ${blocks.length}`);
    process.exit(bad ? 1 : 0);
}

let allSame = true;
for (const [label, want, file] of [['test  ', expTest, `${STAGE}/deepgramBoundaryRepair.test.ts`], ['module', expMod, `${STAGE}/deepgramBoundaryRepair.ts`]]) {
    const buf = fs.readFileSync(file);
    const have = buf.toString('utf8');
    const cr = buf.filter((x) => x === 13).length;
    const same = want === have && cr === 0;
    if (!same) allSame = false;
    console.log(`${label}: ${same ? 'IDENTICAL' : 'DIFFERENT'} to the brief-derived expectation — staged ${buf.length} bytes, CR=${cr}, sha256 ${createHash('sha256').update(buf).digest('hex').slice(0, 16)}; expected ${Buffer.byteLength(want)} bytes, sha256 ${createHash('sha256').update(want).digest('hex').slice(0, 16)}`);
    if (want !== have) console.log(`        ${firstDiff(want, have)}`);
}
process.exit(allSame ? 0 : 1);
