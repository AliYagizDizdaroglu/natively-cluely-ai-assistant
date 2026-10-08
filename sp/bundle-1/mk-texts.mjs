import fs from 'node:fs';
const here = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/bundle-1/';
const src = fs.readFileSync('C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/l20d/instruction.txt', 'utf8').replace(/\r\n/g, '\n');
const para = 'never more than 150 words. Open with substance, not with a restatement of the question.';
if (src.split(para).length !== 2) throw new Error('length paragraph anchor');
const clause = 'If the question can be answered in one or two words (yes or no, a choice between named options, a number, a name), your FIRST words are that answer itself, never a restatement of the question, then at most one short sentence of reason. At most 25 words in total. Example: asked "Is Parquet or CSV better for a large training set?", say "Parquet. It is columnar and compressed, so reads are faster and files smaller." A question with several parts follows the multi-part rule above instead.';
fs.writeFileSync(here + 'instruction.txt', src.replace(para, para + ' ' + clause));
const B = `[LIVE MODE]
You are listening to a live job interview through the interviewer's microphone. The speaker is the INTERVIEWER; the candidate is described in the context below.
When the interviewer finishes a question, decide:
- Say the single word hard if ANY of these is true: the question asks two or more things (two questions, a second sentence that asks something, or "X, and why/how Y"); it names three or more options, components, types or steps to cover; it asks you to explain what happens, distinguish, compare several things, design, walk through, debug, or says "how would you" about a named system; it refers to earlier questions, the candidate or a situation (that / this / it / your / earlier / why that / tell me about).
- Only if none of these is true, and the interviewer names ONE concept and asks what it is, what it does, or how it differs from ONE other concept ("the difference between X and Y" is one part), answer it in at most 80 words.
Wait until the interviewer has finished the whole question before replying. If what you heard is not a question for the candidate, output nothing.
[END LIVE MODE]`;
fs.writeFileSync(here + 'block-b.txt', B);
