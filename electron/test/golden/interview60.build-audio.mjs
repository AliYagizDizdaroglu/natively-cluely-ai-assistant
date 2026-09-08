/**
 * Render interview60.questions.mjs to ONE continuous WAV the operator can play
 * into the live app, and the harness can stream as PCM.
 *
 * Per-item audio is cached to disk, so a 429 wall costs only the items it hit —
 * re-run and it resumes. Every clip is rate-validated before it is accepted: a
 * TTS clip that is implausibly fast or slow has previously looked exactly like a
 * model defect downstream, so a bad clip is rejected here rather than debugged
 * an hour later.
 *
 *   node electron/test/golden/interview60.build-audio.mjs
 *
 * Output: electron/test/golden/interview60.wav  (24 kHz mono 16-bit)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { INTERVIEW, TTS_GEMINI_DIR, WAV_NAME } from './roster.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJ = path.resolve(HERE, '../../..');
const TTS_DIR = path.join(HERE, TTS_GEMINI_DIR);
const OUT_WAV = path.join(HERE, WAV_NAME);
const SR = 24000;                 // Gemini TTS returns 24 kHz mono s16le
const BYTES_PER_SEC = SR * 2;

fs.mkdirSync(TTS_DIR, { recursive: true });

const KEY = fs.readFileSync(path.join(PROJ, '.env'), 'utf8').match(/^GEMINI_API_KEY=(.+)$/m)[1].trim();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const words = (s) => (s.trim().match(/\S+/g) || []).length;

async function tts(item) {
    const f = path.join(TTS_DIR, `${item.id}.pcm24`);
    if (fs.existsSync(f)) return fs.readFileSync(f);

    let lastErr = 'unknown';
    for (let a = 0; a < 6; a++) {
        const res = await fetch(
            'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent',
            {
                method: 'POST',
                headers: { 'content-type': 'application/json', 'x-goog-api-key': KEY },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: `Say this as an interviewer, calm and clear: ${item.q}` }] }],
                    generationConfig: {
                        responseModalities: ['AUDIO'],
                        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
                    },
                }),
            },
        );
        const j = await res.json().catch(() => ({}));
        const b64 = j?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (b64) {
            const buf = Buffer.from(b64, 'base64');
            fs.writeFileSync(f, buf);
            return buf;
        }
        lastErr = `HTTP ${res.status} ${JSON.stringify(j).slice(0, 100)}`;
        await sleep(res.status === 429 ? 30000 : 6000);
    }
    throw new Error(`TTS failed ${item.id}: ${lastErr}`);
}

function wavHeader(dataBytes) {
    const h = Buffer.alloc(44);
    h.write('RIFF', 0);
    h.writeUInt32LE(36 + dataBytes, 4);
    h.write('WAVE', 8);
    h.write('fmt ', 12);
    h.writeUInt32LE(16, 16);
    h.writeUInt16LE(1, 20);            // PCM
    h.writeUInt16LE(1, 22);            // mono
    h.writeUInt32LE(SR, 24);
    h.writeUInt32LE(BYTES_PER_SEC, 28);
    h.writeUInt16LE(2, 32);            // block align
    h.writeUInt16LE(16, 34);           // bits
    h.write('data', 36);
    h.writeUInt32LE(dataBytes, 40);
    return h;
}

const parts = [];
const rejected = [];
let cached = 0, fetched = 0;

console.log(`Building ${INTERVIEW.length} items -> ${path.relative(PROJ, OUT_WAV)}\n`);
for (const item of INTERVIEW) {
    const existed = fs.existsSync(path.join(TTS_DIR, `${item.id}.pcm24`));
    const pcm = await tts(item);
    existed ? cached++ : fetched++;

    const secs = pcm.length / BYTES_PER_SEC;
    const wps = words(item.q) / secs;
    if (wps < 1.6 || wps > 4.5) {
        // Reject rather than trust: an implausible rate means the clip is
        // truncated or padded, and it would masquerade as a detection bug later.
        rejected.push(`${item.id} ${wps.toFixed(2)} w/s`);
        fs.unlinkSync(path.join(TTS_DIR, `${item.id}.pcm24`));
        continue;
    }

    parts.push(pcm, Buffer.alloc(Math.round((item.gapMs / 1000) * BYTES_PER_SEC)));
    const tag = item.kind === 'screenshot' ? ' [SCREENSHOT CUE]' : '';
    console.log(`  ${item.id.padEnd(4)} ${secs.toFixed(1)}s ${wps.toFixed(2)} w/s  +${(item.gapMs / 1000).toFixed(0)}s gap${tag}${existed ? '  (cached)' : ''}`);
    if (!existed) await sleep(1500);
}

const data = Buffer.concat(parts);
fs.writeFileSync(OUT_WAV, Buffer.concat([wavHeader(data.length), data]));

const mins = data.length / BYTES_PER_SEC / 60;
console.log(`\n  items ok   ${INTERVIEW.length - rejected.length}/${INTERVIEW.length}   (cached ${cached}, fetched ${fetched})`);
if (rejected.length) console.log(`  REJECTED   ${rejected.join(', ')}  — re-run to retry these`);
console.log(`  duration   ${mins.toFixed(1)} min`);
console.log(`  wrote      ${OUT_WAV}`);
