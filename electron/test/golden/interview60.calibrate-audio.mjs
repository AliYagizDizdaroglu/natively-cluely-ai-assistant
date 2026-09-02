/**
 * Does the REAL live detector hear the locally-synthesised voice?
 *
 * The 60-minute stimulus is now Windows SAPI rather than Gemini TTS, and SAPI is
 * noticeably more robotic. If detection degrades on it, an hour-long run would
 * produce a pessimistic result that says nothing about the app — the stimulus
 * would be the defect. So this proves the stimulus first, on a handful of clips,
 * before any hour is committed.
 *
 * Pass bar: every sampled question detected exactly once, with heard text close
 * enough to the original that routing would be unaffected.
 *
 *   node electron/test/golden/interview60.calibrate-audio.mjs
 */
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { INTERVIEW } from './interview60.questions.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJ = path.resolve(HERE, '../../..');
const require = createRequire(path.join(PROJ, 'package.json'));
const { GeminiLiveRouter, LIVE_ROUTER_MODEL } =
    require(path.join(PROJ, 'dist-electron/electron/audio/GeminiLiveRouter.js'));

const KEY = fs.readFileSync(path.join(PROJ, '.env'), 'utf8').match(/^GEMINI_API_KEY=(.+)$/m)[1].trim();
const TTS_DIR = path.join(HERE, 'interview60-tts-local');
const SR = 24000, FRAME_MS = 20, FRAME_BYTES = (SR / 1000) * FRAME_MS * 2;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// A deliberate spread: shortest, a mid-length design question, the longest hard
// one, and a screenshot cue (which is NOT a question — it should ideally NOT fire).
const SAMPLE = ['W02', 'M02', 'H03', 'C01'].map((id) => INTERVIEW.find((x) => x.id === id));

function pcmOf(id) {
    const b = fs.readFileSync(path.join(TTS_DIR, `${id}.wav`));
    const i = b.indexOf(Buffer.from('data', 'ascii'), 12);
    return b.subarray(i + 8, i + 8 + b.readUInt32LE(i + 4));
}

/** crude token overlap — enough to tell "heard it" from "heard something else" */
function overlap(a, b) {
    const norm = (s) => new Set((s.toLowerCase().match(/[a-z]+/g) || []).filter((w) => w.length > 3));
    const A = norm(a), B = norm(b);
    if (!A.size) return 0;
    let hit = 0;
    for (const w of A) if (B.has(w)) hit++;
    return hit / A.size;
}

console.log(`listener: ${LIVE_ROUTER_MODEL}\nvoice: Windows SAPI (local)\n`);

const router = new GeminiLiveRouter(() => KEY);
let state = 'idle';
const events = [];
router.on('status', (s) => { state = s.state; if (s.state !== 'connected') console.log(`   [${s.state}]${s.reason ? ' ' + s.reason : ''}`); });
router.on('question', (q) => events.push({ ...q, at: Date.now() }));
void router.start();
for (let i = 0; i < 200 && state !== 'connected'; i++) await sleep(200);
if (state !== 'connected') { console.log('FAILED to connect'); process.exit(1); }

const silence = Buffer.alloc(FRAME_BYTES);
const rows = [];
for (const item of SAMPLE) {
    const before = events.length;
    const pcm = pcmOf(item.id);
    for (let o = 0; o < pcm.length; o += FRAME_BYTES) {
        router.write(pcm.subarray(o, o + FRAME_BYTES), SR);
        await sleep(FRAME_MS);
    }
    const spokeAt = Date.now();
    for (let t = 0; t < 5000; t += FRAME_MS) { router.write(silence, SR); await sleep(FRAME_MS); }
    const fired = events.slice(before);
    const isCue = item.kind === 'screenshot';
    const ov = fired[0] ? overlap(item.q, fired[0].question) : 0;
    rows.push({ id: item.id, isCue, n: fired.length, heard: fired[0]?.question ?? null, intent: fired[0]?.intent ?? null, ms: fired[0] ? fired[0].at - spokeAt : null, ov });
    console.log(`  ${item.id.padEnd(4)} fired=${fired.length}${isCue ? ' (cue — firing is optional)' : ''}  overlap=${(ov * 100).toFixed(0)}%  ${fired[0] ? `+${fired[0].at - spokeAt}ms intent=${fired[0].intent}` : ''}`);
    if (fired[0]) console.log(`        heard: "${fired[0].question}"`);
    for (let t = 0; t < 1500; t += FRAME_MS) { router.write(silence, SR); await sleep(FRAME_MS); }
}
router.stop();

const questions = rows.filter((r) => !r.isCue);
const detected = questions.filter((r) => r.n === 1).length;
const faithful = questions.filter((r) => r.ov >= 0.6).length;
console.log(`\n  detected exactly once   ${detected}/${questions.length}`);
console.log(`  heard faithfully (>60%) ${faithful}/${questions.length}`);
const ok = detected === questions.length && faithful === questions.length;
console.log(`\n  VERDICT: ${ok ? 'local voice is usable — safe to spend the hour' : 'local voice DEGRADES detection — do not run the hour on it'}`);
process.exit(ok ? 0 : 1);
