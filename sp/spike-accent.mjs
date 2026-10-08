// THROWAWAY SPIKE: is Gemini TTS accent-prompting a usable accent source?
//
// Local voices are en-US only, the ElevenLabs free tier refuses library voices via the
// API (402), and the interview recordings are not cleared for transmission. Gemini TTS
// is the only accent route left with working credentials, and it takes a natural-language
// style prefix, so the accent is at least EXPRESSIBLE. Whether it is USEFUL is the question.
//
// WHAT THIS CAN AND CANNOT ESTABLISH. It cannot establish authenticity — I cannot hear the
// audio, and neither can any check here. What it CAN establish is whether the rendering is
// phonetically HARDER for the STT than the neutral one, which is the property under test.
// A "harder" render is evidence the axis is measurable; it is NOT evidence that the
// difficulty resembles a real Turkish or Indian speaker. Only a real recording settles that.
//
// Gemini TTS quota is tight (2026-09-02: a hard daily wall after 3 of 55 clips), so this
// renders ONE short sentence per arm, not a roster.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { normalise } from './rescore-entities.mjs';

const PROJ = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const SCRATCH = path.dirname(new URL(import.meta.url).pathname.replace(/^\//, ''));
const OUT = path.join(SCRATCH, 'accent-tts');
fs.mkdirSync(OUT, { recursive: true });
const require = createRequire(PROJ + '/package.json');
const { createClient, LiveTranscriptionEvents } = require('@deepgram/sdk');

const env = fs.readFileSync(PROJ + '/.env', 'utf8');
const GKEY = env.match(/^GEMINI_API_KEY=(.+)$/m)[1].trim();
const DKEY = env.match(/^DEEPGRAM_API_KEY=(.+)$/m)[1].trim();

const TEXT = "Our inference service has a p99 latency of 800 milliseconds against an SLA of 500, at about 4,000 requests per second. How would you bring it back under the SLA?";

const ARMS = [
    { id: 'neutral', style: 'Say this as an interviewer, calm and clear' },
    { id: 'turkish', style: 'Say this as a native Turkish speaker speaking English, with a noticeable Turkish accent, calm and clear' },
    { id: 'indian', style: 'Say this as a native Hindi speaker speaking English, with a noticeable Indian accent, calm and clear' },
    { id: 'nonnative', style: 'Say this as a non-native English speaker with a strong accent and slightly slower, more deliberate pace' },
];

const SR = 24000, FRAME_MS = 20, FRAME_BYTES = (SR / 1000) * FRAME_MS * 2;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function render(arm) {
    const f = path.join(OUT, `${arm.id}.pcm24`);
    if (fs.existsSync(f)) return fs.readFileSync(f);
    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': GKEY },
        body: JSON.stringify({
            contents: [{ parts: [{ text: `${arm.style}: ${TEXT}` }] }],
            generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } } },
        }),
    });
    const j = await res.json().catch(() => ({}));
    const b64 = j?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!b64) throw new Error(`${arm.id}: no audio — ${JSON.stringify(j).slice(0, 180)}`);
    const pcm = Buffer.from(b64, 'base64');
    fs.writeFileSync(f, pcm);
    return pcm;
}

async function transcribe(pcm) {
    const live = createClient(DKEY).listen.live({
        model: 'nova-3', language: 'en', smart_format: true, interim_results: true,
        encoding: 'linear16', sample_rate: SR, channels: 1, endpointing: 300, utterance_end_ms: 1000, vad_events: true,
    });
    const finals = []; let open = false;
    live.on(LiveTranscriptionEvents.Open, () => { open = true; });
    live.on(LiveTranscriptionEvents.Transcript, (d) => {
        const t = d.channel?.alternatives?.[0]?.transcript ?? '';
        if (d.is_final && t.trim()) finals.push(t);
    });
    for (let i = 0; i < 100 && !open; i++) await sleep(100);
    for (let o = 0; o < pcm.length; o += FRAME_BYTES) { live.send(pcm.subarray(o, o + FRAME_BYTES)); await sleep(FRAME_MS); }
    for (let t = 0; t < 2500; t += FRAME_MS) { live.send(Buffer.alloc(FRAME_BYTES)); await sleep(FRAME_MS); }
    await sleep(1200);
    try { live.requestClose?.(); live.finish?.(); } catch { }
    return finals.join(' ');
}

/** Word error rate of `got` against `want`, both normalised (Levenshtein over words). */
function wer(want, got) {
    const a = normalise(want).trim().split(/\s+/).filter(Boolean);
    const b = normalise(got).trim().split(/\s+/).filter(Boolean);
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
    for (let j = 0; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
        d[i][j] = a[i - 1] === b[j - 1] ? d[i - 1][j - 1] : 1 + Math.min(d[i - 1][j], d[i][j - 1], d[i - 1][j - 1]);
    return a.length ? d[a.length][b.length] / a.length : 0;
}

const FACTS = { p99: /\bp99\b/, 800: /\b800\b/, 500: /\b500\b/, 4000: /\b4000\b/, sla: /\bsla\b/ };

console.log('arm         secs   WER    facts lost   transcript');
const rows = [];
for (const arm of ARMS) {
    let pcm;
    try { pcm = await render(arm); } catch (e) { console.log(`${arm.id.padEnd(11)} RENDER FAILED — ${e.message}`); continue; }
    const secs = pcm.length / (SR * 2);
    const text = await transcribe(pcm);
    const n = normalise(text);
    const lost = Object.entries(FACTS).filter(([, re]) => !re.test(n)).map(([k]) => k);
    const w = wer(TEXT, text);
    rows.push({ id: arm.id, secs, wer: w, lost, text });
    console.log(`${arm.id.padEnd(11)} ${secs.toFixed(1).padStart(4)}  ${(w * 100).toFixed(0).padStart(4)}%  ${(lost.join(',') || 'none').padEnd(12)} ${JSON.stringify(text.slice(0, 90))}`);
    await sleep(1500);
}

const base = rows.find((r) => r.id === 'neutral');
console.log('\nINTERPRETATION');
if (!base) { console.log('  the neutral control did not render — nothing here is comparable.'); }
else {
    const harder = rows.filter((r) => r.id !== 'neutral' && r.wer > base.wer + 0.02);
    const sameLen = rows.filter((r) => r.id !== 'neutral' && Math.abs(r.secs - base.secs) < 0.5).map((r) => r.id);
    console.log(`  neutral WER ${(base.wer * 100).toFixed(0)}%; arms harder than it: ${harder.length ? harder.map((h) => `${h.id} ${(h.wer * 100).toFixed(0)}%`).join(', ') : 'NONE'}`);
    console.log(`  arms with near-identical duration to neutral (a sign the style prefix was IGNORED): ${sameLen.join(', ') || 'none'}`);
    console.log(harder.length
        ? '  => the accent axis is at least MEASURABLE this way. It is still not evidence of\n     resemblance to a real speaker — only a real recording settles that.'
        : '  => the style prefix changed nothing the STT can feel. Gemini TTS is NOT a usable\n     accent source; fall back to a real recording or a paid ElevenLabs tier.');
}
fs.writeFileSync(path.join(SCRATCH, 'spike-accent-out.json'), JSON.stringify(rows, null, 1));
