import { describe, it, expect, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

// verbal-diag.log is the LIVE app's diagnostic log, read when analysing flights, and only the
// app's Electron main process may write it. Vitest runs appended 262 synthetic filter lines on
// 2026-09-22 (21Z, 23Z); the flight's offline answer arms and chains pass, plain node started in
// the checkout, appended ~440 look-alike lines on each of the 2026-09-21 and 09-22 flights.

type Runtime = 'plain node' | 'electron as node' | 'electron main';

/** The last logWrittenIn call, settled or not. */
let lastCall: Promise<unknown> = Promise.resolve();

/**
 * logWrittenInNow, one call at a time. It swaps process-wide state (cwd, VITEST, versions.electron,
 * process.type) across awaits, and vitest abandons a timed-out test without stopping its body: the
 * body runs on, and its finally puts that state back in the middle of the next test. Seen
 * 2026-09-23 in WhatToAnswerLLM.diagLog.test.ts under load: the next test's finally hit ENOENT on
 * chdir, and an Electron-main copy loaded with the checkout as cwd appended to the checkout's
 * verbal-diag.log. A call waiting for its turn spends its own test's budget: after a hang, only
 * the first timeout in a row is the real one.
 */
function logWrittenIn(runtime: Runtime): Promise<string> {
    const call = lastCall.then(() => logWrittenInNow(runtime));
    lastCall = call.catch(() => {});
    return call;
}

/**
 * Drains one answer through a fresh copy of the filter, in a process that looks like `runtime`,
 * and returns what landed in verbal-diag.log. The log path is cwd-relative and fixed when the
 * module loads, so the copy is loaded with the cwd in a temp dir: a failing run writes there,
 * never into the checkout's live log.
 */
async function logWrittenInNow(runtime: Runtime): Promise<string> {
    const home = process.cwd();
    const vitest = process.env.VITEST;
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'verbal-diag-'));
    try {
        process.chdir(dir);
        vi.resetModules();
        const { filterVerbalLines } = await import('./verbalStreamFilter');
        // No case may lean on VITEST: the guard has to hold by runtime alone. Electron run as node
        // (ELECTRON_RUN_AS_NODE, how the built-module probes run) keeps versions.electron but sets
        // no process.type; the app's main process is type 'browser' (both measured on Electron 33.4.11).
        delete process.env.VITEST;
        if (runtime !== 'plain node') Object.defineProperty(process.versions, 'electron', { value: '33.4.11', configurable: true });
        if (runtime === 'electron main') Object.defineProperty(process, 'type', { value: 'browser', configurable: true });
        async function* source() {
            yield 'Time: O(1).\n';
            yield 'The cache evicts the least recently used entry.';
        }
        for await (const _chunk of filterVerbalLines(source())) { /* drain */ }
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

describe('verbalStreamFilter diagnostic log', () => {
    it('plain node (the offline arms, a vitest run) writes no verbal-diag.log', async () => {
        expect(await logWrittenIn('plain node')).toBe('');
    });

    it('Electron run as node (a built-module probe) writes no verbal-diag.log', async () => {
        expect(await logWrittenIn('electron as node')).toBe('');
    });

    it("the app's Electron main process still writes it", async () => {
        expect(await logWrittenIn('electron main')).toContain('>>> filterVerbalLines started (streaming)');
    });
});
