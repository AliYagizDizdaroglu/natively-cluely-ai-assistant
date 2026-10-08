/**
 * THROWAWAY (scratchpad). Mini-recording of the 2026-09-08 roster additions
 * through the REAL Live ear, standalone: the 24 new clips (L01-L06 + follow-ups,
 * C0xF1/F2) are written as PCM straight into GeminiLiveRouter — no speakers, no
 * app window, no screen capture. Every 'question' event is saved with its time
 * relative to the clip start, so the big-question assembly rule can be
 * prototyped on real splits (after9 ledger item 3/4).
 *
 *   node record-long.mjs            # writes long-recording/events.json + .log
 */
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { pathToFileURL } from 'url';

const PROJ = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const GOLDEN = path.join(PROJ, 'electron/test/golden');
const OUT_DIR = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), 'long-recording');
fs.mkdirSync(OUT_DIR, { recursive: true });
const require = createRequire(path.join(PROJ, 'package.json'));
const { GeminiLiveRouter, LIVE_ROUTER_MODEL } = require(path.join(PROJ, 'dist-electron/electron/audio/GeminiLiveRouter.js'));
const { INTERVIEW } = await import(pathToFileURL(path.join(GOLDEN, 'interview60.questions.mjs')).href);

// The key stays in-process: read, handed to the router, never logged.
const KEY = fs.readFileSync(path.join(PROJ, '.env'), 'utf8').match(/^GEMINI_API_KEY=(.+)$/m)[1].trim();
const TTS_DIR = path.join(GOLDEN, 'interview60-tts-local');
const SR = 24000, FRAME_MS = 20, FRAME_BYTES = (SR / 1000) * FRAME_MS * 2;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// --only long   : the six long questions alone (prompt A/B re-runs)
// --tag <name>  : output file suffix (events-<name>.json / record-long-<name>.log)
const argv = process.argv.slice(2);
const only = argv.includes('--only') ? argv[argv.indexOf('--only') + 1] : null;
const tag = argv.includes('--tag') ? `-${argv[argv.indexOf('--tag') + 1]}` : '';
const SAMPLE = INTERVIEW.filter((i) => (only ? i.level === only : i.level === 'long' || i.level === 'followup'));
const logPath = path.join(OUT_DIR, `record-long${tag}.log`);
const log = (s) => { const line = `${new Date().toISOString()} ${s}`; console.log(line); fs.appendFileSync(logPath, line + '\n'); };
fs.writeFileSync(logPath, '');

function pcmOf(id) {
    const b = fs.readFileSync(path.join(TTS_DIR, `${id}.wav`));
    const i = b.indexOf(Buffer.from('data', 'ascii'), 12);
    return b.subarray(i + 8, i + 8 + b.readUInt32LE(i + 4));
}

log(`listener: ${LIVE_ROUTER_MODEL}; ${SAMPLE.length} clips`);
const router = new GeminiLiveRouter(() => KEY);
let state = 'idle';
const events = [];
let current = null;
router.on('status', (s) => { state = s.state; log(`   [${s.state}]${s.reason ? ' ' + s.reason : ''}`); });
router.on('question', (q) => {
    const at = Date.now();
    const ev = { ...q, at: new Date(at).toISOString(), clip: current?.id ?? null, sinceClipStartMs: current ? at - current.startedAt : null, sinceClipEndMs: current?.endedAt ? at - current.endedAt : null };
    events.push(ev);
    log(`   question (${q.intent}) +${ev.sinceClipStartMs}ms since start${ev.sinceClipEndMs != null ? `, +${ev.sinceClipEndMs}ms since end` : ''}: ${JSON.stringify(q.question)}`);
});
void router.start();
for (let i = 0; i < 200 && state !== 'connected'; i++) await sleep(200);
if (state !== 'connected') { log('FAILED to connect'); process.exit(1); }

const silence = Buffer.alloc(FRAME_BYTES);
const clips = [];
for (const item of SAMPLE) {
    const pcm = pcmOf(item.id);
    current = { id: item.id, startedAt: Date.now(), endedAt: null };
    log(`>> ${item.id} (${item.level}) ${(pcm.length / (SR * 2)).toFixed(1)}s: ${JSON.stringify(item.q.slice(0, 70))}...`);
    for (let o = 0; o < pcm.length; o += FRAME_BYTES) { router.write(pcm.subarray(o, o + FRAME_BYTES), SR); await sleep(FRAME_MS); }
    current.endedAt = Date.now();
    // Same pause the roster leaves before the next clip's first words matter for a
    // split: 8 s of silence lets a trailing final close, then on to the next item.
    for (let t = 0; t < 8000; t += FRAME_MS) { router.write(silence, SR); await sleep(FRAME_MS); }
    clips.push({ id: item.id, level: item.level, chain: item.chain ?? null, q: item.q, startedAt: new Date(current.startedAt).toISOString(), endedAt: new Date(current.endedAt).toISOString(), durationMs: current.endedAt - current.startedAt });
}
current = null;
for (let t = 0; t < 3000; t += FRAME_MS) { router.write(silence, SR); await sleep(FRAME_MS); }
router.stop();
const outFile = path.join(OUT_DIR, `events${tag}.json`);
fs.writeFileSync(outFile, JSON.stringify({ model: LIVE_ROUTER_MODEL, recordedAt: new Date().toISOString(), clips, events }, null, 2));
log(`wrote ${events.length} events for ${clips.length} clips -> ${outFile}`);
process.exit(0);
