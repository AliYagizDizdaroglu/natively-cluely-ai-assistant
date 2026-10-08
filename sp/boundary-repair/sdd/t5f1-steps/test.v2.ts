import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
// @ts-ignore — untyped ESM harness module
import { finalsFrom } from './interview60.turns-finals.mjs';

// R22 (flight h40c) as the app logs it since the boundary repair: the Transcript event line keeps
// Deepgram's RAW final and the restore follows on the very next line, from the same handler.
const LOG = [
    '2026-09-29T11:19:27.809Z [LOG] [DeepgramStreaming] Transcript event — isFinal=false, text="How do you cut hallucinations in a rag answer without just making"',
    '2026-09-29T11:19:27.826Z [LOG] [DeepgramStreaming] Transcript event — isFinal=true, text="How do you cut"',
    '2026-09-29T11:19:28.500Z [LOG] [DeepgramStreaming] Transcript event — isFinal=true, text=""',
    '2026-09-29T11:19:29.373Z [LOG] [DeepgramStreaming] Transcript event — isFinal=true, text="in a rag answer without just making it refuse?"',
    '2026-09-29T11:19:29.373Z [LOG] [DeepgramStreaming] boundary repair: restored "hallucinations" before "in a rag answer without just making it r"',
    '2026-09-29T11:19:30.000Z [LOG] [Main] turn: classify finals=2 question="How do you cut hallucinations in a rag answer without just making it refuse?"',
    '2026-09-29T11:19:31.000Z [LOG] [DeepgramStreaming] Transcript event — isFinal=true, text="Okay."',
    '2026-09-29T11:19:31.001Z [LOG] [Main] turn: deepgram utterance-end vad=false',
    '2026-09-29T11:19:31.002Z [LOG] [DeepgramStreaming] boundary repair: restored "not" before "this one"',
].join('\n');
const at = (iso: string) => Date.parse(iso);

describe('finalsFrom: the interviewer finals as the turn tracker saw them', () => {
    it('a final directly followed by a boundary-repair line replays as the restored words + the raw text', () => {
        expect(finalsFrom(LOG, 0)).toEqual([
            { at: at('2026-09-29T11:19:27.826Z'), text: 'How do you cut' },
            { at: at('2026-09-29T11:19:29.373Z'), text: 'hallucinations in a rag answer without just making it refuse?' },
            { at: at('2026-09-29T11:19:31.000Z'), text: 'Okay.' },
        ]);
    });

    it('keeps interims and empty finals out, and drops finals before `since`', () => {
        expect(finalsFrom(LOG, at('2026-09-29T11:19:29.373Z')).map((f) => f.text))
            .toEqual(['hallucinations in a rag answer without just making it refuse?', 'Okay.']);
    });

    it('a repair line that is not the very next line after a final is not applied (one synchronous handler writes both lines)', () => {
        expect(finalsFrom(LOG, 0).some((f) => f.text.startsWith('not '))).toBe(false);
    });

    // Pre-repair logs hold no repair line, so the parser must equal the old inline parse there: the two
    // committed fixtures are the calibration (extracted with `since = startedMs - 2000`, as the extractor does).
    // Paths hang off __dirname (this folder): vitest workers keep the caller's cwd, which is %TEMP% under the
    // repo's test command, not --root.
    for (const name of ['2026-09-09T15-00-55-s50a', '2026-09-08T08-44-56-after9']) {
        const golden = __dirname;
        const run = path.join(golden, 'interview60.runs', name);
        // interview60.runs/ is gitignored (.gitignore:258): a clean checkout has no run logs, so these skip there.
        it.skipIf(!fs.existsSync(path.join(run, 'natively_debug.log')))(`reproduces the committed ${name} fixture's finals from its run log (skipped where the run folder is absent)`, () => {
            const tl = JSON.parse(fs.readFileSync(path.join(run, 'interview60.timeline.json'), 'utf8'));
            const dbg = fs.readFileSync(path.join(run, 'natively_debug.log'), 'utf8');
            const fixture = JSON.parse(fs.readFileSync(path.join(golden, 'fixtures', `${name}-turns.json`), 'utf8'));
            expect(dbg.includes('boundary repair: restored')).toBe(false);
            expect(finalsFrom(dbg, tl.startedMs - 2000)).toEqual(fixture.finals);
        });
    }
});
