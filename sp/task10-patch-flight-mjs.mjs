import fs from 'node:fs';

const path = "C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-cluely-ai-assistant\\electron\\test\\golden\\interview60.flight.mjs";
let text = fs.readFileSync(path, 'utf8');
const hadCRLF = text.includes('\r\n');
text = text.replace(/\r\n/g, '\n');

const oldHeader = ` *   3. answer passes on gemini-3.1-flash-lite, gemini-3.5-flash-lite and the
 *      Groq arms, the same 52 questions, prompt and filters, then the focused`;
const newHeader = ` *   3. answer passes on gemini-3.1-flash-lite and gemini-3.5-flash-lite, the
 *      same 52 questions, prompt and filters, then the focused`;

if (!text.includes(oldHeader)) { console.error('OLD HEADER NOT FOUND'); process.exit(1); }
text = text.replace(oldHeader, newHeader);

const oldComment = `// The first is the app's answer model; the rest are comparison arms. Ids with a "/" run
// on Groq (answers.mjs; with a placeholder GROQ_API_KEY the pass exits 3 in seconds and
// the flight goes on without that file). Both Gemma arms are deliberately absent.
// gemma-4-26b-a4b-it: the 2026-09-08 probe leaked its planning text into the spoken
// answer and one answer ran 11 min to MAX_TOKENS. gemma-4-31b-it: 49, then 37, then 35
// acceptable of 52 across after7/8/9 under the frozen grader, with 4 answers degenerating
// into repeated tokens and 16 truncating mid-word, at 19.4s to first token. Re-measuring
// a model already ruled out costs an hour of flight time and holds the judge exports.
export const ANSWER_MODELS = ['gemini-3.1-flash-lite', 'gemini-3.5-flash-lite', 'qwen/qwen3.8-27b', 'openai/gpt-oss-120b'];`;

const newComment = `// The first is the app's answer model, the second the stall-fallback model. The Groq
// comparison arms (qwen/qwen3.8-27b, openai/gpt-oss-120b) were dropped from the flight at
// the user's request on 2026-09-26 -- answers.mjs still runs a Groq id by hand (ids with a
// "/"; with a placeholder GROQ_API_KEY that pass exits 3 in seconds). Both Gemma arms are
// deliberately absent. gemma-4-26b-a4b-it: the 2026-09-08 probe leaked its planning text
// into the spoken answer and one answer ran 11 min to MAX_TOKENS. gemma-4-31b-it: 49, then
// 37, then 35 acceptable of 52 across after7/8/9 under the frozen grader, with 4 answers
// degenerating into repeated tokens and 16 truncating mid-word, at 19.4s to first token.
// Re-measuring a model already ruled out costs an hour of flight time and holds the judge
// exports.
export const ANSWER_MODELS = ['gemini-3.1-flash-lite', 'gemini-3.5-flash-lite'];`;

if (!text.includes(oldComment)) { console.error('OLD COMMENT NOT FOUND'); process.exit(1); }
text = text.replace(oldComment, newComment);

fs.writeFileSync(path, text, 'utf8'); // Node's utf8 writer never prepends a BOM
console.log('OK hadCRLF=' + hadCRLF + ' newLength=' + text.length);
