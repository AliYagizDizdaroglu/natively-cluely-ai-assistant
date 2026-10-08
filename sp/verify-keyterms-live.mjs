// The real original-symptom check: stream the garbled clips through the SAME live socket the
// app opens (nova-3, smart_format, 16 kHz linear16, endpointing 300), with and without the
// shipped keyterm list. Calibration: the no-keyterm leg must reproduce the flight's garble.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const PROJ = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const WT = `${PROJ}/.claude/worktrees/whole-turn`;
const require_ = createRequire(import.meta.url);
const KEY = fs.readFileSync(path.join(PROJ, '.env'), 'utf8').match(/^DEEPGRAM_API_KEY=(.+)$/m)[1].trim();
const { DEEPGRAM_KEYTERMS } = require_(`${WT}/dist-electron/electron/audio/deepgramKeyterms.js`);
const { createClient, LiveTranscriptionEvents } = require_(`${PROJ}/node_modules/@deepgram/sdk`);

const buf = fs.readFileSync(path.join(PROJ, 'electron/test/golden/scenario50.wav'));
const SRC_RATE = buf.readUInt32LE(24);
const OUT_RATE = 16000;                      // what the app feeds Deepgram
const bytesPerSec = SRC_RATE * 2;

function pcm16k(startSec, secs) {
    const from = 44 + Math.floor(startSec * bytesPerSec / 2) * 2;
    const len = Math.floor(secs * bytesPerSec / 2) * 2;
    const src = buf.subarray(from, Math.min(from + len, buf.length));
    const ratio = SRC_RATE / OUT_RATE;
    const outSamples = Math.floor((src.length / 2) / ratio);
    const out = Buffer.alloc(outSamples * 2);
    for (let i = 0; i < outSamples; i++) out.writeInt16LE(src.readInt16LE(Math.floor(i * ratio) * 2), i * 2);
    return out;
}

function transcribe(pcm, withKeyterms) {
    return new Promise((resolve) => {
        const dg = createClient(KEY);
        const live = dg.listen.live({
            model: 'nova-3', language: 'en', smart_format: true, interim_results: true,
            encoding: 'linear16', sample_rate: OUT_RATE, channels: 1,
            endpointing: 300, utterance_end_ms: 1000, vad_events: true,
            ...(withKeyterms ? { keyterm: [...DEEPGRAM_KEYTERMS] } : {}),
        });
        const finals = [];
        const done = () => { try { live.requestClose(); } catch { } resolve(finals.join(' ').trim()); };
        const guard = setTimeout(done, 25000);
        live.on(LiveTranscriptionEvents.Open, async () => {
            const CH = OUT_RATE * 2 / 10;                   // 100 ms frames, like the app
            for (let o = 0; o < pcm.length; o += CH) {
                live.send(pcm.subarray(o, Math.min(o + CH, pcm.length)));
                await new Promise((r) => setTimeout(r, 25));  // faster than realtime, still paced
            }
            setTimeout(() => { clearTimeout(guard); done(); }, 3500);
        });
        live.on(LiveTranscriptionEvents.Transcript, (d) => {
            const t = d.channel?.alternatives?.[0]?.transcript;
            if (d.is_final && t) finals.push(t);
        });
        live.on(LiveTranscriptionEvents.Error, () => { clearTimeout(guard); done(); });
    });
}

const timeline = JSON.parse(fs.readFileSync(`${PROJ}/electron/test/golden/interview60.runs/2026-09-19T08-22-41-s50j/interview60.timeline.json`, 'utf8'));
const CASES = [
    ['S1Q04F', /\btie\b/i, /\bthai\b/i],
    ['S2Q05', /\bdedup/i, /(?<!de)\bduplicate/i],
    ['S2Q01', /reranking/i, /\bre[- ]ranking\b/i],
    ['S2Q04', /document ids/i, /documenteds|uniqueids/i],
];

console.log(`live socket, ${DEEPGRAM_KEYTERMS.length} keyterms\n`);
for (const [id, want, garble] of CASES) {
    const item = timeline.items.find((x) => x.id === id);
    if (!item) continue;
    const pcm = pcm16k(item.startSec, item.clipSecs + 0.5);
    const off = await transcribe(pcm, false);
    const on = await transcribe(pcm, true);
    const mark = (t) => want.test(t) ? 'RIGHT  ' : garble.test(t) ? 'GARBLED' : 'neither';
    console.log(`=== ${id} ===`);
    console.log(`  OFF [${mark(off)}] ${off.slice(-140)}`);
    console.log(`  ON  [${mark(on)}] ${on.slice(-140)}`);
    console.log();
}
process.exit(0);
