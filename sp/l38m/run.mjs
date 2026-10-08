// L38M (PREREGISTER-l38m.md): 3.8 Live with the ear AND the router in one prompt (the app's handle_question tool +
// L38F's routing block), over the 63 turns of items.json.
//   --variant v1   one continuous session for all turns; on goAway / abnormal close reconnect with the newest
//                  resumption handle (fresh session if none); every reconnect recorded
//   --variant v2   one session per chain (L38F's shape), one retry per chain on an abnormal close
//   --dry          clip lengths and prompt size, no key, no call
// Waits: 6 s quiet after a spoken turn, 8 s quiet after a tool call with no speech, 30 s with nothing, cap 90 s.
// Key read in-process, never printed. Writes runs/l38m-<variant>.json after every turn.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : undefined; };
const VARIANT = arg('--variant');
const DRY = process.argv.includes('--dry');
if (!['v1', 'v2', 'v1-earonly'].includes(VARIANT)) { console.log('usage: --variant v1|v2|v1-earonly [--dry]'); process.exit(2); }
const MODEL = 'gemini-3.8-live';
const ITEMS = JSON.parse(fs.readFileSync(`${HERE}/items.json`, 'utf8'));
const ANSWER_WORDS = 1, QUIET_AFTER_TURN_MS = 6000, QUIET_AFTER_TOOL_MS = 8000, NO_OUTPUT_MS = 30000, CAP_MS = 90000;
const CHUNK = 1920; // 60 ms of 16 kHz mono s16le

// The app's ear duty (GeminiLiveRouter.ts LIVE_LISTENER_PROMPT, lines 69-73) with its last sentence ("Never produce
// audio. Never answer the question yourself. If speech is not a question for the candidate, do nothing.") replaced by
// L38F's routing block. The tool declaration is the app's HANDLE_QUESTION_TOOL, copied verbatim.
const EAR = `You are a listener embedded in an interview-assistant app.
Your FIRST job: when the interviewer asks the candidate a question (or gives a task), call handle_question with:
- question: the question as asked, cleaned up. When it depends on what the interviewer said just before it — a scenario, numbers, constraints, a system being described — include those sentences too, so the question stands on its own; otherwise one clear sentence. Do not call the tool while the interviewer is still setting up a scenario: wait for the actual question, then report the whole thing once
- category: "coding_heavy" if answering well requires writing code, implementing an algorithm/data structure, complexity analysis, or detailed system design; otherwise "behavioral" for experience/situational/personal questions; otherwise "verbal_technical" for conceptual technical questions answerable in speech.`;
const ROUTER = `Your SECOND job, after calling the tool, is to speak one short line:
- If it is a SHORT FACTUAL question with ONE part, which the candidate can answer in one line (an either/or choice, a yes/no, a name, a number, a complexity class), say that one-line answer only: at most five words, the answer itself first, nothing else.
- Otherwise (several parts, a design or a scenario, an explanation, an experience question), say exactly the single word "hard" and nothing else.
- Follow-ups: you hear only the interviewer, never the candidate. A short follow-up that needs only an earlier QUESTION you heard (for example "and in the worst case?") counts as short and factual: answer it in one line. A follow-up about the candidate's own answer, approach, experience or choice (for example "your approach", "that one", "how long did it take you") is "hard", because you do not know what the candidate said.
Wait until the interviewer has finished the whole question before replying. If what you heard is not a question for the candidate, do nothing and say nothing.`;
const EAR_ONLY = `You are a silent meeting listener embedded in an interview-assistant app. You NEVER speak or answer out loud.
Your ONLY job: when the interviewer asks the candidate a question (or gives a task), call handle_question with:
- question: the question as asked, cleaned up. When it depends on what the interviewer said just before it — a scenario, numbers, constraints, a system being described — include those sentences too, so the question stands on its own; otherwise one clear sentence. Do not call the tool while the interviewer is still setting up a scenario: wait for the actual question, then report the whole thing once
- category: "coding_heavy" if answering well requires writing code, implementing an algorithm/data structure, complexity analysis, or detailed system design; otherwise "behavioral" for experience/situational/personal questions; otherwise "verbal_technical" for conceptual technical questions answerable in speech.
Never produce audio. Never answer the question yourself. If speech is not a question for the candidate, do nothing.`;
const SYSTEM = VARIANT === 'v1-earonly' ? EAR_ONLY : `${EAR}\n\n${ROUTER}`;
const TOOL = { functionDeclarations: [{ name: 'handle_question', description: 'Report a question the interviewer just asked, with routing category.', parameters: { type: 'OBJECT', properties: { question: { type: 'STRING' }, category: { type: 'STRING', enum: ['behavioral', 'verbal_technical', 'coding_heavy'] } }, required: ['question', 'category'] } }] };

function clipPcm16k(id) {
    const wav = fs.readFileSync(`${HERE}/clips/${id}.wav`);
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
const CHAINS = ITEMS.chains;
const CLIPS = Object.fromEntries(CHAINS.flat().map((id) => [id, clipPcm16k(id)]));
if (DRY) { const s = CHAINS.flat().reduce((a, id) => a + CLIPS[id].length / 32000, 0); console.log(`${CHAINS.flat().length} clips, ${s.toFixed(0)} s of speech; system ${SYSTEM.length} chars; chains ${CHAINS.length}`); process.exit(0); }

const { GoogleGenAI } = createRequire(`${MAIN}/package.json`)('@google/genai');
const apiKey = fs.readFileSync(`${MAIN}/.env`, 'utf8').match(/^GEMINI_API_KEY=(.+)$/m)?.[1].trim().replace(/^["']|["']$/g, '');
if (!apiKey) { console.log('GEMINI_API_KEY absent'); process.exit(2); }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const T0 = Date.now();
const rel = () => Date.now() - T0;
const events = [];
let current = { id: null, clipEndMs: null };
const ev = (kind, data = {}) => {
    const e = { t: rel(), item: current.id, sinceClipEnd: current.clipEndMs == null ? null : rel() - current.clipEndMs, kind, ...data };
    events.push(e);
    if (kind !== 'audio') console.log(`+${(e.t / 1000).toFixed(2)}s [${e.item ?? '-'}${e.sinceClipEnd == null ? '' : ` ${(e.sinceClipEnd / 1000).toFixed(2)}s`}] ${kind} ${JSON.stringify(data).slice(0, 150)}`);
};
const words = (s) => s.trim().split(/\s+/).filter(Boolean).length;
const sessions = [];
const outFile = `${HERE}/runs/l38m-${VARIANT}.json`;
if (fs.existsSync(outFile)) { console.log(`REFUSED: ${outFile} exists`); process.exit(2); }
fs.mkdirSync(`${HERE}/runs`, { recursive: true });
const save = () => fs.writeFileSync(outFile, JSON.stringify({ model: MODEL, variant: VARIANT, t0Iso: new Date(T0).toISOString(), pairs: CHAINS, system: SYSTEM, answerWords: ANSWER_WORDS, sessions, events }, null, 1));
const ai = new GoogleGenAI({ apiKey, apiVersion: 'v1beta' });
const silence = Buffer.alloc(CHUNK).toString('base64');

// One live connection. st is shared with the turn loop; handle = the newest resumption handle.
let handle = null;
async function connect(st, why) {
    const connecting = ai.live.connect({
        model: MODEL,
        config: {
            responseModalities: ['AUDIO'],
            systemInstruction: { parts: [{ text: SYSTEM }] },
            tools: [TOOL],
            inputAudioTranscription: {},
            outputAudioTranscription: {},
            sessionResumption: handle ? { handle } : {},
            contextWindowCompression: { slidingWindow: {} },
        },
        callbacks: {
            onopen: () => ev('open', { why, resumed: !!handle }),
            onmessage: (msg) => {
                const sc = msg.serverContent;
                if (msg.setupComplete) { st.setup = true; ev('setupComplete'); }
                const u = msg.sessionResumptionUpdate;
                if (u?.resumable && u?.newHandle) handle = u.newHandle;
                if (msg.goAway) { ev('goAway', { timeLeft: msg.goAway.timeLeft }); st.goAway = true; }
                for (const fc of msg.toolCall?.functionCalls ?? []) {
                    ev('toolCall', { name: fc.name, question: String(fc.args?.question ?? ''), category: String(fc.args?.category ?? '') });
                    st.lastEventAt = rel(); if (current.clipEndMs != null || current.id) st.tool = true;
                    try { st.session?.sendToolResponse({ functionResponses: [{ id: fc.id, name: fc.name, response: { result: 'ok' } }] }); } catch { /* mid-close */ }
                }
                if (sc?.inputTranscription?.text) ev('inputTx', { text: sc.inputTranscription.text });
                if (sc?.outputTranscription?.text) { ev('outputTx', { text: sc.outputTranscription.text }); st.turnOpen = true; st.turnText += sc.outputTranscription.text; st.lastEventAt = rel(); }
                for (const p of sc?.modelTurn?.parts ?? []) {
                    if (p.thought) ev('thought', { text: String(p.text ?? '').slice(0, 200) });
                    else if (p.text) ev('text', { text: p.text });
                    else if (p.inlineData) ev('audio', { bytes: p.inlineData.data?.length ?? 0 });
                }
                if (sc?.turnComplete || sc?.interrupted) {
                    ev(sc.turnComplete ? 'turnComplete' : 'interrupted');
                    if (st.turnOpen && current.clipEndMs != null) st.lastTurn = { words: words(st.turnText) };
                    st.turnOpen = false; st.turnText = ''; st.lastEventAt = rel();
                }
                if (sc?.generationComplete) ev('generationComplete');
                if (msg.usageMetadata) ev('usage', { prompt: msg.usageMetadata.promptTokenCount, response: msg.usageMetadata.responseTokenCount, total: msg.usageMetadata.totalTokenCount });
            },
            onerror: (e) => ev('error', { message: String(e?.message ?? e) }),
            onclose: (e) => { st.closed = { code: e?.code, reason: String(e?.reason ?? '').slice(0, 120) }; ev('close', st.closed); },
        },
    });
    try { st.session = await Promise.race([connecting, sleep(15000).then(() => { throw new Error('connect did not settle in 15 s'); })]); }
    catch (e) { ev('connectFailed', { message: String(e?.message ?? e).slice(0, 120) }); return false; }
    for (let w = 0; w < 10000 && !st.setup && !st.closed; w += 50) await sleep(50);
    if (!st.setup) { ev('setupTimeout'); try { st.session.close(); } catch { /* noop */ } return false; }
    return true;
}
const newState = () => ({ session: null, closed: null, setup: false, goAway: false, turnOpen: false, turnText: '', lastTurn: null, lastEventAt: 0, tool: false });

// Play one turn on a live state; returns false if the session ended before or during the clip.
async function playTurn(st, id) {
    const pcm = CLIPS[id];
    current = { id, clipEndMs: null };
    st.lastTurn = null; st.tool = false;
    ev('clipStart', { seconds: +(pcm.length / 32000).toFixed(1) });
    for (let off = 0; off < pcm.length; off += CHUNK) {
        if (st.closed) return false;
        st.session.sendRealtimeInput({ audio: { data: pcm.subarray(off, off + CHUNK).toString('base64'), mimeType: 'audio/pcm;rate=16000' } });
        await sleep(60);
    }
    current.clipEndMs = rel();
    ev('clipEnd');
    const waitFrom = rel();
    while (!st.closed) {
        st.session.sendRealtimeInput({ audio: { data: silence, mimeType: 'audio/pcm;rate=16000' } });
        await sleep(60);
        const waited = rel() - waitFrom, quiet = rel() - Math.max(st.lastEventAt, waitFrom);
        if (waited >= CAP_MS) { ev('cap'); break; }
        if (st.turnOpen) continue;
        if (st.lastTurn) { if (quiet >= QUIET_AFTER_TURN_MS) break; continue; }
        if (st.tool) { if (quiet >= QUIET_AFTER_TOOL_MS) break; continue; }
        if (waited >= NO_OUTPUT_MS) { ev('noOutput'); break; }
    }
    ev('itemDone', { waitedMs: rel() - waitFrom, closed: !!st.closed });
    return true;
}

if (VARIANT.startsWith('v1')) {
    const order = CHAINS.flat();
    let st = newState(), n = 0;
    if (!(await connect(st, 'start'))) { console.log('first connect failed'); save(); process.exit(1); }
    sessions.push({ at: rel(), why: 'start' });
    for (let i = 0; i < order.length; i++) {
        if (st.closed || st.goAway) {
            const why = st.goAway ? 'goAway' : `close ${st.closed?.code}`;
            try { st.session?.close(); } catch { /* noop */ }
            await sleep(500);
            st = newState();
            let ok = await connect(st, why);
            if (!ok) { await sleep(2000); handle = null; st = newState(); ok = await connect(st, `${why} (fresh)`); }
            sessions.push({ at: rel(), why, resumed: !!handle, ok });
            if (!ok) { ev('gaveUp', { at: order[i] }); break; }
        }
        const played = await playTurn(st, order[i]);
        if (!played) { ev('turnLost', { id: order[i] }); i--; if (++n > 5) { ev('gaveUp', { at: order[i + 1] }); break; } continue; }
        save();
    }
    try { st.session?.close(); } catch { /* noop */ }
} else {
    for (const chain of CHAINS) {
        for (let attempt = 1; attempt <= 2; attempt++) {
            const startIdx = events.length;
            const st = newState();
            current = { id: null, clipEndMs: null };
            const ok = await connect(st, `chain ${chain[0]} attempt ${attempt}`);
            let all = ok;
            if (ok) for (const id of chain) if (!(await playTurn(st, id))) { all = false; break; }
            try { st.session?.close(); } catch { /* noop */ }
            await sleep(1200);
            const abnormal = !ok || !all || (st.closed && st.closed.code !== 1000 && st.closed.code !== undefined && !all);
            sessions.push({ chain, attempt, ok, all, closed: st.closed });
            if (!abnormal || attempt === 2) break;
            for (const e of events.slice(startIdx)) if (chain.includes(e.item)) e.item = `${e.item}~a1`;
            ev('retryChain', { chain });
        }
        handle = null;
        save();
    }
}
save();
console.log(`wrote ${outFile}`);
