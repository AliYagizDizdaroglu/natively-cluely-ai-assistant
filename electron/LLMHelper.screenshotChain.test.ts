import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

vi.mock('electron', () => ({
    app: { getPath: vi.fn(() => 'C:/tmp'), getName: vi.fn(() => 'test'), on: vi.fn() },
    safeStorage: {
        isEncryptionAvailable: () => false,
        encryptString: (s: string) => Buffer.from(s),
        decryptString: (b: Buffer) => b.toString(),
    },
    ipcMain: { handle: vi.fn(), on: vi.fn() },
}));

const generateContentStream = vi.fn();
const generateContent = vi.fn(async (_params?: any) => ({ text: () => 'ok' }));
vi.mock('@google/genai', () => ({
    GoogleGenAI: vi.fn().mockImplementation(() => ({ models: { generateContentStream, generateContent } })),
}));

import { LLMHelper, SCREENSHOT_CHAIN_MODEL } from './LLMHelper';

const FRONT = 'gemini-3.5-flash-lite', MID = 'gemini-3.1-flash-lite', LAST = 'gemma-4-31b-it';

async function drain(gen: AsyncGenerator<string, void, unknown>) {
    const chunks: string[] = [];
    for await (const chunk of gen) chunks.push(chunk);
    return chunks;
}

// What each model does when asked; a model not listed answers "<model>-answer".
type Behaviour = 'error' | 'empty' | 'ok';
function script(b: Partial<Record<string, Behaviour>>) {
    generateContentStream.mockImplementation(async (params: { model: string }) => {
        const how = b[params.model] ?? 'ok';
        if (how === 'error') { async function* boom() { throw new Error('{"error":{"code":400,"status":"INVALID_ARGUMENT"}}'); } return boom(); }
        if (how === 'empty') { async function* none() { /* RECITATION-style: no chunk */ } return none(); }
        async function* ans() { yield { text: () => `${params.model}-answer` }; }
        return ans();
    });
}
const asked = () => generateContentStream.mock.calls.map((c) => c[0]);
const sources = (chunks: string[]) => chunks.filter((c) => c.startsWith('__model_source:'));

describe('screenshot answer chain: 3.5-lite HIGH, then 3.1-lite LOW, then Gemma 4 31B', () => {
    let img: string;
    beforeEach(() => {
        generateContentStream.mockReset();
        // 1x1 PNG: the chain must send the file's bytes to every model it asks.
        img = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'shot-')), 's.png');
        fs.writeFileSync(img, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64'));
        delete process.env.NATIVELY_GEMINI_THINKING_LEVEL;
    });
    afterEach(() => { fs.rmSync(path.dirname(img), { recursive: true, force: true }); });

    const run = () => new LLMHelper('fake-gemini-key').streamChat('what is on screen', [img], undefined, undefined, false, SCREENSHOT_CHAIN_MODEL);
    const hasImage = (p: any) => p.contents[0].parts.some((x: any) => x.inlineData?.data);

    it('(1) asks 3.5-lite at HIGH first, with the images, and stops there when it answers', async () => {
        script({});
        const out = await drain(run());
        expect(asked().map((p) => p.model)).toEqual([FRONT]);
        expect(asked()[0].config.thinkingConfig).toEqual({ thinkingLevel: 'HIGH' });
        expect(hasImage(asked()[0])).toBe(true);
        expect(out.join('')).toContain(`${FRONT}-answer`);
    });

    it('(2) on its error asks 3.1-lite at LOW with the images', async () => {
        script({ [FRONT]: 'error' });
        const out = await drain(run());
        expect(asked().map((p) => p.model)).toEqual([FRONT, MID]);
        expect(asked()[1].config.thinkingConfig).toEqual({ thinkingLevel: 'LOW' });
        expect(hasImage(asked()[1])).toBe(true);
        expect(out.join('')).toContain(`${MID}-answer`);
    });

    it('(2b) an empty stream from 3.5-lite counts as a failure', async () => {
        script({ [FRONT]: 'empty' });
        const out = await drain(run());
        expect(asked().map((p) => p.model)).toEqual([FRONT, MID]);
        expect(out.join('')).toContain(`${MID}-answer`);
    });

    it('(2c) a first-token stall on 3.5-lite moves on to 3.1-lite, sequentially (never a race)', async () => {
        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });   // image prep is real I/O: only the stall clock is faked
        try {
            generateContentStream.mockImplementation(async (params: { model: string }) => {
                if (params.model === FRONT) { async function* hang() { await new Promise<void>(() => { /* never */ }); yield { text: () => 'x' }; } return hang(); }
                async function* ans() { yield { text: () => `${params.model}-answer` }; }
                return ans();
            });
            const p = drain(run());
            // streamChat does async setup and real image I/O before its first request: let it reach 3.5-lite
            for (let i = 0; i < 2000 && asked().length === 0; i++) await new Promise((r) => setImmediate(r));
            expect(asked().map((c) => c.model)).toEqual([FRONT]);   // 3.1-lite not started beside it
            await vi.advanceTimersByTimeAsync(10_000);   // the stall clock
            expect((await p).join('')).toContain(`${MID}-answer`);
            expect(asked().map((c) => c.model)).toEqual([FRONT, MID]);
        } finally { vi.useRealTimers(); }
    });

    it('(3) when both Flash Lites fail asks gemma-4-31b-it with the images', async () => {
        script({ [FRONT]: 'error', [MID]: 'error' });
        const out = await drain(run());
        expect(asked().map((p) => p.model)).toEqual([FRONT, MID, LAST]);
        expect(hasImage(asked()[2])).toBe(true);
        expect(out.join('')).toContain(`${LAST}-answer`);
    });

    it('(4) the source label names the model that answered', async () => {
        script({});
        expect(sources(await drain(run()))).toEqual([`__model_source:${FRONT}__`]);
        generateContentStream.mockReset(); script({ [FRONT]: 'error' });
        expect(sources(await drain(run()))).toEqual([`__model_source:${MID}__`]);
        generateContentStream.mockReset(); script({ [FRONT]: 'error', [MID]: 'error' });
        expect(sources(await drain(run()))).toEqual(['__model_source:Gemma 4__']);
    });

    it('(5) a question without screenshots does not touch the chain', async () => {
        script({});
        const helper = new LLMHelper('fake-gemini-key');
        const out = await drain(helper.streamChat('q'));
        expect(asked()).toHaveLength(1);
        expect(asked()[0].model).toBe(helper.getCurrentModelId());
        expect(sources(out)).not.toContain(`__model_source:${FRONT}__`);
    });
});

describe('gemini-chat-stream pins the chain only for screenshots', () => {
    const src = fs.readFileSync(path.join(__dirname, 'ipcHandlers.ts'), 'utf8');
    it('passes the chain for images, nothing otherwise, and no longer pre-announces Gemma', () => {
        expect(src).toContain('const modelOverride = hasImages ? SCREENSHOT_CHAIN_MODEL : undefined;');
        expect(src).not.toContain("send('gemini-stream-source', 'Gemma 4 31B')");
    });
});
