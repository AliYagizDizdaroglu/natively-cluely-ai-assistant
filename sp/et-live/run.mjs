// 3.8 Live EXTENDED THINKING re-probe (2026-10-02 night, user: "can we probe 3.8 live ET, low and medium again").
// tonight's temp-live/run.mjs (itself L20c's harness unchanged) with ONLY the model (gemini-3.8-live-extended-thinking)
// and the arm changed: thinkingConfig.thinkingLevel low vs medium, no temperature (as ET38 ran). Same 6 pairs / 8
// graded items, ONE rep (the user asked for a smaller probe), arms interleaved per pair. Writes runs/live38et-<LOW|MED>-r<rep>.json in L20c's format.
//   node run.mjs
import fs from 'node:fs';
import { createRequire } from 'node:module';

const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const HERE = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/et-live';
const { GoogleGenAI } = createRequire(`${MAIN}/package.json`)('@google/genai');
const MODEL = 'gemini-3.8-live-extended-thinking';
const PAIRS = [['S2Q02', 'S2Q02F'], ['S2Q06', 'S2Q06F'], ['S2Q07', 'S2Q07F'], ['S1Q02', 'S1Q02F'], ['S1Q04', 'S1Q04F'], ['S2Q10', 'S2Q10F']];
const ARMS = { LOW: 'low', MED: 'medium' };
const ANSWER_WORDS = 25, QUIET_AFTER_ANSWER_MS = 6000, QUIET_AFTER_SHORT_MS = 30000, NO_OUTPUT_MS = 60000, CAP_MS = 150000;
const CHUNK = 1920; // 60 ms of 16 kHz mono s16le

const apiKey = fs.readFileSync(`${MAIN}/.env`, 'utf8').match(/^GEMINI_API_KEY=(.+)$/m)?.[1].trim().replace(/^["']|["']$/g, '');
if (!apiKey) { console.log('GEMINI_API_KEY absent'); process.exit(2); }
const P = JSON.parse(fs.readFileSync(`${MAIN}/electron/test/golden/interview60.runs/2026-09-20T11-22-43-s50k/interview60.prompts.json`, 'utf8'));
const LIVE_MODE = `[LIVE MODE]
You are listening to a live job interview through the interviewer's microphone. The speaker is the INTERVIEWER; the candidate is described in the context below.
When the interviewer finishes a question, reply with exactly what the candidate should say next, following every rule above (spoken, first person, the answer's structure and length rules).
Output ONLY the answer itself: no greeting, no acknowledgement, no "let me think", no narration of your reasoning.
Wait until the interviewer has finished the whole question before answering. If what you heard is not a question for the candidate, output nothing.
[END LIVE MODE]`;
// Byte-check against L20c: the LIVE_MODE block must be the one L20c sent.
const l20cSrc = fs.readFileSync(`${HERE}/../l20c/run.mjs`, 'utf8');   // LIVE_MODE byte-check, unchanged
if (!l20cSrc.includes(LIVE_MODE)) { console.log('REFUSED: LIVE_MODE differs from l20c/run.mjs'); process.exit(2); }
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
const CLIPS = Object.fromEntries(PAIRS.flat().map((id) => [id, clipPcm16k(id)]));
const SYSTEMS = Object.fromEntries(PAIRS.map(([main]) => [main, systemFor(main)]));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const words = (s) => s.trim().split(/\s+/).filter(Boolean).length;
fs.mkdirSync(`${HERE}/runs`, { recursive: true });
// One state per output file (arm x rep), so each file reads exactly like an L20c run file.
const files = {};
function fileState(arm, rep) {
    const k = `${arm}-r${rep}`;
    if (!files[k]) { const T0 = Date.now(); files[k] = { arm, rep, T0, t0Iso: new Date(T0).toISOString(), events: [], sessions: [], out: `${HERE}/runs/live38et-${k}.json` }; }
    return files[k];
}
const save = (F) => fs.writeFileSync(F.out, JSON.stringify({ model: MODEL, arm: F.arm, thinkingLevel: ARMS[F.arm], level: 'none', rep: F.rep, t0Iso: F.t0Iso, pairs: PAIRS, answerWords: ANSWER_WORDS, quietAfterAnswerMs: QUIET_AFTER_ANSWER_MS, quietAfterShortMs: QUIET_AFTER_SHORT_MS, noOutputMs: NO_OUTPUT_MS, capMs: CAP_MS, sessions: F.sessions, events: F.events }, null, 1));
const ai = new GoogleGenAI({ apiKey, apiVersion: 'v1beta' });
const silence = Buffer.alloc(CHUNK).toString('base64');

async function runPair(F, pair, attempt) {
    const rel = () => Date.now() - F.T0;
    let current = { id: null, clipEndMs: null };
    const ev = (kind, data = {}) => {
        const e = { t: rel(), item: current.id, sinceClipEnd: current.clipEndMs == null ? null : rel() - current.clipEndMs, kind, ...data };
        F.events.push(e);
        if (!['audio', 'outputTx', 'inputTx'].includes(kind)) console.log(`${F.arm}-r${F.rep} +${(e.t / 1000).toFixed(2)}s [${e.item ?? '-'}${e.sinceClipEnd == null ? '' : ` ${(e.sinceClipEnd / 1000).toFixed(2)}s after end`}] ${kind} ${kind === 'usage' ? JSON.stringify(data) : ''}`);
    };
    const st = { closed: null, setup: false, turnOpen: false, turnText: '', lastTurn: null, lastEventAt: 0 };
    const generated = new Set(), played = new Set();
    const thinkingLevel = ARMS[F.arm];
    const session = await ai.live.connect({
        model: MODEL,
        config: {
            responseModalities: ['AUDIO'],
            systemInstruction: { parts: [{ text: SYSTEMS[pair[0]] }] },
            inputAudioTranscription: {},
            outputAudioTranscription: {},
            contextWindowCompression: { slidingWindow: {} },
            thinkingConfig: { thinkingLevel },
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
        if (st.closed) break;
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

for (const rep of [1]) {   // the smaller probe (user, 22:08: "do a smaller probe"): one rep
    for (const [i, pair] of PAIRS.entries()) {
        const order = (i + rep) % 2 === 0 ? ['LOW', 'MED'] : ['MED', 'LOW'];
        for (const arm of order) {
            const F = fileState(arm, rep);
            const startIdx = F.events.length;
            let r = await runPair(F, pair, 1);
            F.sessions.push({ pair, attempt: 1, ...r });
            if (r.abnormal && !r.complete) {
                for (const e of F.events.slice(startIdx)) if (pair.includes(e.item)) e.item = `${e.item}~a1`;
                r = await runPair(F, pair, 2);
                F.sessions.push({ pair, attempt: 2, ...r });
            }
            save(F);
        }
    }
}
for (const F of Object.values(files)) save(F);
console.log('RUN DONE');
