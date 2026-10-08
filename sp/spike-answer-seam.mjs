// Throwaway spike for approach C ("answer what was asked"): four assumptions
// tested against the flight logs before any code is written.
//   1. hold length: Live-after-STT gaps and split-final gaps, per question
//   2. fragment heuristic: flags the bad dispatch texts, spares the good ones
//   3. join rule: which Deepgram finals it would join, and whether that helps
//   4. 80-word sentence-end cut on the hour's own 52 answers
// usage: node spike-answer-seam.mjs <after4-run-dir> [<other-deepgram-run-dir>]
import fs from 'node:fs';
import path from 'node:path';

const ts = (s) => Date.parse(s);
const words = (s) => String(s).toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').split(/\s+/).filter(Boolean);
const wc = (s) => (String(s).trim().match(/\S+/g) ?? []).length;
function wer(ref, hyp) {
    const r = words(ref), h = words(hyp);
    const d = Array.from({ length: r.length + 1 }, (_, i) => [i, ...Array(h.length).fill(0)]);
    for (let j = 1; j <= h.length; j++) d[0][j] = j;
    for (let i = 1; i <= r.length; i++) for (let j = 1; j <= h.length; j++)
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (r[i - 1] === h[j - 1] ? 0 : 1));
    return r.length ? d[r.length][h.length] / r.length : 0;
}
const pct = (a, p) => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(s.length * p))] : null; };
const f = (x) => x == null ? '—' : (x * 100).toFixed(0) + '%';

// ── the heuristic under test ────────────────────────────────────────────────
// "Fragmentary" = the text is not a whole question: fewer than 4 words, or it
// opens with a conjunction, or it is short and has neither a question mark nor
// a question opener.
const OPENER = /^(what|why|how|when|where|which|who|whom|can|could|would|should|do|does|did|is|are|was|were|tell|walk|describe|explain|give|say|imagine|suppose|your|you|a|an|the|there|someone|inference|training|the same|to start)\b/i;
export function looksFragmentary(t) {
    const s = String(t).trim();
    const n = wc(s);
    if (n < 4) return true;
    if (/^(and|so|but|or|then|because|which means)\b/i.test(s)) return true;
    if (!/\?\s*$/.test(s) && n <= 6 && !OPENER.test(s)) return true;
    return false;
}
// The join rule under test: a final that opens with a conjunction, or that is a
// question while the previous final (within 3 s) was a statement, is appended
// to that previous final.
export function shouldJoin(prev, cur) {
    if (!prev || cur.at - prev.at > 3000) return false;
    if (/^(and|so|but|or|then)\b/i.test(cur.text)) return true;
    return /\?\s*$/.test(cur.text) && !/\?\s*$/.test(prev.text);
}
// The cut under test: whole sentences until the next would cross the limit.
export function cutAtSentences(text, limit = 80) {
    const sentences = String(text).match(/[^.!?]+[.!?]+["']?\s*|[^.!?]+$/g) ?? [String(text)];
    let out = '', n = 0;
    for (const s of sentences) { const k = wc(s); if (n && n + k > limit) break; out += s; n += k; if (n >= limit) break; }
    return out.trim();
}

const [dir, dir2] = process.argv.slice(2);
const dbg = fs.readFileSync(path.join(dir, 'natively_debug.log'), 'utf8');
const timeline = JSON.parse(fs.readFileSync(path.join(dir, 'interview60.timeline.json'), 'utf8'));
const items = timeline.items.filter((i) => (i.kind ?? 'spoken') === 'spoken').map((i) => ({ ...i, spokeEnd: i.playedAt + Math.round((i.clipSecs ?? 0) * 1000) }));
const finals = [...dbg.matchAll(/^(\S+) \[LOG\] \[DeepgramStreaming\] Transcript event — isFinal=true, text="([^"]+)"/gm)].map((m) => ({ at: ts(m[1]), text: m[2] }));
const liveQ = [...dbg.matchAll(/^(\S+) \[LOG\] \[Main\] Live question \((\w+), mode=\w+\): "([^"]*)"/gm)].map((m) => ({ at: ts(m[1]), text: m[3] }));
const dispatches = [...dbg.matchAll(/^(\S+) \[LOG\] \[Main\] dispatch: answer source=(live|whisper) anchor="((?:[^"\\]|\\.)*)" verdict=(\w+)/gm)].map((m) => ({ at: ts(m[1]), source: m[2], anchor: JSON.parse(`"${m[3]}"`), verdict: m[4] }));
const win = (it, e, tail = 12000) => e.at >= it.playedAt - 1000 && e.at <= it.spokeEnd + tail;

// 1. Gaps.
console.log('=== 1. hold length: gaps the hold must cover ===');
const gaps = [], splitGaps = [];
for (const it of items) {
    const fs_ = finals.filter((e) => win(it, e)), lq = liveQ.filter((e) => win(it, e));
    if (fs_.length && lq.length) gaps.push({ id: it.id, gap: lq[0].at - fs_[0].at, firstFinal: fs_[0].text });
    for (let i = 1; i < fs_.length; i++) splitGaps.push({ id: it.id, gap: fs_[i].at - fs_[i - 1].at, prev: fs_[i - 1].text, cur: fs_[i].text });
}
const g = gaps.map((x) => x.gap);
console.log(`Live question after the first STT final: n ${g.length}  p50 ${pct(g, .5)} ms  p90 ${pct(g, .9)} ms  max ${Math.max(...g)} ms   (negative = Live first)`);
console.log(`  Live later than STT by > 0: ${g.filter((x) => x > 0).length};  ≤ 1500 ms ${g.filter((x) => x > 0 && x <= 1500).length};  ≤ 2000 ms ${g.filter((x) => x > 0 && x <= 2000).length};  ≤ 2500 ms ${g.filter((x) => x > 0 && x <= 2500).length}`);
for (const id of ['M26', 'M27', 'M28', 'H09']) { const x = gaps.find((y) => y.id === id); console.log(`  ${id}: Live − STT = ${x ? x.gap + ' ms' : '—'}   STT first final: ${JSON.stringify(x?.firstFinal ?? '')}`); }
const sg = splitGaps.map((x) => x.gap);
console.log(`split finals inside one question: n ${sg.length}  p50 ${pct(sg, .5)} ms  p90 ${pct(sg, .9)} ms  max ${sg.length ? Math.max(...sg) : 0} ms`);
for (const x of splitGaps.filter((x) => x.id === 'H09')) console.log(`  H09: ${x.gap} ms between ${JSON.stringify(x.prev)} and ${JSON.stringify(x.cur)}`);

// 2. Fragment heuristic over the dispatch anchors.
console.log('\n=== 2. fragment heuristic over the 57 dispatch anchors ===');
const flagged = dispatches.filter((d) => looksFragmentary(d.anchor));
console.log(`flagged ${flagged.length}/${dispatches.length}`);
for (const d of flagged) {
    const it = items.filter((i) => d.at >= i.playedAt - 2000 && d.at <= i.spokeEnd + 60000).sort((a, b) => b.playedAt - a.playedAt)[0];
    console.log(`  ${(it?.id ?? '?').padEnd(4)} ${d.source.padEnd(7)} ${JSON.stringify(d.anchor.slice(0, 70))}   ${it ? 'WER vs script ' + f(wer(it.q, d.anchor)) : ''}`);
}
const bad = ['M26', 'M27', 'M28', 'H09'];
const badAnchors = dispatches.filter((d) => { const it = items.filter((i) => d.at >= i.playedAt - 2000 && d.at <= i.spokeEnd + 60000).sort((a, b) => b.playedAt - a.playedAt)[0]; return it && bad.includes(it.id); });
console.log(`the four wrong answers' anchors flagged: ${badAnchors.filter((d) => looksFragmentary(d.anchor)).length}/${badAnchors.length}   ${badAnchors.map((d) => JSON.stringify(d.anchor.slice(0, 40)) + (looksFragmentary(d.anchor) ? ' ✓' : ' ✗')).join('  ')}`);

// 3. Join rule over every Deepgram final, both hours.
console.log('\n=== 3. join rule over Deepgram finals ===');
for (const d of [dir, dir2].filter(Boolean)) {
    const log = fs.readFileSync(path.join(d, 'natively_debug.log'), 'utf8');
    const tl = JSON.parse(fs.readFileSync(path.join(d, 'interview60.timeline.json'), 'utf8'));
    const its = tl.items.filter((i) => (i.kind ?? 'spoken') === 'spoken').map((i) => ({ ...i, spokeEnd: i.playedAt + Math.round((i.clipSecs ?? 0) * 1000) }));
    const fin = [...log.matchAll(/^(\S+) \[LOG\] \[DeepgramStreaming\] Transcript event — isFinal=true, text="([^"]+)"/gm)].map((m) => ({ at: ts(m[1]), text: m[2] }));
    let joins = 0, better = 0, worse = 0, same = 0, cross = 0;
    for (let i = 1; i < fin.length; i++) {
        if (!shouldJoin(fin[i - 1], fin[i])) continue;
        joins++;
        const it = its.find((x) => win(x, fin[i]));
        const itPrev = its.find((x) => win(x, fin[i - 1]));
        if (it && itPrev && it.id !== itPrev.id) { cross++; console.log(`  CROSS-ITEM join ${itPrev.id}+${it.id}: ${JSON.stringify(fin[i - 1].text.slice(0, 40))} + ${JSON.stringify(fin[i].text.slice(0, 40))}`); continue; }
        if (!it) continue;
        const before = wer(it.q, fin[i].text), after = wer(it.q, fin[i - 1].text + ' ' + fin[i].text);
        if (after < before) better++; else if (after > before) worse++; else same++;
        console.log(`  ${it.id} ${f(before)} → ${f(after)}   ${JSON.stringify(fin[i - 1].text.slice(0, 45))} + ${JSON.stringify(fin[i].text.slice(0, 45))}`);
    }
    console.log(`${path.basename(d)}: joins ${joins}  better ${better}  worse ${worse}  same ${same}  cross-item ${cross}`);
}

// 4. The 80-word cut on the hour's own answers.
console.log('\n=== 4. 80-word sentence-end cut on the 52 in-app answers ===');
const judge = JSON.parse(fs.readFileSync(path.join(dir, 'interview60.judge.json'), 'utf8'));
const answers = Object.values(judge.items).filter((v) => v.kind === 'spoken' && v.answer);
const before = answers.map((v) => wc(v.answer)), after = answers.map((v) => wc(cutAtSentences(v.answer, 80)));
const cut = answers.filter((v) => wc(cutAtSentences(v.answer, 80)) < wc(v.answer));
console.log(`answers ${answers.length}: words median ${pct(before, .5)} → ${pct(after, .5)}   over 80: ${before.filter((n) => n > 80).length} → ${after.filter((n) => n > 80).length}   cut ${cut.length}   kept-words median on cut ones ${pct(cut.map((v) => wc(cutAtSentences(v.answer, 80))), .5)}   under 40 after cut ${after.filter((n) => n < 40).length}`);
const ex = cut[0]; if (ex) console.log(`  example: ${wc(ex.answer)}w → ${wc(cutAtSentences(ex.answer, 80))}w  ends "${cutAtSentences(ex.answer, 80).slice(-70)}"`);
