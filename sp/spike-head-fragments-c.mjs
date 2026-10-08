// Throwaway spike, variant C. Variant B (no terminal punctuation -> fragmentary
// at any length) cannot be scored on runs before after5 because their dispatch
// lines truncate the anchor at 80 chars (terminal punctuation lost), and on
// after5 it also holds whole-but-unpunctuated whisper chips for up to 2.5 s.
// Variant C is narrower and cannot hold a complete sentence by construction:
//   A. at most 6 words and no terminal punctuation -> fragmentary (variant A), or
//   C. no terminal punctuation AND the last word is a function word that no
//      sentence ends on (that, because, without, in, for, of, the, a, and, ...).
// Scored on after5 only (full question= text). usage: node spike-head-fragments-c.mjs <run-dir>
import fs from 'node:fs';
import path from 'node:path';

const OPENERS = new Set(['what','why','how','when','where','which','who','whom','whose','can','could','would','should','do','does','did','is','are','was','were','will','have','has','tell','walk','describe','explain','give','compare','imagine','suppose','say','let']);
const TERMINAL = /[.!?？…]["'”’)\]]*$/;
const QMARK = /[?？]["'”’)\]]*$/;
const TRAILING_FUNCTION = new Set(['that','the','a','an','and','or','of','for','to','in','into','on','at','with','without','from','by','as','like','than','because','if','while','your','our','their','its','my','his','her']);
function firstWord(w) { return w[0].toLowerCase().replace(/^[^a-z]+/, '').replace(/[^a-z].*$/, ''); }
function lastWord(w) { return w[w.length - 1].toLowerCase().replace(/[^a-z']+/g, ''); }
function current(text) {
    const t = String(text).trim(); const w = t.split(/\s+/).filter(Boolean);
    if (w.length < 4) return true;
    if (/^(and|so|but|or|then|because)\b/i.test(t)) return true;
    if (w.length > 6) return false;
    if (QMARK.test(t)) return false;
    return !OPENERS.has(firstWord(w));
}
function proposed(text) {
    const t = String(text).trim(); const w = t.split(/\s+/).filter(Boolean);
    if (w.length < 4) return true;
    if (/^(and|so|but|or|then|because)\b/i.test(t)) return true;
    if (!TERMINAL.test(t) && (w.length <= 6 || TRAILING_FUNCTION.has(lastWord(w)))) return true; // variants A + C
    if (w.length > 6) return false;
    if (QMARK.test(t)) return false;
    return !OPENERS.has(firstWord(w));
}
const ts = (s) => Date.parse(s);
const words = (s) => String(s).toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').split(/\s+/).filter(Boolean);

for (const dir of process.argv.slice(2)) {
    const log = fs.readFileSync(path.join(dir, 'natively_debug.log'), 'utf8');
    const items = JSON.parse(fs.readFileSync(path.join(dir, 'interview60.timeline.json'), 'utf8')).items.map((i) => ({ ...i, spokeEnd: i.playedAt + Math.round((i.clipSecs ?? 0) * 1000) }));
    const itemAt = (at) => items.filter((i) => at >= i.playedAt - 2000 && at <= i.spokeEnd + 60000).sort((a, b) => b.playedAt - a.playedAt)[0];
    const liveQ = [...log.matchAll(/^(\S+) \[LOG\] \[Main\] Live question \(\w+, mode=\w+\): "([^"]*)"/gm)].map((m) => ({ at: ts(m[1]), text: m[2] }));
    const disp = [...log.matchAll(/^(\S+) \[LOG\] \[Main\] dispatch: (answer|chip|drop|hold) source=(live|whisper) anchor="((?:[^"\\]|\\.)*)" verdict=(\w+)(?:[^\n]*? question=("(?:[^"\\]|\\.)*"))?/gm)]
        .map((m) => ({ at: ts(m[1]), action: m[2], source: m[3], anchor: JSON.parse('"' + m[4] + '"'), verdict: m[5], question: m[6] ? JSON.parse(m[6]) : null }));
    const seen = new Set(); const cands = [];
    for (const d of disp) { if (d.source !== 'whisper' || !d.question) continue; const key = d.question.toLowerCase(); if (seen.has(key)) continue; seen.add(key); cands.push({ at: d.at, text: d.question, action: d.action }); }
    // the 52 script questions themselves: none may be classed fragmentary
    const scriptFalse = items.filter((i) => proposed(i.q));
    const flips = cands.filter((c) => current(c.text) !== proposed(c.text));
    console.log(`=== ${path.basename(dir)}: whisper dispatch texts (full) ${cands.length}; script questions classed fragmentary: ${scriptFalse.length}; class changes under variant C: ${flips.length}`);
    let falseHolds = 0, rescued = 0, drops = 0;
    for (const f of flips) {
        const it = itemAt(f.at);
        const whole = it && words(f.text).join(' ') === words(it.q).join(' ');
        const other = liveQ.find((l) => l.at > f.at && l.at - f.at <= 2600);
        if (whole) falseHolds++; if (other) rescued++; if (f.action === 'drop') drops++;
        console.log(`   ${new Date(f.at).toISOString().slice(11, 19)} ${(it?.id ?? '—').padEnd(4)} ${f.action.padEnd(6)} ${JSON.stringify(f.text)} → now ${proposed(f.text) ? 'FRAGMENTARY' : 'whole'}${whole ? '   <- WHOLE script question (false hold)' : ''}${other ? '   Live within hold: ' + JSON.stringify(other.text.slice(0, 50)) : ''}`);
    }
    console.log(`   summary: flips ${flips.length}, false holds ${falseHolds}, Live inside the hold ${rescued}, already-drops ${drops}`);
}
