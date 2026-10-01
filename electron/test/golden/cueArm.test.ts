import { describe, it, expect } from 'vitest';
// @ts-ignore — untyped ESM harness module
import { carriesCueRule, withCueRule, withoutCueRule } from './cueArm.mjs';
import { CUE_RULE, SPOKEN_LENGTH_AND_DEPTH, VERBAL_WHAT_TO_ANSWER_PROMPT } from '../../llm/prompts';

/**
 * The bench replays captured bytes with the cue rule inserted exactly where the app puts it
 * (a pre-cue hour's treatment) or removed byte for byte (a cue hour's control). The request
 * appends a notes block and a language line AFTER the prompt, so "append at the end" would
 * bench a different position from the shipped one.
 */
const TAIL = '\n\n<user_context>notes</user_context>\nAnswer in English.';
const PRE = `${VERBAL_WHAT_TO_ANSWER_PROMPT.split(CUE_RULE).join('')}${TAIL}`;   // an s50m-era capture
const POST = `${VERBAL_WHAT_TO_ANSWER_PROMPT}${TAIL}`;                            // a cue-era capture

describe('cue-rule variants of a captured system prompt', () => {
    it('inserts the rule directly after the structured rule, once, and leaves the tail alone', () => {
        const withRule = withCueRule(PRE, CUE_RULE, SPOKEN_LENGTH_AND_DEPTH)!;
        expect(withRule.indexOf(CUE_RULE)).toBe(PRE.indexOf(SPOKEN_LENGTH_AND_DEPTH) + SPOKEN_LENGTH_AND_DEPTH.length);
        expect(withRule.endsWith(TAIL)).toBe(true);
        expect(withRule.split(CUE_RULE).length - 1).toBe(1);
        expect(withRule).toBe(POST);
    });
    it('strip then insert round-trips a cue-era capture byte for byte', () => {
        expect(carriesCueRule(POST, CUE_RULE)).toBe(true);
        expect(carriesCueRule(PRE, CUE_RULE)).toBe(false);
        expect(withoutCueRule(POST, CUE_RULE)).toBe(PRE);
        expect(withCueRule(withoutCueRule(POST, CUE_RULE), CUE_RULE, SPOKEN_LENGTH_AND_DEPTH)).toBe(POST);
    });
    it('refuses to insert when the anchor is missing, and never doubles the rule', () => {
        expect(withCueRule('some other system prompt', CUE_RULE, SPOKEN_LENGTH_AND_DEPTH)).toBeNull();
        expect(withCueRule(POST, CUE_RULE, SPOKEN_LENGTH_AND_DEPTH)).toBe(POST);
    });
});
