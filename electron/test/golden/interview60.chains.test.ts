import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Spec 2026-09-30 §3.6: interview60.chains.mjs sends the hands-free prompt, which carries CUE_RULE,
 * so its answers open with a cue block. Without stripCueBlock innermost the raw block would enter
 * each stored answer, the anchor-hit proxy and the `ASSISTANT (PREVIOUS SUGGESTION)` history it
 * pushes into the next turn — history the app never builds (its history is the prose fullAnswer).
 * The module reads .env and runs its chains at load, so a test cannot import it; this pins the
 * source text, the pattern of ipcHandlers.typedPrompt.test.ts.
 */
// The path hangs off __dirname (this folder): vitest workers keep the caller's cwd, which is %TEMP%
// under the repo's test command, not --root.
const src = fs.readFileSync(path.join(__dirname, 'interview60.chains.mjs'), 'utf8');

describe('interview60.chains.mjs filters the cue block like the app', () => {
    it('takes stripCueBlock from the built filter beside the three filters it already used', () => {
        expect(src).toContain('const { filterVerbalLines, stripSuggestionBlock, stripSpokenNotation, stripCueBlock } =');
    });
    it('composes it innermost, as WhatToAnswerLLM places it (the wrap of interview60.answers.mjs)', () => {
        expect(src).toContain('stripSpokenNotation(stripSuggestionBlock(filterVerbalLines(stripCueBlock(gen(), () => {})), () => {}))');
        expect(src).not.toContain('filterVerbalLines(gen())');
    });
});
