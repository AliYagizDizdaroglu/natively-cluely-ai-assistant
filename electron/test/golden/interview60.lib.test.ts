import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
// @ts-ignore — untyped ESM harness module; vitest resolves it, tsc has no declaration for it
import { waitForLogLines, logSince, overlap, playStartFromStdout, playEndFromStdout, resolveEnvKey } from './interview60.lib.mjs';

const tmp = () => path.join(os.tmpdir(), `i60-lib-${Date.now()}-${Math.random().toString(36).slice(2)}.log`);
const tmpProjDir = () => {
    const d = path.join(os.tmpdir(), `i60-lib-env-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    fs.mkdirSync(d, { recursive: true });
    return d;
};

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

describe('resolveEnvKey', () => {
    it('prefers a non-empty environment value over the project .env file', () => {
        const dir = tmpProjDir();
        fs.writeFileSync(path.join(dir, '.env'), 'GEMINI_API_KEY=from-file\n');
        expect(resolveEnvKey('GEMINI_API_KEY', { GEMINI_API_KEY: 'from-env' }, dir)).toBe('from-env');
    });
    it('falls back to the project .env file when the environment does not have it', () => {
        const dir = tmpProjDir();
        fs.writeFileSync(path.join(dir, '.env'), 'GEMINI_API_KEY=from-file\n');
        expect(resolveEnvKey('GEMINI_API_KEY', {}, dir)).toBe('from-file');
    });
    it('treats a blank environment value as unset and falls back to the file', () => {
        const dir = tmpProjDir();
        fs.writeFileSync(path.join(dir, '.env'), 'GEMINI_API_KEY=from-file\n');
        expect(resolveEnvKey('GEMINI_API_KEY', { GEMINI_API_KEY: '  ' }, dir)).toBe('from-file');
    });
    it('is undefined, not a thrown ENOENT, when the project has no .env file at all (a worktree checkout)', () => {
        const dir = tmpProjDir(); // no .env written here
        expect(resolveEnvKey('GEMINI_API_KEY', {}, dir)).toBeUndefined();
    });
    it('is undefined, not a crash, when .env exists but lacks the named key', () => {
        const dir = tmpProjDir();
        fs.writeFileSync(path.join(dir, '.env'), 'OTHER_KEY=x\n');
        expect(resolveEnvKey('GEMINI_API_KEY', {}, dir)).toBeUndefined();
    });
});
