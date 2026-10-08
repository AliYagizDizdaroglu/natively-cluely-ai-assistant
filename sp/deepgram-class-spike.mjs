// The app's own DeepgramStreamingSTT, driven the way main.ts drives it: one
// instance, setSampleRate(48000), setAudioChannelCount(1), start(), then
// write() 1920-byte silent chunks at the cadence the run log shows (~12.5/s).
// The class logs its own Connected / Closed / Reconnecting lines. If it flaps
// here, the defect is inside the class; if it holds for 40 s, it is in how
// main.ts drives it. Usage: node --env-file=.env deepgram-class-spike.mjs <compiled.js>
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const modPath = process.argv[2];
if (!modPath) { console.error('pass the path to the compiled DeepgramStreamingSTT.js'); process.exit(2); }
const mod = require(modPath);
const DeepgramStreamingSTT = mod.DeepgramStreamingSTT ?? mod.default ?? mod;

const found = Object.entries(process.env).find(([k, v]) => /DEEPGRAM/i.test(k) && v);
if (!found) { console.error('no *DEEPGRAM* variable in env'); process.exit(2); }
console.log(`using env var ${found[0]}`);

const t0 = Date.now();
const orig = console.log;
console.log = (...a) => orig(`+${((Date.now() - t0) / 1000).toFixed(1)}s`, ...a);

const stt = new DeepgramStreamingSTT(found[1]);
stt.on?.('transcript', (t) => console.log('transcript event', JSON.stringify(t).slice(0, 80)));
stt.on?.('error', (e) => console.log('error event', e?.message));
stt.setSampleRate(48000);
stt.setAudioChannelCount?.(1);
stt.start();

const chunk = Buffer.alloc(1920);
let n = 0;
const feed = setInterval(() => { stt.write(chunk); n++; }, 80);
setTimeout(() => {
    clearInterval(feed);
    console.log(`done: ${n} chunks written over 40 s — stopping`);
    stt.stop();
    setTimeout(() => process.exit(0), 500);
}, 40000);
