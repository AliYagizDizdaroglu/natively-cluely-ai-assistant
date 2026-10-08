// Throwaway: reproduce the Deepgram socket flap OUTSIDE the app by driving the built
// class exactly as main.ts does — start() at the 16 kHz default, real-time PCM writes,
// then setSampleRate(48000) 2.5 s later (the capture reports its rate on the first
// chunk, which restarts the stream).  Expected BEFORE the fix: a 1011 close every
// ~12 s from the moment the first (stale) socket dies.  AFTER the fix: zero 1011
// closes over the window and exactly one live socket after the restart.
// The key is read in-process from .env and never printed.
// usage: node repro-flap.cjs <repo-root> [seconds=45]
const path = require('node:path');
const root = process.argv[2];
const secs = Number(process.argv[3] ?? 45);
require(path.join(root, 'node_modules', 'dotenv')).config({ path: path.join(root, '.env'), quiet: true });
const key = process.env.DEEPGRAM_API_KEY;
if (!key) { console.error('DEEPGRAM_API_KEY is not set in .env'); process.exit(2); }
const { DeepgramStreamingSTT } = require(path.join(root, 'dist-electron', 'electron', 'audio', 'DeepgramStreamingSTT.js'));

const t0 = Date.now();
const stamp = () => ((Date.now() - t0) / 1000).toFixed(1).padStart(5) + 's';
let closes1011 = 0, connects = 0, opens = 0;
const origLog = console.log;
console.log = (...a) => {
    const s = a.join(' ');
    if (s.includes('Closed (code=1011')) closes1011++;
    if (s.includes('Connecting (')) connects++;
    if (s.includes('] Connected')) opens++;
    if (!s.includes('Transcript event')) origLog(stamp(), s.slice(0, 200));
};

const stt = new DeepgramStreamingSTT(key);
stt.on('error', (e) => origLog(stamp(), 'error event:', e?.message ?? e));
stt.on('transcript', () => { });
stt.start();
// 48 kHz mono linear16 real time = 96 000 B/s; 1920-byte chunks every 20 ms.
const chunk = Buffer.alloc(1920);
const writer = setInterval(() => stt.write(chunk), 20);
setTimeout(() => stt.setSampleRate(48000), 2500);
setTimeout(() => {
    clearInterval(writer);
    stt.stop();
    origLog(`\nRESULT over ${secs}s: connects=${connects} opens=${opens} closes1011=${closes1011}`);
    setTimeout(() => process.exit(0), 500);
}, secs * 1000);
