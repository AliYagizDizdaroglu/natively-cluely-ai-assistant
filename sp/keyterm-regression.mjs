// REGRESSION SWEEP: does the keyterm list make any OTHER question worse?
// Replays every s50j clip through the live socket twice — list off, list on — and scores each
// against the scripted text by word error rate. A term list that biases the decoder would show
// up as WER rising on questions the list never mentions.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const PROJ = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const WT = `${PROJ}/.claude/worktrees/whole-turn`;
const require_ = createRequire(import.meta.url);
const KEY = fs.readFileSync(path.join(PROJ, '.env'), 'utf8').match(/^DEEPGRAM_API_KEY=(.+)$/m)[1].trim();
const { DEEPGRAM_KEYTERMS } = require_(`${WT}/dist-electron/electron/audio/deepgramKeyterms.js`);
const { createClient, LiveTranscriptionEvents } = require_(`${PROJ}/node_modules/@deepgram/sdk`);

const buf = fs.readFileSync(path.join(PROJ, 'electron/test/golden/scenario50.wav'));
const SRC = buf.readUInt32LE(24), OUT = 16000, bps = SRC * 2;
function pcm(startSec, secs) {
    const from = 44 + Math.floor(startSec * bps / 2) * 2;
    const src = buf.subarray(from, Math.min(from + Math.floor(secs * bps / 2) * 2, buf.length));
    const r = SRC / OUT, n = Math.floor((src.length / 2) / r), out = Buffer.alloc(n * 2);
    for (let i = 0; i < n; i++) out.writeInt16LE(src.readInt16LE(Math.floor(i * r) * 2), i * 2);
    return out;
}
function transcribe(audio, terms) {
    return new Promise((resolve) => {
        const live = createClient(KEY).listen.live({
            model: 'nova-3', language: 'en', smart_format: true, interim_results: true,
            encoding: 'linear16', sample_rate: OUT, channels: 1,
            endpointing: 300, utterance_end_ms: 1000, vad_events: true,
            ...(terms.length ? { keyterm: terms } : {}),
        });
        const finals = [];
        const done = () => { try { live.requestClose(); } catch { } resolve(finals.join(' ').trim()); };
        const guard = setTimeout(done, 60000);
        live.on(LiveTranscriptionEvents.Open, async () => {
            const CH = OUT * 2 / 10;
            for (let o = 0; o < audio.length; o += CH) {
                live.send(audio.subarray(o, Math.min(o + CH, audio.length)));
                await new Promise((r) => setTimeout(r, 20));
            }
            setTimeout(() => { clearTimeout(guard); done(); }, 6000);
        });
        live.on(LiveTranscriptionEvents.Transcript, (d) => {
            const t = d.channel?.alternatives?.[0]?.transcript;
            if (d.is_final && t) finals.push(t);
        });
        live.on(LiveTranscriptionEvents.Error, () => { clearTimeout(guard); done(); });
    });
}

const norm = (s) => s.toLowerCase().replace(/[-_/]/g, ' ').replace(/[^a-z0-9\s']/g, ' ').split(/\s+/).filter(Boolean);
// Levenshtein over words -> word error rate against the scripted question
function wer(ref, hyp) {
    const a = norm(ref), b = norm(hyp);
    if (!a.length) return null;
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
    for (let j = 0; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[a.length][b.length] / a.length;
}

const timeline = JSON.parse(fs.readFileSync(`${PROJ}/electron/test/golden/interview60.runs/2026-09-19T08-22-41-s50j/interview60.timeline.json`, 'utf8'));
const items = (timeline.items ?? []).filter((i) => i.q && i.clipSecs);
console.log(`${items.length} clips, ${DEEPGRAM_KEYTERMS.length} keyterms, two passes each\n`);

const rows = [];
for (const it of items) {
    const audio = pcm(it.startSec, it.clipSecs + 1.0);
    const off = await transcribe(audio, []);
    const on = await transcribe(audio, [...DEEPGRAM_KEYTERMS]);
    const wOff = wer(it.q, off), wOn = wer(it.q, on);
    rows.push({ id: it.id, wOff, wOn, d: (wOn ?? 0) - (wOff ?? 0), off, on });
    const mark = wOn < wOff ? 'BETTER' : wOn > wOff ? 'WORSE ' : 'same  ';
    console.log(`${it.id.padEnd(8)} ${mark}  wer off ${(wOff * 100).toFixed(1).padStart(5)}%  on ${(wOn * 100).toFixed(1).padStart(5)}%`);
}

const better = rows.filter((r) => r.d < -0.0001), worse = rows.filter((r) => r.d > 0.0001);
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
console.log(`\n=== ${rows.length} clips ===`);
console.log(`mean WER  off ${(mean(rows.map((r) => r.wOff)) * 100).toFixed(2)}%   on ${(mean(rows.map((r) => r.wOn)) * 100).toFixed(2)}%`);
console.log(`better ${better.length}   worse ${worse.length}   unchanged ${rows.length - better.length - worse.length}`);
if (worse.length) {
    console.log('\nREGRESSIONS (keyterm made these worse):');
    for (const r of worse.sort((a, b) => b.d - a.d)) {
        console.log(`  ${r.id}  +${(r.d * 100).toFixed(1)} pts`);
        console.log(`    script: ${r.off.slice(0, 0)}${norm(items.find((i) => i.id === r.id).q).join(' ').slice(0, 130)}`);
        console.log(`    off   : ${norm(r.off).join(' ').slice(0, 130)}`);
        console.log(`    on    : ${norm(r.on).join(' ').slice(0, 130)}`);
    }
}
fs.writeFileSync(path.join(process.env.TEMP ?? '.', 'keyterm-regression.json'), JSON.stringify(rows, null, 1));
process.exit(0);
