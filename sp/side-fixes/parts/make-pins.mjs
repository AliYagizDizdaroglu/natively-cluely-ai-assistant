// Builds a/ (the target's file) and b/ (with the pinned expectation changed) copies of the two pinned
// test files the side fixes change, under side-fixes/pins/. Reads the merge-cue worktree, writes only here.
// Each edit must match exactly once, at the line number given, or the script stops with exit 1.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, '..', 'pins');
const TARGET = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/.claude/worktrees/merge-cue';

const EDITS = [
    {
        file: 'electron/ipcHandlers.typedPrompt.test.ts',
        lines: {
            33: [
                "            'stream = llmHelper.streamVerbalWithGeminiFlash(userContent, verbalSystemPrompt, undefined, selectedModel);',",
                "            'const verbal = llmHelper.streamVerbalWithGeminiFlash(userContent, verbalSystemPrompt, undefined, selectedModel);',",
            ],
        },
    },
    {
        file: 'electron/llm/WhatToAnswerLLM.hedgeCues.test.ts',
        lines: Object.fromEntries([130, 165, 183].map((n) => [n, [
            "expect(asked()).toEqual(['gemini-3.5-flash-lite', 'gemini-3.5-flash-lite']);",
            "expect(asked()).toEqual(['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite']);",
        ]])),
    },
];

for (const { file, lines } of EDITS) {
    const src = fs.readFileSync(path.join(TARGET, file), 'utf8');
    if (src.includes('\r')) { console.error(`${file}: has CR, refusing`); process.exit(1); }
    const rows = src.split('\n');
    for (const [n, [from, to]] of Object.entries(lines)) {
        const i = Number(n) - 1;
        const occurrences = rows.filter((r) => r.includes(from)).length;
        if (!rows[i].includes(from)) { console.error(`${file}:${n}: expected text not on this line: ${JSON.stringify(rows[i])}`); process.exit(1); }
        if (file.endsWith('typedPrompt.test.ts') && occurrences !== 1) { console.error(`${file}: expected 1 occurrence, found ${occurrences}`); process.exit(1); }
        rows[i] = rows[i].replace(from, to);
    }
    const all = EDITS.find((e) => e.file === file);
    const changed = rows.join('\n');
    for (const side of ['a', 'b']) {
        const dest = path.join(OUT, side, file);
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.writeFileSync(dest, side === 'a' ? src : changed);
    }
    const diffLines = src.split('\n').filter((r, k) => r !== changed.split('\n')[k]).length;
    console.log(`${file}: ${diffLines} line(s) changed (expected ${Object.keys(all.lines).length})`);
}
