import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
// @ts-ignore — untyped ESM harness module; vitest resolves it, tsc has no declaration for it
import { waitForLogLines, logSince, overlap, playStartFromStdout, playEndFromStdout } from './interview60.lib.mjs';

const tmp = () => path.join(os.tmpdir(), `i60-lib-${Date.now()}-${Math.random().toString(36).slice(2)}.log`);

describe('waitForLogLines', () => {
    it('resolves once every pattern has appeared after the offset', async () => {
        const f = tmp();
        fs.writeFileSync(f, 'old line\n');
        const from = fs.statSync(f).size;
        setTimeout(() => fs.appendFileSync(f, '[Main] Starting Meeting...\n'), 30);
        setTimeout(() => fs.appendFileSync(f, '[Main] Live Mode restored → auto\n'), 60);
        const r = await waitForLogLines(f, from, [/Starting Meeting/, /Live Mode restored → auto/], { timeoutMs: 2000, pollMs: 10 });
        expect(r.ok).toBe(true);
        expect(r.missing).toEqual([]);
    });
    it('reports which pattern never appeared and does not hang', async () => {
        const f = tmp();
        fs.writeFileSync(f, '');
        fs.appendFileSync(f, '[Main] Starting Meeting...\n');
        const r = await waitForLogLines(f, 0, [/Starting Meeting/, /Live Mode restored → auto/], { timeoutMs: 100, pollMs: 10 });
        expect(r.ok).toBe(false);
        expect(r.missing.map(String)).toEqual([String(/Live Mode restored → auto/)]);
    });
    it('ignores lines written before the offset', async () => {
        const f = tmp();
        fs.writeFileSync(f, '[Main] Live Mode restored → auto\n');
        const from = fs.statSync(f).size;
        const r = await waitForLogLines(f, from, [/Live Mode restored → auto/], { timeoutMs: 100, pollMs: 10 });
        expect(r.ok).toBe(false);
    });
});

describe('logSince / overlap', () => {
    it('reads only the byte range asked for', () => {
        const f = tmp();
        fs.writeFileSync(f, 'abcdef');
        expect(logSince(f, 2, 4)).toBe('cd');
        expect(logSince(f, 4)).toBe('ef');
        expect(logSince(f, 9)).toBe('');
    });
    it('overlap is the fraction of the first text’s content words found in the second', () => {
        expect(overlap('Why do Docker layers matter for build times?', 'why do docker layer\'s matter for build')).toBeCloseTo(3 / 5, 5);
        expect(overlap('', 'anything')).toBe(0);
    });
});

describe('player stdout stamps (interview60.run.mjs playWav)', () => {
    it('reads the PLAYSTART / PLAYEND epoch-ms lines wherever they sit in the output', () => {
        const out = '\ufeffPLAYSTART 1788961933084\r\nPLAYEND 1788966000123\r\n';
        expect(playStartFromStdout(out)).toBe(1788961933084);
        expect(playEndFromStdout(out)).toBe(1788966000123);
    });
    it('is null until the line has arrived (stdout comes in pieces)', () => {
        expect(playStartFromStdout('')).toBeNull();
        expect(playStartFromStdout('PLAYST')).toBeNull();
        expect(playEndFromStdout('PLAYSTART 1788961933084\r\n')).toBeNull();
    });
});
