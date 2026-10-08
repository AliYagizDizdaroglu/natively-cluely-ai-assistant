// Throwaway spike: the reconcile guard (Task 1) now uses looksFragmentary, and
// Task 2 widens looksFragmentary with the head-fragment rule (variant C). Score
// every historical 'replaced' verdict under the WIDENED predicate: would the
// guard now keep Live's claim, and which text was closer to the script?
// usage: node spike-reconcile-guard-c.mjs <run-dir> ...
import fs from 'node:fs';
import path from 'node:path';

const OPENERS = new Set(['what','why','how','when','where','which','who','whom','whose','can','could','would','should','do','does','did','is','are','was','were','will','have','has','tell','walk','describe','explain','give','compare','imagine','suppose','say','let']);
const TERMINAL = /[.!?？…]["'”’)\]]*$/;
const QMARK = /[?？]["'”’)\]]*$/;
const TRAIL = new Set(['that','the','a','an','and','or','of','for','to','in','into','on','at','with','without','from','by','as','like','than','because','if','while','your','our','their','its','my','his','her']);
function looksFragmentaryC(text) {
    const t = String(text).trim(); const w = t.split(/\s+/).filter(Boolean);
    if (w.length < 4) return true;
    if (/^(and|so|but|or|then|because)\b/i.test(t)) return true;
    if (!TERMINAL.test(t)) {
        if (w.length <= 6) return true;
        const last = w[w.length - 1].toLowerCase().replace(/[^a-z']+/g, '');
        if (TRAIL.has(last)) return true;
    }
    if (w.length > 6) return false;
    if (QMARK.test(t)) return false;
    const f = w[0].toLowerCase().replace(/^[^a-z]+/, '').replace(/[^a-z].*$/, '');
    return !OPENERS.has(f);
}
function looksFragmentaryOld(text) {
    const t = String(text).trim(); const w = t.split(/\s+/).filter(Boolean);
    if (w.length < 4) return true;
    if (/^(and|so|but|or|then|because)\b/i.test(t)) return true;
    if (w.length > 6) return false;
    if (QMARK.test(t)) return false;
    const f = w[0].toLowerCase().replace(/^[^a-z]+/, '').replace(/[^a-z].*$/, '');
    return !OPENERS.has(f);
}
const words = (s) => String(s).toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').split(/\s+/).filter(Boolean);
function wer(ref, hyp) { const r = words(ref), h = words(hyp); const d = Array.from({ length: r.length + 1 }, (_, i) => [i, ...Array(h.length).fill(0)]); for (let j = 1; j <= h.length; j++) d[0][j] = j; for (let i = 1; i <= r.length; i++) for (let j = 1; j <= h.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (r[i - 1] === h[j - 1] ? 0 : 1)); return r.length ? d[r.length][h.length] / r.length : 1; }
const ts = (s) => Date.parse(s);

let total = 0, changed = 0;
for (const arg of process.argv.slice(2)) {
    const log = fs.readFileSync(path.join(arg, 'natively_debug.log'), 'utf8');
    const tl = path.join(arg, 'interview60.timeline.json');
    const items = fs.existsSync(tl) ? JSON.parse(fs.readFileSync(tl, 'utf8')).items.map((i) => ({ ...i, spokeEnd: i.playedAt + Math.round((i.clipSecs ?? 0) * 1000) })) : [];
    const itemAt = (at) => items.filter((i) => at >= i.playedAt - 2000 && at <= i.spokeEnd + 60000).sort((a, b) => b.playedAt - a.playedAt)[0];
    const rows = [...log.matchAll(/^(\S+) \[LOG\] \[Main\] Live question replaced by transcript: live=("(?:[^"\\]|\\.)*") said=("(?:[^"\\]|\\.)*")/gm)].map((m) => ({ at: ts(m[1]), live: JSON.parse(m[2]), said: JSON.parse(m[3]) }));
    console.log(`\n=== ${path.basename(arg)}: ${rows.length} replaced verdicts`);
    for (const r of rows) {
        total++;
        const oldKeep = looksFragmentaryOld(r.said), newKeep = looksFragmentaryC(r.said);
        const it = itemAt(r.at);
        let right = '?';
        if (it) { const wl = wer(it.q, r.live), ws = wer(it.q, r.said); right = wl < ws ? 'live' : ws < wl ? 'said' : 'tie'; }
        if (oldKeep !== newKeep) changed++;
        console.log(`  ${new Date(r.at).toISOString().slice(11, 19)} ${(it?.id ?? '—').padEnd(4)} said=${JSON.stringify(r.said)} (${words(r.said).length} words)  Task1 guard keeps Live: ${oldKeep ? 'YES' : 'no '}  with Task2 rule: ${newKeep ? 'YES' : 'no '}${oldKeep !== newKeep ? '  <- CHANGES' : ''}  closer to script: ${right}`);
    }
}
console.log(`\nTOTAL replaced ${total}; verdicts that change between the Task 1 guard and the Task 2 rule: ${changed}`);
