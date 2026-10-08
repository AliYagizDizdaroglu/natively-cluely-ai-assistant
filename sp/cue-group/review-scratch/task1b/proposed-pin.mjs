// Throwaway: does the proposed second pin (every line naming verbalSystemPrompt, plus any call) close the gap
// without costing a test? Read-only on the worktree; mutants in memory only.
import fs from 'node:fs';
import { isDeepStrictEqual } from 'node:util';

const src = fs.readFileSync('C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-cluely-ai-assistant\\.claude\\worktrees\\whole-turn\\electron\\ipcHandlers.ts', 'utf8');
const RE = /\bverbalSystemPrompt\b|streamVerbalWithGeminiFlash\(/;
const EXP = [
    'let verbalSystemPrompt = VERBAL_TYPED_PROMPT;',
    'verbalSystemPrompt = `${kr.systemPromptInjection}\\n\\n${VERBAL_TYPED_PROMPT}`;',
    'stream = llmHelper.streamVerbalWithGeminiFlash(userContent, verbalSystemPrompt, undefined, selectedModel);',
];
const verdict = (text) => (isDeepStrictEqual(text.split('\n').map((l) => l.trim()).filter((l) => RE.test(l)), EXP) ? 'pass' : 'FAIL');
const occurs = (s, sub) => s.split(sub).length - 1;
const mut = (from, to) => { if (occurs(src, from) !== 1) throw new Error(`target occurs ${occurs(src, from)}x: ${from}`); return src.replace(from, () => to); };
const IND = '              ';
const CALL = 'stream = llmHelper.streamVerbalWithGeminiFlash(userContent, verbalSystemPrompt, undefined, selectedModel);';
const cases = {
    'current source (must pass)': src,
    'A plain branch -> hands-free': mut('let verbalSystemPrompt = VERBAL_TYPED_PROMPT;', 'let verbalSystemPrompt = VERBAL_WHAT_TO_ANSWER_PROMPT;'),
    'B call wraps the variable': mut('(userContent, verbalSystemPrompt, undefined', '(userContent, wrap(verbalSystemPrompt), undefined'),
    'F added re-assignment before the call': mut(CALL, `verbalSystemPrompt = withCueRule(verbalSystemPrompt);\n${IND}${CALL}`),
    'G added re-assignment after the knowledge branch': mut('let verbalContext = context;', `let verbalContext = context;\n${IND}verbalSystemPrompt = promptFor(mode);`),
    'I a second call that names another prompt': mut(CALL, `${CALL}\n${IND}stream = llmHelper.streamVerbalWithGeminiFlash(userContent, handsFree, undefined, selectedModel);`),
    'H4 harmless re-indent (must pass)': mut(`${IND}${CALL}`, `${IND}    ${CALL}`),
    'H5 harmless CRLF (must pass)': src.replace(/\n/g, '\r\n'),
};
for (const [name, text] of Object.entries(cases)) console.log(name.padEnd(50), verdict(text));
