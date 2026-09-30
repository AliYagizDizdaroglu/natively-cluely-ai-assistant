import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Spec 2026-09-30 §3.6: a typed chat answer carries no cue block, so gemini-chat-stream sends the
 * verbal prompt WITHOUT the cue rule (VERBAL_TYPED_PROMPT) on both of its verbal branches — the
 * plain one and the knowledge-injection one. ipcHandlers.ts registers every handler against the
 * Electron runtime and has no unit harness, and the whole change is two identifiers, so this pins
 * the source text: without it the seam is found only by a user reading `__CUES__` in a bubble.
 */
// @ts-ignore — import.meta is ESM-only; this file runs under vitest's ESM transform
const HERE = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(HERE, 'ipcHandlers.ts'), 'utf8');

describe('gemini-chat-stream sends the typed verbal prompt', () => {
    it('imports VERBAL_TYPED_PROMPT and never mentions the hands-free prompt or the cue rule', () => {
        expect(src).toMatch(/import \{ VERBAL_TYPED_PROMPT \} from ["']\.\/llm\/prompts["']/);
        expect(src).not.toContain('VERBAL_WHAT_TO_ANSWER_PROMPT');
        // the rule must not reach the typed prompt some other way either (re-review N8)
        expect(src).not.toMatch(/CUE_RULE|CUES_SENTINEL|__CUES__/);
    });
    it('uses it on both verbal branches: the plain prompt and the knowledge-injected one', () => {
        expect(src).toContain('let verbalSystemPrompt = VERBAL_TYPED_PROMPT;');
        expect(src).toContain('verbalSystemPrompt = `${kr.systemPromptInjection}\\n\\n${VERBAL_TYPED_PROMPT}`;');
    });
});
