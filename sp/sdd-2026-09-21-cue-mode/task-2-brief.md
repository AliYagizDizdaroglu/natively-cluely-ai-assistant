### Task 2: `extractCues` and the streaming guard `stripCueBlock`

**Files:**
- Modify: `electron/llm/verbalStreamFilter.ts` (after `stripSuggestionBlock` / `longestSentinelPrefixSuffix`, around line 320)
- Test: `electron/llm/verbalStreamFilter.test.ts`

**Interfaces:**
- Produces: `extractCues(text: string): { cues: string[]; prose: string }`; `stripCueBlock(source: AsyncGenerator<string>, onCues?: (cues: string[]) => void): AsyncGenerator<string>` — yields prose only; calls `onCues` exactly once per stream (at block close, at stream end inside the block, or as soon as the stream is known not to start with the sentinel).

- [ ] **Step 1: Write the failing tests**

Append to `electron/llm/verbalStreamFilter.test.ts` (add `extractCues, stripCueBlock` to the import on line 2, and `import { CUES_SENTINEL } from './prompts';` on a new line):

```ts
/** Feed `text` through the cue guard in fixed-size chunks. */
async function runCues(text: string, chunkSize: number): Promise<{ out: string; cues: string[] | null; calls: number }> {
    async function* source() { for (let i = 0; i < text.length; i += chunkSize) yield text.slice(i, i + chunkSize); }
    let out = '', cues: string[] | null = null, calls = 0;
    for await (const c of stripCueBlock(source(), (x) => { cues = x; calls++; })) out += c;
    return { out, cues, calls };
}

describe('extractCues — splitting the cue block from the spoken answer (cue mode, spec 2026-09-20)', () => {
    const PROSE = 'Ten million vectors take about thirty gigabytes.\nQuantizing to int eight halves it.';

    it('no sentinel at the start: no cues, text unchanged', () => {
        expect(extractCues(PROSE)).toEqual({ cues: [], prose: PROSE });
        expect(extractCues('')).toEqual({ cues: [], prose: '' });
    });
    it('one line, several lines, leading blank lines and a blank line inside the block', () => {
        expect(extractCues(`__CUES__\n1| thirty gigabytes in float32\n${PROSE}`)).toEqual({ cues: ['thirty gigabytes in float32'], prose: PROSE });
        expect(extractCues(`\n\n__CUES__\n1| thirty gigabytes\n\n2| int8, then shard\n${PROSE}`)).toEqual({ cues: ['thirty gigabytes', 'int8, then shard'], prose: PROSE });
    });
    it('the first non-cue line closes the block; that line and everything after it are prose', () => {
        expect(extractCues(`__CUES__\n1| thirty gigabytes\nnot a cue line\n2| looks like one\n`)).toEqual({ cues: ['thirty gigabytes'], prose: 'not a cue line\n2| looks like one\n' });
    });
    it('wrapping quotes are removed; an over-long line is kept whole (a bench finding, not a runtime repair)', () => {
        const long = 'one two three four five six seven eight nine ten';
        expect(extractCues(`__CUES__\n1| "thirty gigabytes"\n2| ${long}\nProse.`)).toEqual({ cues: ['thirty gigabytes', long], prose: 'Prose.' });
    });
    it('block only, no prose', () => {
        expect(extractCues('__CUES__\n1| a\n2| b\n')).toEqual({ cues: ['a', 'b'], prose: '' });
    });
    it('the sentinel it recognises is the one the prompt asks for', () => {
        expect(extractCues(`${CUES_SENTINEL}\n1| a\nProse.`).cues).toEqual(['a']);
    });
});

describe('stripCueBlock — the block must never flash on screen, and the prose must never be swallowed', () => {
    const FULL = '__CUES__\n1| thirty gigabytes in float32\n2| int8, then shard\nTen million vectors take about thirty gigabytes. Quantizing to int eight halves it.\n';
    const PROSE = 'Ten million vectors take about thirty gigabytes. Quantizing to int eight halves it.\n';

    // 1 and 3 split "__CUES__" across chunk boundaries — where a naive indexOf leaks "__CU".
    it.each([1, 3, 4, 7, 500])('strips the block at chunk size %i and matches extractCues', async (size) => {
        const { out, cues, calls } = await runCues(FULL, size);
        expect(out).not.toContain('__CUES__');
        expect(out).not.toContain('__CU');
        expect(out).toBe(extractCues(FULL).prose);
        expect(out).toBe(PROSE);
        expect(cues).toEqual(['thirty gigabytes in float32', 'int8, then shard']);
        expect(calls).toBe(1);
    });
    it('passes an answer with no block through byte-for-byte and reports an empty array, once', async () => {
        const { out, cues, calls } = await runCues(PROSE, 3);
        expect(out).toBe(PROSE);
        expect(cues).toEqual([]);
        expect(calls).toBe(1);
    });
    it('tolerates whitespace before the sentinel (a stream often opens with a newline)', async () => {
        const { out, cues } = await runCues('\n__CUES__\n1| a\nProse.', 2);
        expect(out).toBe('Prose.');
        expect(cues).toEqual(['a']);
    });
    it('a non-cue line closes the block; the prose starts there, with the line intact', async () => {
        const { out, cues } = await runCues('__CUES__\n1| a\nThis is prose\n2| not a cue\n', 5);
        expect(cues).toEqual(['a']);
        expect(out).toBe('This is prose\n2| not a cue\n');
    });
    it('block only: cues delivered, nothing yielded, one callback at stream end', async () => {
        const { out, cues, calls } = await runCues('__CUES__\n1| a\n2| b', 4);
        expect(out).toBe('');
        expect(cues).toEqual(['a', 'b']);
        expect(calls).toBe(1);
    });
    it('a partial sentinel that never completes is prose', async () => {
        const { out, cues } = await runCues('__CU', 1);
        expect(out).toBe('__CU');
        expect(cues).toEqual([]);
    });
    it('does not mistake ordinary underscores or a sentinel mid-answer for the block', async () => {
        const text = 'Use __init__ for setup. Then __CUES__ is just text here.';
        const { out, cues } = await runCues(text, 2);
        expect(out).toBe(text);
        expect(cues).toEqual([]);
    });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node node_modules/vitest/vitest.mjs run electron/llm/verbalStreamFilter.test.ts`
Expected: FAIL — `extractCues` / `stripCueBlock` are not exported.

- [ ] **Step 3: Implement**

In `electron/llm/verbalStreamFilter.ts`, directly after `longestSentinelPrefixSuffix` (after line ~320):

```ts
/**
 * Sentinel that opens the cue block (cue mode, spec 2026-09-20). Kept module-local like
 * SENTINEL above; prompts.ts CUES_SENTINEL is the same string and the test proves it.
 */
const CUES_SENTINEL = '__CUES__';
const CUE_LINE = /^(\d+)\s*\|\s*(.+)$/;
const cuePhrase = (m: RegExpMatchArray): string => m[2].trim().replace(/^["'`]|["'`]$/g, '');

/**
 * Splits a completed verbal answer into its cue block and the spoken prose.
 *
 * The model is asked (CUE_RULE) to OPEN with the sentinel and one `N| key phrase` line per
 * part of the question, then the prose:
 *
 *     __CUES__
 *     1| thirty gigabytes in float32
 *     2| int8, then shard
 *     Ten million vectors take ...
 *
 * The block ends at the first non-empty line that is not a cue line; that line and everything
 * after it are prose, untouched. No sentinel at the start means no cues and the text is
 * returned unchanged. Lines are trimmed and wrapping quotes removed, never truncated: an
 * over-long cue is a bench finding (cues_wellformed), not a runtime repair.
 */
export function extractCues(text: string): { cues: string[]; prose: string } {
    const lines = text.split('\n');
    let i = 0;
    while (i < lines.length && lines[i].trim() === '') i++;
    if (i === lines.length) return { cues: [], prose: text };
    const first = lines[i].trimStart();
    if (!first.startsWith(CUES_SENTINEL)) return { cues: [], prose: text };
    lines[i] = first.slice(CUES_SENTINEL.length);   // anything after the sentinel on its line is block text
    const cues: string[] = [];
    for (; i < lines.length; i++) {
        const t = lines[i].trim();
        if (t === '') continue;
        const m = t.match(CUE_LINE);
        if (!m) break;
        const phrase = cuePhrase(m);
        if (phrase) cues.push(phrase);
    }
    return { cues, prose: lines.slice(i).join('\n') };
}

/**
 * Streaming guard for the cue block: yields the prose only and hands the cues to `onCues`
 * exactly once — at block close, at stream end if the stream ends inside the block, or as
 * soon as the stream is known not to start with the sentinel. Leading whitespace before the
 * sentinel is tolerated. A sentinel anywhere but the start is prose and stays in the text.
 *
 * Holds back only what it must: before the decision, at most a partial sentinel (so an
 * answer with no block is delayed by the length of "__CUES__" at most); inside the block,
 * at most one partial line. The result on a whole string equals extractCues.
 */
export async function* stripCueBlock(
    source: AsyncGenerator<string>,
    onCues?: (cues: string[]) => void,
): AsyncGenerator<string> {
    let phase: 'prefix' | 'block' | 'prose' = 'prefix';
    let pending = '';   // prefix: text not yet known to be prose; block: the partial line
    const cues: string[] = [];
    let reported = false;
    const report = () => { if (reported) return; reported = true; onCues?.(cues.slice()); };

    for await (const chunk of source) {
        if (phase === 'prose') { yield chunk; continue; }
        pending += chunk;
        if (phase === 'prefix') {
            const lead = pending.replace(/^\s+/, '');
            if (lead.startsWith(CUES_SENTINEL)) {
                phase = 'block';
                pending = lead.slice(CUES_SENTINEL.length);
            } else if (CUES_SENTINEL.startsWith(lead)) {
                continue;   // still could be the sentinel (or only whitespace so far)
            } else {
                phase = 'prose';
                report();
                yield pending;
                pending = '';
                continue;
            }
        }
        // phase === 'block': consume complete lines; the first non-cue line closes the block
        let nl: number;
        while ((nl = pending.indexOf('\n')) !== -1) {
            const t = pending.slice(0, nl).trim();
            if (t === '') { pending = pending.slice(nl + 1); continue; }
            const m = t.match(CUE_LINE);
            if (m) {
                const phrase = cuePhrase(m);
                if (phrase) cues.push(phrase);
                pending = pending.slice(nl + 1);
                continue;
            }
            phase = 'prose';
            report();
            yield pending;   // this line and everything after it, intact
            pending = '';
            break;
        }
    }

    if (phase === 'prefix') {
        // whitespace only, or a partial sentinel that never completed: prose, as it arrived
        report();
        if (pending) yield pending;
        return;
    }
    if (phase === 'block') {
        // the stream ended inside the block; a partial last line is a cue if it parses, else prose
        const m = pending.trim().match(CUE_LINE);
        if (m) { const phrase = cuePhrase(m); if (phrase) cues.push(phrase); pending = ''; }
        report();
        if (pending.trim()) yield pending;
    }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node node_modules/vitest/vitest.mjs run electron/llm/verbalStreamFilter.test.ts`
Expected: PASS, every case including all five chunk sizes.

- [ ] **Step 5: Commit**

```bash
git add electron/llm/verbalStreamFilter.ts electron/llm/verbalStreamFilter.test.ts
git commit -m "feat(cues): strip the cue block from the stream, hand the cues out once

extractCues is the pure split; stripCueBlock is the streaming guard, proven
under chunking that splits the sentinel and the lines. The block ends at the
first non-cue line and the prose is never swallowed; no sentinel means an
unchanged answer and an empty callback.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

