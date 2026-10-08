// The pass engine of the offline routing replay: ONE gemini-3.8-live session over a roster in order (follow-ups hear their parents), the clips sent in real time (60 ms chunks), real-time
// silence while waiting (as the app's session pads it), Q = the moment the last clip chunk is sent. It follows router-default/liveall/run.mjs: session resumption between items on a goAway / close,
// ONE unplanned recovery (an item cut by a close is replayed once after the reconnect, its first attempt relabelled `<id>~a1`), a second unplanned close stops the run (the file is saved).
// Everything external is injected, so the calibration drives it on a VIRTUAL clock with a scripted stand-in session and no network:
//   deps = { connect(config, callbacks) -> session{ sendRealtimeInput({audio:{data,mimeType}}), close() }, clock{ now(), sleep(ms) }, hooks?{ onClipEnd(id, attempt) } , log? }
// It records raw events per item (times relative to Q); classification is applied later by classify.mjs, so a rule change never needs a re-run.
export const CHUNK_BYTES = 1920;         // 60 ms of 16 kHz mono s16le
export const CHUNK_MS = 60;
export const TIMING = {
    QUIET_MS: 2000,                      // after the turn has ended, this long without any event closes the item
    OPEN_QUIET_MS: 8000,                 // text with no end event and this long without an event: close anyway (an answer streams continuously; 8 s of silence is the end)
    NO_OUTPUT_MS: 15000,                 // no text at all: NONE. Anything first appearing after Q + 2 s is LATE or NONE either way, so 15 s only bounds the wait
    CAP_MS: 90000,                       // one item never waits longer than this
};
export const MAX_RECONNECTS = 12;

export async function runPass({ items, system, connect, clock, hooks = {}, timing = TIMING, log = () => {} }) {
    const { now: abs, sleep } = clock;
    const T0 = abs(), rel = () => abs() - T0;
    const events = [];                   // global log: { t, item, kind, ... } (no text for audio)
    const sessions = [];
    const silence = Buffer.alloc(CHUNK_BYTES).toString('base64');
    let current = { id: null, qAbs: null };
    let st = null, handle = null;
    const generated = new Set(), played = new Set();
    const perItem = new Map();           // id -> { id, parent, events: [{t,kind,text?}], clipMs, attempt }
    const ev = (kind, data = {}) => {
        const e = { t: rel(), item: current.id, kind, ...data };
        events.push(e);
        if (kind !== 'outputTx' && kind !== 'audio') log(`+${(e.t / 1000).toFixed(2)}s [${e.item ?? '-'}] ${kind}${['close', 'error', 'goAway', 'reconnect'].includes(kind) ? ' ' + JSON.stringify(Object.fromEntries(Object.entries(data).filter(([k]) => k !== 'text'))).slice(0, 160) : ''}`);
    };

    async function open(resumeHandle) {
        st = { closed: null, setup: false, turnOpen: false, sawText: false, lastEventAt: 0, goAway: false };
        const my = st;
        const config = { responseModalities: ['AUDIO'], systemInstruction: { parts: [{ text: system }] }, inputAudioTranscription: {}, outputAudioTranscription: {}, contextWindowCompression: { slidingWindow: {} }, sessionResumption: resumeHandle ? { handle: resumeHandle } : {} };
        const session = await connect(config, {
            onopen: () => ev('open', { resumed: !!resumeHandle }),
            onmessage: (msg) => {
                const sc = msg.serverContent;
                if (msg.setupComplete) { my.setup = true; ev('setupComplete'); }
                if (msg.sessionResumptionUpdate?.newHandle && msg.sessionResumptionUpdate.resumable !== false) handle = msg.sessionResumptionUpdate.newHandle;
                if (sc?.outputTranscription?.text) { ev('outputTx', { text: String(sc.outputTranscription.text) }); my.turnOpen = true; my.sawText = true; my.lastEventAt = rel(); }
                if (sc?.generationComplete) { ev('generationComplete'); my.turnOpen = false; my.lastEventAt = rel(); if (current.qAbs !== null) generated.add(current.id); }
                if (sc?.turnComplete) { ev('turnComplete'); my.turnOpen = false; my.lastEventAt = rel(); }
                if (sc?.interrupted) { ev('interrupted'); my.turnOpen = false; my.lastEventAt = rel(); }
                if (msg.goAway) { my.goAway = true; ev('goAway'); }
            },
            onerror: (e) => ev('error', { message: String(e?.message ?? e).slice(0, 120) }),
            onclose: (e) => { my.closed = { code: e?.code, reason: String(e?.reason ?? '').slice(0, 80) }; ev('close', my.closed); },
        });
        for (let w = 0; w < 10000 && !my.setup && !my.closed; w += 50) await sleep(50);
        if (!my.setup) { ev('setupTimeout'); try { session.close(); } catch { /* noop */ } throw new Error('no setupComplete in 10 s'); }
        return session;
    }

    let session = await open(null), unplanned = 0, reconnects = 0, stopped = null;
    async function reconnect(why) {
        if (reconnects >= MAX_RECONNECTS) { stopped = `more than ${MAX_RECONNECTS} reconnects`; return false; }
        if (!handle) { stopped = `${why}: no resumption handle (the model never sent one), context cannot be kept`; return false; }
        current = { id: null, qAbs: null };   // our own close must not be logged as the last item's
        try { session.close(); } catch { /* noop */ }
        await sleep(1000);
        reconnects++;
        ev('reconnect', { why, n: reconnects });
        try { session = await open(handle); } catch (e) { stopped = `${why}: reconnect failed (${String(e?.message ?? e)})`; return false; }
        return true;
    }

    async function playItem(item, attempt) {
        const rec = { id: item.id, parent: item.parent ?? null, events: [], clipMs: Math.round((item.pcm.length / CHUNK_BYTES) * CHUNK_MS), attempt };
        perItem.set(item.id, rec);
        current = { id: item.id, qAbs: null };
        const my = st;
        my.sawText = false; my.turnOpen = false;
        ev('clipStart', { attempt });
        for (let off = 0; off < item.pcm.length && !my.closed; off += CHUNK_BYTES) {
            session.sendRealtimeInput({ audio: { data: item.pcm.subarray(off, off + CHUNK_BYTES).toString('base64'), mimeType: 'audio/pcm;rate=16000' } });
            await sleep(CHUNK_MS);
        }
        if (my.closed) return { cut: true };
        current.qAbs = abs();
        rec.qRel = rel();   // Q: the end of the clip; per-item event times are rebased on it when the result is built
        played.add(item.id);
        ev('clipEnd');
        hooks.onClipEnd?.(item.id, attempt);
        const waitFrom = rel();
        for (;;) {
            session.sendRealtimeInput({ audio: { data: silence, mimeType: 'audio/pcm;rate=16000' } });
            await sleep(CHUNK_MS);
            const waited = rel() - waitFrom, quiet = rel() - Math.max(my.lastEventAt, waitFrom);
            if (my.closed) break;
            if (waited >= timing.CAP_MS) { ev('cap'); break; }
            if (!my.sawText) { if (waited >= timing.NO_OUTPUT_MS) { ev('noOutput'); break; } continue; }
            if (my.turnOpen) { if (quiet >= timing.OPEN_QUIET_MS) { ev('openTurnTimeout'); break; } continue; }
            if (quiet >= timing.QUIET_MS) break;
        }
        ev('itemDone', { waitedMs: rel() - waitFrom });
        return { cut: !!my.closed && !generated.has(item.id) };
    }

    const RELEVANT = new Set(['outputTx', 'generationComplete', 'turnComplete', 'interrupted', 'close']);
    // per-item events, rebased on Q (times before the clip ended are negative); an item that never reached Q has no events
    const evFor = (id, rec) => (rec?.qRel === undefined ? [] : events.filter((e) => e.item === id && RELEVANT.has(e.kind)).map((e) => ({ t: e.t - rec.qRel, kind: e.kind, ...(e.kind === 'outputTx' ? { text: e.text } : {}) })));
    const outItem = (id, rec) => ({ ...(rec ?? { id, parent: null }), id, events: evFor(id, rec), played: played.has(id) });
    const build = () => ({ items: items.map((i) => outItem(i.id, perItem.get(i.id))), cutAttempts: [...perItem.entries()].filter(([, x]) => x.cut).map(([id, x]) => outItem(id, x)), sessions, reconnects, unplanned, stopped, totalMs: rel() });

    for (const item of items) {
        if (st.closed || st.goAway) {
            if (!st.goAway) unplanned++;
            if (unplanned > 1) { stopped = 'second unplanned close'; break; }
            if (!(await reconnect(st.goAway ? 'goAway' : 'close'))) break;
        }
        let r = await playItem(item, 1);
        if (r.cut) {
            if (!st.goAway) unplanned++;
            const first = perItem.get(item.id); perItem.delete(item.id); perItem.set(`${item.id}~a1`, { ...first, id: `${item.id}~a1`, cut: true });
            for (const e of events) if (e.item === item.id) e.item = `${item.id}~a1`;
            played.delete(item.id);
            sessions.push({ item: item.id, attempt: 1, cut: true, closed: st.closed });
            if (unplanned > 1) { stopped = 'second unplanned close'; break; }
            if (!(await reconnect('cut'))) break;
            r = await playItem(item, 2);
            if (r.cut) { sessions.push({ item: item.id, attempt: 2, cut: true, closed: st.closed }); stopped = 'item cut twice'; break; }
        }
        sessions.push({ item: item.id, attempt: perItem.has(`${item.id}~a1`) ? 2 : 1, cut: false });
        hooks.onItemDone?.(build());
    }
    current = { id: null, qAbs: null };
    try { session.close(); } catch { /* noop */ }
    await sleep(1500);
    return build();
}
