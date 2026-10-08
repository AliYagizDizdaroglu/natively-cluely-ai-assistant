// L38R, the Live router probe (PREREGISTER-l38r.md): bare gemini-3.8-live hears each clip in real time, ONE session
// per item (items.json "order"), under the app's captured s50k system prompt for S1Q08 + that pair's CONTEXT block +
// a ROUTING live-mode block: a short one-part factual question -> a one-line answer (<= 5 words); anything else ->
// the single word "hard"; not a question -> nothing. The harness is l20c/run.mjs (ET10's after amendment 1) with
// these changes only: single-item sessions, two clip folders (scenario50-tts-local for the hard ids, ./clips for the
// simple ones), the routing block, answerWords 1 (the first completed turn is the answer: a one-liner is expected),
// quiet 6 s after any completed turn, 30 s with no output = nothing, cap 90 s. One retry per item on an abnormal
// close (code != 1000) before its generationComplete, the failed attempt kept as `<id>~a1`. Key read in-process.
//   node run.mjs --rep 1|2
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const { GoogleGenAI } = createRequire(`${MAIN}/package.json`)('@google/genai');
const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : undefined; };
const REP = arg('--rep');
if (!['1', '2', '3'].includes(REP)) { console.log('usage: --rep 1|2|3'); process.exit(2); }
const MODEL = 'gemini-3.8-live';
const ITEMS = JSON.parse(fs.readFileSync(`${HERE}/items.json`, 'utf8'));
const ORDER = ITEMS.order;
const SIMPLE = new Set(ITEMS.simple);
const ANSWER_WORDS = 1, QUIET_AFTER_TURN_MS = 6000, NO_OUTPUT_MS = 30000, CAP_MS = 90000;
const CHUNK = 1920; // 60 ms of 16 kHz mono s16le

const env = fs.readFileSync(`${MAIN}/.env`, 'utf8');
const apiKey = env.match(/^GEMINI_API_KEY=(.+)$/m)?.[1].trim().replace(/^["']|["']$/g, '');
if (!apiKey) { console.log('GEMINI_API_KEY absent'); process.exit(2); }

const P = JSON.parse(fs.readFileSync(`${MAIN}/electron/test/golden/interview60.runs/2026-09-20T11-22-43-s50k/interview60.prompts.json`, 'utf8'));
export const LIVE_MODE = `[LIVE MODE]
You are listening to a live job interview through the interviewer's microphone. The speaker is the INTERVIEWER; the candidate is described in the context below.
When the interviewer finishes a question, decide:
- If it is a SHORT FACTUAL question with ONE part, which the candidate can answer in one line (an either/or choice, a yes/no, a name, a number, a complexity class), reply with that one-line answer only: at most five words, the answer itself first, nothing else.
- Otherwise (several parts, a design or a scenario, an explanation, an experience question, a follow-up that builds on an earlier answer), say exactly the single word "hard" and nothing else.
Wait until the interviewer has finished the whole question before replying. If what you heard is not a question for the candidate, output nothing.
[END LIVE MODE]`;
function systemFor(main) {
    const p = P[main];
    if (!p?.system || !p?.user) throw new Error(`${main}: no captured s50k prompt`);
    const a = p.user.indexOf('CONTEXT:'), b = p.user.indexOf('USER QUESTION:');
    if (a < 0 || b < a) throw new Error(`${main}: CONTEXT / USER QUESTION markers not found in the captured prompt`);
    return `${p.system}\n\n${p.user.slice(a, b).trim()}\n\n${LIVE_MODE}`;
}
function clipPcm16k(id) {
    const file = SIMPLE.has(id) ? `${HERE}/clips/${id}.wav` : `${MAIN}/electron/test/golden/scenario50-tts-local/${id}.wav`;
    const wav = fs.readFileSync(file);
    const rate = wav.readUInt32LE(24), ch = wav.readUInt16LE(22), bits = wav.readUInt16LE(34);
    if (bits !== 16) throw new Error(`${id}: ${bits}-bit`);
    let off = 12, dataOff = -1, dataLen = 0;
    while (off < wav.length - 8) { const idc = wav.toString('ascii', off, off + 4); const len = wav.readUInt32LE(off + 4); if (idc === 'data') { dataOff = off + 8; dataLen = len; break; } off += 8 + len; }
    if (dataOff < 0) throw new Error(`${id}: no data chunk`);
    const src = new Int16Array(wav.buffer, wav.byteOffset + dataOff, Math.floor(Math.min(dataLen, wav.length - dataOff) / 2));
    const frames = Math.floor(src.length / ch), f = rate / 16000;
    const out = new Int16Array(Math.floor(frames / f));
    for (let i = 0; i < out.length; i++) out[i] = src[Math.floor(i * f) * ch];
    return Buffer.from(out.buffer, out.byteOffset, out.byteLength);
}
// Fail before any network call if a clip or the captured prompt is missing.
const CLIPS = Object.fromEntries(ORDER.map((id) => [id, clipPcm16k(id)]));
const SYSTEM = systemFor(ITEMS.contextMain);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const T0 = Date.now();
const T0_ISO = new Date(T0).toISOString();
const rel = () => Date.now() - T0;
const events = [];
let current = { id: null, clipEndMs: null };
const ev = (kind, data = {}) => {
    const e = { t: rel(), item: current.id, sinceClipEnd: current.clipEndMs == null ? null : rel() - current.clipEndMs, kind, ...data };
    events.push(e);
    if (kind !== 'audio') console.log(`+${(e.t / 1000).toFixed(2)}s [${e.item ?? '-'}${e.sinceClipEnd == null ? '' : ` ${(e.sinceClipEnd / 1000).toFixed(2)}s after end`}] ${kind} ${JSON.stringify(data).slice(0, 160)}`);
};
const words = (s) => s.trim().split(/\s+/).filter(Boolean).length;
const sessions = [];
const outFile = `${HERE}/runs/l38r-r${REP}.json`;
fs.mkdirSync(`${HERE}/runs`, { recursive: true });
const save = () => fs.writeFileSync(outFile, JSON.stringify({ model: MODEL, level: 'none', rep: Number(REP), t0Iso: T0_ISO, pairs: ORDER.map((id) => [id]), simple: ITEMS.simple, hard: ITEMS.hard, liveMode: LIVE_MODE, answerWords: ANSWER_WORDS, quietAfterTurnMs: QUIET_AFTER_TURN_MS, noOutputMs: NO_OUTPUT_MS, capMs: CAP_MS, sessions, events }, null, 1));

const ai = new GoogleGenAI({ apiKey, apiVersion: 'v1beta' });
const silence = Buffer.alloc(CHUNK).toString('base64');

async function runItem(id, attempt) {
    const st = { closed: null, setup: false, turnOpen: false, turnText: '', lastTurn: null, lastEventAt: 0 };
    let generated = false, played = false;
    current = { id: null, clipEndMs: null };
    const session = await ai.live.connect({
        model: MODEL,
        config: {
            responseModalities: ['AUDIO'],
            systemInstruction: { parts: [{ text: SYSTEM }] },
            inputAudioTranscription: {},
            outputAudioTranscription: {},
            contextWindowCompression: { slidingWindow: {} },
        },
        callbacks: {
            onopen: () => ev('open', { item: id, attempt }),
            onmessage: (msg) => {
                const sc = msg.serverContent;
                if (msg.setupComplete) { st.setup = true; ev('setupComplete'); }
                if (sc?.inputTranscription?.text) ev('inputTx', { text: sc.inputTranscription.text });
                if (sc?.outputTranscription?.text) { ev('outputTx', { text: sc.outputTranscription.text }); st.turnOpen = true; st.turnText += sc.outputTranscription.text; st.lastEventAt = rel(); }
                for (const p of sc?.modelTurn?.parts ?? []) {
                    if (p.thought) ev('thought', { text: String(p.text ?? '').slice(0, 200) });
                    else if (p.text) ev('text', { text: p.text });
                    else if (p.inlineData) ev('audio', { bytes: p.inlineData.data?.length ?? 0 });
                }
                if (sc?.turnComplete || sc?.interrupted) {
                    ev(sc.turnComplete ? 'turnComplete' : 'interrupted');
                    if (st.turnOpen && current.clipEndMs != null) st.lastTurn = { words: words(st.turnText), error: /system error/i.test(st.turnText) };
                    st.turnOpen = false; st.turnText = ''; st.lastEventAt = rel();
                }
                if (sc?.generationComplete) { ev('generationComplete'); if (current.clipEndMs != null) generated = true; }
                if (msg.usageMetadata) ev('usage', { prompt: msg.usageMetadata.promptTokenCount, response: msg.usageMetadata.responseTokenCount, thoughts: msg.usageMetadata.thoughtsTokenCount, total: msg.usageMetadata.totalTokenCount });
                if (msg.goAway) ev('goAway', msg.goAway);
            },
            onerror: (e) => ev('error', { message: String(e?.message ?? e) }),
            onclose: (e) => { st.closed = { code: e?.code, reason: e?.reason }; ev('close', st.closed); },
        },
    });
    for (let w = 0; w < 10000 && !st.setup && !st.closed; w += 50) await sleep(50);
    if (!st.setup) { ev('setupTimeout'); try { session.close(); } catch { /* noop */ } return { closed: st.closed ?? 'no setupComplete in 10 s', abnormal: true, complete: false }; }
    const pcm = CLIPS[id];
    current = { id, clipEndMs: null };
    ev('clipStart', { seconds: +(pcm.length / 32000).toFixed(1), attempt });
    for (let off = 0; off < pcm.length && !st.closed; off += CHUNK) {
        session.sendRealtimeInput({ audio: { data: pcm.subarray(off, off + CHUNK).toString('base64'), mimeType: 'audio/pcm;rate=16000' } });
        await sleep(60);
    }
    if (!st.closed) {
        current.clipEndMs = rel();
        played = true;
        ev('clipEnd');
        const waitFrom = rel();
        while (!st.closed) {
            session.sendRealtimeInput({ audio: { data: silence, mimeType: 'audio/pcm;rate=16000' } });
            await sleep(60);
            const waited = rel() - waitFrom, quiet = rel() - Math.max(st.lastEventAt, waitFrom);
            if (waited >= CAP_MS) { ev('cap'); break; }
            if (st.turnOpen) continue;
            if (!st.lastTurn) { if (waited >= NO_OUTPUT_MS) { ev('noOutput'); break; } continue; }
            if (quiet >= QUIET_AFTER_TURN_MS) break;
        }
        ev('itemDone', { waitedMs: rel() - waitFrom });
    }
    try { session.close(); } catch { /* noop */ }
    await sleep(1500);
    const abnormal = st.closed && st.closed.code !== 1000;
    return { closed: st.closed, abnormal: !!abnormal, complete: played && generated };
}

for (const id of ORDER) {
    const startIdx = events.length;
    let r = await runItem(id, 1);
    sessions.push({ pair: [id], attempt: 1, ...r });
    if (r.abnormal && !r.complete) {
        for (const e of events.slice(startIdx)) if (e.item === id) e.item = `${id}~a1`;
        current = { id: null, clipEndMs: null };
        ev('retryPair', { pair: id });
        r = await runItem(id, 2);
        sessions.push({ pair: [id], attempt: 2, ...r });
    }
    save();
}
save();
console.log(`wrote ${outFile}`);
