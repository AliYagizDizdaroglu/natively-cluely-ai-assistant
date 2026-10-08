// THROWAWAY A/B: is the calibration failure caused by the VOICE, or by the question's
// SHAPE — a complete ask, full stop, then 24-67 more words?
//
// The gate's verdict says "local voice DEGRADES detection", but the voice reconstructed
// "evaluate_top_k" and "select_context" perfectly at 79-100% overlap. The two clips it
// failed on were heard as their opening sentence ALONE. So the same words are rendered
// twice by the same voice, differing only in whether that opening sentence stands alone.
//
// A: exactly as the roster has it        "Explain your RAG pipeline precisely. Walk through ..."
// B: the opening merged into the body    "Explain your RAG pipeline precisely: walk through ..."
//
// If B is heard whole and A is not, the shape is the cause and the voice is exonerated.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const PROJ = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const G = PROJ + '/electron/test/golden/';
const OUT = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/ab-tts';
fs.mkdirSync(OUT, { recursive: true });

const { SCENARIO50 } = await import(pathToFileURL(G + 'scenario50.questions.mjs').href);
const require = createRequire(PROJ + '/package.json');
const { GeminiLiveRouter, LIVE_ROUTER_MODEL } = require(PROJ + '/dist-electron/electron/audio/GeminiLiveRouter.js');
const KEY = fs.readFileSync(PROJ + '/.env', 'utf8').match(/^GEMINI_API_KEY=(.+)$/m)[1].trim();

const SR = 24000, FRAME_MS = 20, FRAME_BYTES = (SR / 1000) * FRAME_MS * 2;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** "Head. Tail" -> "Head: tail"; a question head keeps its mark but loses the pause. */
function merge(q) {
    const m = q.match(/^(.{10,90}?)([.?])\s+(\S)(.*)$/s);
    if (!m) return q;
    const [, head, mark, firstChar, rest] = m;
    return mark === '?' ? `${head}, and specifically, ${firstChar.toLowerCase()}${rest}`
        : `${head}: ${firstChar.toLowerCase()}${rest}`;
}

function speak(id, text) {
    const out = path.join(OUT, `${id}.wav`);
    if (fs.existsSync(out)) return out;
    const ps = `
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$s = New-Object System.Speech.Synthesis.SpeechSynthesizer
try { $s.SelectVoice("Microsoft David Desktop") } catch { }
$s.Rate = 0
$fmt = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(${SR}, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono)
$s.SetOutputToWaveFile(${JSON.stringify(out)}, $fmt)
$s.Speak(${JSON.stringify(text)})
$s.SetOutputToNull()
$s.Dispose()`;
    execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', ps], { stdio: 'pipe' });
    return out;
}
const pcmOf = (f) => { const b = fs.readFileSync(f); const i = b.indexOf(Buffer.from('data', 'ascii'), 12); return b.subarray(i + 8, i + 8 + b.readUInt32LE(i + 4)); };
const norm = (s) => new Set((s.toLowerCase().match(/[a-z]+/g) || []).filter((w) => w.length > 3));
function overlap(a, b) { const A = norm(a), B = norm(b); if (!A.size) return 0; let h = 0; for (const w of A) if (B.has(w)) h++; return h / A.size; }

const IDS = ['S2Q01', 'S2Q02', 'S1Q04'];
const cases = [];
for (const id of IDS) {
    const item = SCENARIO50.find((x) => x.id === id);
    cases.push({ id: id + '-A', arm: 'A as-written', text: item.q });
    cases.push({ id: id + '-B', arm: 'B merged   ', text: merge(item.q) });
}
console.log(`listener: ${LIVE_ROUTER_MODEL}\n`);
for (const c of cases) if (c.arm.startsWith('B')) console.log(`  merged ${c.id}: ${JSON.stringify(c.text.slice(0, 96))}`);
console.log('');

const router = new GeminiLiveRouter(() => KEY);
let state = 'idle';
const events = [];
router.on('status', (s) => { state = s.state; if (s.state !== 'connected') console.log(`   [${s.state}]${s.reason ? ' ' + s.reason : ''}`); });
router.on('question', (q) => events.push({ ...q, at: Date.now() }));
void router.start();
for (let i = 0; i < 200 && state !== 'connected'; i++) await sleep(200);
if (state !== 'connected') { console.log('FAILED to connect'); process.exit(1); }

const silence = Buffer.alloc(FRAME_BYTES);
for (const c of cases) {
    const before = events.length;
    const pcm = pcmOf(speak(c.id, c.text));
    for (let o = 0; o < pcm.length; o += FRAME_BYTES) { router.write(pcm.subarray(o, o + FRAME_BYTES), SR); await sleep(FRAME_MS); }
    for (let t = 0; t < 5000; t += FRAME_MS) { router.write(silence, SR); await sleep(FRAME_MS); }
    const fired = events.slice(before);
    const best = fired.map((f) => ({ f, ov: overlap(c.text, f.question ?? f.text ?? '') })).sort((a, b) => b.ov - a.ov)[0];
    console.log(`${c.id.padEnd(10)} ${c.arm}  fired=${fired.length}  overlap=${best ? Math.round(best.ov * 100) : 0}%`);
    if (best) console.log(`             heard: ${JSON.stringify((best.f.question ?? best.f.text ?? '').slice(0, 150))}`);
}
await router.stop?.();
process.exit(0);
