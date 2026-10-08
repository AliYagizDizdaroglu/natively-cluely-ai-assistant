// Throwaway (2026-09-29): the Deepgram-seam probe for the boundary repair. Streams the cached clips of
// questions whose Deepgram finals lost one word in earlier (non-holdout) flights, in real time, to
// Deepgram with the app's exact live options (DeepgramStreamingSTT.connect), and records every event.
// Deepgram's events do not depend on our code, so one recording serves as "before"; the built repair is
// applied to the same events afterwards (seam-apply.mjs). Reads DEEPGRAM_API_KEY from the environment,
// never prints it — run through the wrapper that loads MAIN's .env:
//   node ../run-with-main-env.mjs seam-probe.mjs [plays=5]
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { INTERVIEW } from 'file:///C:/Users/sotka/OneDrive/Masa%C3%BCst%C3%BC/natively-cluely-ai-assistant/electron/test/golden/interview60.questions.mjs';
import { SCENARIO50 } from 'file:///C:/Users/sotka/OneDrive/Masa%C3%BCst%C3%BC/natively-cluely-ai-assistant/electron/test/golden/scenario50.questions.mjs';

const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const G = `${MAIN}/electron/test/golden`;
const require = createRequire(`${MAIN}/package.json`);
const { createClient, LiveTranscriptionEvents } = require('@deepgram/sdk');
const { keytermsFor } = require(`${MAIN}/dist-electron/electron/audio/deepgramKeyterms.js`);

const DRY = process.argv.includes('--dry-run');
const PLAYS = Number(process.argv.slice(2).find((a) => /^\d+$/.test(a)) ?? 5);
// --clips A,B,C picks cached clips by id (scenario50 first, then interview60); default = the first run's four.
const ci = process.argv.indexOf('--clips');
const IDS = ci > 0 ? process.argv[ci + 1].split(',') : ['S1Q01F', 'S1Q10', 'S2Q07', 'M13'];
const CLIPS = IDS.map((id) => {
    const wav = [`${G}/scenario50-tts-local/${id}.wav`, `${G}/interview60-tts-local/${id}.wav`].find((f) => fs.existsSync(f));
    if (!wav) { console.log(`REFUSED: no cached clip for ${id}`); process.exit(3); }
    return { id, wav };
});
const SCRIPT = Object.fromEntries([...INTERVIEW, ...SCENARIO50].map((i) => [i.id, i.q]));
const LEAD_S = 2, GAP_S = 4, CHUNK_MS = 100;

const key = process.env.DEEPGRAM_API_KEY;
if (!key && !DRY) { console.log('DEEPGRAM_API_KEY is not set in the environment (run through run-with-main-env.mjs)'); process.exit(2); }

/** 16-bit PCM mono samples + rate from a RIFF WAV; refuses anything it cannot read exactly. */
function readWav(file) {
    const b = fs.readFileSync(file);
    if (b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WAVE') throw new Error(`${file}: not a RIFF WAVE file`);
    let off = 12, fmt = null, data = null;
    while (off + 8 <= b.length) {
        const id = b.toString('ascii', off, off + 4), size = b.readUInt32LE(off + 4);
        if (id === 'fmt ') fmt = { format: b.readUInt16LE(off + 8), channels: b.readUInt16LE(off + 10), rate: b.readUInt32LE(off + 12), bits: b.readUInt16LE(off + 22) };
        if (id === 'data') data = b.subarray(off + 8, off + 8 + size);
        off += 8 + size + (size % 2);
    }
    if (!fmt || !data) throw new Error(`${file}: no fmt or data chunk`);
    const n = data.length / (fmt.bits / 8) / fmt.channels;
    const out = Buffer.alloc(n * 2);
    for (let i = 0; i < n; i++) {
        let sum = 0;
        for (let c = 0; c < fmt.channels; c++) {
            const at = (i * fmt.channels + c) * (fmt.bits / 8);
            if (fmt.format === 1 && fmt.bits === 16) sum += data.readInt16LE(at) / 32768;
            else if (fmt.format === 3 && fmt.bits === 32) sum += data.readFloatLE(at);
            else throw new Error(`${file}: unsupported WAV format ${fmt.format}/${fmt.bits}-bit`);
        }
        out.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round((sum / fmt.channels) * 32767))), i * 2);
    }
    return { rate: fmt.rate, pcm: out };
}

const clips = CLIPS.map((c) => ({ ...c, ...readWav(c.wav) }));
const rate = clips[0].rate;
if (clips.some((c) => c.rate !== rate)) { console.log(`REFUSED: clips differ in sample rate: ${clips.map((c) => `${c.id}=${c.rate}`).join(' ')}`); process.exit(3); }

// The stream: lead silence, then PLAYS rounds of every clip, each followed by a gap of silence.
const silence = (s) => Buffer.alloc(Math.round(s * rate) * 2);
const parts = [silence(LEAD_S)], plan = [];
let cursor = LEAD_S;
for (let p = 1; p <= PLAYS; p++) for (const c of clips) {
    const secs = c.pcm.length / 2 / rate;
    plan.push({ play: p, id: c.id, startS: cursor, endS: cursor + secs });
    parts.push(c.pcm, silence(GAP_S));
    cursor += secs + GAP_S;
}
const stream = Buffer.concat(parts);
if (DRY) {
    for (const c of clips) console.log(`${c.id}: ${(c.pcm.length / 2 / rate).toFixed(1)} s | script: ${SCRIPT[c.id]}`);
    console.log(`DRY RUN: ${plan.length} plays, stream ${(stream.length / 2 / rate / 60).toFixed(1)} min at ${rate} Hz, keyterms ${keytermsFor('en')?.length ?? 0}; no connection made`);
    process.exit(0);
}
const outDir = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), 'seam-probe');
fs.mkdirSync(outDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const eventsFile = path.join(outDir, `events-${stamp}.jsonl`);
fs.writeFileSync(path.join(outDir, `plan-${stamp}.json`), JSON.stringify({ rate, plan, script: Object.fromEntries(CLIPS.map((c) => [c.id, SCRIPT[c.id]])) }, null, 1));
console.log(`stream ${(stream.length / 2 / rate / 60).toFixed(1)} min at ${rate} Hz, ${plan.length} plays; events -> ${eventsFile}`);

const keyterm = keytermsFor('en');
const dg = createClient(key);
const live = dg.listen.live({
    model: 'nova-3', language: 'en', smart_format: true, interim_results: true, encoding: 'linear16',
    sample_rate: rate, channels: 1, endpointing: 300, utterance_end_ms: 1000, vad_events: true,
    ...(keyterm ? { keyterm: [...keyterm] } : {}),
});
const log = (o) => fs.appendFileSync(eventsFile, JSON.stringify({ at: Date.now(), ...o }) + '\n');
let closed = false;
live.on(LiveTranscriptionEvents.Error, (e) => { console.log(`DEEPGRAM ERROR: ${e?.message ?? e}`); log({ kind: 'error', message: String(e?.message ?? e) }); });
live.on(LiveTranscriptionEvents.Close, (e) => { closed = true; log({ kind: 'close', code: e?.code ?? null }); });
live.on(LiveTranscriptionEvents.Open, async () => {
    console.log(`connected; keyterm prompting: ${keyterm ? keyterm.length : 0} terms`);
    live.on(LiveTranscriptionEvents.Transcript, (d) => {
        const alt = d.channel?.alternatives?.[0];
        // words: Deepgram's per-word timings, kept for the |T| == 1 follow-up (timestamps, not text).
        log({ kind: 'transcript', isFinal: !!d.is_final, speechFinal: !!d.speech_final, start: d.start, duration: d.duration, text: alt?.transcript ?? '', words: (alt?.words ?? []).map((w) => [w.punctuated_word ?? w.word, w.start, w.end]) });
    });
    live.on(LiveTranscriptionEvents.SpeechStarted, (d) => log({ kind: 'speech-started', timestamp: d?.timestamp ?? null }));
    live.on(LiveTranscriptionEvents.UtteranceEnd, (d) => log({ kind: 'utterance-end', lastWordEnd: d?.last_word_end ?? null }));
    const bytesPerChunk = Math.round((rate * CHUNK_MS) / 1000) * 2;
    const t0 = Date.now();
    for (let off = 0, i = 0; off < stream.length && !closed; off += bytesPerChunk, i++) {
        live.send(stream.subarray(off, off + bytesPerChunk));
        const wait = t0 + (i + 1) * CHUNK_MS - Date.now(); // real time, drift-corrected
        if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    }
    try { live.finalize(); } catch { /* older SDK */ }
    await new Promise((r) => setTimeout(r, 5000));
    try { live.requestClose(); } catch { /* already closed */ }
    await new Promise((r) => setTimeout(r, 1500));
    const n = fs.readFileSync(eventsFile, 'utf8').split('\n').filter(Boolean).length;
    console.log(`done: ${n} events recorded`);
    process.exit(0);
});
