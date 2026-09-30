// hedge-live.policy.mjs — the two spoken-answer policies the live hedge probe compares, as pure
// functions over an injected ask(model, signal). ask resolves at the FIRST TOKEN ({ ttft }, ms from
// its own start), or at the failure ({ ttft: null, error }), or, once signal is aborted, with
// ({ ttft: null, aborted: true }). Deadlines are parameters so the tests run in milliseconds.
//   today: primary first; on its error start the fallback at once; at stallMs with no token abort
//          the primary and start the fallback (LLMHelper.streamGeminiWithStallFallback today).
//   hedge: front first; on its error start the back at once; at triggerMs with no token start the
//          back WITHOUT stopping the front; the first token from either wins, the other is aborted;
//          a leg that fails leaves the other to finish.
// Both resolve { wait, by, extra, legs }: wait = ms from the policy start to the first token (null =
// no answer), by = the model that spoke ('none'), extra = a second request was made, legs = every
// request's record with startedAt and at (both ms from the policy start).
export const TODAY = { primary: 'gemini-3.1-flash-lite', fallback: 'gemini-3.5-flash-lite', stallMs: 10000 };
export const HEDGE = { front: 'gemini-3.5-flash-lite', back: 'gemini-3.1-flash-lite', triggerMs: 5000 };

const after = (ms, value) => new Promise((r) => setTimeout(() => r(value), ms));
function leg(ask, model, t0) {
    const ac = new AbortController();
    const startedAt = Date.now() - t0;
    const p = ask(model, ac.signal).then((r) => ({ model, startedAt, ...r, at: r.ttft != null ? startedAt + r.ttft : null }));
    return { model, p, abort: () => ac.abort() };
}
async function finish(legs, winner) {
    const records = await Promise.all(legs.map((l) => l.p));
    return { wait: winner ? winner.at : null, by: winner ? winner.model : 'none', extra: legs.length > 1, legs: records };
}

export async function runToday({ ask, primary = TODAY.primary, fallback = TODAY.fallback, stallMs = TODAY.stallMs }) {
    const t0 = Date.now();
    const a = leg(ask, primary, t0);
    const first = await Promise.race([a.p, after(stallMs, 'stall')]);
    if (first !== 'stall' && first.ttft != null) return finish([a], first);
    if (first === 'stall') a.abort();
    const b = leg(ask, fallback, t0);
    const r = await b.p;
    return finish([a, b], r.ttft != null ? r : null);
}

export async function runHedge({ ask, front = HEDGE.front, back = HEDGE.back, triggerMs = HEDGE.triggerMs }) {
    const t0 = Date.now();
    const f = leg(ask, front, t0);
    const first = await Promise.race([f.p, after(triggerMs, 'trigger')]);
    if (first !== 'trigger' && first.ttft != null) return finish([f], first);
    const b = leg(ask, back, t0);
    if (first !== 'trigger') { const r = await b.p; return finish([f, b], r.ttft != null ? r : null); }
    // Both alive: the first token wins; a failed leg leaves the other to finish.
    const winner = await new Promise((resolve) => {
        let alive = 2;
        for (const l of [f, b]) l.p.then((r) => { if (r.ttft != null) resolve({ r, other: l === f ? b : f }); else if (--alive === 0) resolve(null); });
    });
    if (winner) winner.other.abort();
    return finish([f, b], winner ? winner.r : null);
}
