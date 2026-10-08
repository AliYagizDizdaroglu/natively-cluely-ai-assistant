// CONTROL for the regression sweep: run the SAME config repeatedly. If off-vs-off scatters as
// much as off-vs-on did, the sweep's "3 better / 2 worse" is harness noise, not keyterm bias.
// Covers both clips the sweep called worse and both it called better.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const PROJ = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const require_ = createRequire(import.meta.url);
const KEY = fs.readFileSync(path.join(PROJ, '.env'), 'utf8').match(/^DEEPGRAM_API_KEY=(.+)$/m)[1].trim();
const { DEEPGRAM_KEYTERMS } = require_(`${PROJ}/.claude/worktrees/whole-turn/dist-electron/electron/audio/deepgramKeyterms.js`);
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
function wer(ref, hyp) {
    const a = norm(ref), b = norm(hyp); if (!a.length) return null;
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
    for (let j = 0; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[a.length][b.length] / a.length;
}

const timeline = JSON.parse(fs.readFileSync(`${PROJ}/electron/test/golden/interview60.runs/2026-09-19T08-22-41-s50j/interview60.timeline.json`, 'utf8'));
const IDS = ['S1Q08', 'S1Q06', 'S1Q07', 'S2Q01'];   // the 2 "worse" and 2 of the 3 "better"

console.log('3 reps per config, same clip — spread WITHIN a config is the noise floor\n');
for (const id of IDS) {
    const it = timeline.items.find((x) => x.id === id);
    const audio = pcm(it.startSec, it.clipSecs + 1.0);
    const out = {};
    for (const [label, terms] of [['OFF', []], ['ON ', [...DEEPGRAM_KEYTERMS]]]) {
        const w = [], len = [];
        for (let r = 0; r < 3; r++) {
            const t = await transcribe(audio, terms);
            w.push(wer(it.q, t) * 100); len.push(norm(t).length);
        }
        out[label] = { w, len };
        console.log(`${id.padEnd(7)} ${label}  wer ${w.map((x) => x.toFixed(1).padStart(5)).join('  ')}   words ${len.join(' ')}`);
    }
    const spreadOff = Math.max(...out['OFF'].w) - Math.min(...out['OFF'].w);
    const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
    const between = mean(out['ON '].w) - mean(out['OFF'].w);
    console.log(`${' '.repeat(7)}      within-OFF spread ${spreadOff.toFixed(1)} pts   |   ON minus OFF (means) ${between >= 0 ? '+' : ''}${between.toFixed(1)} pts\n`);
}
process.exit(0);
