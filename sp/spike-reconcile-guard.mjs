// Throwaway spike: reconcileLiveQuestion's 'replaced' verdict swaps Live's claim
// for the latest STT text when their overlap is < 0.25, guarded only by
// isFragment(latest) (< 4 words). In the after5 hour Whisper hallucinations on a
// noisy channel ("I'm going to go.", 4 words) passed that guard and replaced
// correct Live questions. Proposed guard: looksFragmentary(latest) — the same
// predicate the fragment hold uses. This scores every 'replaced' line in every
// run we have: would the proposed guard have kept Live's claim, and which text
// was actually right (compared with the script question of the item)?
// usage: node spike-reconcile-guard.mjs <run-dir|log-file> ...
import fs from 'node:fs';
import path from 'node:path';

const OPENERS = new Set(['what','why','how','when','where','which','who','whom','whose','can','could','would','should','do','does','did','is','are','was','were','will','have','has','tell','walk','describe','explain','give','compare','imagine','suppose','say','let']);
function looksFragmentary(text) { const t = String(text).trim(); const w = t.split(/\s+/).filter(Boolean); if (w.length < 4) return true; if (/^(and|so|but|or|then|because)\b/i.test(t)) return true; if (w.length > 6) return false; if (/[?？]["'”’)\]]*$/.test(t)) return false; const f = w[0].toLowerCase().replace(/^[^a-z]+/, '').replace(/[^a-z].*$/, ''); return !OPENERS.has(f); }
const isFragment = (t) => String(t).trim().split(/\s+/).filter(Boolean).length < 4;
const words = (s) => String(s).toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').split(/\s+/).filter(Boolean);
function wer(ref, hyp) { const r = words(ref), h = words(hyp); const d = Array.from({ length: r.length + 1 }, (_, i) => [i, ...Array(h.length).fill(0)]); for (let j = 1; j <= h.length; j++) d[0][j] = j; for (let i = 1; i <= r.length; i++) for (let j = 1; j <= h.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (r[i - 1] === h[j - 1] ? 0 : 1)); return r.length ? d[r.length][h.length] / r.length : 1; }
const ts = (s) => Date.parse(s);

let total = 0, guardKeeps = 0, keepRight = 0, keepWrong = 0, unchangedRight = 0, unchangedWrong = 0;
for (const arg of process.argv.slice(2)) {
    const isDir = fs.statSync(arg).isDirectory();
    const log = fs.readFileSync(isDir ? path.join(arg, 'natively_debug.log') : arg, 'utf8');
    let items = [];
    const tl = isDir ? path.join(arg, 'interview60.timeline.json') : null;
    if (tl && fs.existsSync(tl)) items = JSON.parse(fs.readFileSync(tl, 'utf8')).items.map((i) => ({ ...i, spokeEnd: i.playedAt + Math.round((i.clipSecs ?? 0) * 1000) }));
    const itemAt = (at) => items.filter((i) => at >= i.playedAt - 2000 && at <= i.spokeEnd + 60000).sort((a, b) => b.playedAt - a.playedAt)[0];
    const rows = [...log.matchAll(/^(\S+) \[LOG\] \[Main\] Live question replaced by transcript: live=("(?:[^"\\]|\\.)*") said=("(?:[^"\\]|\\.)*")/gm)].map((m) => ({ at: ts(m[1]), live: JSON.parse(m[2]), said: JSON.parse(m[3]) }));
    console.log(`\n=== ${path.basename(arg)}: ${rows.length} replaced verdicts`);
    for (const r of rows) {
        total++;
        const keep = looksFragmentary(r.said) && !isFragment(r.said);
        const it = itemAt(r.at);
        let right = '?';
        if (it) { const wl = wer(it.q, r.live), ws = wer(it.q, r.said); right = wl < ws ? 'live' : ws < wl ? 'said' : 'tie'; }
        if (keep) { guardKeeps++; if (right === 'live') keepRight++; else if (right === 'said') keepWrong++; }
        else { if (right === 'said') unchangedRight++; else if (right === 'live') unchangedWrong++; }
        console.log(`  ${new Date(r.at).toISOString().slice(11, 19)} ${(it?.id ?? '—').padEnd(4)} live=${JSON.stringify(r.live.slice(0, 55))} said=${JSON.stringify(r.said.slice(0, 40))}  guard keeps Live: ${keep ? 'YES' : 'no '}  closer to script: ${right}`);
    }
}
console.log(`\nTOTAL replaced ${total}; proposed guard would keep Live in ${guardKeeps} (right ${keepRight}, wrong ${keepWrong}); unchanged ${total - guardKeeps} (replacement right ${unchangedRight}, replacement wrong ${unchangedWrong})`);
