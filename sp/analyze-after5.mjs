// Throwaway analysis of the after5 hour (Groq REST STT regime, first flight
// with the pinned question / fragment hold / word budget build):
//   1. Whisper hallucinations on the silence between clips: how many RestSTT
//      transcripts are hallucination-shaped, and how many dispatched answers
//      have a phantom as their question.
//   2. Reconcile 'replaced' verdicts: for each, would the proposed guard
//      (looksFragmentary(said) instead of isFragment(said)) have kept Live's
//      claim instead? And did the item end up answered correctly anyway?
//   3. Holds: what each held, what resolved it (a better text, expiry → answer,
//      expiry → duplicate drop), and whether a detector chip UPDATE with the
//      real question arrived after the hold expired (the update-never-dispatched hole).
//   4. Pinned pairing + budget distribution over the hour.
// usage: node analyze-after5.mjs <run-dir>
import fs from 'node:fs';
import path from 'node:path';

const dir = process.argv[2];
const dbg = fs.readFileSync(path.join(dir, 'natively_debug.log'), 'utf8').split('\n');
const timeline = JSON.parse(fs.readFileSync(path.join(dir, 'interview60.timeline.json'), 'utf8'));
const items = timeline.items.map((i) => ({ ...i, spokeEnd: i.playedAt + Math.round((i.clipSecs ?? 0) * 1000) }));
const ts = (s) => Date.parse(s);
const wc = (s) => (String(s).trim().match(/\S+/g) ?? []).length;
const OPENERS = new Set(['what','why','how','when','where','which','who','whom','whose','can','could','would','should','do','does','did','is','are','was','were','will','have','has','tell','walk','describe','explain','give','compare','imagine','suppose','say','let']);
function looksFragmentary(text) { const t = String(text).trim(); const w = t.split(/\s+/).filter(Boolean); if (w.length < 4) return true; if (/^(and|so|but|or|then|because)\b/i.test(t)) return true; if (w.length > 6) return false; if (/[?？]["'”’)\]]*$/.test(t)) return false; const f = w[0].toLowerCase().replace(/^[^a-z]+/, '').replace(/[^a-z].*$/, ''); return !OPENERS.has(f); }
const isFragment = (t) => String(t).trim().split(/\s+/).filter(Boolean).length < 4;
const HALLUC = /^\s*(I'm going to go|I'm sorry|I'm not going|Thank you|Thanks for watching|Bye|You|Okay|So|The|Where's)\b/i;
const itemAt = (at) => items.filter((i) => at >= i.playedAt - 2000 && at <= i.spokeEnd + 60000).sort((a, b) => b.playedAt - a.playedAt)[0];

const lines = dbg.map((l) => { const m = l.match(/^(\S+) \[(LOG|WARN|ERROR)\] (.*)$/); return m ? { at: ts(m[1]), text: m[3] } : null; }).filter(Boolean);
const rest = lines.filter((l) => l.text.startsWith('[RestSTT] Transcript: '));
const halluc = rest.filter((l) => HALLUC.test(l.text.slice('[RestSTT] Transcript: '.length).replace(/^"/, '')));
const dispatches = lines.map((l) => { const m = l.text.match(/^\[Main\] dispatch: (answer|chip|drop|hold) source=(live|whisper) anchor="((?:[^"\\]|\\.)*)" verdict=(\w+)(?: duplicateOf=(\w+) answered=(true|false))?(?: reason=(\w+))?(?: question=("(?:[^"\\]|\\.)*"))?/); return m ? { at: l.at, action: m[1], source: m[2], anchor: JSON.parse('"' + m[3] + '"'), verdict: m[4], duplicateOf: m[5], answered: m[6], reason: m[7], question: m[8] ? JSON.parse(m[8]) : null } : null; }).filter(Boolean);
const replaced = lines.map((l) => { const m = l.text.match(/^\[Main\] Live question replaced by transcript: live=("(?:[^"\\]|\\.)*") said=("(?:[^"\\]|\\.)*")/); return m ? { at: l.at, live: JSON.parse(m[1]), said: JSON.parse(m[2]) } : null; }).filter(Boolean);
const updates = lines.map((l) => { const m = l.text.match(/^\[QuestionDetector\] chip updated: id=(\w+) q="([^"]*)"/); return m ? { at: l.at, id: m[1], q: m[2] } : null; }).filter(Boolean);
const pinned = lines.map((l) => { const m = l.text.match(/^\[IntelligenceEngine\] runWhatShouldISay: pinned question ("(?:[^"\\]|\\.)*")/); return m ? { at: l.at, q: JSON.parse(m[1]) } : null; }).filter(Boolean);
const budget = lines.map((l) => { const m = l.text.match(/^\[Answer\] budget: words=(\d+) cut=(yes|no) allowance=(yes|no)/); return m ? { at: l.at, words: +m[1], cut: m[2] === 'yes', allowance: m[3] === 'yes' } : null; }).filter(Boolean);

console.log(`=== ${path.basename(dir)}: ${items.length} items, ${rest.length} RestSTT transcripts, hallucination-shaped ${halluc.length} (${(100 * halluc.length / Math.max(1, rest.length)).toFixed(0)}%)`);
const answers = dispatches.filter((d) => d.action === 'answer');
const phantomAnswers = answers.filter((d) => d.question && HALLUC.test(d.question) && wc(d.question) <= 8);
console.log(`answers ${answers.length}; answers whose question is a phantom/hallucination: ${phantomAnswers.length}`);
for (const d of phantomAnswers) console.log(`   ${new Date(d.at).toISOString().slice(11, 19)} ${(itemAt(d.at)?.id ?? '?').padEnd(4)} ${d.source} ${d.verdict} ${JSON.stringify(d.question)}`);

console.log(`\n=== reconcile 'replaced' verdicts: ${replaced.length}`);
let guardWouldKeep = 0;
for (const r of replaced) {
    const keep = looksFragmentary(r.said) && !isFragment(r.said); // the proposed guard changes the outcome only here
    if (keep) guardWouldKeep++;
    const it = itemAt(r.at);
    const laterAnswer = answers.find((a) => a.at > r.at && a.at - r.at < 60000 && it && itemAt(a.at)?.id === it.id && !HALLUC.test(a.question ?? ''));
    console.log(`   ${new Date(r.at).toISOString().slice(11, 19)} ${(it?.id ?? '?').padEnd(4)} live=${JSON.stringify(r.live.slice(0, 60))} said=${JSON.stringify(r.said)} → guard(looksFragmentary) would keep Live: ${keep ? 'YES' : 'no'}; item later answered with a real question: ${laterAnswer ? 'yes (' + laterAnswer.source + ')' : 'NO'}`);
}
console.log(`the guard swap would have kept Live's claim in ${guardWouldKeep}/${replaced.length}`);

console.log(`\n=== holds: ${dispatches.filter((d) => d.action === 'hold').length}`);
for (const h of dispatches.filter((d) => d.action === 'hold')) {
    const it = itemAt(h.at);
    const next = dispatches.find((d) => d.at > h.at && d.action !== 'hold' && (d.question === h.question || (d.source !== h.source && d.at - h.at < 2600)));
    const resolution = dispatches.find((d) => d.at > h.at && d.at - h.at <= 2700 && d.question === h.question);
    const lateUpdate = updates.find((u) => u.at > h.at && u.at - h.at < 15000 && !HALLUC.test(u.q) && u.q.toLowerCase().includes((it?.q ?? '§').toLowerCase().split(' ').slice(1, 4).join(' ')));
    console.log(`   ${new Date(h.at).toISOString().slice(11, 19)} ${(it?.id ?? '?').padEnd(4)} held ${h.source} ${JSON.stringify(h.question.slice(0, 50))} → resolved as ${resolution ? resolution.action + (resolution.duplicateOf ? ' (dup of ' + resolution.duplicateOf + ')' : '') : '?'} at +${resolution ? resolution.at - h.at : '?'} ms${next && next !== resolution ? '; other ear dispatched ' + next.action + ' at +' + (next.at - h.at) + ' ms' : ''}${lateUpdate ? '; detector UPDATE with the real question at +' + (lateUpdate.at - h.at) + ' ms (never dispatched)' : ''}`);
}

console.log(`\n=== pinned: answers ${answers.length}, pinned lines ${pinned.length}, mismatched ${answers.filter((a) => { const p = pinned.find((x) => x.at >= a.at && x.at - a.at <= 2000); return !p || p.q.trim() !== (a.question ?? '').trim(); }).length}`);
const ws = budget.map((b) => b.words).sort((a, b) => a - b);
console.log(`=== budget: n ${budget.length}, cut ${budget.filter((b) => b.cut).length}, over 80 ${ws.filter((w) => w > 80).length}, p50 ${ws[Math.floor(ws.length / 2)] ?? '—'}, max ${ws.at(-1) ?? '—'}, min ${ws[0] ?? '—'}`);
