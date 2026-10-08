// Throwaway: Groq Whisper (whisper-large-v3, the app's RestSTT model) on the 52
// spoken clips of the interview, scored against the script with the same WER as
// the other engines. The in-app log truncates Groq transcripts at 63 chars, so
// accuracy has to be measured directly. One request per clip, paced for the free
// tier; results cached per clip so a rerun is free. Key read in-process from .env.
// usage: node groq-whisper-wer.mjs <repo-root>
import fs from 'node:fs';
import path from 'node:path';

const root = process.argv[2];
const env = fs.readFileSync(path.join(root, '.env'), 'utf8');
const KEY = env.match(/^GROQ_API_KEY=(.+)$/m)?.[1]?.trim();
if (!KEY) { console.error('no GROQ_API_KEY in .env'); process.exit(2); }
const { INTERVIEW } = await import(path.join(root, 'electron/test/golden/interview60.questions.mjs').replace(/\\/g, '/').replace(/^([A-Za-z]):/, 'file:///$1:'));
const CLIPS = path.join(root, 'electron/test/golden/interview60-tts-local');
const OUT = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), 'groq-whisper-wer.json');
const MODEL = 'whisper-large-v3';

const words = (s) => String(s).toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').split(/\s+/).filter(Boolean);
function wer(ref, hyp) {
    const r = words(ref), h = words(hyp);
    const d = Array.from({ length: r.length + 1 }, (_, i) => [i, ...Array(h.length).fill(0)]);
    for (let j = 1; j <= h.length; j++) d[0][j] = j;
    for (let i = 1; i <= r.length; i++) for (let j = 1; j <= h.length; j++)
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (r[i - 1] === h[j - 1] ? 0 : 1));
    return r.length ? d[r.length][h.length] / r.length : 0;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const store = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};
const items = INTERVIEW.filter((i) => (i.kind ?? 'spoken') === 'spoken');
console.log(`GROQ WHISPER  model=${MODEL}  ${items.length} clips from ${CLIPS}`);

for (const it of items) {
    if (store[it.id]?.text != null) continue;
    const file = path.join(CLIPS, `${it.id}.wav`);
    if (!fs.existsSync(file)) { console.log(`  ${it.id} no clip`); continue; }
    for (let attempt = 1; attempt <= 4; attempt++) {
        const form = new FormData();
        form.append('file', new Blob([fs.readFileSync(file)], { type: 'audio/wav' }), `${it.id}.wav`);
        form.append('model', MODEL);
        form.append('response_format', 'json');
        const t0 = Date.now();
        const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', { method: 'POST', headers: { authorization: `Bearer ${KEY}` }, body: form });
        const ms = Date.now() - t0;
        if (res.status === 429) { const wait = Number(res.headers.get('retry-after') ?? 10) * 1000; console.log(`  ${it.id} 429, waiting ${wait} ms`); await sleep(wait); continue; }
        if (!res.ok) { console.log(`  ${it.id} HTTP ${res.status}`); store[it.id] = { error: `HTTP ${res.status}` }; break; }
        const j = await res.json();
        const text = String(j.text ?? '').trim();
        store[it.id] = { text, ms, wer: wer(it.q, text) };
        console.log(`  ${it.id} ${(store[it.id].wer * 100).toFixed(0).padStart(3)}%  ${String(ms).padStart(5)} ms  ${JSON.stringify(text.slice(0, 90))}`);
        break;
    }
    fs.writeFileSync(OUT, JSON.stringify(store, null, 1));
    await sleep(3200); // free tier: stay under 20 requests a minute
}
const done = items.map((it) => store[it.id]).filter((r) => r && r.text != null);
const ws = done.map((r) => r.wer), ms = done.map((r) => r.ms);
const pct = (a, p) => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(s.length * p))] : null; };
const f = (x) => (x * 100).toFixed(0) + '%';
console.log(`\nGroq Whisper direct: transcribed ${done.length}/${items.length}   WER median ${f(pct(ws, .5))} p90 ${f(pct(ws, .9))}   >25% ${ws.filter((w) => w > 0.25).length}   >50% ${ws.filter((w) => w > 0.5).length}   request time median ${pct(ms, .5)} ms p90 ${pct(ms, .9)} ms`);
const worst = items.map((it) => ({ id: it.id, ...store[it.id] })).filter((r) => r.wer != null).sort((a, b) => b.wer - a.wer).slice(0, 4);
for (const r of worst) console.log(`   worst ${r.id} ${f(r.wer)}  ${JSON.stringify(r.text.slice(0, 100))}`);
