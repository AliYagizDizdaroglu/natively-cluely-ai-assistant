import { describe, it, expect, vi, afterEach } from 'vitest';
import { createUnknownMarkerStripper, stripUnknownMarkers } from './unknownMarkerFilter';
import { WhatToAnswerLLM } from './WhatToAnswerLLM';

/** Push every chunk, return the per-push outputs; the flush is appended as the last entry when non-empty. */
function run(chunks: string[]): string[] {
    const s = createUnknownMarkerStripper();
    const out = chunks.map((c) => s.push(c));
    const tail = s.flush();
    if (tail) out.push(tail);
    return out;
}

describe('createUnknownMarkerStripper (spec 7.1)', () => {
    it('strips an unknown __WORD__ marker', () => {
        expect(run(['a __FOO__ b']).join('')).toBe('a  b');
    });
    it('keeps __MORE__ and __CUES__', () => {
        expect(run(['x __MORE__ y __CUES__ z']).join('')).toBe('x __MORE__ y __CUES__ z');
    });
    it('keeps the model-source sentinel: the colon and the space keep it from matching WORD', () => {
        const s = '__model_source:gemini-3.1-flash-lite (hedge)__';
        expect(run([s]).join('')).toBe(s);
    });
    it('strips a marker split across chunks, releasing the safe part first', () => {
        expect(run(['a __FO', 'O__ b'])).toEqual(['a ', ' b']);
    });
    it('releases a partial once whitespace shows it is not a marker', () => {
        expect(run(['x __abc', ' y'])).toEqual(['x ', '__abc y']);
    });
    it('end of stream: a held partial comes out on flush', () => {
        expect(run(['tail __ab'])).toEqual(['tail ', '__ab']);
    });
    it('snake_case passes unchanged', () => {
        expect(run(['use snake_case and my_var_name here']).join('')).toBe('use snake_case and my_var_name here');
    });
});

describe('stripUnknownMarkers (generator)', () => {
    it('wraps the stripper over a stream and flushes the tail', async () => {
        async function* src() { yield 'a __FO'; yield 'O__ b __ab'; }
        let out = '';
        for await (const c of stripUnknownMarkers(src())) out += c;
        expect(out).toBe('a  b __ab');
    });
});

describe('WhatToAnswerLLM placement (M5)', () => {
    afterEach(() => vi.restoreAllMocks());
    const VERBAL = { intent: 'general', confidence: 0.9, answerShape: '' } as any;
    function makeHelper(chunks: string[]) {
        async function* stream(): AsyncGenerator<string> { for (const c of chunks) yield c; }
        return { streamChat: vi.fn(() => stream()), streamVerbalWithGeminiFlash: vi.fn(() => stream()), getCurrentModelId: vi.fn(() => 'gemini-3.1-flash-lite') } as any;
    }
    async function drain(gen: AsyncGenerator<string>): Promise<string> {
        let out = '';
        for await (const c of gen) out += c;
        return out;
    }
    const gen = (helper: any) => new WhatToAnswerLLM(helper).generateStream('[INTERVIEWER]: How much memory?', undefined, VERBAL);

    it('a stray __S1Q05__ is not displayed', async () => {
        vi.spyOn(console, 'log').mockImplementation(() => {});
        const out = await drain(gen(makeHelper(['Hello __S1Q05__ world'])));
        expect(out).not.toContain('__S1Q05__');
        expect(out).toContain('Hello');
        expect(out).toContain('world');
    });
    it('a stray marker split across chunks is not displayed either', async () => {
        vi.spyOn(console, 'log').mockImplementation(() => {});
        const out = await drain(gen(makeHelper(['Hello __S1Q', '05__ world'])));
        expect(out).not.toContain('S1Q05');
    });
});
