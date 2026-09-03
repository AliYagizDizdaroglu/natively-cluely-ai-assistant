import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
// @ts-ignore — untyped ESM harness module
import { computeRun, evaluateGate, GATE } from './interview60.metrics.mjs';

// @ts-ignore — import.meta is ESM-only; this file runs under vitest's ESM
// transform regardless of electron/tsconfig.json's CommonJS module target
const HERE = path.dirname(fileURLToPath(import.meta.url));
const BEFORE = path.join(HERE, 'interview60.runs', '2026-09-02-before');
const have = fs.existsSync(path.join(BEFORE, 'natively_debug.log'));

// computeRun(BEFORE) must NOT run at describe-body/collection time: skipIf only
// skips the it()s, and a describe body runs unconditionally during collection
// (proved in the isolation worktree, where interview60.runs/ is gitignored and
// absent — the bare call threw ENOENT there even with skipIf true). Deferring
// it into beforeAll keeps a clean checkout green.
describe.skipIf(!have)(`computeRun on the 2026-09-02 baseline (regression: the numbers the published report shows)${have ? '' : ` — SKIPPED: fixture not present at ${BEFORE} (gitignored)`}`, () => {
    let m: any;
    beforeAll(() => { m = computeRun(BEFORE); });
    it('attributes the hour the way the report did', () => {
        expect(m.items.length).toBe(52);
        expect(m.heard).toBe(51);
        expect(m.answered).toBe(26);
        expect(m.items.filter((i: any) => i.heardBy === null).map((i: any) => i.id)).toEqual(['M04']);
        expect(m.raceLosses).toBe(22);
        expect(m.sttCloses).toBe(299);
        expect(m.lostUtterances).toBe(2);
        expect(m.fragmentChips).toBe(5);
        expect(m.coachingAnswers).toBe(25);
        // The published page counted 4 CODING routes; 2 of those were the screenshot
        // cues, which are not spoken items. Per-item the count is 2–4 depending on
        // how the cue windows attribute — pin the range, not a guess.
        expect(m.codingForSpoken).toBeGreaterThanOrEqual(2);
        expect(m.codingForSpoken).toBeLessThanOrEqual(4);
        expect(m.expiryLoops).toBe(0);
        expect(m.invented).toBe(1);
        expect(m.surfacedMulti).toBe(12);
        expect(m.ttftSource).toBe('answer-only');
    });
    it('fails the gate on the baseline, on the rows the report named', () => {
        const g = evaluateGate(m);
        expect(g.pass).toBe(false);
        const failed = g.rows.filter((r) => !r.pass).map((r) => r.label);
        expect(failed).toContain('Answered hands-free');
        expect(failed).toContain('STT socket closes / lost utterances / fragment chips');
        expect(failed).toContain('Technical questions answered via the coaching path');
    });
});

describe('GATE', () => {
    it('has one row per spec §6 line', () => {
        expect(GATE.map((g) => g.label)).toEqual([
            'Answered hands-free',
            'Heard by either detector',
            'Surfaced detections per question',
            'STT socket closes / lost utterances / fragment chips',
            'Technical questions answered via the coaching path',
            'Spoken questions routed CODING',
            'Live expiry loops',
            'Answer TTFT p90 · detect p50',
        ]);
    });
});
