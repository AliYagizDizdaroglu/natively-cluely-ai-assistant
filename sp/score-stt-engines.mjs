// Throwaway: one yardstick for every STT engine we logged, on the same 52-question
// audio — Groq REST Whisper ([RestSTT] Transcript lines), Deepgram streaming
// (isFinal=true lines) and Gemini Live captions ([LiveCaption] fragment lines).
// Per spoken item: text in the play window, word error rate vs the script, delay
// from the end of the spoken sentence to the first text event, and how many text
// events it took. usage: node score-stt-engines.mjs <run-dir> [<run-dir> ...]
import fs from 'node:fs';
import path from 'node:path';

const words = (s) => String(s).toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').split(/\s+/).filter(Boolean);
function wer(ref, hyp) {
    const r = words(ref), h = words(hyp);
    const d = Array.from({ length: r.length + 1 }, (_, i) => [i, ...Array(h.length).fill(0)]);
    for (let j = 1; j <= h.length; j++) d[0][j] = j;
    for (let i = 1; i <= r.length; i++) for (let j = 1; j <= h.length; j++)
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (r[i - 1] === h[j - 1] ? 0 : 1));
    return r.length ? d[r.length][h.length] / r.length : 0;
}
const pct = (a, p) => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(s.length * p))] : null; };
const f = (x) => x == null ? '   —' : (x * 100).toFixed(0).padStart(3) + '%';
const ms = (x) => x == null ? '    —' : String(Math.round(x)).padStart(5) + ' ms';
const ts = (s) => Date.parse(s);

const ENGINES = {
    'Groq REST Whisper': (dbg) => [...dbg.matchAll(/^(\S+) \[LOG\] \[RestSTT\] Transcript: "(.*?)\.{0,3}" id=/gm)].map((m) => ({ at: ts(m[1]), text: m[2].trim() })).filter((e) => e.text),
    'Deepgram streaming': (dbg) => [...dbg.matchAll(/^(\S+) \[LOG\] \[DeepgramStreaming\] Transcript event — isFinal=true, text="([^"]+)"/gm)].map((m) => ({ at: ts(m[1]), text: m[2] })),
    'Live 3.x captions': (dbg) => [...dbg.matchAll(/^(\S+) \[LOG\] \[LiveCaption\] fragment (".*")$/gm)].map((m) => ({ at: ts(m[1]), text: JSON.parse(m[2]) })),
};

for (const dir of process.argv.slice(2)) {
    const dbg = fs.readFileSync(path.join(dir, 'natively_debug.log'), 'utf8');
    const timeline = JSON.parse(fs.readFileSync(path.join(dir, 'interview60.timeline.json'), 'utf8'));
    const items = timeline.items.filter((i) => (i.kind ?? 'spoken') === 'spoken');
    console.log(`\n=== ${path.basename(dir)} — ${items.length} spoken questions ===`);
    for (const [name, extract] of Object.entries(ENGINES)) {
        const events = extract(dbg);
        if (!events.length) continue;
        const rows = items.map((it) => {
            const spokeEnd = it.playedAt + Math.round((it.clipSecs ?? 0) * 1000);
            const inWin = events.filter((e) => e.at >= it.playedAt - 1000 && e.at <= spokeEnd + 12000);
            const text = inWin.map((e) => e.text).join(' ').replace(/\s+/g, ' ').trim();
            // Delay: end of the spoken sentence → the first text event that lands after the sentence ended.
            const first = inWin.find((e) => e.at >= spokeEnd - 500);
            return { id: it.id, w: text ? wer(it.q, text) : null, delay: first ? first.at - spokeEnd : null, n: inWin.length };
        });
        const have = rows.filter((r) => r.w != null);
        const ws = have.map((r) => r.w), ds = rows.filter((r) => r.delay != null).map((r) => r.delay);
        console.log(`${name.padEnd(20)} events/h ${String(events.length).padStart(3)}   heard ${have.length}/${rows.length}   WER median ${f(pct(ws, .5))} p90 ${f(pct(ws, .9))}   >25% ${ws.filter((w) => w > 0.25).length}   >50% ${ws.filter((w) => w > 0.5).length}   delay after sentence: median ${ms(pct(ds, .5))} p90 ${ms(pct(ds, .9))}   events per question: median ${pct(rows.map((r) => r.n), .5)} max ${Math.max(...rows.map((r) => r.n))}`);
    }
}
