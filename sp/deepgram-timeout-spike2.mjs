// Second spike, at the app's actual parameters: the capture is 48 kHz mono and
// hands DeepgramStreamingSTT 1920-byte chunks (20 ms). The log shows ~12.5 chunks
// per second reaching the feed (≈25% of real time). Two sockets: real-time 48 kHz
// silence (a chunk every 20 ms) and the observed quarter-rate feed (every 80 ms).
// Prints the key's NAME only, never its value.
import { createRequire } from 'node:module';
const require = createRequire('C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/package.json');
const { createClient, LiveTranscriptionEvents } = require('@deepgram/sdk');

const found = Object.entries(process.env).find(([k, v]) => /DEEPGRAM/i.test(k) && v);
if (!found) { console.error('no *DEEPGRAM* variable in env'); process.exit(2); }
console.log(`using env var ${found[0]}`);
const key = found[1];

function run(label, opts) {
    return new Promise((resolve) => {
        const live = createClient(key).listen.live({
            model: 'nova-3', language: 'en', smart_format: true, interim_results: true,
            encoding: 'linear16', sample_rate: 48000, channels: 1,
            endpointing: 300, utterance_end_ms: 1000, vad_events: true,
        });
        const t0 = Date.now();
        const el = () => ((Date.now() - t0) / 1000).toFixed(1) + 's';
        let audio = null, selfClose = null, sent = 0;
        const stop = () => { clearInterval(audio); clearTimeout(selfClose); };
        live.on(LiveTranscriptionEvents.Open, () => {
            console.log(`[${label}] open at +${el()}`);
            const chunk = Buffer.alloc(1920);
            audio = setInterval(() => { live.send(chunk); sent++; }, opts.everyMs);
            selfClose = setTimeout(() => { console.log(`[${label}] STILL OPEN at +${el()} (${sent} chunks sent) — closing it myself`); stop(); live.requestClose(); }, opts.secs * 1000);
        });
        live.on(LiveTranscriptionEvents.Close, (e) => { stop(); console.log(`[${label}] CLOSED at +${el()} code=${e?.code} reason=${e?.reason} (${sent} chunks sent)`); resolve(); });
        live.on(LiveTranscriptionEvents.Error, (e) => console.log(`[${label}] error: ${e?.message ?? e}`));
    });
}

await run('48k-silence-realtime-20ms', { everyMs: 20, secs: 25 });
await run('48k-silence-quarter-rate-80ms', { everyMs: 80, secs: 25 });
