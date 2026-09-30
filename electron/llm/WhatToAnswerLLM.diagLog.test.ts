import { describe, it, expect, vi, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import type { IntentResult } from './IntentClassifier';

// The rule of verbalStreamFilter.diagLog.test.ts, for WhatToAnswerLLM's own copy of diagLog:
// only the app's Electron main process writes the live verbal-diag.log. The two copies' guards
// have drifted apart before: this one had the VITEST check from 3f39fe0 (2026-09-03), the
// filter's had no guard at all until 2026-09-23.

type Runtime = 'plain node' | 'electron as node' | 'electron main';

const CODING: IntentResult = { intent: 'coding', confidence: 0.9, answerShape: 'Code first, then a short walkthrough.' };

/** The last logWrittenIn call, settled or not. */
let lastCall: Promise<unknown> = Promise.resolve();

/** logWrittenInNow, one call at a time: see verbalStreamFilter.diagLog.test.ts. */
function logWrittenIn(runtime: Runtime): Promise<string> {
    const call = lastCall.then(() => logWrittenInNow(runtime));
    lastCall = call.catch(() => {});
    return call;
}

/** As in verbalStreamFilter.diagLog.test.ts, with one coding answer through generateStream. */
async function logWrittenInNow(runtime: Runtime): Promise<string> {
    const home = process.cwd();
    const vitest = process.env.VITEST;
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'verbal-diag-'));
    try {
        process.chdir(dir);
        vi.resetModules();
        const { WhatToAnswerLLM } = await import('./WhatToAnswerLLM');
        delete process.env.VITEST;
        if (runtime !== 'plain node') Object.defineProperty(process.versions, 'electron', { value: '33.4.11', configurable: true });
        if (runtime === 'electron main') Object.defineProperty(process, 'type', { value: 'browser', configurable: true });
        // The model call is the one external piece: the coding route hands it the message and
        // passes its stream straight through.
        const helper = { async *streamChat() { yield 'def reverse(head): ...'; } };
        for await (const _chunk of new WhatToAnswerLLM(helper as any).generateStream('Reverse a linked list in place.', undefined, CODING)) { /* drain */ }
        const log = path.join(dir, 'verbal-diag.log');
        return fs.existsSync(log) ? fs.readFileSync(log, 'utf8') : '';
    } finally {
        delete (process as any).type;
        delete (process.versions as any).electron;
        process.env.VITEST = vitest;
        process.chdir(home);
        fs.rmSync(dir, { recursive: true, force: true });
    }
}

describe('WhatToAnswerLLM diagnostic log', () => {
    // The first load of WhatToAnswerLLM's module graph (LLMHelper and the model SDKs) took 1.0 s
    // alone, 1.7-2.3 s in a full vitest run and 8.5-12.1 s with three full runs at once
    // (2026-09-23): past the 5 s test budget, where the first case timed out, and past the 10 s
    // hook default. Every fresh copy after it loaded in ~0.1 s, so the first load is paid here,
    // once, on five times the worst of those.
    beforeAll(async () => { await import('./WhatToAnswerLLM'); }, 60_000);

    it('plain node writes no verbal-diag.log', async () => {
        expect(await logWrittenIn('plain node')).toBe('');
    });

    it('Electron run as node writes no verbal-diag.log', async () => {
        expect(await logWrittenIn('electron as node')).toBe('');
    });

    it("the app's Electron main process still writes it", async () => {
        expect(await logWrittenIn('electron main')).toContain('=== generateStream invoked ===');
    });
});
