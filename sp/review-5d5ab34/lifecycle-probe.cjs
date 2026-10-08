// Throwaway review probe for 5d5ab34: does closing the verbal answer early still reach the SDK
// request's abort through nameStallSwitch + watch()? Runs the BUILT modules; only electron and
// GoogleGenAI are stood in for. No key, no network.
//   node lifecycle-probe.cjs <dist-electron/electron> real|broken
'use strict';
const path = require('path');
const Module = require('module');
process.env.VITEST = '1'; // diagLog is a no-op under this flag: nothing lands in any checkout's log
process.chdir(__dirname);
const DIST = process.argv[2];
const MODE = process.argv[3] || 'real';

const electronShim = {
    app: { getPath: () => __dirname, getName: () => 'probe', getVersion: () => '0.0.0', getAppPath: () => __dirname, isPackaged: false, on() {}, whenReady: () => Promise.resolve() },
    safeStorage: { isEncryptionAvailable: () => false, encryptString: (s) => Buffer.from(s), decryptString: (b) => b.toString() },
    ipcMain: { handle() {}, on() {} },
};

let plan = [];
const calls = [];
const untilAbort = (signal) => new Promise((resolve) => {
    if (!signal) return; // no signal: never completes, like the real SDK's un-aborted close
    if (signal.aborted) return resolve();
    signal.addEventListener('abort', () => resolve(), { once: true });
});
function FakeGenAI() {
    return {
        models: {
            generateContentStream: async (params) => {
                const signal = params.config && params.config.abortSignal;
                const i = calls.length;
                calls.push({ model: params.model, signal });
                const step = plan[i] || { tokens: ['unplanned. '] };
                if (step === 'error') throw new Error('got status: 503 Service Unavailable');
                async function* s() {
                    if (step === 'silent') { await new Promise(() => {}); return; }
                    try {
                        for (const t of step.tokens) yield { text: () => t };
                        if (step.throwAfter) throw new Error('socket hang up (mid-stream)');
                        if (step.hold) await untilAbort(signal);
                    } finally {
                        if (step.hold) await untilAbort(signal); // close alone does not release it (measured 2026-09-05)
                    }
                }
                return s();
            },
            generateContent: async () => ({ text: () => 'ok' }),
        },
    };
}
const originalLoad = Module._load;
Module._load = function (request) {
    if (request === 'electron') return electronShim;
    if (request === '@google/genai') return Object.assign({}, originalLoad.apply(this, arguments), { GoogleGenAI: FakeGenAI });
    return originalLoad.apply(this, arguments);
};

const { LLMHelper } = require(path.join(DIST, 'LLMHelper.js'));
const { WhatToAnswerLLM } = require(path.join(DIST, 'llm', 'WhatToAnswerLLM.js'));

if (MODE === 'broken') {
    // Calibration arm: a nameStallSwitch that never forwards close to its source.
    WhatToAnswerLLM.prototype.nameStallSwitch = async function* (raw, filter) {
        const it = filter(raw)[Symbol.asyncIterator]();
        for (;;) { const r = await it.next(); if (r.done) return; yield r.value; }
    };
}
if (MODE === 'passthrough') {
    // The pre-commit composition: filtered(rawStream), no switch naming at all.
    WhatToAnswerLLM.prototype.nameStallSwitch = function (raw, filter) { return filter(raw); };
}

const TECH = { intent: 'general', confidence: 0.9, answerShape: '' };
const BEH = { intent: 'behavioral', confidence: 0.9, answerShape: '' };
const prose = (n) => Array.from({ length: n }, (_, i) => `Sentence number ${i} is here. `);
const SENT = /^__model_source:[^_]*__$/;

async function run(name, { intent = TECH, steps, breakAfter, explicitReturn, override, select, showTail }) {
    plan = steps; calls.length = 0;
    if (override) process.env.NATIVELY_VERBAL_PRIMARY_MODEL = override; else delete process.env.NATIVELY_VERBAL_PRIMARY_MODEL;
    process.env.NATIVELY_FIRST_TOKEN_TIMEOUT_MS = '50';
    const helper = new LLMHelper('fake-gemini-key');
    if (select) { helper.setModel(select); await new Promise((r) => setTimeout(r, 20)); calls.length = 0; }
    const gen = new WhatToAnswerLLM(helper).generateStream('How do you make ingestion idempotent?', undefined, intent);
    const chunks = [];
    const loop = (async () => {
        let content = 0;
        for await (const c of gen) {
            chunks.push(c);
            if (!SENT.test(c) && c.trim()) content++;
            if (breakAfter && content >= breakAfter) {
                if (explicitReturn) await gen.return(undefined); // IntelligenceEngine's supersede does this, then breaks
                break;
            }
        }
        return 'done';
    })();
    let timer;
    const raced = await Promise.race([loop, new Promise((r) => { timer = setTimeout(() => r('TIMEOUT'), 1500); })]);
    clearTimeout(timer);
    await new Promise((r) => setTimeout(r, 20));
    const labels = chunks.flatMap((c) => [...c.matchAll(/__model_source:([^_]+)__/g)].map((m) => m[1]));
    const words = chunks.filter((c) => !SENT.test(c)).join('').split(/\s+/).filter(Boolean).length;
    console.log(`[${MODE}] ${name}\n    loop=${raced} asked=[${calls.map((c) => c.model).join(', ')}] aborted=[${calls.map((c) => (c.signal ? c.signal.aborted : 'no-signal')).join(', ')}]\n    labels=[${labels.join(' | ')}] words=${words}`);
    if (showTail) console.log(`    tail=${JSON.stringify(chunks.join('').replace(/__model_source:[^_]*__/g, '').slice(-150))}`);
}

(async () => {
    await run('S1 healthy primary, consumer breaks after 3 content chunks', { steps: [{ tokens: prose(40), hold: true }], breakAfter: 3 });
    await run('S1b healthy primary, consumer breaks after the FIRST content chunk', { steps: [{ tokens: prose(40), hold: true }], breakAfter: 1 });
    await run('S2 stall -> switched stream, consumer breaks after 3', { steps: ['silent', { tokens: prose(40), hold: true }], breakAfter: 3 });
    await run('S3 503 -> error fallback, consumer breaks after 3', { steps: ['error', { tokens: prose(40), hold: true }], breakAfter: 3 });
    await run('S4 stall -> switched 503 -> error fallback, breaks after 3', { steps: ['silent', 'error', { tokens: prose(40), hold: true }], breakAfter: 3 });
    await run('S5 word-budget cut, consumer drains', { steps: [{ tokens: prose(80), hold: true }] });
    await run('S5b stall -> switched stream, word-budget cut, consumer drains', { steps: ['silent', { tokens: prose(80), hold: true }] });
    await run('S6 supersede-style explicit return after 3', { steps: [{ tokens: prose(40), hold: true }], breakAfter: 3, explicitReturn: true });
    await run('S7 behavioral stall -> switched stream, breaks after 3', { intent: BEH, steps: ['silent', { tokens: prose(40), hold: true }], breakAfter: 3 });
    await run('S8 natural completion (calibration: no abort)', { steps: [{ tokens: prose(5) }] });
    await run('S9 override 3.5, stall -> switched 503 -> error fallback', { override: 'gemini-3.5-flash-lite', steps: ['silent', 'error', { tokens: prose(5) }] });
    await run('S10 stall -> switched stream is EMPTY (done, no text)', { steps: ['silent', { tokens: [] }] });
    if (MODE === 'real') {
        await run('S11 503 -> error fallback 3.5 STALLS -> its race switches to 3.1', { steps: ['error', 'silent', { tokens: prose(3) }] });
        await run('S12 override 3.5, Gemma selected, technical route', { override: 'gemini-3.5-flash-lite', select: 'gemma-4-31b-it', steps: [{ tokens: prose(3) }] });
        await run('S13 override 3.5, mid-stream error on the primary (no fallback tried)', { override: 'gemini-3.5-flash-lite', steps: [{ tokens: prose(3), throwAfter: true }], showTail: true });
        await run('S14 invalid override value', { override: 'gemini-9-lite', steps: [{ tokens: prose(3) }], showTail: true });
        await run('S15 override 3.5, stall -> switched 3.1 -> mid-stream error', { override: 'gemini-3.5-flash-lite', steps: ['silent', { tokens: prose(3), throwAfter: true }], showTail: true });
    }
    process.exit(0);
})().catch((e) => { console.error(`probe crashed: ${e && e.stack ? e.stack : e}`); process.exit(1); });
