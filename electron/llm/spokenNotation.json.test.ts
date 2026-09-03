import { describe, it, expect } from 'vitest';
import { stripSpokenNotation } from './verbalStreamFilter';

/**
 * Regression found during the 60-minute run (2026-09-02): the knowledge
 * short-circuit in streamChat yields a JSON coaching object instead of speech,
 * and stripSpokenNotation — written for TeX-style "\alpha" — deleted the
 * backslash from every "\n" inside it. The JSON still parsed, so nothing
 * failed loudly; the card just showed "…code.nIt also…".
 */
async function* chunks(parts: string[]) { for (const p of parts) yield p; }
async function drain(g: AsyncIterable<string>) { let o = ''; for await (const c of g) o += c; return o; }

const blob = JSON.stringify({
    __negotiationCoaching: {
        tacticalNote: 'Keep it concrete.\nName the parts.',
        suggestedResponse: 'I prefer CloudFormation because it is "infrastructure as code".\nIt also integrates with CI/CD.',
    },
});

describe('stripSpokenNotation and structured payloads', () => {
    it('passes a JSON object through byte-for-byte when delivered whole', async () => {
        expect(await drain(stripSpokenNotation(chunks([blob])))).toBe(blob);
    });

    it('passes it through intact even when the stream splits at every escape', async () => {
        const out = await drain(stripSpokenNotation(chunks(blob.split(/(?=\\)/))));
        expect(out).toBe(blob);
        // the actual failure mode: the newline must survive as a newline
        expect(JSON.parse(out).__negotiationCoaching.tacticalNote).toBe('Keep it concrete.\nName the parts.');
    });

    it('passes it through when the first chunk is only whitespace', async () => {
        expect(await drain(stripSpokenNotation(chunks([' ', '\n', blob])))).toBe(' \n' + blob);
    });

    it('still strips notation from ordinary speech', async () => {
        expect(await drain(stripSpokenNotation(chunks(['use `ModelLatency` and **p99**'])))).toBe('use ModelLatency and p99');
    });

    it('does not treat a spoken sentence that merely contains a brace as a payload', async () => {
        expect(await drain(stripSpokenNotation(chunks(['the `{}` literal is **empty**'])))).toBe('the {} literal is empty');
    });
});
