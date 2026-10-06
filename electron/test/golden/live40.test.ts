import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { LIVE40 } from './live40.questions.mjs';

/**
 * live40 harness (spec 7.4, plan Task 12). Every case that spawns a CLI does it in a
 * TEMP COPY of the golden folder laid out as <tmp>/electron/test/golden, so the
 * builder, the clips script and wav:check write there and never touch the real
 * live40-tts-local or live40.wav. The sources (items.json and the 47 clips) are
 * outside the repo; with them absent the CLI cases skip rather than pass.
 */
// __dirname is this folder; vitest workers keep the caller's cwd (%TEMP%), so nothing here is cwd-relative.
const HERE = __dirname;
const SP_LIVE40 = 'C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-lab\\sp\\live40';
const ITEMS = path.join(SP_LIVE40, 'items.json');
const CLIPS = path.join(SP_LIVE40, 'clips');
const HAVE_SOURCES = fs.existsSync(ITEMS) && fs.existsSync(path.join(CLIPS, 'manifest.json'));
const ITEMS_SHA = 'e531772bdc6e9c23865156286d8441c51521c62be74413bc56322090c81b2aaf';

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
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'live40-test-'));
});
afterAll(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
});

describe('live40.questions.mjs (generated)', () => {
    it('has 47 items in items.json chain order, parents before children, classes E20 H11 QF9 AF7, gapMs 20000', () => {
        expect(LIVE40).toHaveLength(47);
        expect(new Set(LIVE40.map((x: any) => x.chain)).size).toBe(31);
        const seen = new Map<string, number>();
        LIVE40.forEach((x: any, i: number) => {
            if (x.parent) {
                expect(seen.has(x.parent), `${x.id}'s parent ${x.parent} must come first`).toBe(true);
                expect(LIVE40[seen.get(x.parent)!].chain).toBe(x.chain);
            }
            seen.set(x.id, i);
        });
        const count = (c: string) => LIVE40.filter((x: any) => x.class === c).length;
        expect([count('E'), count('H'), count('QF'), count('AF')]).toEqual([20, 11, 9, 7]);
        expect(LIVE40.every((x: any) => x.gapMs === 20000)).toBe(true);
        // run.mjs computeOffsets copies level and topic into the timeline
        expect(LIVE40.every((x: any) => x.level === x.route && x.topic === x.chain && (x.route === 'EASY' || x.route === 'HARD'))).toBe(true);
        expect(LIVE40.every((x: any) => typeof x.q === 'string' && x.q.length > 0)).toBe(true);
    });

    it.skipIf(!HAVE_SOURCES)('follows items.json order and records its source sha in the header', () => {
        const items = JSON.parse(fs.readFileSync(ITEMS, 'utf8'));
        const src = fs.readFileSync(path.join(HERE, 'live40.questions.mjs'), 'utf8');
        expect(src).toContain(ITEMS_SHA);
        const order = [...src.matchAll(/"id":\s*"([A-Z]+\d+)"/g)].map((m) => m[1]);
        expect(order).toEqual(items.items.map((x: any) => x.id));
    });
});

describe.skipIf(!HAVE_SOURCES)('live40.gen.mjs', () => {
    it('refuses an items.json with one byte changed (exit 2, names the sha)', () => {
        const g = makeGolden('gen-refuse');
        const bad = Buffer.from(fs.readFileSync(ITEMS));
        bad[bad.indexOf(Buffer.from('mutable'))] ^= 0x01;
        const badPath = path.join(tmp, 'items-bad.json');
        fs.writeFileSync(badPath, bad);
        const r = node([path.join(g, 'live40.gen.mjs'), '--items', badPath], g);
        expect(r.code).toBe(2);
        expect(r.out).toMatch(/items\.json sha256 [0-9a-f]{64} refused/);
    });

    it('accepts the real items.json and writes exactly the committed module', () => {
        const g = makeGolden('gen-ok');
        fs.rmSync(path.join(g, 'live40.questions.mjs'), { force: true });
        const r = node([path.join(g, 'live40.gen.mjs'), '--items', ITEMS], g);
        expect(r.code).toBe(0);
        expect(fs.readFileSync(path.join(g, 'live40.questions.mjs'), 'utf8')).toBe(fs.readFileSync(path.join(HERE, 'live40.questions.mjs'), 'utf8'));
    });
});

describe.skipIf(!HAVE_SOURCES)('live40.clips.mjs', () => {
    let srcCopy: string;
    beforeAll(() => {
        srcCopy = path.join(tmp, 'clips-src');
        copyDir(CLIPS, srcCopy);
    });

    it('exits 1 naming a clip whose sha12 differs from the manifest, and copies nothing', () => {
        const g = makeGolden('clips-sha');
        const dir = path.join(tmp, 'clips-sha-src');
        copyDir(srcCopy, dir);
        const b = fs.readFileSync(path.join(dir, 'RE05.wav'));
        b[b.length - 1] ^= 0x01; // last PCM byte: header and format stay valid, only the hash moves
        fs.writeFileSync(path.join(dir, 'RE05.wav'), b);
        const r = node([path.join(g, 'live40.clips.mjs'), '--src', dir], g);
        expect(r.code).toBe(1);
        expect(r.out).toMatch(/RE05.*sha12/);
        expect(fs.existsSync(path.join(g, 'live40-tts-local'))).toBe(false);
    });

    it('exits 1 on a 22 050 Hz clip (format), even when its manifest sha12 is made to match', () => {
        const g = makeGolden('clips-fmt');
        const dir = path.join(tmp, 'clips-fmt-src');
        copyDir(srcCopy, dir);
        const b = fs.readFileSync(path.join(dir, 'RE06.wav'));
        b.writeUInt32LE(22050, 24);
        fs.writeFileSync(path.join(dir, 'RE06.wav'), b);
        const m = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
        m.clips.RE06.sha12 = sha12(b);
        fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(m));
        const r = node([path.join(g, 'live40.clips.mjs'), '--src', dir], g);
        expect(r.code).toBe(1);
        expect(r.out).toMatch(/RE06.*format/);
    });

    it('copies 47 clips and writes each .txt stamp equal to q', () => {
        const g = makeGolden('clips-ok');
        const r = node([path.join(g, 'live40.clips.mjs')], g);
        expect(r.code).toBe(0);
        for (const it of LIVE40) {
            expect(fs.existsSync(path.join(g, 'live40-tts-local', `${it.id}.wav`))).toBe(true);
            expect(fs.readFileSync(path.join(g, 'live40-tts-local', `${it.id}.txt`), 'utf8')).toBe(it.q);
        }
    });
});

describe.skipIf(!HAVE_SOURCES)('live40 builder and wav:check', () => {
    let g: string;
    // interview60.run.mjs resolves a Gemini key when it loads, even for wav:check, which makes no call: a dummy keeps the test off the real key.
    const env = { NATIVELY_ROSTER: 'live40', GEMINI_API_KEY: 'dummy-not-a-key' };
    beforeAll(() => {
        g = makeGolden('build');
        expect(node([path.join(g, 'live40.clips.mjs')], g).code).toBe(0);
    });

    it('refuses to re-render a clip whose .txt stamp differs from q', () => {
        const g2 = makeGolden('build-refuse');
        copyDir(path.join(g, 'live40-tts-local'), path.join(g2, 'live40-tts-local'));
        fs.writeFileSync(path.join(g2, 'live40-tts-local', 'RE01.txt'), 'something else');
        const r = node([path.join(g2, 'interview60.build-audio-local.mjs')], g2, env);
        expect(r.code).not.toBe(0);
        expect(r.out).toContain("would re-render RE01 — refused (live40 reuses router40's clips)");
        expect(fs.existsSync(path.join(g2, 'live40.wav'))).toBe(false);
    });

    it('builds live40.wav, wav:check accepts it, and rejects the same wav with 2 s of PCM cut (calibration)', () => {
        const b = node([path.join(g, 'interview60.build-audio-local.mjs')], g, env);
        expect(b.code).toBe(0);
        expect(b.out).toContain('SUSPECT    RE11 1.57 w/s, EF06 1.58 w/s');
        const ok = node([path.join(g, 'interview60.run.mjs'), 'wav:check'], g, env);
        expect(ok.code).toBe(0);
        expect(ok.out).toContain('live40.wav matches live40  47 items');

        // Cut 2 s of PCM AND fix the header: the check reads the header's data length.
        const wav = fs.readFileSync(path.join(g, 'live40.wav'));
        const short = Buffer.from(wav.subarray(0, wav.length - 2 * 24000 * 2));
        short.writeUInt32LE(short.length - 8, 4);
        short.writeUInt32LE(short.length - 44, 40);
        fs.writeFileSync(path.join(g, 'live40.wav'), short);
        const bad = node([path.join(g, 'interview60.run.mjs'), 'wav:check'], g, env);
        expect(bad.code).toBe(1);
        expect(bad.out).toMatch(/live40\.wav holds .* min but live40/);
    });
});

describe('roster.mjs live40 entry', () => {
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

    it('selects live40 with its audio paths, no render, and the four sample ids', async () => {
        const r = await loadRoster('live40');
        expect(r.ROSTER_NAME).toBe('live40');
        expect(r.INTERVIEW).toHaveLength(47);
        expect(r.TTS_LOCAL_DIR).toBe('live40-tts-local');
        expect(r.TTS_GEMINI_DIR).toBe('live40-tts');
        expect(r.WAV_NAME).toBe('live40.wav');
        expect(r.TTS_NO_RENDER).toBe(true);
        expect(r.calibrationSample().map((x: any) => x.id)).toEqual(['RE11', 'EF06', 'RH05', 'RE12']);
    });

    it('leaves the other rosters rendering (TTS_NO_RENDER false)', async () => {
        const r = await loadRoster(undefined);
        expect(r.ROSTER_NAME).toBe('interview60');
        expect(r.TTS_NO_RENDER).toBe(false);
    });
});
