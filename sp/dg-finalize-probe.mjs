// THROWAWAY. Measures how long Deepgram takes to return the is_final transcript after the voice
// stops, streaming a golden clip in real time (20 ms chunks paced by wall-clock).
//   --suppress <hangoverMs> <keepaliveMs>  emulate the app's Rust SilenceSuppressor: after the last
//        loud frame + hangover, send ONE 20 ms zero frame every keepaliveMs instead of every frame
//        (app: for_system_audio = 600 / 100). Without it every frame is sent (silence included).
//   --finalize <gateMs>  send Deepgram Finalize when the local VAD has seen gateMs of silence
//        (the app's DeepgramStreamingSTT.finalize() exists but is never called)
//   --endpointing <ms>   Deepgram endpointing (app: 300)
// Key: read in-process from the repo .env (name printed, value never). Nothing is written to disk.
// usage: node dg-finalize-probe.mjs <wav> [--suppress 600 100] [--finalize 1200] [--endpointing 300]
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const REPO = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const require = createRequire(path.join(REPO, 'package.json'));
const { createClient, LiveTranscriptionEvents } = require('@deepgram/sdk');

const argv = process.argv.slice(2);
const wavPath = argv[0];
if (!wavPath) { console.error('usage: node dg-finalize-probe.mjs <wav> [--suppress hangoverMs keepaliveMs] [--finalize gateMs] [--endpointing ms]'); process.exit(2); }
const opt = (name, n) => { const i = argv.indexOf(name); return i >= 0 ? argv.slice(i + 1, i + 1 + n).map(Number) : null; };
const SUP = opt('--suppress', 2);            // [hangoverMs, keepaliveMs] or null
const FIN = opt('--finalize', 1)?.[0] ?? null;
const ENDPOINTING = opt('--endpointing', 1)?.[0] ?? 300;

const env = fs.readFileSync(path.join(REPO, '.env'), 'utf8');
const keyLine = env.split('\n').find((l) => /^\s*DEEPGRAM[A-Z_]*\s*=/.test(l));
if (!keyLine) { console.error('no DEEPGRAM* variable in .env'); process.exit(2); }
const KEY = keyLine.slice(keyLine.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '');

const wav = fs.readFileSync(wavPath);
const rate = wav.readUInt32LE(24), channels = wav.readUInt16LE(22), bits = wav.readUInt16LE(34);
const di = wav.indexOf(Buffer.from('data', 'ascii'), 12);
const pcm = wav.subarray(di + 8, di + 8 + wav.readUInt32LE(di + 4));
if (channels !== 1 || bits !== 16) { console.error(`need mono 16-bit, got ch=${channels} bits=${bits}`); process.exit(2); }
const FRAME = Math.round(rate * 0.02), BYTES = FRAME * 2;
const nFrames = Math.floor(pcm.length / BYTES);
const TAIL = 200;                                     // 4 s of digital silence after the clip
// energy VAD (same as the replay spike): RMS >= 300 on int16
const loud = new Array(nFrames + TAIL).fill(false);
for (let f = 0; f < nFrames; f++) { let s = 0; for (let k = 0; k < FRAME; k++) { const v = pcm.readInt16LE(f * BYTES + k * 2); s += v * v; } loud[f] = Math.sqrt(s / FRAME) >= 300; }
console.log(`${path.basename(wavPath)}: ${rate} Hz, ${(nFrames / 50).toFixed(1)} s | endpointing ${ENDPOINTING} | ${SUP ? `suppress hangover ${SUP[0]} ms, keepalive every ${SUP[1]} ms` : 'every frame sent'} | ${FIN ? `Finalize at ${FIN} ms gate` : 'no Finalize'}`);

const dg = createClient(KEY);
const live = dg.listen.live({ model: 'nova-3', language: 'en', smart_format: true, interim_results: true, encoding: 'linear16', sample_rate: rate, channels: 1, endpointing: ENDPOINTING, utterance_end_ms: 1000, vad_events: true });

let start = 0;
const rel = (t) => ((t - start) / 1000).toFixed(2).padStart(6);
const stops = [];          // one per silence >= 250 ms after voice: { voiceOff, finalizeAt, finalAt, text }
let cur = null, lastLoudF = null, sentFrames = 0;
const onsets = [];         // one per voice onset after >= 250 ms of silence: { at, interimAt }

live.on(LiveTranscriptionEvents.Open, () => {
    live.on(LiveTranscriptionEvents.Transcript, (data) => {
        const text = data.channel?.alternatives?.[0]?.transcript ?? '';
        if (!text) return;
        const now = Date.now();
        if (!data.is_final) { const o = onsets.filter((x) => !x.interimAt && x.at <= now).at(-1); if (o) o.interimAt = now; return; }
        if (data.is_final) {
            console.log(`${rel(now)}s  FINAL ${data.speech_final ? '(speech_final)' : '              '} "${text}"`);
            const open = stops.filter((s) => !s.finalAt).at(-1);
            if (open) { open.finalAt = now; open.text = text; }
        }
    });
    live.on(LiveTranscriptionEvents.UtteranceEnd, () => console.log(`${rel(Date.now())}s  UtteranceEnd`));
    live.on(LiveTranscriptionEvents.Error, (e) => console.log(`${rel(Date.now())}s  error ${e?.message ?? e}`));

    start = Date.now();
    let f = 0;
    const tick = () => {
        const due = Math.floor((Date.now() - start) / 20);
        while (f < due && f < nFrames + TAIL) {
            const isLoud = loud[f];
            const now = Date.now();
            if (isLoud && (lastLoudF === null || (f - lastLoudF) * 20 >= 250)) onsets.push({ at: start + f * 20, interimAt: null });
            if (isLoud) { lastLoudF = f; cur = null; }
            const sinceLoud = lastLoudF === null ? Infinity : (f - lastLoudF) * 20;
            if (!isLoud && lastLoudF !== null && sinceLoud >= 250 && !cur) { cur = { voiceOff: start + lastLoudF * 20 + 20, finalizeAt: null, finalAt: null, text: '' }; stops.push(cur); }
            if (FIN && cur && !cur.finalizeAt && sinceLoud >= FIN) { live.finalize(); cur.finalizeAt = now; console.log(`${rel(now)}s  >> Finalize (${FIN} ms after voice)`); }

            let send = true, chunk = f < nFrames ? pcm.subarray(f * BYTES, (f + 1) * BYTES) : Buffer.alloc(BYTES);
            if (SUP && !isLoud && lastLoudF !== null && sinceLoud > SUP[0]) {
                // suppressed: one zero frame per keepalive interval
                send = (sinceLoud % SUP[1]) < 20;
                chunk = Buffer.alloc(BYTES);
            }
            if (send) { live.send(chunk); sentFrames++; }
            f++;
        }
        if (f >= nFrames + TAIL) {
            setTimeout(() => {
                console.log(`\nsent ${(sentFrames / 50).toFixed(1)} s of audio for ${((nFrames + TAIL) / 50).toFixed(1)} s of wall-clock`);
                console.log('voice stop → final (seconds after the last loud frame):');
                const lag = [];
                for (const s of stops) {
                    if (s.finalAt) lag.push(s.finalAt - s.voiceOff);
                    console.log(`  +${((s.voiceOff - start) / 1000).toFixed(2)}s  ${s.finalizeAt ? `finalize +${((s.finalizeAt - s.voiceOff) / 1000).toFixed(2)}` : '              '}  final ${s.finalAt ? '+' + ((s.finalAt - s.voiceOff) / 1000).toFixed(2) : '   —  '}  "${s.text.slice(0, 55)}"`);
                }
                const sorted = lag.sort((a, b) => a - b);
                const p = (q) => sorted.length ? (sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))] / 1000).toFixed(2) : '—';
                console.log(`FINAL LAG after voice stop: n=${sorted.length} p50 ${p(.5)} s  max ${p(1)} s`);
                const on = onsets.filter((o) => o.interimAt).map((o) => (o.interimAt - o.at) / 1000).sort((a, b) => a - b);
                console.log(`FIRST INTERIM after voice onset: n=${on.length} p50 ${on.length ? on[Math.floor(on.length / 2)].toFixed(2) : '—'} s  min ${on[0]?.toFixed(2)} s  max ${on.at(-1)?.toFixed(2)} s   (${on.map((x) => x.toFixed(2)).join(' ')})`);
                try { live.requestClose(); } catch { }
                setTimeout(() => process.exit(0), 500);
            }, 3000);
            return;
        }
        setTimeout(tick, 5);
    };
    tick();
});
