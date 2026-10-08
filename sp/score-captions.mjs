// Throwaway: word error rate of the two ears against the scripted questions,
// per spoken item, from one run folder: Live 3.x captions ([LiveCaption]
// fragment lines, shadow-logged since d8d6d8b) vs Deepgram streaming finals.
// usage: node score-captions.mjs <run-dir>
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
// Calibration against known answers before trusting a single number.
const check = (a, b, want) => { const got = wer(a, b); if (Math.abs(got - want) > 1e-9) throw new Error(`wer calibration: ${JSON.stringify([a, b])} → ${got}, wanted ${want}`); };
check('what is a pod', 'what is a pod', 0);
check('what is a pod', 'what is a node', 0.25);      // one substitution of four
check('what is a pod', 'what is pod', 0.25);         // one deletion
check('what is a pod', 'so what is a pod', 0.25);    // one insertion
check('what is a pod', '', 1);                        // nothing heard
console.log('wer calibration ok');

const dir = process.argv[2];
const dbg = fs.readFileSync(path.join(dir, 'natively_debug.log'), 'utf8');
const timeline = JSON.parse(fs.readFileSync(path.join(dir, 'interview60.timeline.json'), 'utf8'));
const ts = (s) => Date.parse(s);
const captions = [...dbg.matchAll(/^(\S+) \[LOG\] \[LiveCaption\] fragment (".*")$/gm)].map((m) => ({ at: ts(m[1]), text: JSON.parse(m[2]) }));
const finals = [...dbg.matchAll(/^(\S+) \[LOG\] \[DeepgramStreaming\] Transcript event — isFinal=true, text="([^"]*)"/gm)].map((m) => ({ at: ts(m[1]), text: m[2] })).filter((f) => f.text);
console.log(`captions ${captions.length}   deepgram finals (non-empty) ${finals.length}\n`);

const items = timeline.items.filter((i) => (i.kind ?? 'spoken') === 'spoken');
const rows = items.map((it) => {
    const from = it.playedAt - 1000, to = it.playedAt + Math.round((it.clipSecs ?? 0) * 1000) + 12000;
    const inWin = (e) => e.at >= from && e.at <= to;
    const live = captions.filter(inWin).map((c) => c.text).join(' ').replace(/\s+/g, ' ').trim();
    const dg = finals.filter(inWin).map((f) => f.text).join(' ').replace(/\s+/g, ' ').trim();
    return { id: it.id, q: it.q, live, dg, liveWer: live ? wer(it.q, live) : null, dgWer: dg ? wer(it.q, dg) : null };
});

const pct = (a, p) => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(s.length * p))] : null; };
const f = (x) => x == null ? '   —' : (x * 100).toFixed(0).padStart(3) + '%';
console.log('item   live   dg     question');
for (const r of rows) console.log(`${r.id.padEnd(5)} ${f(r.liveWer)}  ${f(r.dgWer)}   ${r.q.slice(0, 70)}`);
for (const [name, key] of [['Live 3.x captions', 'liveWer'], ['Deepgram finals', 'dgWer']]) {
    const have = rows.filter((r) => r[key] != null).map((r) => r[key]);
    console.log(`\n${name}: heard ${have.length}/${rows.length}   WER median ${f(pct(have, .5))}  p90 ${f(pct(have, .9))}   ≤10% ${have.filter((w) => w <= 0.10).length}   ≤25% ${have.filter((w) => w <= 0.25).length}   >50% ${have.filter((w) => w > 0.5).length}`);
    const worst = rows.filter((r) => r[key] != null).sort((a, b) => b[key] - a[key]).slice(0, 4);
    for (const r of worst) console.log(`   worst ${r.id} ${f(r[key])}  heard: ${JSON.stringify((key === 'liveWer' ? r.live : r.dg).slice(0, 110))}`);
    const missing = rows.filter((r) => r[key] == null).map((r) => r.id);
    if (missing.length) console.log(`   nothing in window: ${missing.join(' ')}`);
}
// Head to head on items both ears heard.
const both = rows.filter((r) => r.liveWer != null && r.dgWer != null);
console.log(`\nhead to head on ${both.length} items: Live better ${both.filter((r) => r.liveWer < r.dgWer).length}, Deepgram better ${both.filter((r) => r.dgWer < r.liveWer).length}, tie ${both.filter((r) => r.liveWer === r.dgWer).length}`);
