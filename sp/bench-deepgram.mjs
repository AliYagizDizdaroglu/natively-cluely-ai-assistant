// THROWAWAY: the same shape audio through DEEPGRAM, with the app's own nova-3 settings.
//
// The Live bench showed the detector losing or altering facts: "SLA" came back as "SLO",
// and the merged shape was compressed to a summary with both numbers gone. Live is a
// paraphraser — it reports what was ASKED, not what was SAID. Deepgram transcribes.
//
// If the transcript keeps the entities Live drops, the fix is structural and general:
// when the reconciler CORROBORATES a Live claim against the transcript, the answer should
// be built from the transcript's wording, not from Live's paraphrase. That repairs every
// question, not the ten in this bench.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { SHAPES, ENTITIES } from './shapes.mjs';

const PROJ = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const SCRATCH = path.dirname(new URL(import.meta.url).pathname.replace(/^\//, ''));
const TTS = path.join(SCRATCH, 'shape-tts');
const require = createRequire(PROJ + '/package.json');
const { createClient, LiveTranscriptionEvents } = require('@deepgram/sdk');
const KEY = fs.readFileSync(PROJ + '/.env', 'utf8').match(/^DEEPGRAM_API_KEY=(.+)$/m)[1].trim();

const SR = 24000, FRAME_MS = 20, FRAME_BYTES = (SR / 1000) * FRAME_MS * 2;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const pcmOf = (f) => { const b = fs.readFileSync(f); const i = b.indexOf(Buffer.from('data', 'ascii'), 12); return b.subarray(i + 8, i + 8 + b.readUInt32LE(i + 4)); };

/** Exactly the app's live config (electron/audio/DeepgramStreamingSTT.ts). */
function open() {
    return createClient(KEY).listen.live({
        model: 'nova-3', language: 'en', smart_format: true, interim_results: true,
        encoding: 'linear16', sample_rate: SR, channels: 1,
        endpointing: 300, utterance_end_ms: 1000, vad_events: true,
    });
}

async function transcribe(wav) {
    const live = open();
    const finals = [];
    let open_ = false;
    live.on(LiveTranscriptionEvents.Open, () => { open_ = true; });
    live.on(LiveTranscriptionEvents.Transcript, (d) => {
        const t = d.channel?.alternatives?.[0]?.transcript ?? '';
        if (d.is_final && t.trim()) finals.push(t);
    });
    for (let i = 0; i < 100 && !open_; i++) await sleep(100);
    if (!open_) throw new Error('deepgram did not open');
    const pcm = pcmOf(wav);
    for (let o = 0; o < pcm.length; o += FRAME_BYTES) { live.send(pcm.subarray(o, o + FRAME_BYTES)); await sleep(FRAME_MS); }
    for (let t = 0; t < 2500; t += FRAME_MS) { live.send(Buffer.alloc(FRAME_BYTES)); await sleep(FRAME_MS); }
    await sleep(1200);
    try { live.requestClose?.(); live.finish?.(); } catch { }
    return finals.join(' ');
}

const liveOut = JSON.parse(fs.readFileSync(path.join(SCRATCH, 'bench-shapes-out.json'), 'utf8'));
console.log('shape         entities lost — DEEPGRAM        entities lost — LIVE');
const rows = [];
for (const s of SHAPES) {
    const wav = path.join(TTS, `${s.id}.wav`);
    if (!fs.existsSync(wav)) { console.log(`${s.id.padEnd(13)} (no audio — run bench-shapes.mjs first)`); continue; }
    let text = '';
    try { text = await transcribe(wav); } catch (e) { console.log(`${s.id.padEnd(13)} ERROR ${e.message}`); continue; }
    const lostDg = Object.entries(ENTITIES).filter(([, re]) => !re.test(text)).map(([n]) => n);
    const lostLive = liveOut.find((r) => r.id === s.id)?.lost ?? ['?'];
    rows.push({ id: s.id, text, lostDg, lostLive });
    console.log(`${s.id.padEnd(13)} ${(lostDg.length ? lostDg.join(', ') : 'none').padEnd(32)} ${lostLive.length ? lostLive.join(', ') : 'none'}`);
}

const dgTotal = rows.reduce((a, r) => a + r.lostDg.length, 0);
const liveTotal = rows.reduce((a, r) => a + r.lostLive.length, 0);
console.log(`\nentity losses across ${rows.length} shapes:  Deepgram ${dgTotal}   Live ${liveTotal}`);
console.log(rows.length && dgTotal < liveTotal
    ? '=> the TRANSCRIPT is the faithful record. Building the answer from it, once corroborated,\n   repairs entity fidelity for any question.'
    : '=> the transcript is NOT better — the fix must be elsewhere.');
fs.writeFileSync(path.join(SCRATCH, 'bench-deepgram-out.json'), JSON.stringify(rows, null, 1));
process.exit(0);
