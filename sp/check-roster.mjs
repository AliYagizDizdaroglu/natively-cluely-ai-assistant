// THROWAWAY: verify scenario50 against its own claims before anything is spent on it.
//   1. ids unique, and disjoint from interview60 (a shared id makes the TTS cache
//      speak the OTHER roster's question for a whole hour, silently)
//   2. every follow-up's `chain` names a real main question
//   3. the `long` flag agrees with the measured word count (>= 40)
//   4. the duration, at the measured speaking rate, per scenario and in total
import { pathToFileURL } from 'node:url';
const G = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/';
const { SCENARIO50, PLAN, wordsOf } = await import(pathToFileURL(G + 'scenario50.questions.mjs').href);
const { INTERVIEW } = await import(pathToFileURL(G + 'interview60.questions.mjs').href);

let bad = 0;
const fail = (m) => { console.log('  FAIL ' + m); bad++; };

// 1. ids
const ids = SCENARIO50.map((x) => x.id);
const dupes = ids.filter((x, i) => ids.indexOf(x) !== i);
if (dupes.length) fail('duplicate ids: ' + [...new Set(dupes)].join(', '));
const old = new Set(INTERVIEW.map((x) => x.id));
const clash = ids.filter((x) => old.has(x));
if (clash.length) fail('ids shared with interview60 (TTS cache would speak the wrong question): ' + clash.join(', '));

// 2. chains
for (const x of SCENARIO50.filter((i) => i.chain)) {
    if (!ids.includes(x.chain)) fail(`${x.id} chains to ${x.chain}, which is not in the roster`);
}
const mains = SCENARIO50.filter((x) => x.level !== 'followup');
const withFollowup = new Set(SCENARIO50.filter((x) => x.chain).map((x) => x.chain));
for (const m of mains) if (!withFollowup.has(m.id)) fail(`${m.id} has no follow-up`);

// 3. the long flag vs the measured word count
const LONG_AT = 40;
for (const x of SCENARIO50) {
    const w = wordsOf(x.q);
    if (x.long && w < LONG_AT) fail(`${x.id} flagged long but is ${w} words`);
    if (!x.long && w >= LONG_AT) fail(`${x.id} is ${w} words but not flagged long`);
}

// 4. duration. 2.66 w/s is the median of 79 measured after9 clips; 2.24 is p10.
const RATE = 2.66;
const secsOf = (x) => wordsOf(x.q) / RATE + x.gapMs / 1000;
console.log(`\nitems ${PLAN.total}   mains ${mains.length}   follow-ups ${PLAN.byLevel.followup}`);
console.log('byLevel  ' + JSON.stringify(PLAN.byLevel));

const mainWords = mains.map((x) => wordsOf(x.q)).sort((a, b) => a - b);
const fWords = SCENARIO50.filter((x) => x.level === 'followup').map((x) => wordsOf(x.q)).sort((a, b) => a - b);
const p = (a, q) => a[Math.floor((a.length - 1) * q)];
console.log(`\nmain question words   min ${mainWords[0]}  p50 ${p(mainWords, 0.5)}  max ${mainWords.at(-1)}   >=40 words: ${mainWords.filter((w) => w >= 40).length}/${mainWords.length}`);
console.log(`follow-up words       min ${fWords[0]}  p50 ${p(fWords, 0.5)}  max ${fWords.at(-1)}`);
const i60 = INTERVIEW.filter((x) => (x.kind ?? 'spoken') === 'spoken').map((x) => wordsOf(x.q)).sort((a, b) => a - b);
console.log(`interview60 for scale  min ${i60[0]}  p50 ${p(i60, 0.5)}  max ${i60.at(-1)}   >=40 words: ${i60.filter((w) => w >= 40).length}/${i60.length}`);

console.log('\nduration');
let total = 0;
for (const s of ['S1', 'S2', 'S3', 'S4', 'S5']) {
    const items = SCENARIO50.filter((x) => x.scenario === s);
    const secs = items.reduce((a, x) => a + secsOf(x), 0);
    total += secs;
    console.log(`  ${s}  ${items.length} items  ${(secs / 60).toFixed(1)} min`);
}
console.log(`  ALL  ${SCENARIO50.length} items  ${(total / 60).toFixed(1)} min  (${(total / 3600).toFixed(2)} h)`);
const speech = SCENARIO50.reduce((a, x) => a + wordsOf(x.q) / RATE, 0);
console.log(`       speech ${(speech / 60).toFixed(1)} min, silence ${((total - speech) / 60).toFixed(1)} min`);
console.log(`\ninterview60 for scale: ${(INTERVIEW.reduce((a, x) => a + wordsOf(x.q) / RATE + x.gapMs / 1000, 0) / 60).toFixed(1)} min over ${INTERVIEW.length} items`);

console.log(bad ? `\n${bad} PROBLEM(S)` : '\nall checks pass');
process.exit(bad ? 1 : 0);
