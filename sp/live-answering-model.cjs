// live-answering-model.cjs — ONE live exercise of the answering-model fix, across the seams the
// unit tests mock: the BUILT dist modules, the real @google/genai SDK, real requests to Gemini,
// and the NATIVELY_* variables actually reaching the process. The only synthetic part is one 503
// per fault scenario, injected at the global fetch the SDK calls, because Google cannot be made
// to fail on demand.
//
// No Electron, no app window, no credentials.enc: 'electron' is a shim whose userData is a
// scratch folder, and the key reaches this process only through node --env-file. Nothing here
// prints a key or a URL — only the model name parsed out of each request path.
//
//   node --env-file=<MAIN>/.env live-answering-model.cjs <dist-electron/electron> <tag>
'use strict';
const path = require('path');
const fs = require('fs');
const Module = require('module');

const DIST = process.argv[2];
const TAG = process.argv[3] || 'run';
if (!DIST || !fs.existsSync(path.join(DIST, 'LLMHelper.js'))) { console.error('usage: <folder holding the built LLMHelper.js> <tag>'); process.exit(2); }
if (!process.env.GEMINI_API_KEY) { console.error('GEMINI_API_KEY: not in the environment — run with --env-file'); process.exit(2); }

// verbal-diag.log is opened relative to the working directory at module load: keep it here,
// never in a checkout, where it would land in the middle of a real flight's log.
process.chdir(__dirname);
const SCRATCH = path.join(__dirname, 'live-userdata');
fs.mkdirSync(SCRATCH, { recursive: true });
const electronShim = {
    app: { getPath: () => SCRATCH, getName: () => 'natively-live-check', getVersion: () => '0.0.0', getAppPath: () => SCRATCH, isPackaged: false, on() {}, whenReady: () => Promise.resolve() },
    safeStorage: { isEncryptionAvailable: () => false, encryptString: (s) => Buffer.from(s), decryptString: (b) => b.toString() },
    ipcMain: { handle() {}, on() {} },
};
const originalLoad = Module._load;
Module._load = function (request) {
    if (request === 'electron') return electronShim;
    return originalLoad.apply(this, arguments);
};

// Every request the SDK makes, by model, and at most one injected 503 per scenario.
const realFetch = globalThis.fetch;
let requests = [];
let inject = null;
globalThis.fetch = async (url, init) => {
    const model = (String(url).match(/models\/([^:?/]+)/) || [])[1] || '(other)';
    if (inject && inject === model) {
        inject = null;
        requests.push(model + ' [503 injected]');
        return new Response(JSON.stringify({ error: { code: 503, message: 'The model is overloaded (injected by the live check).', status: 'UNAVAILABLE' } }),
            { status: 503, statusText: 'Service Unavailable', headers: { 'content-type': 'application/json' } });
    }
    requests.push(model);
    return realFetch(url, init);
};

const { LLMHelper } = require(path.join(DIST, 'LLMHelper.js'));
const { WhatToAnswerLLM } = require(path.join(DIST, 'llm', 'WhatToAnswerLLM.js'));

const TECHNICAL = { intent: 'general', confidence: 0.9, answerShape: '' };
const QUESTION = 'How would you make a document ingestion pipeline idempotent?';
const SENTINEL = /^__model_source:([^_]*)__$/;

async function scenario(name, { override, faultOn, stallBudgetMs }) {
    requests = [];
    inject = faultOn || null;
    if (override) process.env.NATIVELY_VERBAL_PRIMARY_MODEL = override; else delete process.env.NATIVELY_VERBAL_PRIMARY_MODEL;
    if (stallBudgetMs) process.env.NATIVELY_FIRST_TOKEN_TIMEOUT_MS = String(stallBudgetMs); else delete process.env.NATIVELY_FIRST_TOKEN_TIMEOUT_MS;
    const llm = new WhatToAnswerLLM(new LLMHelper(process.env.GEMINI_API_KEY));
    const chunks = [];
    const t0 = Date.now();
    for await (const c of llm.generateStream(QUESTION, undefined, TECHNICAL)) chunks.push(c);
    const labels = chunks.flatMap((c) => [...c.matchAll(/__model_source:([^_]+)__/g)].map((m) => m[1]));
    const text = chunks.join('').replace(/__model_source:[^_]*__/g, '').trim();
    // The order the consumer sees: each label, then where the first spoken words arrive.
    const head = [];
    for (const c of chunks) {
        const m = SENTINEL.exec(c);
        if (m) head.push(`[label ${m[1]}]`);
        else if (c.trim()) { head.push('[first words]'); break; }
    }
    console.log(`\n[${TAG}] ${name}`);
    console.log(`  requests  : ${requests.join('  ->  ')}`);
    console.log(`  stream    : ${head.join(' ')}`);
    console.log(`  bar ends  : ${labels.at(-1) ?? '(no label)'}`);
    console.log(`  answer    : ${JSON.stringify(text.slice(0, 80))}${text.length > 80 ? '…' : ''}  (${Date.now() - t0} ms)`);
}

(async () => {
    console.log(`live check [${TAG}] on ${DIST}`);
    await scenario('A. override 3.5-lite, healthy', { override: 'gemini-3.5-flash-lite' });
    await scenario('B. override 3.5-lite, 503 on the primary before its first token', { override: 'gemini-3.5-flash-lite', faultOn: 'gemini-3.5-flash-lite' });
    await scenario('C. override 3.5-lite, primary stalls (budget forced to 50 ms)', { override: 'gemini-3.5-flash-lite', stallBudgetMs: 50 });
    await scenario('D. shipped config, 503 on 3.1-lite (the pairing must not change)', { faultOn: 'gemini-3.1-flash-lite' });
    process.exit(0);
})().catch((e) => { console.error(`[${TAG}] live check crashed: ${e && e.message ? e.message : e}`); process.exit(1); });
