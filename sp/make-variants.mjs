// Throwaway (review of a7e9a79..efda6cf, named risk 3): builds known-answer variants of
// ipcHandlers.ts OUTSIDE the worktree, each next to a byte copy of the committed pin
// (electron/ipcHandlers.typedPrompt.test.ts @efda6cf), so one vitest run rooted here shows
// which assertion each variant trips. Reads and writes only under ./pin.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const pin = path.join(HERE, 'pin');
const TEST = 'ipcHandlers.typedPrompt.test.ts';
const head = fs.readFileSync(path.join(pin, 'head', 'electron', 'ipcHandlers.ts'), 'utf8');
const test = fs.readFileSync(path.join(pin, 'head', 'electron', TEST), 'utf8');
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex').slice(0, 12);

// A replacement that does not apply exactly once is a broken mutant: refuse, do not guess.
function once(src, from, to, name) {
    const n = src.split(from).length - 1;
    if (n !== 1) throw new Error(`${name}: expected exactly 1 occurrence of ${JSON.stringify(from)}, found ${n}`);
    return src.replace(from, () => to);
}

const IMPORT = 'import { VERBAL_TYPED_PROMPT } from "./llm/prompts"';
const SITE_B = 'let verbalSystemPrompt = VERBAL_TYPED_PROMPT;';
const SITE_C = 'verbalSystemPrompt = `${kr.systemPromptInjection}\\n\\n${VERBAL_TYPED_PROMPT}`;';
const INDENT = '\n              ';

const variants = {
    // the hands-free prompt back on the knowledge-injection branch only
    m_site_c: once(head, SITE_C, SITE_C.replace('VERBAL_TYPED_PROMPT', 'VERBAL_WHAT_TO_ANSWER_PROMPT'), 'm_site_c'),
    // the hands-free prompt back on the plain branch only
    m_site_b: once(head, SITE_B, SITE_B.replace('VERBAL_TYPED_PROMPT', 'VERBAL_WHAT_TO_ANSWER_PROMPT'), 'm_site_b'),
    // both sites intact, the rule appended some other way (what N8 is for), one per alternation
    m_n8_rule: once(head, SITE_B, `${SITE_B}${INDENT}verbalSystemPrompt += CUE_RULE;`, 'm_n8_rule'),
    m_n8_const: once(head, SITE_B, `${SITE_B}${INDENT}verbalSystemPrompt += CUES_SENTINEL;`, 'm_n8_const'),
    m_n8_literal: once(head, SITE_B, `${SITE_B}${INDENT}verbalSystemPrompt += '__CUES__';`, 'm_n8_literal'),
    // both sites intact, the hands-free prompt imported under the typed name
    m_alias: once(head, IMPORT, 'import { VERBAL_WHAT_TO_ANSWER_PROMPT as VERBAL_TYPED_PROMPT } from "./llm/prompts"', 'm_alias'),
};

for (const [name, src] of Object.entries(variants)) {
    const dir = path.join(pin, name, 'electron');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'ipcHandlers.ts'), src);
    fs.writeFileSync(path.join(dir, TEST), test);
}
// base: the file as it was before the task, under the same test
fs.writeFileSync(path.join(pin, 'base', 'electron', TEST), test);

const base = fs.readFileSync(path.join(pin, 'base', 'electron', 'ipcHandlers.ts'), 'utf8');
console.log(`head  ${sha(head)}  lines=${head.split('\n').length}`);
console.log(`base  ${sha(base)}  lines=${base.split('\n').length}`);
for (const [name, src] of Object.entries(variants)) console.log(`${name}  ${sha(src)}  differs from head: ${src !== head}`);
console.log(`test  ${sha(test)}  lines=${test.split('\n').length}`);
