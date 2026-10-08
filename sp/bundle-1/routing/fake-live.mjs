// A VIRTUAL clock and a scripted stand-in for the Live session, so the pass engine, the classification and the scorer can be exercised end to end with NO network and in milliseconds.
// Used by cal-routing.mjs and by `run.mjs --fake` (which writes a run file flagged fake:true that the scorer refuses).
export function makeVirtualClock() {
    let t = 0, seq = 0; const q = [];
    const runDue = (upto) => {
        for (;;) {
            q.sort((a, b) => a.at - b.at || a.seq - b.seq);
            if (!q.length || q[0].at > upto) break;
            const j = q.shift(); t = Math.max(t, j.at); j.fn();
        }
    };
    return {
        now: () => t,
        sleep: async (ms) => { const target = t + ms; runDue(target); t = target; },
        schedule: (dt, fn) => { q.push({ at: t + dt, seq: seq++, fn }); },
    };
}

/**
 * script(id, attempt) -> { events: [{ dt, type: 'tx', text } | { dt, type: 'gc' | 'tc' | 'int' | 'goAway' | 'close' }] } with dt in ms after Q (clip end), or null for "says nothing".
 * Options: setupMs, handleEvery (a sessionResumptionUpdate with a handle is sent at setup), noHandle (never send one), failSetup.
 */
export function makeFake(clock, script, { setupMs = 100, noHandle = false, failSetup = false } = {}) {
    let n = 0; const opened = [];
    const connect = async (config, cb) => {
        const idx = ++n; opened.push({ idx, resumed: !!config.sessionResumption?.handle, system: config.systemInstruction?.parts?.[0]?.text });
        const state = { closed: false };
        const msg = (m) => { if (!state.closed) cb.onmessage(m); };
        clock.schedule(0, () => cb.onopen());
        if (!failSetup) clock.schedule(setupMs, () => { msg({ setupComplete: {} }); if (!noHandle) msg({ sessionResumptionUpdate: { newHandle: `h${idx}`, resumable: true } }); });
        const session = {
            sendRealtimeInput: () => { /* audio is ignored */ },
            close: () => { if (!state.closed) { state.closed = true; clock.schedule(0, () => cb.onclose({ code: 1000, reason: 'client close' })); } },
        };
        session.emit = (events) => {
            for (const e of events) clock.schedule(e.dt, () => {
                if (e.type === 'tx') msg({ serverContent: { outputTranscription: { text: e.text } } });
                else if (e.type === 'gc') msg({ serverContent: { generationComplete: true } });
                else if (e.type === 'tc') msg({ serverContent: { turnComplete: true } });
                else if (e.type === 'int') msg({ serverContent: { interrupted: true } });
                else if (e.type === 'goAway') msg({ goAway: { timeLeft: '10s' } });
                else if (e.type === 'close') { if (!state.closed) { state.closed = true; cb.onclose({ code: 1011, reason: 'Internal error' }); } }
            });
        };
        fakeSessions.push(session);
        return session;
    };
    const fakeSessions = [];
    const hooks = { onClipEnd: (id, attempt) => { const s = script(id, attempt); if (s?.events?.length) fakeSessions[fakeSessions.length - 1].emit(s.events); } };
    return { connect, hooks, opened };
}

/** A tiny scripted reply: the word `hard` (or an answer of `words` words) at `firstMs` after Q, then generationComplete and turnComplete. */
export const hardReply = (firstMs = 900, token = 'hard') => ({ events: [{ dt: firstMs, type: 'tx', text: token }, { dt: firstMs + 150, type: 'gc' }, { dt: firstMs + 200, type: 'tc' }] });
export const easyReply = (firstMs = 1000, words = 30, lead = 'Sure') => ({ events: [{ dt: firstMs, type: 'tx', text: `${lead} ` }, ...Array.from({ length: words - 1 }, (_, i) => ({ dt: firstMs + 120 * (i + 1), type: 'tx', text: `w${i} ` })), { dt: firstMs + 120 * words + 200, type: 'gc' }, { dt: firstMs + 120 * words + 260, type: 'tc' }] });
