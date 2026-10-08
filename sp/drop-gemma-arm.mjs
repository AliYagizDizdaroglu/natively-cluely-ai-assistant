// THROWAWAY: remove gemma-4-31b-it from the flight's answer arms, line-based so the
// file's CRLF endings and em-dashes are never re-encoded by a regex match.
import fs from 'node:fs';

const p = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.flight.mjs';
const src = fs.readFileSync(p, 'utf8');
const eol = src.includes('\r\n') ? '\r\n' : '\n';
const lines = src.split(/\r?\n/);
const find = (needle) => {
    const i = lines.findIndex((l) => l.includes(needle));
    if (i < 0) throw new Error('anchor not found: ' + needle);
    return i;
};

// 1. header doc: the arms it names
const h = find(' *      gemma-4-31b-it');
if (!lines[h - 1].includes('gemini-3.5-flash-lite and')) throw new Error('header line above is not the arms line: ' + lines[h - 1]);
lines[h - 1] = ' *   3. answer passes on gemini-3.1-flash-lite, gemini-3.5-flash-lite and the';
lines[h] = ' *      Groq arms, the same 52 questions, prompt and filters, plus the';

// 2. the note above ANSWER_MODELS, which already records why 26b is absent
const n = find('gemma-4-26b-a4b-it is deliberately absent');
if (!lines[n + 2].includes('MAX_TOKENS')) throw new Error('note block is not 3 lines: ' + lines[n + 2]);
lines.splice(n, 3,
    '// the flight goes on without that file). Both Gemma arms are deliberately absent.',
    '// gemma-4-26b-a4b-it: the 2026-09-08 probe leaked its planning text into the spoken',
    '// answer and one answer ran 11 min to MAX_TOKENS. gemma-4-31b-it: 49, then 37, then 35',
    '// acceptable of 52 across after7/8/9 under the frozen grader, with 4 answers degenerating',
    '// into repeated tokens and 16 truncating mid-word, at 19.4s to first token. Re-measuring',
    '// a model already ruled out costs an hour of flight time and holds the judge exports.');

// 3. the arms list itself
const a = find('export const ANSWER_MODELS');
lines[a] = "export const ANSWER_MODELS = ['gemini-3.1-flash-lite', 'gemini-3.5-flash-lite', 'qwen/qwen3.8-27b', 'openai/gpt-oss-120b'];";

fs.writeFileSync(p, lines.join(eol));
console.log('patched');
