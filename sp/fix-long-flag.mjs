// THROWAWAY: replace the hand-written `long: true` flags with a derived one.
// The check found 54 of them wrong; a flag a human maintains beside 100 questions
// will be wrong again. Deriving it from the measured word count cannot drift.
import fs from 'node:fs';

const F = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/scenario50.questions.mjs';
let s = fs.readFileSync(F, 'utf8');
const eol = s.includes('\r\n') ? '\r\n' : '\n';
const before = (s.match(/long: true, /g) ?? []).length;

// 2. the header paragraph that claimed 50 of 50
const oldClaim = [
    " *   1. EVERY question is multi-sentence. interview60's median question is 14",
    " *      words and only its 6 `L` items exceed 40; here 50 of 50 do. That is the",
    ' *      regime where Deepgram closes the question as several finals and the',
    ' *      reconciler has to corroborate against the joined window — the whole',
    " *      point of this set, and the case interview60 could only measure 6 times.",
].join(eol);
const newClaim = [
    " *   1. The questions are far longer. Measured: this set's main questions run a",
    " *      median of 40 words and 26 of 50 reach 40 or more; interview60's spoken",
    ' *      items run a median of 14 and only 6 of 76 reach 40. Past ~40 words',
    ' *      Deepgram closes the question as several finals and the reconciler has to',
    ' *      corroborate against the joined window — the case interview60 could only',
    ' *      exercise 6 times, and this set exercises 26.',
].join(eol);
if (!s.includes(oldClaim)) throw new Error('header claim not found verbatim');
s = s.replace(oldClaim, newClaim);

// 3. the paragraph documenting the flag
const oldDoc = [
    " * `long: true` marks a question long enough that the STT splits it (>= 40 words,",
    ' * measured, not assumed — see the `wordsOf` export and scenario50.plan.mjs).',
    " * `interview60` encodes the same fact as `level: 'long'`; this set cannot, because",
    ' * `level` carries the question\'s class and nearly every question here is long.',
].join(eol);
const newDoc = [
    ' * `long` is DERIVED, never hand-written: a question is long when it reaches',
    ' * LONG_WORDS words. It was hand-written first, and the check found 54 of the 100',
    ' * flags wrong — a flag maintained by hand beside 100 questions will be wrong again.',
    " * `interview60` encodes the same fact as `level: 'long'`; this set cannot, because",
    " * `level` carries the question's class.",
].join(eol);
if (!s.includes(oldDoc)) throw new Error('flag doc not found verbatim');
s = s.replace(oldDoc, newDoc);

// 1. strip every hand-written flag (after the doc paragraphs that legitimately name it)
s = s.split('long: true, ').join('');
if (/long: true/.test(s)) throw new Error('a long: true survived in an unexpected shape');

// 4. raw list, then a derived export
if (!s.includes('export const SCENARIO50 = [')) throw new Error('array declaration not found');
s = s.replace('export const SCENARIO50 = [', 'const RAW = [');

// wordsOf must exist before the derived export; move it above the array.
const wordsDecl = [
    '/** Words in a question, counted the way the pipeline counts them. */',
    "export const wordsOf = (q) => (q.match(/[A-Za-z0-9']+/g) ?? []).length;",
].join(eol);
if (!s.includes(wordsDecl)) throw new Error('wordsOf not found verbatim');
s = s.replace(wordsDecl + eol + eol, '');

const anchor = '/** @type {{id:string,level:string,topic:string,q:string,gapMs:number,long?:boolean,chain?:string,scenario:string}[]} */' + eol + 'const RAW = [';
if (!s.includes(anchor)) throw new Error('typedef anchor not found');
s = s.replace(anchor, [
    wordsDecl,
    '',
    '/** At or above this many words, Deepgram closes the question as several finals. */',
    'export const LONG_WORDS = 40;',
    '',
    '/** @type {{id:string,level:string,topic:string,q:string,gapMs:number,chain?:string,scenario:string}[]} */',
    'const RAW = [',
].join(eol));

const listEnd = '];' + eol + eol + '/** Spoken items only';
if (!s.includes(listEnd)) throw new Error('end of list not found');
s = s.replace(listEnd, [
    '];',
    '',
    '/** The roster the harness reads. `long` is derived here so it can never disagree with the text. */',
    'export const SCENARIO50 = RAW.map((x) => ({ ...x, long: wordsOf(x.q) >= LONG_WORDS }));',
    '',
    '/** Spoken items only',
].join(eol));

fs.writeFileSync(F, s);
console.log(`stripped ${before} hand-written flags; long is now derived`);
