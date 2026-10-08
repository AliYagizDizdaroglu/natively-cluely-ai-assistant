// Spike: does gemini-3.8-live accept (and read) `temperature` in the Live session config? One short clip per call.
//   node spike.mjs 0.4    -> expect setupComplete and an answer
//   node spike.mjs 5      -> out of range: a server that READS the field should refuse (error/close); a silent
//                            success would mean the field may be ignored, and the probe would measure nothing
//   node spike.mjs none   -> no temperature (the L20c setting)
// Prints events and numbers only; the key is read in-process, never printed.
import fs from 'node:fs';
import { createRequire } from 'node:module';
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const { GoogleGenAI } = createRequire(`${MAIN}/package.json`)('@google/genai');
const T = process.argv[2];
const temperature = T === 'none' ? undefined : Number(T);
const apiKey = fs.readFileSync(`${MAIN}/.env`, 'utf8').match(/^GEMINI_API_KEY=(.+)$/m)?.[1].trim().replace(/^["']|["']$/g, '');
if (!apiKey) { console.log('GEMINI_API_KEY absent'); process.exit(2); }
const wav = fs.readFileSync(`${MAIN}/electron/test/golden/scenario50-tts-local/S1Q01.wav`);
const rate = wav.readUInt32LE(24), ch = wav.readUInt16LE(22);
let off = 12, dataOff = -1, dataLen = 0;
while (off < wav.length - 8) { const idc = wav.toString('ascii', off, off + 4); const len = wav.readUInt32LE(off + 4); if (idc === 'data') { dataOff = off + 8; dataLen = len; break; } off += 8 + len; }
const src = new Int16Array(wav.buffer, wav.byteOffset + dataOff, Math.floor(Math.min(dataLen, wav.length - dataOff) / 2));
const f = rate / 16000, out = new Int16Array(Math.floor(src.length / ch / f));
for (let i = 0; i < out.length; i++) out[i] = src[Math.floor(i * f) * ch];
const pcm = Buffer.from(out.buffer);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const t0 = Date.now(); const rel = () => ((Date.now() - t0) / 1000).toFixed(2);
let setup = false, closed = null, words = 0, firstOut = null, clipEnd = null, done = false;
const ai = new GoogleGenAI({ apiKey, apiVersion: 'v1beta' });
let session;
try {
    session = await ai.live.connect({
        model: 'gemini-3.8-live',
        config: { responseModalities: ['AUDIO'], systemInstruction: { parts: [{ text: 'You are a job candidate. Answer the interviewer briefly, in first person.' }] }, outputAudioTranscription: {}, ...(temperature === undefined ? {} : { temperature }) },
        callbacks: {
            onmessage: (m) => {
                if (m.setupComplete) { setup = true; console.log(`+${rel()} setupComplete`); }
                const t = m.serverContent?.outputTranscription?.text;
                if (t) { if (firstOut === null && clipEnd) firstOut = Date.now() - clipEnd; words += t.trim().split(/\s+/).filter(Boolean).length; }
                if (m.serverContent?.turnComplete) { console.log(`+${rel()} turnComplete, words ${words}`); done = true; }
            },
            onerror: (e) => console.log(`+${rel()} error ${String(e?.message ?? e).slice(0, 200)}`),
            onclose: (e) => { closed = { code: e?.code, reason: String(e?.reason ?? '').slice(0, 200) }; console.log(`+${rel()} close ${JSON.stringify(closed)}`); },
        },
    });
} catch (e) { console.log(`connect threw: ${String(e?.message ?? e).slice(0, 300)}`); process.exit(0); }
for (let w = 0; w < 10000 && !setup && !closed; w += 50) await sleep(50);
if (!setup) { console.log(`temperature ${T}: NO SETUP (closed ${JSON.stringify(closed)})`); try { session.close(); } catch {} process.exit(0); }
for (let o = 0; o < pcm.length && !closed; o += 1920) { session.sendRealtimeInput({ audio: { data: pcm.subarray(o, o + 1920).toString('base64'), mimeType: 'audio/pcm;rate=16000' } }); await sleep(60); }
clipEnd = Date.now();
const silence = Buffer.alloc(1920).toString('base64');
for (let w = 0; w < 40000 && !done && !closed; w += 60) { session.sendRealtimeInput({ audio: { data: silence, mimeType: 'audio/pcm;rate=16000' } }); await sleep(60); }
try { session.close(); } catch {}
await sleep(500);
console.log(`temperature ${T}: setup ${setup}, answered ${done}, words ${words}, first output ${firstOut === null ? '-' : firstOut + ' ms'} after clip end, close ${JSON.stringify(closed)}`);
process.exit(0);
