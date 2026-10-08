// L20 runner (see PREREGISTER-l20.md): gemini-3.8-live BARE (no thinkingConfig) hears each scenario50 clip in
// real time, one Live session per main+follow-up pair from items.json, and answers. The harness is ET10's
// (et10/et-run.mjs after amendment 1) unchanged: same system instruction (the app's captured s50k system prompt +
// the pair's main CONTEXT + the LIVE MODE block), same wait (6 s quiet after a turn of >= 25 words or a
// system-error message, 30 s after shorter turns, 60 s no output = no answer, cap 150 s).
// One addition: a pair whose session closes abnormally (code != 1000) before every played item has a
// generationComplete after its question ended is re-run ONCE in a fresh session; the failed attempt's events stay
// in the file relabelled `<id>~a1`, and the drop is counted. Standalone; the key is read in-process, never printed.
//   node run.mjs --rep 1|2|3
//   node run.mjs --rep 2 --retry-pair S2Q09   (amendment 1: the retry the runner owed a pair whose session never
//                                              set up; appended to that run's file as attempt 2)
import fs from 'node:fs';
import { createRequire } from 'node:module';

const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const HERE = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/l20c';
const { GoogleGenAI } = createRequire(`${MAIN}/package.json`)('@google/genai');
const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : undefined; };
const REP = arg('--rep');
if (!['1', '2', '3'].includes(REP)) { console.log('usage: --rep 1|2|3'); process.exit(2); }
const MODEL = 'gemini-3.8-live';
const PAIRS = JSON.parse(fs.readFileSync(`${HERE}/items.json`, 'utf8')).pairs;
const ANSWER_WORDS = 25, QUIET_AFTER_ANSWER_MS = 6000, QUIET_AFTER_SHORT_MS = 30000, NO_OUTPUT_MS = 60000, CAP_MS = 150000;
const CHUNK = 1920; // 60 ms of 16 kHz mono s16le

const env = fs.readFileSync(`${MAIN}/.env`, 'utf8');
const apiKey = env.match(/^GEMINI_API_KEY=(.+)$/m)?.[1].trim().replace(/^["']|["']$/g, '');
if (!apiKey) { console.log('GEMINI_API_KEY absent'); process.exit(2); }

const P = JSON.parse(fs.readFileSync(`${MAIN}/electron/test/golden/interview60.runs/2026-09-20T11-22-43-s50k/interview60.prompts.json`, 'utf8'));
const LIVE_MODE = `[LIVE MODE]
You are listening to a live job interview through the interviewer's microphone. The speaker is the INTERVIEWER; the candidate is described in the context below.
When the interviewer finishes a question, reply with exactly what the candidate should say next, following every rule above (spoken, first person, the answer's structure and length rules).
Output ONLY the answer itself: no greeting, no acknowledgement, no "let me think", no narration of your reasoning.
Wait until the interviewer has finished the whole question before answering. If what you heard is not a question for the candidate, output nothing.
[END LIVE MODE]`;
function systemFor(main) {
    const p = P[main];
    if (!p?.system || !p?.user) throw new Error(`${main}: no captured s50k prompt`);
    const a = p.user.indexOf('CONTEXT:'), b = p.user.indexOf('USER QUESTION:');
    if (a < 0 || b < a) throw new Error(`${main}: CONTEXT / USER QUESTION markers not found in the captured prompt`);
    return `${p.system}\n\n${p.user.slice(a, b).trim()}\n\n${LIVE_MODE}`;
}
function clipPcm16k(id) {
    const wav = fs.readFileSync(`${MAIN}/electron/test/golden/scenario50-tts-local/${id}.wav`);
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
// Fail before any network call if a clip or a captured prompt is missing.
const CLIPS = Object.fromEntries(PAIRS.flat().map((id) => [id, clipPcm16k(id)]));
const SYSTEMS = Object.fromEntries(PAIRS.map(([main]) => [main, systemFor(main)]));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let T0 = Date.now();
let T0_ISO = new Date(T0).toISOString();
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
const outFile = `${HERE}/runs/live38-r${REP}.json`;
fs.mkdirSync(`${HERE}/runs`, { recursive: true });
const save = () => fs.writeFileSync(outFile, JSON.stringify({ model: MODEL, level: 'none', rep: Number(REP), t0Iso: T0_ISO, pairs: PAIRS, answerWords: ANSWER_WORDS, quietAfterAnswerMs: QUIET_AFTER_ANSWER_MS, quietAfterShortMs: QUIET_AFTER_SHORT_MS, noOutputMs: NO_OUTPUT_MS, capMs: CAP_MS, sessions, events }, null, 1));

const ai = new GoogleGenAI({ apiKey, apiVersion: 'v1beta' });
const silence = Buffer.alloc(CHUNK).toString('base64');

async function runPair(pair, attempt) {
    const st = { closed: null, setup: false, turnOpen: false, turnText: '', lastTurn: null, lastEventAt: 0 };
    const generated = new Set(); // items with a generationComplete after their question ended
    const played = new Set();
    current = { id: null, clipEndMs: null };
    const session = await ai.live.connect({
        model: MODEL,
        config: {
            responseModalities: ['AUDIO'],
            systemInstruction: { parts: [{ text: SYSTEMS[pair[0]] }] },
            inputAudioTranscription: {},
            outputAudioTranscription: {},
            contextWindowCompression: { slidingWindow: {} },
        },
        callbacks: {
            onopen: () => ev('open', { pair: pair[0], attempt }),
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
                if (sc?.generationComplete) { ev('generationComplete'); if (current.clipEndMs != null) generated.add(current.id); }
                if (msg.usageMetadata) ev('usage', { prompt: msg.usageMetadata.promptTokenCount, response: msg.usageMetadata.responseTokenCount, thoughts: msg.usageMetadata.thoughtsTokenCount, total: msg.usageMetadata.totalTokenCount });
                if (msg.goAway) ev('goAway', msg.goAway);
                if (msg.toolCall) ev('toolCall');
            },
            onerror: (e) => ev('error', { message: String(e?.message ?? e) }),
            onclose: (e) => { st.closed = { code: e?.code, reason: e?.reason }; ev('close', st.closed); },
        },
    });
    for (let w = 0; w < 10000 && !st.setup && !st.closed; w += 50) await sleep(50);
    // A session that never set up is an abnormal close before any item played: it takes the one retry too.
    if (!st.setup) { ev('setupTimeout'); try { session.close(); } catch { /* noop */ } return { closed: st.closed ?? 'no setupComplete in 10 s', abnormal: true, complete: false }; }
    for (const id of pair) {
        if (st.closed) break;
        const pcm = CLIPS[id];
        current = { id, clipEndMs: null };
        st.lastTurn = null;
        ev('clipStart', { seconds: +(pcm.length / 32000).toFixed(1), attempt });
        for (let off = 0; off < pcm.length && !st.closed; off += CHUNK) {
            session.sendRealtimeInput({ audio: { data: pcm.subarray(off, off + CHUNK).toString('base64'), mimeType: 'audio/pcm;rate=16000' } });
            await sleep(60);
        }
        if (st.closed) break; // the question was cut short: this item did not happen
        current.clipEndMs = rel();
        played.add(id);
        ev('clipEnd');
        const waitFrom = rel();
        while (!st.closed) {
            session.sendRealtimeInput({ audio: { data: silence, mimeType: 'audio/pcm;rate=16000' } });
            await sleep(60);
            const waited = rel() - waitFrom, quiet = rel() - Math.max(st.lastEventAt, waitFrom);
            if (waited >= CAP_MS) { ev('cap'); break; }
            if (st.turnOpen) continue;
            if (!st.lastTurn) { if (waited >= NO_OUTPUT_MS) { ev('noOutput'); break; } continue; }
            const answerLike = st.lastTurn.words >= ANSWER_WORDS || st.lastTurn.error;
            if (quiet >= (answerLike ? QUIET_AFTER_ANSWER_MS : QUIET_AFTER_SHORT_MS)) break;
        }
        ev('itemDone', { waitedMs: rel() - waitFrom });
    }
    try { session.close(); } catch { /* noop */ }
    await sleep(1500);
    const abnormal = st.closed && st.closed.code !== 1000;
    const complete = pair.every((id) => played.has(id) && generated.has(id));
    return { closed: st.closed, abnormal: !!abnormal, complete };
}

const RETRY = arg('--retry-pair');
if (RETRY) {
    const pair = PAIRS.find((p) => p[0] === RETRY);
    if (!pair) { console.log(`--retry-pair ${RETRY}: not a pair's main id`); process.exit(2); }
    const prev = JSON.parse(fs.readFileSync(outFile, 'utf8'));
    const tries = prev.sessions.filter((x) => x.pair[0] === RETRY);
    const bad = (x) => !x.complete && x.closed && (typeof x.closed === 'string' || x.closed.code !== 1000);
    if (tries.length !== 1 || !bad(tries[0])) { console.log(`--retry-pair ${RETRY}: owed only after exactly one abnormal, incomplete attempt; found ${JSON.stringify(tries)}`); process.exit(2); }
    tries[0].abnormal = true;
    events.push(...prev.events); sessions.push(...prev.sessions); T0_ISO = prev.t0Iso;
    T0 = Date.now() - ((prev.events.at(-1)?.t ?? 0) + 1000); // the run clock continues after the file's last event
    for (const e of events) if (pair.includes(e.item)) e.item = `${e.item}~a1`;
    current = { id: null, clipEndMs: null };
    ev('retryPair', { pair: RETRY, late: true });
    const r = await runPair(pair, 2);
    sessions.push({ pair, attempt: 2, ...r });
    save();
    console.log(`wrote ${outFile} (retry of ${RETRY} appended)`);
    process.exit(0);
}

for (const pair of PAIRS) {
    const startIdx = events.length;
    let r = await runPair(pair, 1);
    sessions.push({ pair, attempt: 1, ...r });
    if (r.abnormal && !r.complete) {
        for (const e of events.slice(startIdx)) if (pair.includes(e.item)) e.item = `${e.item}~a1`;
        current = { id: null, clipEndMs: null };
        ev('retryPair', { pair: pair[0] });
        r = await runPair(pair, 2);
        sessions.push({ pair, attempt: 2, ...r });
    }
    save();
}
save();
console.log(`wrote ${outFile}`);
