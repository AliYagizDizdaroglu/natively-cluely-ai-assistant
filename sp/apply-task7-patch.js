const fs = require('fs');

const TARGET = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/llm/WhatToAnswerLLM.ts';
const BRIEF = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/.superpowers/sdd/2026-09-04-answer-what-was-asked/task-7-brief.md';

const src = fs.readFileSync(TARGET, 'utf8');
const briefLines = fs.readFileSync(BRIEF, 'utf8').split('\n');

function replaceOnce(text, oldStr, newStr, label) {
    const count = text.split(oldStr).length - 1;
    if (count !== 1) {
        throw new Error(`${label}: expected exactly 1 occurrence of anchor, found ${count}`);
    }
    return text.split(oldStr).join(newStr);
}

// ---- Edit (a): extend the filter import ----
// Extract the new import line verbatim from the brief's backtick-quoted text (line 85, 1-indexed).
const importLineRaw = briefLines[84]; // 0-indexed
const m = importLineRaw.match(/`([^`]+)`/);
if (!m) throw new Error('Could not extract import line from brief line 85');
const newImportLine = m[1];
const oldImportLine = 'import { filterVerbalLines, stripSuggestionBlock, stripSpokenNotation, type Suggestion } from "./verbalStreamFilter";';
if (newImportLine.indexOf('cutAtWordBudget') === -1) {
    throw new Error('Extracted import line does not contain cutAtWordBudget: ' + newImportLine);
}

let out = replaceOnce(src, oldImportLine, newImportLine, 'Edit (a) import line');

// ---- Edit (b): insert the two constants after diagLog(), before the class ----
// Constants block body = brief lines 90-97 (1-indexed) i.e. index 89..96 inclusive.
const constantsBody = briefLines.slice(89, 97).join('\n');
if (!constantsBody.startsWith('/**') || !constantsBody.includes('SPOKEN_WORD_LIMIT = 80;') || !constantsBody.includes('SPOKEN_WORD_FLOOR = 40;')) {
    throw new Error('Constants block extraction looks wrong:\n' + constantsBody);
}
const anchorB_old = '    } catch { /* swallow — never break the stream on log failure */ }\n}\n\nexport class WhatToAnswerLLM {';
const anchorB_new = '    } catch { /* swallow — never break the stream on log failure */ }\n}\n\n' + constantsBody + '\n\nexport class WhatToAnswerLLM {';
out = replaceOnce(out, anchorB_old, anchorB_new, 'Edit (b) constants insertion');

// ---- Edit (c): replace the yield* tapFirstToken(...) call in the verbal branch ----
// New block = brief lines 103-131 (1-indexed) i.e. index 102..130 inclusive.
const newCallBlock = briefLines.slice(102, 131).join('\n');
if (!newCallBlock.startsWith('                yield* tapFirstToken(') || !newCallBlock.trim().endsWith(');') || !newCallBlock.includes('cutAtWordBudget(')) {
    throw new Error('New call block extraction looks wrong:\n' + newCallBlock);
}
const oldCallBlock = [
    '                yield* tapFirstToken(',
    '                    this.withVerbalFallback(',
    '                        filtered(rawStream),',
    '                        () => filtered(',
    '                            this.llmHelper.streamVerbalWithGeminiFlash(',
    '                                fullMessage,',
    '                                VERBAL_WHAT_TO_ANSWER_PROMPT,',
    '                                undefined,',
    '                                GEMINI_FLASH_FALLBACK_MODEL,',
    '                            ),',
    '                        ),',
    '                    ),',
    '                    (ms) => diagLog(`first token ${ms}ms`),',
    '                    (head) => diagLog(`answer head: ${JSON.stringify(head)}`),',
    '                    t0,',
    '                );',
].join('\n');
out = replaceOnce(out, oldCallBlock, newCallBlock, 'Edit (c) tapFirstToken call block');

fs.writeFileSync(TARGET, out, 'utf8');
console.log('PATCH_APPLIED_OK');
console.log('--- new import line ---');
console.log(newImportLine);
console.log('--- constants body ---');
console.log(constantsBody);
console.log('--- new call block ---');
console.log(newCallBlock);
