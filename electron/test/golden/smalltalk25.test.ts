import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { SMALLTALK25 } from './smalltalk25.questions.mjs';

/**
 * smalltalk25 harness (modelled on live40.test.ts). Every case that spawns a CLI does it in a TEMP COPY of the
 * golden folder laid out as <tmp>/electron/test/golden, so the builder, the clips script and wav:check write there
 * and never touch the real smalltalk25-tts-local or smalltalk25.wav. The sources (items.json and the 25 clips) are
 * outside the repo; with them absent the CLI cases skip rather than pass.
 */
const HERE = __dirname;
const SP_ST = 'C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-lab\\sp\\smalltalk';
const ITEMS = path.join(SP_ST, 'items.json');
const CLIPS = path.join(SP_ST, 'clips');
const HAVE_SOURCES = fs.existsSync(ITEMS) && fs.existsSync(path.join(CLIPS, 'manifest.json'));
const ITEMS_SHA = '52bdab3db973059e6d2f171464b82b3e588bf3e97782f16168b70954bed81c2c';

let tmp: string;

function node(args: string[], cwd: string, env: Record<string, string> = {}) {
    const r = spawnSync(process.execPath, args, { cwd, encoding: 'utf8', env: { ...process.env, ...env } });
    return { code: r.status, out: `${r.stdout}${r.stderr}` };
}

/** <tmp>/<name>/electron/test/golden with every top-level .mjs/.json/.cjs of the real folder (no audio, no dirs). */
function makeGolden(name: string) {
    const g = path.join(tmp, name, 'electron', 'test', 'golden');
    fs.mkdirSync(g, { recursive: true });
    for (const f of fs.readdirSync(HERE)) {
        if (/\.(mjs|json|cjs)$/.test(f) && fs.statSync(path.join(HERE, f)).isFile()) fs.copyFileSync(path.join(HERE, f), path.join(g, f));
    }
    return g;
}

function copyDir(from: string, to: string) {
    fs.mkdirSync(to, { recursive: true });
    for (const f of fs.readdirSync(from)) fs.copyFileSync(path.join(from, f), path.join(to, f));
}

const sha12 = (b: Buffer) => crypto.createHash('sha256').update(b).digest('hex').slice(0, 12);

beforeAll(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'smalltalk25-test-'));
});
afterAll(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
});

describe('smalltalk25.questions.mjs (generated)', () => {
    it('has 25 items: 14 ignore (3 question-shaped, 11 statements) and 11 answer, every gap 20000', () => {
        expect(SMALLTALK25).toHaveLength(25);
        expect(new Set(SMALLTALK25.map((x: any) => x.id)).size).toBe(25);
        const ignore = SMALLTALK25.filter((x: any) => x.expect === 'ignore');
        const answer = SMALLTALK25.filter((x: any) => x.expect === 'answer');
        expect(ignore).toHaveLength(14);
        expect(answer).toHaveLength(11);
        expect(ignore.filter((x: any) => x.talk === 'smalltalk-question')).toHaveLength(3);
        expect(ignore.filter((x: any) => x.talk === 'smalltalk-statement')).toHaveLength(11);
        expect(ignore.every((x: any) => x.role === undefined)).toBe(true);
        expect(answer.every((x: any) => x.talk === undefined)).toBe(true);
        expect(SMALLTALK25.every((x: any) => x.gapMs === 20000)).toBe(true);
        expect(SMALLTALK25.every((x: any) => typeof x.q === 'string' && x.q.length > 0)).toBe(true);
    });

    it('answer roles: 2 behavioral, 4 technical, 3 followup, 1 closing, 1 embedded', () => {
        const role = (r: string) => SMALLTALK25.filter((x: any) => x.role === r).length;
        expect([role('behavioral'), role('technical'), role('followup'), role('closing'), role('embedded')]).toEqual([2, 4, 3, 1, 1]);
    });

    it('never sets kind (the harness reads kind as spoken | screenshot) and follow-ups follow their technical parent', () => {
        expect(SMALLTALK25.every((x: any) => x.kind === undefined)).toBe(true);
        const pos = new Map(SMALLTALK25.map((x: any, i: number) => [x.id, i]));
        const follow = SMALLTALK25.filter((x: any) => x.role === 'followup') as any[];
        expect(follow).toHaveLength(3);
        for (const f of follow) {
            const parent = SMALLTALK25.find((x: any) => x.id === f.parent) as any;
            expect(parent.role).toBe('technical');
            expect(pos.get(f.parent)! < pos.get(f.id)!).toBe(true);
            expect(f.level).toBe('followup');
            expect(f.chain).toBe(f.parent);
        }
        for (const m of SMALLTALK25.filter((x: any) => x.role !== 'followup') as any[]) {
            expect(m.level).toBe('main');
            expect(m.parent).toBeUndefined();
        }
    });

    it('opens with small talk, interleaves real questions, and closes with small talk', () => {
        expect((SMALLTALK25[0] as any).expect).toBe('ignore');
        expect((SMALLTALK25[24] as any).expect).toBe('ignore');
        // no run of more than four real questions in a row (SQ03 SF01 SQ04 SF02 is the longest) (it is a conversation, not a drill)
        let run = 0, longest = 0;
        for (const x of SMALLTALK25 as any[]) { run = x.expect === 'answer' ? run + 1 : 0; longest = Math.max(longest, run); }
        expect(longest).toBe(4);
    });

    it.skipIf(!HAVE_SOURCES)('follows items.json order and records its source sha in the header', () => {
        const items = JSON.parse(fs.readFileSync(ITEMS, 'utf8'));
        const src = fs.readFileSync(path.join(HERE, 'smalltalk25.questions.mjs'), 'utf8');
        expect(src).toContain(ITEMS_SHA);
        const order = [...src.matchAll(/"id":\s*"([A-Z]+\d+)"/g)].map((m) => m[1]);
        expect(order).toEqual(items.items.map((x: any) => x.id));
    });
});

describe.skipIf(!HAVE_SOURCES)('smalltalk25.gen.mjs', () => {
    it('refuses an items.json with one byte changed (exit 2, names the sha)', () => {
        const g = makeGolden('gen-refuse');
        const bad = Buffer.from(fs.readFileSync(ITEMS));
        bad[bad.indexOf(Buffer.from('screen'))] ^= 0x01;
        const badPath = path.join(tmp, 'items-bad.json');
        fs.writeFileSync(badPath, bad);
        const r = node([path.join(g, 'smalltalk25.gen.mjs'), '--items', badPath], g);
        expect(r.code).toBe(2);
        expect(r.out).toMatch(/items\.json sha256 [0-9a-f]{64} refused/);
    });

    it('accepts the real items.json and writes exactly the committed module', () => {
        const g = makeGolden('gen-ok');
        fs.rmSync(path.join(g, 'smalltalk25.questions.mjs'), { force: true });
        const r = node([path.join(g, 'smalltalk25.gen.mjs'), '--items', ITEMS], g);
        expect(r.code).toBe(0);
        expect(fs.readFileSync(path.join(g, 'smalltalk25.questions.mjs'), 'utf8')).toBe(fs.readFileSync(path.join(HERE, 'smalltalk25.questions.mjs'), 'utf8'));
    });
});

describe.skipIf(!HAVE_SOURCES)('smalltalk25.clips.mjs', () => {
    let srcCopy: string;
    beforeAll(() => {
        srcCopy = path.join(tmp, 'clips-src');
        copyDir(CLIPS, srcCopy);
    });

    it('exits 1 naming a clip whose sha12 differs from the manifest, and copies nothing', () => {
        const g = makeGolden('clips-sha');
        const dir = path.join(tmp, 'clips-sha-src');
        copyDir(srcCopy, dir);
        const b = fs.readFileSync(path.join(dir, 'SQ02.wav'));
        b[b.length - 1] ^= 0x01; // last PCM byte: header and format stay valid, only the hash moves
        fs.writeFileSync(path.join(dir, 'SQ02.wav'), b);
        const r = node([path.join(g, 'smalltalk25.clips.mjs'), '--src', dir], g);
        expect(r.code).toBe(1);
        expect(r.out).toMatch(/SQ02.*sha12/);
        expect(fs.existsSync(path.join(g, 'smalltalk25-tts-local'))).toBe(false);
    });

    it('exits 1 on a 22 050 Hz clip (format), even when its manifest sha12 is made to match', () => {
        const g = makeGolden('clips-fmt');
        const dir = path.join(tmp, 'clips-fmt-src');
        copyDir(srcCopy, dir);
        const b = fs.readFileSync(path.join(dir, 'SQ03.wav'));
        b.writeUInt32LE(22050, 24);
        fs.writeFileSync(path.join(dir, 'SQ03.wav'), b);
        const m = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
        m.clips.SQ03.sha12 = sha12(b);
        fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(m));
        const r = node([path.join(g, 'smalltalk25.clips.mjs'), '--src', dir], g);
        expect(r.code).toBe(1);
        expect(r.out).toMatch(/SQ03.*format/);
    });

    it('exits 1 on a clip whose text stamp differs from q (a re-worded item with an old clip)', () => {
        const g = makeGolden('clips-stamp');
        const dir = path.join(tmp, 'clips-stamp-src');
        copyDir(srcCopy, dir);
        fs.writeFileSync(path.join(dir, 'ST02.txt'), 'Can you hear me?');
        const r = node([path.join(g, 'smalltalk25.clips.mjs'), '--src', dir], g);
        expect(r.code).toBe(1);
        expect(r.out).toMatch(/ST02.*text stamp/);
    });

    it('copies 25 clips and writes each .txt stamp equal to q', () => {
        const g = makeGolden('clips-ok');
        const r = node([path.join(g, 'smalltalk25.clips.mjs')], g);
        expect(r.code).toBe(0);
        for (const it of SMALLTALK25 as any[]) {
            expect(fs.existsSync(path.join(g, 'smalltalk25-tts-local', `${it.id}.wav`))).toBe(true);
            expect(fs.readFileSync(path.join(g, 'smalltalk25-tts-local', `${it.id}.txt`), 'utf8')).toBe(it.q);
        }
    });
});

describe.skipIf(!HAVE_SOURCES)('smalltalk25 builder and wav:check', () => {
    let g: string;
    // interview60.run.mjs resolves a Gemini key when it loads, even for wav:check, which makes no call: a dummy keeps the test off the real key.
    const env = { NATIVELY_ROSTER: 'smalltalk25', GEMINI_API_KEY: 'dummy-not-a-key' };
    beforeAll(() => {
        g = makeGolden('build');
        expect(node([path.join(g, 'smalltalk25.clips.mjs')], g).code).toBe(0);
    });

    it('refuses to re-render a clip whose .txt stamp differs from q', () => {
        const g2 = makeGolden('build-refuse');
        copyDir(path.join(g, 'smalltalk25-tts-local'), path.join(g2, 'smalltalk25-tts-local'));
        fs.writeFileSync(path.join(g2, 'smalltalk25-tts-local', 'SQ01.txt'), 'something else');
        const r = node([path.join(g2, 'interview60.build-audio-local.mjs')], g2, env);
        expect(r.code).not.toBe(0);
        expect(r.out).toContain('would re-render SQ01 — refused');
        expect(fs.existsSync(path.join(g2, 'smalltalk25.wav'))).toBe(false);
    });

    it('builds a ~10 min smalltalk25.wav, wav:check accepts it, and rejects the same wav cut by 2 s (calibration)', () => {
        const b = node([path.join(g, 'interview60.build-audio-local.mjs')], g, env);
        expect(b.code).toBe(0);
        expect(b.out).toContain('items      25/25');
        const secs = fs.statSync(path.join(g, 'smalltalk25.wav')).size / 48000;
        expect(secs).toBeGreaterThan(9 * 60);
        expect(secs).toBeLessThan(11 * 60);
        const ok = node([path.join(g, 'interview60.run.mjs'), 'wav:check'], g, env);
        expect(ok.code).toBe(0);
        expect(ok.out).toContain('smalltalk25.wav matches smalltalk25  25 items');

        const wav = fs.readFileSync(path.join(g, 'smalltalk25.wav'));
        fs.writeFileSync(path.join(g, 'smalltalk25.wav'), wav.subarray(0, wav.length - 2 * 24000 * 2));
        const cut = node([path.join(g, 'interview60.run.mjs'), 'wav:check'], g, env);
        expect(cut.code).toBe(1);
        expect(cut.out).toMatch(/smalltalk25\.wav is \d+ bytes but its header promises \d+ bytes of audio/);
        fs.writeFileSync(path.join(g, 'smalltalk25.wav'), wav);

        // Cut 2 s of PCM AND fix the header: the check reads the header's data length.
        const short = Buffer.from(wav.subarray(0, wav.length - 2 * 24000 * 2));
        short.writeUInt32LE(short.length - 8, 4);
        short.writeUInt32LE(short.length - 44, 40);
        fs.writeFileSync(path.join(g, 'smalltalk25.wav'), short);
        const bad = node([path.join(g, 'interview60.run.mjs'), 'wav:check'], g, env);
        expect(bad.code).toBe(1);
        expect(bad.out).toMatch(/smalltalk25\.wav holds .* min but smalltalk25/);
    });
});

describe('roster.mjs smalltalk25 entry', () => {
    async function loadRoster(name: string | undefined) {
        vi.resetModules();
        const saved = process.env.NATIVELY_ROSTER;
        if (name === undefined) delete process.env.NATIVELY_ROSTER;
        else process.env.NATIVELY_ROSTER = name;
        try {
            return (await import('./roster.mjs')) as any;
        } finally {
            if (saved === undefined) delete process.env.NATIVELY_ROSTER;
            else process.env.NATIVELY_ROSTER = saved;
            vi.resetModules();
        }
    }

    it('selects smalltalk25 with its audio paths, no render, and the five sample ids', async () => {
        const r = await loadRoster('smalltalk25');
        expect(r.ROSTER_NAME).toBe('smalltalk25');
        expect(r.INTERVIEW).toHaveLength(25);
        expect(r.TTS_LOCAL_DIR).toBe('smalltalk25-tts-local');
        expect(r.TTS_GEMINI_DIR).toBe('smalltalk25-tts');
        expect(r.WAV_NAME).toBe('smalltalk25.wav');
        expect(r.TTS_NO_RENDER).toBe(true);
        expect(r.calibrationSample().map((x: any) => x.id)).toEqual(['ST07', 'SF01', 'ST08', 'SQ07', 'SQ08']);
    });

    it('leaves the default roster interview60 and still rendering', async () => {
        const r = await loadRoster(undefined);
        expect(r.ROSTER_NAME).toBe('interview60');
        expect(r.TTS_NO_RENDER).toBe(false);
    });
});
