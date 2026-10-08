// Throwaway: rebuild, from the built app modules, the system prompts the spike arms need.
//   swap          = what LLMHelper.streamChat sent during flight s50b: knowledge-engine rules
//                   (ContextAssembler) + "\n" + SPOKEN_LENGTH_AND_DEPTH (keepSpokenBudget)
//                   + the profile notes as <user_context> (userContextBlock)
//   verbal_notes  = VERBAL_WHAT_TO_ANSWER_PROMPT + the same notes block
//   plainB        = VERBAL_WHAT_TO_ANSWER_PROMPT verbatim (a second run of the plain arm)
// Prints character counts only.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WT = process.argv[2];
if (!WT) { console.error('usage: node build-arm-prompts.mjs <worktree-root>'); process.exit(2); }
const require = createRequire(path.join(WT, 'package.json'));
const P = require(path.join(WT, 'dist-electron/electron/llm/prompts.js'));
const { keepSpokenBudget } = require(path.join(WT, 'dist-electron/electron/llm/knowledgePromptBudget.js'));
const { userContextBlock } = require(path.join(WT, 'dist-electron/electron/llm/userContext.js'));
const { assemblePromptContext } = require(path.join(WT, 'dist-electron/electron/knowledge/ContextAssembler.js'));

const docFiles = fs.readdirSync(HERE).filter((f) => f.startsWith('kdoc-') && f.endsWith('.json'));
const load = (type) => {
    const f = docFiles.filter((x) => x.startsWith(`kdoc-${type}-`)).sort().pop();
    return f ? { type, structured_data: JSON.parse(fs.readFileSync(path.join(HERE, f), 'utf8')) } : null;
};
const resumeDoc = load('resume');
const jdDoc = load('jd');
console.log('resume doc:', !!resumeDoc, ' jd doc:', !!jdDoc, ' files:', docFiles.join(', '));
if (!resumeDoc) { console.error('no resume document — the swap arm cannot be rebuilt'); process.exit(3); }

const notes = fs.readFileSync(path.join(HERE, 'notes.txt'), 'utf8');
const notesBlock = userContextBlock(notes);

// A question that is neither a greeting nor an intro request — the injection is the same for all of them.
const r = await assemblePromptContext('How would you index those tables?', resumeDoc, jdDoc, [], null, undefined);
if (!r.systemPromptInjection) { console.error('assemblePromptContext returned no injection'); process.exit(3); }

const swap = `${keepSpokenBudget(P.VERBAL_WHAT_TO_ANSWER_PROMPT, r.systemPromptInjection)}${notesBlock}`;
const verbalNotes = `${P.VERBAL_WHAT_TO_ANSWER_PROMPT}${notesBlock}`;
const plainB = P.VERBAL_WHAT_TO_ANSWER_PROMPT;

for (const [name, text] of [['swap', swap], ['verbal_notes', verbalNotes], ['plainB', plainB]]) {
    fs.writeFileSync(path.join(HERE, `sys-${name}.txt`), text);
    console.log(`sys-${name}.txt  ${text.length} chars`);
}
console.log('injection chars', r.systemPromptInjection.length, ' notes block chars', notesBlock.length,
    ' swap keeps verbal rules:', swap.includes('INTERVIEW FRAMING'), ' swap keeps budget tail:', swap.includes(P.SPOKEN_LENGTH_AND_DEPTH));
