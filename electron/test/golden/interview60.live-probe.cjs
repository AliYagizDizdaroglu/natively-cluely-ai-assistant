/**
 * Live-ear probe: does the Live model still call handle_question for the
 * harness's 34 s probe clip, with the app's exact session config (AUDIO
 * modality, the listener prompt, the tool, input transcription, resumption,
 * context compression)? gemini-3.1-flash-live-preview has been observed to
 * exhaust a daily allowance SILENTLY — it connects and transcribes but never
 * generates — which the app's own preflight only discovers after a build and
 * a launch. One minute, one session, a yes/no before anything is spent.
 *
 *   node --env-file=.env electron/test/golden/interview60.live-probe.cjs
 *   NATIVELY_LIVE_MODEL=<id> overrides the model, exactly as it does in the app.
 *
 * Exit 0: a tool call was seen. Exit 3: connected but silent. Exit 1: could
 * not connect (FATAL line says why). Exit 2: no Gemini key in the env.
 * interview60.flight.mjs turns 0/3 into the model for the hour.
 */
const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');

const keyName = ['GEMINI_API_KEY', 'GOOGLE_API_KEY', 'VITE_GEMINI_API_KEY'].find((n) => process.env[n]);
if (!keyName) { console.error('no Gemini key in env'); process.exit(2); }
const apiKey = process.env[keyName];
const variant = process.argv[2] || 'app';
const model = process.env.NATIVELY_LIVE_MODEL || 'gemini-3.1-flash-live-preview';

const PROMPT = `You are a silent meeting listener embedded in an interview-assistant app. You NEVER speak or answer out loud.
Your ONLY job: when the interviewer asks the candidate a question (or gives a task), call handle_question with:
- question: the question, cleaned up, as one clear sentence
- category: "coding_heavy" if answering well requires writing code, implementing an algorithm/data structure, complexity analysis, or detailed system design; otherwise "behavioral" for experience/situational/personal questions; otherwise "verbal_technical" for conceptual technical questions answerable in speech.
Never produce audio. Never answer the question yourself. If speech is not a question for the candidate, do nothing.`;
const TOOL = { functionDeclarations: [{ name: 'handle_question', description: 'Report a question the interviewer just asked, with routing category.', parameters: { type: 'OBJECT', properties: { question: { type: 'STRING' }, category: { type: 'STRING', enum: ['behavioral', 'verbal_technical', 'coding_heavy'] } }, required: ['question', 'category'] } }] };

// probe-continuous.wav: 24 kHz mono s16 → 16 kHz by integer-ish decimation (same idea as the router).
const wav = fs.readFileSync(require('path').join(__dirname, 'probe-continuous.wav'));
const src = new Int16Array(wav.buffer, wav.byteOffset + 44, Math.floor((wav.length - 44) / 2));
const factor = 24000 / 16000;
const out = new Int16Array(Math.floor(src.length / factor));
for (let i = 0; i < out.length; i++) out[i] = src[Math.floor(i * factor)];
const pcm16 = Buffer.from(out.buffer, out.byteOffset, out.byteLength);

const t0 = Date.now();
const log = (m) => console.log(`+${((Date.now() - t0) / 1000).toFixed(2)}s ${m}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const summary = (parts) => parts.map((p) => p.text ? `text(${String(p.text).slice(0, 60)})` : p.inlineData ? `audio(${p.inlineData.data?.length ?? 0}b64)` : p.functionCall ? 'functionCall' : Object.keys(p).join('+')).join(',');

(async () => {
  const config = {
    responseModalities: [variant === 'text' ? 'TEXT' : 'AUDIO'],
    systemInstruction: { parts: [{ text: variant === 'chat' ? 'You are a helpful voice assistant. Answer each question in one short sentence.' : PROMPT }] },
    tools: variant === 'chat' ? [] : [TOOL],
    sessionResumption: {},
    contextWindowCompression: { slidingWindow: {} },
  };
  if (variant !== 'notx') config.inputAudioTranscription = {};
  if (variant === 'bare') { delete config.sessionResumption; delete config.contextWindowCompression; }
  log(`variant=${variant} model=${model} key=${keyName}`);
  let session;
  let audioMsgs = 0, toolCalls = 0;
  session = await new GoogleGenAI({ apiKey, apiVersion: 'v1beta' }).live.connect({
    model, config,
    callbacks: {
      onopen: () => log('open'),
      onmessage: (msg) => {
        if (msg.setupComplete) log('setupComplete');
        if (msg.toolCall) {
          toolCalls++; log('TOOLCALL ' + JSON.stringify((msg.toolCall.functionCalls ?? []).map((f) => [f.name, f.args])));
          try { session.sendToolResponse({ functionResponses: (msg.toolCall.functionCalls ?? []).map((f) => ({ id: f.id, name: f.name, response: { result: 'ok' } })) }); } catch (e) { log('toolResponse failed ' + e.message); }
        }
        const sc = msg.serverContent;
        if (sc) {
          if (sc.inputTranscription?.text) log('inputTx ' + JSON.stringify(sc.inputTranscription.text));
          if (sc.outputTranscription?.text) log('outputTx ' + JSON.stringify(sc.outputTranscription.text));
          if (sc.modelTurn?.parts?.length) {
            const s = summary(sc.modelTurn.parts);
            if (s.startsWith('audio(')) { if (++audioMsgs <= 3) log('modelTurn ' + s); } else log('modelTurn ' + s);
          }
          if (sc.turnComplete) log(`turnComplete (audio msgs so far ${audioMsgs})`);
          if (sc.interrupted) log('interrupted');
          if (sc.generationComplete) log('generationComplete');
        }
        if (msg.usageMetadata) log(`usage total=${msg.usageMetadata.totalTokenCount}`);
        if (msg.goAway) log('goAway ' + JSON.stringify(msg.goAway));
        if (msg.sessionResumptionUpdate) log(`resumptionUpdate resumable=${!!msg.sessionResumptionUpdate.resumable}`);
        const known = ['setupComplete', 'toolCall', 'serverContent', 'usageMetadata', 'goAway', 'sessionResumptionUpdate', 'toolCallCancellation'];
        const other = Object.keys(msg).filter((k) => !known.includes(k));
        if (other.length) log('other keys ' + other.join(','));
      },
      onerror: (e) => log('error ' + (e?.message ?? e)),
      onclose: (e) => log(`close code=${e?.code} reason=${JSON.stringify(e?.reason ?? '')}`),
    },
  });
  log(`streaming ${(pcm16.length / 32000).toFixed(1)} s of 16 kHz audio in 60 ms chunks`);
  for (let off = 0; off < pcm16.length; off += 1920) {
    session.sendRealtimeInput({ audio: { data: pcm16.subarray(off, off + 1920).toString('base64'), mimeType: 'audio/pcm;rate=16000' } });
    await sleep(60);
  }
  log('audio done; waiting 15 s for the model');
  await sleep(15000);
  try { session.close(); } catch { /* noop */ }
  log(`LIVE-PROBE ${model}: ${toolCalls ? 'TOOLCALL seen — the Live ear generates' : 'SILENT — connected and transcribed but never called the tool'}`);
  process.exit(toolCalls ? 0 : 3);
})().catch((e) => { log('FATAL ' + (e?.message ?? e)); process.exit(1); });
