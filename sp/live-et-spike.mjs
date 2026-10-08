// Throwaway FEASIBILITY spike (2026-09-27): can gemini-3.8-live-extended-thinking answer a live interview on
// its own — hear the interviewer, answer when the question ends, in the app's style? Standalone: no Electron
// app, nothing in MAIN changes. scenario50 only (never holdout40).
//   node live-et-spike.mjs [--level low|medium|high] [--modality TEXT|AUDIO] [--items S1Q01,S1Q01F,...] [--gap 20]
// Streams each item's TTS clip in real time (16 kHz, 60 ms chunks), then --gap seconds of silence, and logs
// every server message with its time relative to the clip's end. Writes SP/live-et/<stamp>-<level>.json.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const { GoogleGenAI } = createRequire(`${MAIN}/package.json`)('@google/genai');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const MODEL = arg('--model', 'gemini-3.8-live-extended-thinking');
const LEVEL = arg('--level', 'low');
const MODALITY = arg('--modality', 'TEXT');
const GAP_S = Number(arg('--gap', '20'));
const ITEMS = arg('--items', 'S1Q01,S1Q01F,S1Q02,S1Q02F,S1Q03,S1Q03F,S1Q04,S1Q04F,S1Q05,S1Q05F').split(',');

const env = fs.readFileSync(`${MAIN}/.env`, 'utf8');
const apiKey = env.match(/^GEMINI_API_KEY=(.+)$/m)?.[1].trim().replace(/^["']|["']$/g, '');
if (!apiKey) { console.log('GEMINI_API_KEY absent'); process.exit(2); }

// The app's own system prompt and candidate context, as captured on the s50m hour.
const P = JSON.parse(fs.readFileSync(`${MAIN}/electron/test/golden/interview60.runs/2026-09-22T08-22-50-s50m/interview60.prompts.json`, 'utf8'));
const system = P.S1Q02.system;
const u = P.S1Q02.user;
const context = u.slice(u.indexOf('CONTEXT:'), u.indexOf('USER QUESTION:')).trim();
const LIVE_MODE = `[LIVE MODE]
You are listening to a live job interview through the interviewer's microphone. The speaker is the INTERVIEWER; the candidate is described in the context below.
When the interviewer finishes a question, reply with exactly what the candidate should say next, following every rule above (spoken, first person, the answer's structure and length rules).
Output ONLY the answer itself: no greeting, no acknowledgement, no "let me think", no narration of your reasoning.
Wait until the interviewer has finished the whole question before answering. If what you heard is not a question for the candidate, output nothing.
[END LIVE MODE]`;
const systemText = `${system}\n\n${context}\n\n${LIVE_MODE}`;

function clipPcm16k(id) {
    const wav = fs.readFileSync(`${MAIN}/electron/test/golden/scenario50-tts-local/${id}.wav`);
    const rate = wav.readUInt32LE(24), ch = wav.readUInt16LE(22), bits = wav.readUInt16LE(34);
    if (bits !== 16) throw new Error(`${id}: ${bits}-bit`);
    let off = 12; let dataOff = -1, dataLen = 0;
    while (off < wav.length - 8) { const idc = wav.toString('ascii', off, off + 4); const len = wav.readUInt32LE(off + 4); if (idc === 'data') { dataOff = off + 8; dataLen = len; break; } off += 8 + len; }
    const src = new Int16Array(wav.buffer, wav.byteOffset + dataOff, Math.floor(Math.min(dataLen, wav.length - dataOff) / 2));
    const frames = Math.floor(src.length / ch);
    const f = rate / 16000;
    const out = new Int16Array(Math.floor(frames / f));
    for (let i = 0; i < out.length; i++) out[i] = src[Math.floor(i * f) * ch];
    return Buffer.from(out.buffer, out.byteOffset, out.byteLength);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const T0 = Date.now();
const events = [];
let current = { id: null, clipEndMs: null };
const rel = () => Date.now() - T0;
const ev = (kind, data = {}) => { const e = { t: rel(), item: current.id, sinceClipEnd: current.clipEndMs == null ? null : rel() - current.clipEndMs, kind, ...data }; events.push(e); if (!['audio'].includes(kind)) console.log(`+${(e.t / 1000).toFixed(2)}s [${e.item ?? '-'}${e.sinceClipEnd == null ? '' : ` ${(e.sinceClipEnd / 1000).toFixed(2)}s after end`}] ${kind} ${JSON.stringify(data).slice(0, 160)}`); };

const config = {
    responseModalities: [MODALITY],
    systemInstruction: { parts: [{ text: systemText }] },
    thinkingConfig: { thinkingLevel: LEVEL },
    inputAudioTranscription: {},
    ...(MODALITY === 'AUDIO' ? { outputAudioTranscription: {} } : {}),
    contextWindowCompression: { slidingWindow: {} },
};
let closed = null;
const session = await new GoogleGenAI({ apiKey, apiVersion: 'v1beta' }).live.connect({
    model: MODEL, config,
    callbacks: {
        onopen: () => ev('open'),
        onmessage: (msg) => {
            const sc = msg.serverContent;
            if (msg.setupComplete) ev('setupComplete');
            if (sc?.inputTranscription?.text) ev('inputTx', { text: sc.inputTranscription.text });
            if (sc?.outputTranscription?.text) ev('outputTx', { text: sc.outputTranscription.text });
            for (const p of sc?.modelTurn?.parts ?? []) {
                if (p.thought) ev('thought', { text: String(p.text ?? '').slice(0, 200) });
                else if (p.text) ev('text', { text: p.text });
                else if (p.inlineData) ev('audio', { bytes: p.inlineData.data?.length ?? 0 });
            }
            if (sc?.turnComplete) ev('turnComplete');
            if (sc?.generationComplete) ev('generationComplete');
            if (sc?.interrupted) ev('interrupted');
            if (msg.usageMetadata) ev('usage', { prompt: msg.usageMetadata.promptTokenCount, response: msg.usageMetadata.responseTokenCount, thoughts: msg.usageMetadata.thoughtsTokenCount, total: msg.usageMetadata.totalTokenCount });
            if (msg.goAway) ev('goAway', msg.goAway);
            if (msg.toolCall) ev('toolCall');
        },
        onerror: (e) => ev('error', { message: String(e?.message ?? e) }),
        onclose: (e) => { closed = { code: e?.code, reason: e?.reason }; ev('close', closed); },
    },
});
const silence = Buffer.alloc(1920);
for (const id of ITEMS) {
    if (closed) break;
    const pcm = clipPcm16k(id);
    current = { id, clipEndMs: null };
    ev('clipStart', { seconds: +(pcm.length / 32000).toFixed(1) });
    for (let off = 0; off < pcm.length && !closed; off += 1920) { session.sendRealtimeInput({ audio: { data: pcm.subarray(off, off + 1920).toString('base64'), mimeType: 'audio/pcm;rate=16000' } }); await sleep(60); }
    current.clipEndMs = rel();
    ev('clipEnd');
    for (let s = 0; s < GAP_S * 1000 && !closed; s += 60) { session.sendRealtimeInput({ audio: { data: silence.toString('base64'), mimeType: 'audio/pcm;rate=16000' } }); await sleep(60); }
}
try { session.close(); } catch { /* noop */ }
await sleep(500);
fs.mkdirSync(`${SP}/live-et`, { recursive: true });
const outFile = `${SP}/live-et/${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}-${MODEL}-${LEVEL}-${MODALITY}.json`;
fs.writeFileSync(outFile, JSON.stringify({ model: MODEL, level: LEVEL, modality: MODALITY, gapS: GAP_S, items: ITEMS, closed, events }, null, 1));
console.log(`wrote ${outFile}`);
