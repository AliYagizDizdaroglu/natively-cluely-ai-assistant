// Throwaway probe: can gemini-3.8-live answer as TEXT, and from a TYPED question (our STT text) instead of audio?
//   node modality-probe.mjs --out TEXT|AUDIO --in audio|text
// One session, one question (S1Q02F, 10.6 s clip, or its scripted text), 40 s wait. Prints setup, first output,
// the text received and the close reason. The key is read in-process, never printed.
import fs from 'node:fs';
import { createRequire } from 'node:module';
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const { GoogleGenAI } = createRequire(`${MAIN}/package.json`)('@google/genai');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const OUT = arg('--out', 'TEXT'), IN = arg('--in', 'audio');
const env = fs.readFileSync(`${MAIN}/.env`, 'utf8');
const apiKey = env.match(/^GEMINI_API_KEY=(.+)$/m)?.[1].trim().replace(/^["']|["']$/g, '');
const P = JSON.parse(fs.readFileSync(`${MAIN}/electron/test/golden/interview60.runs/2026-09-20T11-22-43-s50k/interview60.prompts.json`, 'utf8'));
const u = P.S1Q02.user;
const system = `${P.S1Q02.system}\n\n${u.slice(u.indexOf('CONTEXT:'), u.indexOf('USER QUESTION:')).trim()}\n\n[LIVE MODE]\nYou are listening to a live job interview through the interviewer's microphone. The speaker is the INTERVIEWER; the candidate is described in the context below.\nWhen the interviewer finishes a question, reply with exactly what the candidate should say next, following every rule above (spoken, first person, the answer's structure and length rules).\nOutput ONLY the answer itself: no greeting, no acknowledgement, no "let me think", no narration of your reasoning.\nWait until the interviewer has finished the whole question before answering. If what you heard is not a question for the candidate, output nothing.\n[END LIVE MODE]`;
const QUESTION = 'What can you conclude from a PR-AUC of 0.38 and an ROC-AUC of 0.88, and what else would you need before deciding the model is useful?';
function clipPcm16k(id) {
    const wav = fs.readFileSync(`${MAIN}/electron/test/golden/scenario50-tts-local/${id}.wav`);
    const rate = wav.readUInt32LE(24), ch = wav.readUInt16LE(22);
    let off = 12, dataOff = -1, dataLen = 0;
    while (off < wav.length - 8) { const idc = wav.toString('ascii', off, off + 4); const len = wav.readUInt32LE(off + 4); if (idc === 'data') { dataOff = off + 8; dataLen = len; break; } off += 8 + len; }
    const src = new Int16Array(wav.buffer, wav.byteOffset + dataOff, Math.floor(Math.min(dataLen, wav.length - dataOff) / 2));
    const frames = Math.floor(src.length / ch), f = rate / 16000;
    const out = new Int16Array(Math.floor(frames / f));
    for (let i = 0; i < out.length; i++) out[i] = src[Math.floor(i * f) * ch];
    return Buffer.from(out.buffer, out.byteOffset, out.byteLength);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const T0 = Date.now(); const rel = () => ((Date.now() - T0) / 1000).toFixed(2);
let setup = false, closed = null, text = '', tx = '', firstAt = null, sentAt = null, done = false;
const session = await new GoogleGenAI({ apiKey, apiVersion: 'v1beta' }).live.connect({
    model: 'gemini-3.8-live',
    config: { responseModalities: [OUT], systemInstruction: { parts: [{ text: system }] }, inputAudioTranscription: {}, ...(OUT === 'AUDIO' ? { outputAudioTranscription: {} } : {}) },
    callbacks: {
        onmessage: (m) => {
            const sc = m.serverContent;
            if (m.setupComplete) { setup = true; console.log(`+${rel()}s setupComplete`); }
            for (const p of sc?.modelTurn?.parts ?? []) if (p.text) { firstAt ??= Date.now(); text += p.text; }
            if (sc?.outputTranscription?.text) { firstAt ??= Date.now(); tx += sc.outputTranscription.text; }
            if (sc?.turnComplete) { done = true; console.log(`+${rel()}s turnComplete`); }
        },
        onerror: (e) => console.log(`+${rel()}s error ${e?.message ?? e}`),
        onclose: (e) => { closed = { code: e?.code, reason: e?.reason }; console.log(`+${rel()}s close ${JSON.stringify(closed)}`); },
    },
});
for (let w = 0; w < 10000 && !setup && !closed; w += 50) await sleep(50);
if (!setup) { console.log(`no setup: ${JSON.stringify(closed)}`); process.exit(1); }
if (IN === 'audio') {
    const pcm = clipPcm16k('S1Q02F');
    for (let off = 0; off < pcm.length && !closed; off += 1920) { session.sendRealtimeInput({ audio: { data: pcm.subarray(off, off + 1920).toString('base64'), mimeType: 'audio/pcm;rate=16000' } }); await sleep(60); }
    sentAt = Date.now(); console.log(`+${rel()}s audio question sent (clip end)`);
    const silence = Buffer.alloc(1920).toString('base64');
    for (let t = 0; t < 40000 && !closed && !(done && Date.now() - sentAt > 3000); t += 60) { session.sendRealtimeInput({ audio: { data: silence, mimeType: 'audio/pcm;rate=16000' } }); await sleep(60); }
} else if (IN === 'rttext') {
    // the Live API's other text path: text inside the realtime input stream, no explicit turn boundary
    session.sendRealtimeInput({ text: QUESTION });
    sentAt = Date.now(); console.log(`+${rel()}s realtime text question sent`);
    for (let t = 0; t < 40000 && !closed && !done; t += 100) await sleep(100);
} else {
    session.sendClientContent({ turns: [{ role: 'user', parts: [{ text: `[interviewer, transcribed] ${QUESTION}` }] }], turnComplete: true });
    sentAt = Date.now(); console.log(`+${rel()}s text question sent`);
    for (let t = 0; t < 40000 && !closed && !done; t += 100) await sleep(100);
}
console.log(`first output ${firstAt ? ((firstAt - sentAt) / 1000).toFixed(2) + ' s after the question' : 'NONE'}; words text=${text.trim().split(/\s+/).filter(Boolean).length} transcript=${tx.trim().split(/\s+/).filter(Boolean).length}`);
console.log(`TEXT: ${text.trim().slice(0, 500)}\nTRANSCRIPT: ${tx.trim().slice(0, 500)}`);
try { session.close(); } catch { /* noop */ }
await sleep(300);
