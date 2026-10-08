// Throwaway spike, variant B of spike-head-fragments.mjs.
// Rule under test: a whisper chip text with NO terminal punctuation at all
// (no . ! ? …) is fragmentary at ANY length (H03's 7-word head "How would you
// design a pipeline that" escaped the 6-word variant). Candidates are the
// whisper dispatch lines (answer/chip/hold/drop) — their anchor/question text
// is the full chip text, unlike the 60-char-truncated "chip emitted" log line.
// For every class change: is the text a whole script question (a false hold)?
// and did Live bring the whole sentence inside the 2.5 s hold window?
// usage: node spike-head-fragments-b.mjs <run-dir> ...
import fs from 'node:fs';
import path from 'node:path';

const OPENERS = new Set(['what','why','how','when','where','which','who','whom','whose','can','could','would','should','do','does','did','is','are','was','were','will','have','has','tell','walk','describe','explain','give','compare','imagine','suppose','say','let']);
const TERMINAL = /[.!?？…]["'”’)\]]*$/;
const QMARK = /[?？]["'”’)\]]*$/;
function firstWord(w) { return w[0].toLowerCase().replace(/^[^a-z]+/, '').replace(/[^a-z].*$/, ''); }
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
    if (!TERMINAL.test(t)) return true; // the new rule: no terminal punctuation -> fragmentary at any length
    if (w.length > 6) return false;
    if (QMARK.test(t)) return false;
    return !OPENERS.has(firstWord(w));
}
const ts = (s) => Date.parse(s);
const words = (s) => String(s).toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').split(/\s+/).filter(Boolean);

let totalCands = 0, totalFlips = 0, falseHolds = 0, rescued = 0;
for (const dir of process.argv.slice(2)) {
    const log = fs.readFileSync(path.join(dir, 'natively_debug.log'), 'utf8');
    const tlPath = path.join(dir, 'interview60.timeline.json');
    const items = fs.existsSync(tlPath) ? JSON.parse(fs.readFileSync(tlPath, 'utf8')).items.map((i) => ({ ...i, spokeEnd: i.playedAt + Math.round((i.clipSecs ?? 0) * 1000) })) : [];
    const itemAt = (at) => items.filter((i) => at >= i.playedAt - 2000 && at <= i.spokeEnd + 60000).sort((a, b) => b.playedAt - a.playedAt)[0];
    const liveQ = [...log.matchAll(/^(\S+) \[LOG\] \[Main\] Live question \(\w+, mode=\w+\): "([^"]*)"/gm)].map((m) => ({ at: ts(m[1]), text: m[2] }));
    const disp = [...log.matchAll(/^(\S+) \[LOG\] \[Main\] dispatch: (answer|chip|drop|hold) source=(live|whisper) anchor="((?:[^"\\]|\\.)*)" verdict=(\w+)(?:[^\n]*? question=("(?:[^"\\]|\\.)*"))?/gm)]
        .map((m) => ({ at: ts(m[1]), action: m[2], source: m[3], anchor: JSON.parse('"' + m[4] + '"'), verdict: m[5], question: m[6] ? JSON.parse(m[6]) : null }));
    const seen = new Set();
    const cands = [];
    for (const d of disp) {
        if (d.source !== 'whisper') continue;
        const text = d.question ?? d.anchor;
        const key = text.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        cands.push({ at: d.at, text, action: d.action });
    }
    const flips = cands.filter((c) => current(c.text) !== proposed(c.text));
    totalCands += cands.length; totalFlips += flips.length;
    console.log(`\n=== ${path.basename(dir)}: whisper dispatch texts ${cands.length}; class changes under variant B: ${flips.length}`);
    for (const f of flips) {
        const it = itemAt(f.at);
        const whole = it && words(f.text).join(' ') === words(it.q).join(' ');
        const other = liveQ.find((l) => l.at > f.at && l.at - f.at <= 2600);
        if (whole) falseHolds++;
        if (other) rescued++;
        console.log(`   ${new Date(f.at).toISOString().slice(11, 19)} ${(it?.id ?? '—').padEnd(4)} ${f.action.padEnd(6)} ${JSON.stringify(f.text)} → now ${proposed(f.text) ? 'FRAGMENTARY' : 'whole'}${whole ? '   <- WHOLE script question (false hold)' : ''}${other ? '   Live within hold: ' + JSON.stringify(other.text.slice(0, 50)) : ''}`);
    }
}
console.log(`\nTOTAL candidates ${totalCands}; class changes ${totalFlips}; of which whole script questions (false holds) ${falseHolds}; Live's sentence inside the hold window ${rescued}`);
