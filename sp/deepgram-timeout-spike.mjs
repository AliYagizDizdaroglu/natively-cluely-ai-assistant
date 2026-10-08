// Does anything reset Deepgram's 10 s idle timer? Three sockets, same params as
// DeepgramStreamingSTT.ts: (1) silent linear16 PCM at real-time pace, no keepalive;
// (2) KeepAlive text every 8 s, no audio; (3) nothing. Each is closed by us at 25 s
// if the server has not closed it first. Prints the key's NAME only, never its value.
import { createRequire } from 'node:module';
const require = createRequire('C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/package.json');
const { createClient, LiveTranscriptionEvents } = require('@deepgram/sdk');

const found = Object.entries(process.env).find(([k, v]) => /DEEPGRAM/i.test(k) && v);
if (!found) { console.error('no *DEEPGRAM* variable in env'); process.exit(2); }
console.log(`using env var ${found[0]} (length ${found[1].length})`);
const key = found[1];

function run(label, opts) {
    return new Promise((resolve) => {
        const live = createClient(key).listen.live({
            model: 'nova-3', language: 'en-US', smart_format: true, interim_results: true,
            encoding: 'linear16', sample_rate: 16000, channels: 1,
            endpointing: 300, utterance_end_ms: 1000, vad_events: true,
        });
        const t0 = Date.now();
        const el = () => ((Date.now() - t0) / 1000).toFixed(1) + 's';
        let audio = null, ka = null, selfClose = null, sent = 0;
        const stop = () => { clearInterval(audio); clearInterval(ka); clearTimeout(selfClose); };
        live.on(LiveTranscriptionEvents.Open, () => {
            console.log(`[${label}] open at +${el()}`);
            if (opts.audio) { const chunk = Buffer.alloc(1920); audio = setInterval(() => { live.send(chunk); sent++; }, 60); }
            if (opts.keepAlive) ka = setInterval(() => { live.keepAlive(); console.log(`[${label}] keepAlive sent at +${el()}`); }, 8000);
            selfClose = setTimeout(() => { console.log(`[${label}] STILL OPEN at +${el()} (${sent} chunks sent) — closing it myself`); stop(); live.requestClose(); }, opts.secs * 1000);
        });
        live.on(LiveTranscriptionEvents.Close, (e) => { stop(); console.log(`[${label}] CLOSED at +${el()} code=${e?.code} reason=${e?.reason} (${sent} chunks sent)`); resolve(); });
        live.on(LiveTranscriptionEvents.Error, (e) => console.log(`[${label}] error: ${e?.message ?? e}`));
    });
}

await run('silence-realtime', { audio: true, keepAlive: false, secs: 25 });
await run('keepalive-only', { audio: false, keepAlive: true, secs: 25 });
await run('nothing', { audio: false, keepAlive: false, secs: 25 });
