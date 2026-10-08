// Throwaway reviewer repro (Task 4): the hedge's control flow transcribed from LLMHelper.ts
// (streamGeminiWithHedge verbatim minus types; streamWithGeminiModel's stop/abort/finally shape),
// with a fake SDK whose pending requests REJECT on abort, as the real SDK's fetch does (the
// vitest fake's 'silent' never settles, so the tests never exercise an aborted loser's rejection).
// Real timers. Reports unhandledRejection / rejectionHandled events per scenario.
const events = [];
process.on('unhandledRejection', (r) => events.push(`UNHANDLED: ${r?.message ?? r}`));
process.on('rejectionHandled', () => events.push('rejectionHandled (late handler)'));
process.on('warning', (w) => events.push(`warning: ${w.name}`));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = [];
let calls = [];

// step: {kind:'error', at} | {kind:'silent'} | {kind:'token', at, chunks} | {kind:'gate', gate, chunks}
function fakeSdk(model, signal, step) {
    const rec = { model, signal };
    calls.push(rec);
    const abortErr = () => Object.assign(new Error(`${model} aborted`), { name: 'AbortError' });
    return new Promise((resolve, reject) => {
        signal.addEventListener('abort', () => reject(abortErr()), { once: true });
        if (step.kind === 'error') setTimeout(() => reject(new Error('got status: 503')), step.at ?? 1);
        else resolve((async function* () {
            // headers arrived; the body read also rejects on abort
            const wait = (p) => new Promise((res, rej) => { p.then(res, rej); signal.addEventListener('abort', () => rej(abortErr()), { once: true }); });
            if (step.kind === 'silent') await wait(new Promise(() => {}));
            if (step.kind === 'token') await wait(sleep(step.at));
            if (step.kind === 'gate') await wait(step.gate);
            for (const c of step.chunks) yield c;
        })());
    });
}

let plan = {};
async function* streamWithGeminiModel(model, stop) {
    const abort = new AbortController();
    stop?.throwIfAborted();
    stop?.addEventListener('abort', () => abort.abort(), { once: true });
    const stream = await fakeSdk(model, abort.signal, plan[model]);
    async function* rawChunks() { for await (const c of stream) if (c) yield c; }
    for await (const token of rawChunks()) {
        let delivered = false;
        try { yield token; delivered = true; } finally { if (!delivered) abort.abort(); }
    }
}

const FRONT = 'gemini-3.5-flash-lite', BACK = 'gemini-3.1-flash-lite';
async function* hedge(triggerMs) {
    const t0 = Date.now();
    const since = () => Date.now() - t0;
    const start = (model) => {
        const stop = new AbortController();
        const gen = streamWithGeminiModel(model, stop.signal);
        const leg = { model, gen, stop, settled: null, first: null };
        leg.first = gen.next().then(
            (r) => (r.done || !r.value ? { kind: 'empty' } : { kind: 'token', value: r.value }),
            (err) => ({ kind: 'error', err }),
        ).then((r) => { leg.settled = r; return r; });
        return leg;
    };
    const deliver = async function* (leg, firstToken) {
        let delivered = false;
        try {
            yield `__model_source:${leg.model} (hedge)__`;
            yield firstToken;
            delivered = true;
        } finally {
            if (!delivered) leg.gen.return(undefined);
        }
        yield* leg.gen;
    };
    const front = start(FRONT);
    let timer;
    const trigger = new Promise((resolve) => { timer = setTimeout(() => resolve('trigger'), triggerMs); });
    const frontFirst = await Promise.race([front.first, trigger]);
    clearTimeout(timer);
    if (frontFirst !== 'trigger' && frontFirst.kind === 'token') {
        log.push(`won by ${FRONT} at ${since()}ms; other=not-started`);
        yield* deliver(front, frontFirst.value);
        return;
    }
    const reason = frontFirst === 'trigger' ? 'trigger' : frontFirst.kind === 'error' ? 'front-error' : 'front-empty';
    log.push(`back started at ${since()}ms reason=${reason}`);
    const back = start(BACK);
    const legs = reason === 'trigger' ? [front, back] : [back];
    const winner = await new Promise((resolve) => {
        let alive = legs.length;
        for (const leg of legs) leg.first.then((r) => { if (r.kind === 'token') resolve({ leg, value: r.value }); else if (--alive === 0) resolve(null); });
    });
    if (!winner) {
        const f = front.settled, b = back.settled;
        log.push(`no answer - front ${f.kind}, back ${b.kind}`);
        if (f.kind === 'error') throw f.err;
        if (b.kind === 'error') throw b.err;
        return;
    }
    const loser = winner.leg === front ? back : front;
    const other = loser.settled ? (loser.settled.kind === 'error' ? 'failed' : 'empty') : 'aborted';
    if (!loser.settled) loser.stop.abort();
    log.push(`won by ${winner.leg.model} at ${since()}ms; other=${other}`);
    yield* deliver(winner.leg, winner.value);
}

// Production-shaped consumer: WhatToAnswerLLM.withVerbalFallback's for-await + catch.
async function consume(gen, { breakAfter } = {}) {
    const out = [];
    try {
        for await (const c of gen) { out.push(c); if (breakAfter && out.length >= breakAfter) break; }
    } catch (e) { out.push(`THREW ${e.message}`); }
    return out;
}

async function scenario(name, p, fn) {
    plan = p; calls = []; log.length = 0; events.length = 0;
    const res = await fn();
    await sleep(150);   // let late rejections / warnings surface (several macrotasks)
    console.log(`\n== ${name}`);
    console.log('  result:', JSON.stringify(res));
    console.log('  log:', JSON.stringify(log));
    console.log('  aborted:', JSON.stringify(calls.map((c) => `${c.model}=${c.signal.aborted}`)));
    console.log('  events:', JSON.stringify(events));
}

await scenario('A both 503, production consumer', { [FRONT]: { kind: 'error' }, [BACK]: { kind: 'error' } }, () => consume(hedge(50)));
await scenario('B front silent, back token -> front loser aborted (rejects into first)', { [FRONT]: { kind: 'silent' }, [BACK]: { kind: 'token', at: 20, chunks: ['b1', 'b2'] } }, () => consume(hedge(50)));
await scenario('C front late token, back silent -> back loser aborted', { [FRONT]: { kind: 'token', at: 80, chunks: ['f1'] }, [BACK]: { kind: 'silent' } }, () => consume(hedge(50)));
await scenario('D consumer breaks on the sentinel (winner after trigger)', { [FRONT]: { kind: 'silent' }, [BACK]: { kind: 'token', at: 20, chunks: ['b1', 'b2'] } }, () => consume(hedge(50), { breakAfter: 1 }));
await scenario('E test-shaped consumer: out created, awaited a macrotask later', { [FRONT]: { kind: 'error' }, [BACK]: { kind: 'error' } }, async () => {
    const drain = async (g) => { const o = []; for await (const c of g) o.push(c); return o; };
    const out = drain(hedge(50));
    await sleep(30);
    return out.catch((e) => `THREW ${e.message}`);
});
{
    // F: supersede before any token, both legs pending: return() is queued behind the in-flight next().
    let resolveGate; const gate = new Promise((r) => { resolveGate = r; });
    await scenario('F supersede (return) at 70ms while both legs pending; back answers at 400ms', { [FRONT]: { kind: 'silent' }, [BACK]: { kind: 'gate', gate, chunks: ['late'] } }, async () => {
        const g = hedge(50);
        const firstNext = g.next();   // the consumer's pending read (it is inside for-await)
        await sleep(70);
        const t = Date.now();
        const abortedAtReturn = () => JSON.stringify(calls.map((c) => `${c.model}=${c.signal.aborted}`));
        const ret = g.return(undefined);
        await sleep(100);
        const at170 = abortedAtReturn();
        setTimeout(() => resolveGate(), 230);
        await ret; await firstNext;
        return { returnSettledAfterMs: Date.now() - t, abortedAt170ms: at170 };
    });
}
{
    // G: both legs' first tokens land in the same tick after the trigger.
    let resolveGate; const gate = new Promise((r) => { resolveGate = r; });
    setTimeout(() => resolveGate(), 120);
    await scenario('G both first tokens in the same tick after the trigger', { [FRONT]: { kind: 'gate', gate, chunks: ['f1', 'f2'] }, [BACK]: { kind: 'gate', gate, chunks: ['b1', 'b2'] } }, () => consume(hedge(50)));
}
