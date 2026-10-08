const fs = require('fs');
const path = process.argv[2];
let s = fs.readFileSync(path, 'utf8');

const oldConst = `/** Spoken-answer word budget. 30s at ~140wpm conversational pace. */
export const SPOKEN_WORD_BUDGET = 70;`;
const newConst = `/** Spoken-answer word budget. 30s at ~140wpm conversational pace. */
export const SPOKEN_WORD_BUDGET = 70;

/**
 * What the model is TOLD. Measured 2026-09-02 (answer-only pass, 52 questions):
 * told 70 it produced a median of 71 and a max of 81. The gate stays at 70;
 * the instruction aims lower so the answers land inside it.
 */
export const SPOKEN_WORD_TARGET = 60;`;

if (s.split(oldConst).length - 1 !== 1) throw new Error('oldConst not found exactly once: ' + (s.split(oldConst).length - 1));
s = s.replace(oldConst, newConst);

const oldSentence = 'Keep it to AT MOST ${SPOKEN_WORD_BUDGET} words';
const newSentence = 'Keep it to AT MOST ${SPOKEN_WORD_TARGET} words';
if (s.split(oldSentence).length - 1 !== 1) throw new Error('oldSentence not found exactly once: ' + (s.split(oldSentence).length - 1));
s = s.replace(oldSentence, newSentence);

fs.writeFileSync(path, s);
console.log('patched OK');
