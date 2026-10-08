// Throwaway: is OUR audio conversion what breaks gemini-3.8-live on some questions? The clips are 24 kHz mono
// s16le; L20 decimated them to 16 kHz by picking samples (no low-pass filter). Arms, fresh session each, back to
// back, order alternating per id: "d16" = the L20 audio exactly; "n24" = the WAV samples untouched, sent with
// mimeType audio/pcm;rate=24000 in 60 ms chunks. Both arms use the L20 system instruction and config. Records
// what Live heard, what it said, the close, the last usageMetadata. Key read in-process, never printed.
//   node audio-ab.mjs [--ids S2Q08,S1Q04,S1Q02]
import fs from 'node:fs';
import { createRequire } from 'node:module';

const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const HERE = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/l20';
const { GoogleGenAI } = createRequire(`${MAIN}/package.json`)('@google/genai');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const IDS = arg('--ids', 'S2Q08,S1Q04,S1Q02').split(',');
const MODEL = 'gemini-3.8-live';
const ANSWER_WORDS = 25, QUIET_AFTER_ANSWER_MS = 6000, QUIET_AFTER_SHORT_MS = 30000, NO_OUTPUT_MS = 60000, CAP_MS = 150000;

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
function fullFor(main) {
    const p = P[main];
    if (!p?.system || !p?.user) throw new Error(`${main}: no captured s50k prompt`);
    const a = p.user.indexOf('CONTEXT:'), b = p.user.indexOf('USER QUESTION:');
    if (a < 0 || b < a) throw new Error(`${main}: CONTEXT / USER QUESTION markers not found in the captured prompt`);
    return `${p.system}\n\n${p.user.slice(a, b).trim()}\n\n${LIVE_MODE}`;
}
// Returns { d16, n24 }: the L20 decimation and the untouched 24 kHz samples. Refuses anything but 24 kHz mono s16le.
function clips(id) {
    const wav = fs.readFileSync(`${MAIN}/electron/test/golden/scenario50-tts-local/${id}.wav`);
    const rate = wav.readUInt32LE(24), ch = wav.readUInt16LE(22), bits = wav.readUInt16LE(34);
    if (rate !== 24000 || ch !== 1 || bits !== 16) throw new Error(`${id}: expected 24000 Hz mono 16-bit, got ${rate} Hz ${ch} ch ${bits}-bit`);
    let off = 12, dataOff = -1, dataLen = 0;
    while (off < wav.length - 8) { const idc = wav.toString('ascii', off, off + 4); const len = wav.readUInt32LE(off + 4); if (idc === 'data') { dataOff = off + 8; dataLen = len; break; } off += 8 + len; }
    if (dataOff < 0) throw new Error(`${id}: no data chunk`);
    const src = new Int16Array(wav.buffer, wav.byteOffset + dataOff, Math.floor(Math.min(dataLen, wav.length - dataOff) / 2));
    const f = rate / 16000;
    const d = new Int16Array(Math.floor(src.length / f));
    for (let i = 0; i < d.length; i++) d[i] = src[Math.floor(i * f)];
    return { d16: Buffer.from(d.buffer, d.byteOffset, d.byteLength), n24: Buffer.from(src.buffer, src.byteOffset, src.byteLength) };
}
const CLIPS = Object.fromEntries(IDS.map((id) => [id, clips(id)]));
const FULL = Object.fromEntries(IDS.map((id) => [id, fullFor(id.replace(/F$/, ''))]));
// 60 ms per chunk at each rate: 16 kHz -> 1920 bytes, 24 kHz -> 2880 bytes.
const FMT = { d16: { chunk: 1920, mime: 'audio/pcm;rate=16000' }, n24: { chunk: 2880, mime: 'audio/pcm;rate=24000' } };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const T0 = Date.now(), T0_ISO = new Date(T0).toISOString();
const rel = () => Date.now() - T0;
const words = (s) => s.trim().split(/\s+/).filter(Boolean).length;
const ai = new GoogleGenAI({ apiKey, apiVersion: 'v1beta' });

async function probe(id, arm) {
    const { chunk, mime } = FMT[arm];
    const pcm = CLIPS[id][arm];
    const silence = Buffer.alloc(chunk).toString('base64');
    const st = { closed: null, setup: false, turnOpen: false, turnText: '', lastTurn: null, lastEventAt: 0 };
    const r = { id, arm, openedAt: rel(), setupMs: null, clipSeconds: +(pcm.length / (chunk / 0.06)).toFixed(1), clipEndMs: null, heard: '', outputBeforeEnd: false, firstWordMs: null, lastWordMs: null, text: '', closed: null, abnormal: false, usage: [] };
    const log = (m) => console.log(`+${(rel() / 1000).toFixed(2)}s [${id} ${arm}] ${m}`);
    const session = await ai.live.connect({
        model: MODEL,
        config: {
            responseModalities: ['AUDIO'],
            systemInstruction: { parts: [{ text: FULL[id] }] },
            inputAudioTranscription: {},
            outputAudioTranscription: {},
            contextWindowCompression: { slidingWindow: {} },
        },
        callbacks: {
            onmessage: (msg) => {
                const sc = msg.serverContent;
                if (msg.setupComplete) { st.setup = true; r.setupMs = rel() - r.openedAt; }
                if (sc?.inputTranscription?.text) r.heard += sc.inputTranscription.text;
                if (sc?.outputTranscription?.text) {
                    if (r.clipEndMs == null) r.outputBeforeEnd = true;
                    else { r.firstWordMs ??= rel() - r.clipEndMs; r.lastWordMs = rel() - r.clipEndMs; }
                    if (r.firstWordMs != null && r.text === '') log(`first word ${r.firstWordMs} ms after clip end`);
                    r.text += sc.outputTranscription.text; st.turnOpen = true; st.turnText += sc.outputTranscription.text; st.lastEventAt = rel();
                }
                if (sc?.turnComplete || sc?.interrupted) {
                    if (st.turnOpen && r.clipEndMs != null) st.lastTurn = { words: words(st.turnText), error: /system error/i.test(st.turnText) };
                    st.turnOpen = false; st.turnText = ''; st.lastEventAt = rel();
                }
                if (msg.usageMetadata) r.usage.push(msg.usageMetadata);
            },
            onerror: (e) => log(`error ${String(e?.message ?? e)}`),
            onclose: (e) => { st.closed = { code: e?.code, reason: e?.reason }; log(`close ${JSON.stringify(st.closed)}`); },
        },
    });
    for (let w = 0; w < 10000 && !st.setup && !st.closed; w += 50) await sleep(50);
    if (!st.setup) { log('no setupComplete in 10 s'); try { session.close(); } catch { /* noop */ } r.closed = st.closed ?? 'no setupComplete in 10 s'; r.abnormal = true; return r; }
    for (let off = 0; off < pcm.length && !st.closed; off += chunk) {
        session.sendRealtimeInput({ audio: { data: pcm.subarray(off, off + chunk).toString('base64'), mimeType: mime } });
        await sleep(60);
    }
    if (!st.closed) {
        r.clipEndMs = rel();
        const waitFrom = rel();
        while (!st.closed) {
            session.sendRealtimeInput({ audio: { data: silence, mimeType: mime } });
            await sleep(60);
            const waited = rel() - waitFrom, quiet = rel() - Math.max(st.lastEventAt, waitFrom);
            if (waited >= CAP_MS) { log('cap'); break; }
            if (st.turnOpen) continue;
            if (!st.lastTurn) { if (waited >= NO_OUTPUT_MS) { log('no output in 60 s'); break; } continue; }
            const answerLike = st.lastTurn.words >= ANSWER_WORDS || st.lastTurn.error;
            if (quiet >= (answerLike ? QUIET_AFTER_ANSWER_MS : QUIET_AFTER_SHORT_MS)) break;
        }
    }
    try { session.close(); } catch { /* noop */ }
    await sleep(1500);
    r.closed = st.closed; r.abnormal = !!(st.closed && st.closed.code !== 1000) || r.clipEndMs == null;
    return r;
}

const results = [];
for (const [i, id] of IDS.entries()) {
    for (const arm of i % 2 === 0 ? ['n24', 'd16'] : ['d16', 'n24']) results.push(await probe(id, arm));
}
fs.mkdirSync(`${HERE}/health`, { recursive: true });
const out = `${HERE}/health/audio-ab-${T0_ISO.replace(/[:.]/g, '-')}.json`;
fs.writeFileSync(out, JSON.stringify({ model: MODEL, t0Iso: T0_ISO, results }, null, 1));
const s = (ms) => (ms == null ? '-' : `${(ms / 1000).toFixed(1)} s`);
const ok = (r) => r.firstWordMs != null && words(r.text) >= ANSWER_WORDS && !/system error/i.test(r.text);
console.log(`\nid      arm   first word  words  thoughts  close`);
for (const r of results) {
    const u = r.usage.at(-1);
    console.log(`${r.id.padEnd(7)} ${r.arm.padEnd(4)}  ${s(r.firstWordMs).padStart(9)}  ${String(words(r.text)).padStart(5)}  ${String(u?.thoughtsTokenCount ?? '-').padStart(8)}  ${typeof r.closed === 'string' ? r.closed : `${r.closed?.code ?? '-'} ${r.closed?.reason ?? ''}`}`);
    console.log(`        heard: ${r.heard.trim().slice(0, 160)}`);
}
for (const arm of ['n24', 'd16']) { const rs = results.filter((r) => r.arm === arm); console.log(`${arm}: answered ${rs.filter(ok).length}/${rs.length}; abnormal closes ${rs.filter((r) => r.abnormal).length}`); }
console.log(`wrote ${out}`);
