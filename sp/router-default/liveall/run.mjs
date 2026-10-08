// Live-all runner: l20d/run.mjs's harness (same instruction + CONTEXT system form, same wait rules, same event shape so et10/et-extract.mjs reads it unchanged),
// but ONE gemini-3.8-live session over the 47 live40 items in roster order (follow-ups hear their parents), clips from live40-tts-local (sample-identical to live40.wav, proven by dry.mjs).
// Differences from l20d/run.mjs, all forced by one long session: (1) session resumption: the server's goAway / a drop is followed by a reconnect with the last resumption handle,
// between items (a reconnect is logged as an event; no handle = stop); (2) ONE unplanned recovery allowed (an item cut by a close is replayed once after the reconnect, its first attempt relabelled `<id>~a1`);
// a second unplanned close stops the run (the file is saved). The key is read in-process, never printed; the console never prints text, only kinds.
//   node run.mjs [--smoke]    (--smoke: first 3 items only)
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { buildItems, buildSystem, toPcm16k, MAIN, HERE, INSTRUCTION_SHA256 } from './common.mjs';

const { GoogleGenAI } = createRequire(`${MAIN}/package.json`)('@google/genai');
const SMOKE = process.argv.includes('--smoke');
const MODEL = 'gemini-3.8-live';
const ANSWER_WORDS = 25, QUIET_AFTER_ANSWER_MS = 6000, QUIET_AFTER_SHORT_MS = 30000, NO_OUTPUT_MS = 60000, CAP_MS = 150000;
const CHUNK = 1920; // 60 ms of 16 kHz mono s16le
const MAX_RECONNECTS = 12;

const envTxt = fs.readFileSync(`${MAIN}/.env`, 'utf8');
const apiKey = envTxt.match(/^GEMINI_API_KEY=(.+)$/m)?.[1].trim().replace(/^["']|["']$/g, '');
if (!apiKey) { console.log('GEMINI_API_KEY absent'); process.exit(2); }

const B = await buildItems();
if (B.bad.length) { console.log(`items do not check: ${B.bad.join(' | ')}`); process.exit(2); }
const SYS = await buildSystem();
let ITEMS = B.items.map((i) => ({ id: i.id, parent: i.parent, pcm: toPcm16k(i.wav) }));
if (SMOKE) ITEMS = ITEMS.slice(0, 3);
const FROM = process.argv.includes('--from') ? process.argv[process.argv.indexOf('--from') + 1] : null;   // the ONE retry: a fresh session from a chain boundary after the first session was closed by the server (1011)
if (FROM) { const k = ITEMS.findIndex((i) => i.id === FROM); if (k < 0) { console.log('--from: not an item'); process.exit(2); } ITEMS = ITEMS.slice(k); }
const IDS = ITEMS.map((i) => i.id);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const T0 = Date.now(), T0_ISO = new Date(T0).toISOString();
const rel = () => Date.now() - T0;
const events = [];
let current = { id: null, clipEndMs: null };
const ev = (kind, data = {}) => {
    const e = { t: rel(), item: current.id, sinceClipEnd: current.clipEndMs == null ? null : rel() - current.clipEndMs, kind, ...data };
    events.push(e);
    if (kind !== 'audio') console.log(`+${(e.t / 1000).toFixed(2)}s [${e.item ?? '-'}] ${kind}${kind === 'close' || kind === 'error' || kind === 'goAway' || kind === 'reconnect' ? ' ' + JSON.stringify(Object.fromEntries(Object.entries(data).filter(([k]) => k !== 'text'))).slice(0, 160) : ''}`);
};
const words = (s) => s.trim().split(/\s+/).filter(Boolean).length;
const sessions = [];
const outFile = `${HERE}/runs/liveall-r1${SMOKE ? '-smoke' : ''}${FROM ? '-s2' : ''}.json`;
fs.mkdirSync(`${HERE}/runs`, { recursive: true });
if (fs.existsSync(outFile)) { console.log(`${outFile} exists: refusing to overwrite`); process.exit(3); }
const save = (extra = {}) => fs.writeFileSync(outFile, JSON.stringify({ model: MODEL, level: 'none', instruction: INSTRUCTION_SHA256, system: SYS.shas, rep: 1, t0Iso: T0_ISO, pairs: [IDS], answerWords: ANSWER_WORDS, quietAfterAnswerMs: QUIET_AFTER_ANSWER_MS, quietAfterShortMs: QUIET_AFTER_SHORT_MS, noOutputMs: NO_OUTPUT_MS, capMs: CAP_MS, sessions, events, ...extra }, null, 1));

const ai = new GoogleGenAI({ apiKey, apiVersion: 'v1beta' });
const silence = Buffer.alloc(CHUNK).toString('base64');

// one connection's state; `st` is replaced on every reconnect
let st = null, handle = null, handleAt = null;
const generated = new Set(), played = new Set();

async function connect(resumeHandle) {
    st = { closed: null, setup: false, turnOpen: false, turnText: '', lastTurn: null, lastEventAt: 0, goAway: false };
    const my = st;
    const config = {
        responseModalities: ['AUDIO'],
        systemInstruction: { parts: [{ text: SYS.system }] },
        inputAudioTranscription: {},
        outputAudioTranscription: {},
        contextWindowCompression: { slidingWindow: {} },
        sessionResumption: resumeHandle ? { handle: resumeHandle } : {},
    };
    const session = await ai.live.connect({
        model: MODEL,
        config,
        callbacks: {
            onopen: () => ev('open', { resumed: !!resumeHandle }),
            onmessage: (msg) => {
                const sc = msg.serverContent;
                if (msg.setupComplete) { my.setup = true; ev('setupComplete'); }
                if (msg.sessionResumptionUpdate?.newHandle && msg.sessionResumptionUpdate.resumable !== false) { if (!handle) ev('resumeHandle'); handle = msg.sessionResumptionUpdate.newHandle; handleAt = rel(); }
                if (sc?.inputTranscription?.text) ev('inputTx', { text: sc.inputTranscription.text });
                if (sc?.outputTranscription?.text) { ev('outputTx', { text: sc.outputTranscription.text }); my.turnOpen = true; my.turnText += sc.outputTranscription.text; my.lastEventAt = rel(); }
                for (const p of sc?.modelTurn?.parts ?? []) {
                    if (p.thought) ev('thought', { text: String(p.text ?? '').slice(0, 200) });
                    else if (p.text) ev('text', { text: p.text });
                    else if (p.inlineData) ev('audio', { bytes: p.inlineData.data?.length ?? 0 });
                }
                if (sc?.turnComplete || sc?.interrupted) {
                    ev(sc.turnComplete ? 'turnComplete' : 'interrupted');
                    if (my.turnOpen && current.clipEndMs != null) my.lastTurn = { words: words(my.turnText), error: /system error/i.test(my.turnText) };
                    my.turnOpen = false; my.turnText = ''; my.lastEventAt = rel();
                }
                if (sc?.generationComplete) { ev('generationComplete'); if (current.clipEndMs != null) generated.add(current.id); }
                if (msg.usageMetadata) ev('usage', { prompt: msg.usageMetadata.promptTokenCount, response: msg.usageMetadata.responseTokenCount, thoughts: msg.usageMetadata.thoughtsTokenCount, total: msg.usageMetadata.totalTokenCount });
                if (msg.goAway) { my.goAway = true; ev('goAway', msg.goAway); }
                if (msg.toolCall) ev('toolCall');
            },
            onerror: (e) => ev('error', { message: String(e?.message ?? e) }),
            onclose: (e) => { my.closed = { code: e?.code, reason: e?.reason }; ev('close', my.closed); },
        },
    });
    for (let w = 0; w < 10000 && !my.setup && !my.closed; w += 50) await sleep(50);
    if (!my.setup) { ev('setupTimeout'); try { session.close(); } catch { /* noop */ } throw new Error('no setupComplete in 10 s'); }
    return session;
}

let session = null, unplanned = 0, reconnects = 0, stopped = null;
session = await connect(null);

// the drain: a reconnect between items (goAway or a close); returns false = the run cannot go on
async function reconnect(why) {
    if (reconnects >= MAX_RECONNECTS) { stopped = `more than ${MAX_RECONNECTS} reconnects`; return false; }
    if (!handle) { stopped = `${why}: no resumption handle (the model never sent one), context cannot be kept`; return false; }
    try { session.close(); } catch { /* noop */ }
    await sleep(1000);
    reconnects++;
    current = { id: null, clipEndMs: null };
    ev('reconnect', { why, n: reconnects, handleAgeMs: rel() - handleAt });
    try { session = await connect(handle); } catch (e) { stopped = `${why}: reconnect failed (${String(e?.message ?? e)})`; return false; }
    return true;
}

async function playItem(item, attempt) {
    current = { id: item.id, clipEndMs: null };
    st.lastTurn = null;
    ev('clipStart', { seconds: +(item.pcm.length / 32000).toFixed(1), attempt });
    const my = st;
    for (let off = 0; off < item.pcm.length && !my.closed; off += CHUNK) {
        session.sendRealtimeInput({ audio: { data: item.pcm.subarray(off, off + CHUNK).toString('base64'), mimeType: 'audio/pcm;rate=16000' } });
        await sleep(60);
    }
    if (my.closed) return { cut: true };
    current.clipEndMs = rel();
    played.add(item.id);
    ev('clipEnd');
    const waitFrom = rel();
    while (!my.closed) {
        session.sendRealtimeInput({ audio: { data: silence, mimeType: 'audio/pcm;rate=16000' } });
        await sleep(60);
        const waited = rel() - waitFrom, quiet = rel() - Math.max(my.lastEventAt, waitFrom);
        if (waited >= CAP_MS) { ev('cap'); break; }
        if (my.turnOpen) continue;
        if (!my.lastTurn) { if (waited >= NO_OUTPUT_MS) { ev('noOutput'); break; } continue; }
        const answerLike = my.lastTurn.words >= ANSWER_WORDS || my.lastTurn.error;
        if (quiet >= (answerLike ? QUIET_AFTER_ANSWER_MS : QUIET_AFTER_SHORT_MS)) break;
    }
    ev('itemDone', { waitedMs: rel() - waitFrom });
    return { cut: !!my.closed && !generated.has(item.id) };
}

for (const item of ITEMS) {
    if (st.closed || st.goAway) {
        const planned = !st.closed || st.goAway;
        if (!planned) unplanned++;
        if (unplanned > 1) { stopped = 'second unplanned close'; break; }
        if (!(await reconnect(st.goAway ? 'goAway' : 'close'))) break;
    }
    let r = await playItem(item, 1);
    if (r.cut) {
        if (!st.goAway) unplanned++;
        for (const e of events) if (e.item === item.id) e.item = `${item.id}~a1`;
        played.delete(item.id);
        sessions.push({ item: item.id, attempt: 1, cut: true, closed: st.closed });
        if (unplanned > 1) { stopped = 'second unplanned close'; break; }
        if (!(await reconnect('cut'))) break;
        r = await playItem(item, 2);
        if (r.cut) { sessions.push({ item: item.id, attempt: 2, cut: true, closed: st.closed }); stopped = 'item cut twice'; break; }
    }
    sessions.push({ item: item.id, attempt: events.some((e) => e.item === `${item.id}~a1`) ? 2 : 1, cut: false });
    save({ partial: true });
}
try { session.close(); } catch { /* noop */ }
await sleep(1500);
save({ partial: false, stopped, unplanned, reconnects });
console.log(`wrote ${outFile}; items played ${played.size}/${ITEMS.length}; reconnects ${reconnects}; unplanned ${unplanned}; stopped ${stopped ?? 'no'}`);
process.exit(stopped ? 5 : 0);
