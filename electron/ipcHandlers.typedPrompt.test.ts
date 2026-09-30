import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Spec 2026-09-30 §3.6: a typed chat answer carries no cue block, so gemini-chat-stream sends the
 * verbal prompt WITHOUT the cue rule (VERBAL_TYPED_PROMPT) on both of its verbal branches — the
 * plain one and the knowledge-injection one. ipcHandlers.ts registers every handler against the
 * Electron runtime and has no unit harness, and the whole change is two identifiers, so this pins
 * the source text: without it the seam is found only by a user reading `__CUES__` in a bubble.
 */
// The path hangs off __dirname (this folder): vitest workers keep the caller's cwd, which is %TEMP%
// under the repo's test command, not --root.
const src = fs.readFileSync(path.join(__dirname, 'ipcHandlers.ts'), 'utf8');
// Only the lines that matter, trimmed: a failing pin then prints a few lines, not the whole source.
const lines = src.split('\n').map((l) => l.trim());
const mentioning = (re: RegExp): string[] => lines.filter((l) => re.test(l));

describe('gemini-chat-stream sends the typed verbal prompt', () => {
    it('names a verbal prompt or the cue rule in exactly three lines: the typed import and its two verbal branches', () => {
        // the hands-free prompt, CUE_RULE or the sentinel reaching this file any way at all adds a line here (re-review N8)
        expect(mentioning(/VERBAL_\w+_PROMPT|CUE_RULE|CUES_SENTINEL|__CUES__/)).toEqual([
            'import { VERBAL_TYPED_PROMPT } from "./llm/prompts"',
            'let verbalSystemPrompt = VERBAL_TYPED_PROMPT;',
            'verbalSystemPrompt = `${kr.systemPromptInjection}\\n\\n${VERBAL_TYPED_PROMPT}`;',
        ]);
    });
    it('sends that variable: every line that names it is its declaration, the knowledge branch and the one call', () => {
        // a line that re-assigns or wraps the prompt between the pin above and the call adds a line here (Task 1b review, I1)
        expect(mentioning(/\bverbalSystemPrompt\b|streamVerbalWithGeminiFlash\(/)).toEqual([
            'let verbalSystemPrompt = VERBAL_TYPED_PROMPT;',
            'verbalSystemPrompt = `${kr.systemPromptInjection}\\n\\n${VERBAL_TYPED_PROMPT}`;',
            'stream = llmHelper.streamVerbalWithGeminiFlash(userContent, verbalSystemPrompt, undefined, selectedModel);',
        ]);
    });
});
