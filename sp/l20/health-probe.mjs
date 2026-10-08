// Throwaway health probe: is gemini-3.8-live answering again? One fresh session per id, sequential, the L20
// config and wait rule (run.mjs) unchanged. Per session: setup time, first/last transcript word after the clip
// ends, words, close code. Writes health/<utc-iso>.json. The key is read in-process, never printed.
//   node health-probe.mjs [--ids S1Q02,S2Q08,...] [--compression on|off|ab]
// ab: each id runs once with contextWindowCompression and once without, back to back, order alternating per id.
import fs from 'node:fs';
import { createRequire } from 'node:module';

const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const HERE = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/l20';
const { GoogleGenAI } = createRequire(`${MAIN}/package.json`)('@google/genai');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
// S1Q02 known good; S2Q08 failed 6/6 in L20; S2Q01 flaky; S1Q06 normal; S1Q04 hard.
const IDS = arg('--ids', 'S1Q02,S2Q08,S2Q01,S1Q06,S1Q04').split(',');
const MODEL = 'gemini-3.8-live';
const COMP = arg('--compression', 'on');
if (!['on', 'off', 'ab'].includes(COMP)) { console.log('--compression on|off|ab'); process.exit(2); }
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
const CLIPS = Object.fromEntries(IDS.map((id) => [id, clipPcm16k(id)]));
const SYSTEMS = Object.fromEntries(IDS.map((id) => [id, systemFor(id.replace(/F$/, ''))]));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const T0 = Date.now(), T0_ISO = new Date(T0).toISOString();
const rel = () => Date.now() - T0;
const words = (s) => s.trim().split(/\s+/).filter(Boolean).length;
const ai = new GoogleGenAI({ apiKey, apiVersion: 'v1beta' });
const silence = Buffer.alloc(CHUNK).toString('base64');

async function probe(id, comp) {
    const st = { closed: null, setup: false, turnOpen: false, turnText: '', lastTurn: null, lastEventAt: 0 };
    const r = { id, comp, openedAt: rel(), setupMs: null, clipSeconds: +(CLIPS[id].length / 32000).toFixed(1), clipEndMs: null, heard: '', outputBeforeEnd: false, firstWordMs: null, lastWordMs: null, text: '', closed: null, abnormal: false, generationComplete: false };
    const log = (m) => console.log(`+${(rel() / 1000).toFixed(2)}s [${id} comp=${comp}] ${m}`);
    const session = await ai.live.connect({
        model: MODEL,
        config: {
            responseModalities: ['AUDIO'],
            systemInstruction: { parts: [{ text: SYSTEMS[id] }] },
            inputAudioTranscription: {},
            outputAudioTranscription: {},
            ...(comp === 'on' ? { contextWindowCompression: { slidingWindow: {} } } : {}),
        },
        callbacks: {
            onmessage: (msg) => {
                const sc = msg.serverContent;
                if (msg.setupComplete) { st.setup = true; r.setupMs = rel() - r.openedAt; log(`setupComplete ${r.setupMs} ms`); }
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
                if (sc?.generationComplete && r.clipEndMs != null) r.generationComplete = true;
            },
            onerror: (e) => log(`error ${String(e?.message ?? e)}`),
            onclose: (e) => { st.closed = { code: e?.code, reason: e?.reason }; log(`close ${JSON.stringify(st.closed)}`); },
        },
    });
    for (let w = 0; w < 10000 && !st.setup && !st.closed; w += 50) await sleep(50);
    if (!st.setup) { log('no setupComplete in 10 s'); try { session.close(); } catch { /* noop */ } r.closed = st.closed ?? 'no setupComplete in 10 s'; r.abnormal = true; return r; }
    const pcm = CLIPS[id];
    for (let off = 0; off < pcm.length && !st.closed; off += CHUNK) {
        session.sendRealtimeInput({ audio: { data: pcm.subarray(off, off + CHUNK).toString('base64'), mimeType: 'audio/pcm;rate=16000' } });
        await sleep(60);
    }
    if (!st.closed) {
        r.clipEndMs = rel(); log(`clip end (${r.clipSeconds} s)`);
        const waitFrom = rel();
        while (!st.closed) {
            session.sendRealtimeInput({ audio: { data: silence, mimeType: 'audio/pcm;rate=16000' } });
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
    const order = COMP === 'ab' ? (i % 2 === 0 ? ['on', 'off'] : ['off', 'on']) : [COMP];
    for (const c of order) results.push(await probe(id, c));
}
fs.mkdirSync(`${HERE}/health`, { recursive: true });
const out = `${HERE}/health/${T0_ISO.replace(/[:.]/g, '-')}.json`;
fs.writeFileSync(out, JSON.stringify({ model: MODEL, compression: COMP, t0Iso: T0_ISO, results }, null, 1));
const s = (ms) => (ms == null ? '-' : `${(ms / 1000).toFixed(1)} s`);
console.log(`\nid      comp  setup   first word  last word  words  premature  close`);
for (const r of results) console.log(`${r.id.padEnd(7)} ${r.comp.padEnd(4)}  ${String(r.setupMs ?? '-').padStart(5)}   ${s(r.firstWordMs).padStart(8)}  ${s(r.lastWordMs).padStart(8)}  ${String(words(r.text)).padStart(5)}  ${String(r.outputBeforeEnd).padEnd(9)}  ${typeof r.closed === 'string' ? r.closed : `${r.closed?.code ?? '-'} ${r.closed?.reason ?? ''}`}`);
const ok = (r) => r.firstWordMs != null && words(r.text) >= ANSWER_WORDS && !/system error/i.test(r.text);
for (const c of ['on', 'off']) { const rs = results.filter((r) => r.comp === c); if (rs.length) console.log(`compression ${c}: answered ${rs.filter(ok).length}/${rs.length}; abnormal closes ${rs.filter((r) => r.abnormal).length}`); }
console.log(`answered ${results.filter((r) => r.firstWordMs != null && words(r.text) >= ANSWER_WORDS && !/system error/i.test(r.text)).length}/${results.length}; abnormal closes ${results.filter((r) => r.abnormal).length}; wrote ${out}`);
