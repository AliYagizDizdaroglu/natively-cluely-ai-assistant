// Throwaway, read-only (2026-09-29): size every variant of Deepgram's boundary word loss in the recorded
// run logs, so a repair rule is chosen from counts, not from the one shape we noticed first.
//
// A CUT: interim I, then final F1 whose tokens equal I's first |F1| tokens -- strictly, or all but F1's
// LAST token (Deepgram re-spells the word at the cut: interim "RAC" -> final "Rag", seam probe 5/5).
// T = I's tokens after |F1|. Then the NEXT final F2 is classed:
//   NORMAL      F2 starts with T[0] (the word moved to the next segment; nothing lost)
//   SKIP1_E2+   F2 starts with T[1], T[2] (>= 2 evidence words)       candidate T[0]
//   SKIP1_E1    F2 starts with T[1], only 1 evidence word available or matching   candidate T[0]
//   TAIL0       |T| == 1 and F2 does not start with T[0]           candidate T[0]
//   SKIPN       F2 starts with T[k], k >= 2 (>= 1 evidence word)     candidates T[0..k-1]
//   OTHER       none of the above (F2 unrelated to T)
// Each candidate is labelled against the scripted question playing at F1's time (timeline item):
//   TRUE   the script holds the sequence  candidate(s) + F2's first token  (the repair restores speech)
//   FALSE  it does not (the repair would insert a word not spoken there)  -- printed for manual review
//   UNKNOWN no scripted question was playing
// Holdout runs (h40*) are reported separately and never used to choose the rule.
//   node variants-scan.mjs [--print CLASS] [--holdout]
import fs from 'node:fs';
import path from 'node:path';

const RUNS = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs';
const tok = (s) => String(s).toLowerCase().replace(/(\d),(\d)/g, '$1$2').match(/[a-z0-9']+/g) ?? [];
const unq = (s) => JSON.parse(`"${s}"`);
const printClass = process.argv.includes('--print') ? process.argv[process.argv.indexOf('--print') + 1] : null;
const printHoldout = process.argv.includes('--holdout');
const hasSeq = (hay, needle) => {
    for (let i = 0; i + needle.length <= hay.length; i++) if (needle.every((w, j) => hay[i + j] === w)) return true;
    return false;
};

const tally = {};
const bump = (bucket, cls, label, prefix) => {
    const k = `${bucket} ${cls}`;
    tally[k] ??= { n: 0, strict: 0, tolerant: 0, TRUE: 0, FALSE: 0, UNKNOWN: 0, gaps: [] };
    tally[k].n++;
    tally[k][prefix]++;
    if (label) tally[k][label]++;
};

for (const dir of fs.readdirSync(RUNS).filter((d) => fs.existsSync(path.join(RUNS, d, 'natively_debug.log'))).sort()) {
    const R = path.join(RUNS, dir);
    const bucket = /h40/.test(dir) ? 'holdout' : 'other';
    let items = [];
    try { items = JSON.parse(fs.readFileSync(path.join(R, 'interview60.timeline.json'), 'utf8')).items ?? []; } catch { /* no timeline */ }
    const playing = (atMs) => items.find((i) => atMs >= i.playedAt - 500 && atMs <= i.playedAt + (i.clipSecs ?? 0) * 1000 + 3000);
    let lastInterim = null, pending = null;
    for (const l of fs.readFileSync(path.join(R, 'natively_debug.log'), 'utf8').split('\n')) {
        const m = l.match(/^(\S+) \[LOG\] \[DeepgramStreaming\] Transcript event — isFinal=(true|false), text="((?:[^"\\]|\\.)*)"/);
        if (!m) continue;
        const text = unq(m[3]);
        if (m[2] === 'false') { lastInterim = text; continue; }
        if (pending) {
            const T = pending.T, f2w = tok(text);
            let cls = 'OTHER', cand = null, ev = 0;
            if (f2w.length && f2w[0] === T[0]) cls = 'NORMAL';
            else if (f2w.length) {
                for (let k = 1; k < T.length; k++) {
                    let n = 0;
                    while (k + n < T.length && n < f2w.length && T[k + n] === f2w[n]) n++;
                    if (n >= 1) { cand = T.slice(0, k); ev = n; cls = k >= 2 ? 'SKIPN' : n >= 2 ? 'SKIP1_E2+' : 'SKIP1_E1'; break; }
                }
                if (!cand && T.length === 1) { cls = 'TAIL0'; cand = [T[0]]; }
            }
            let label = null;
            if (cand) {
                const item = playing(pending.atMs);
                label = !item ? 'UNKNOWN' : hasSeq(tok(item.q), [...cand, f2w[0]]) ? 'TRUE' : 'FALSE';
                if ((printClass === cls || printClass === 'ALL') && (bucket === 'other' || printHoldout)) {
                    console.log(`${bucket === 'holdout' ? 'H ' : '  '}${cls.padEnd(9)} ${label.padEnd(7)} ${dir.slice(0, 22)} +${Date.parse(m[1]) - pending.atMs}ms ev=${ev} ${pending.prefix}`);
                    console.log(`      I : ${JSON.stringify(pending.i)}`);
                    console.log(`      F1: ${JSON.stringify(pending.f1t)}`);
                    console.log(`      F2: ${JSON.stringify(text.slice(0, 90))}`);
                    if (item) console.log(`      Q : ${item.id}: ${item.q.slice(0, 110)}`);
                }
            }
            bump(bucket, cls, label, pending.prefix);
            if (cand) tally[`${bucket} ${cls}`].gaps.push(Date.parse(m[1]) - pending.atMs);
            pending = null;
        }
        if (lastInterim) {
            const iw = tok(lastInterim), fw = tok(text);
            if (fw.length > 0 && fw.length < iw.length) {
                const strict = fw.every((w, i) => w === iw[i]);
                const tolerant = !strict && fw.length >= 2 && fw.slice(0, -1).every((w, i) => w === iw[i]);
                if (strict || tolerant) pending = { T: iw.slice(fw.length), atMs: Date.parse(m[1]), prefix: strict ? 'strict' : 'tolerant', i: lastInterim, f1t: text };
            }
        }
        lastInterim = null;
    }
}
for (const [k, v] of Object.entries(tally).sort()) {
    const g = v.gaps.sort((a, b) => a - b);
    const gs = g.length ? ` gap ms min ${g[0]} med ${g[Math.floor(g.length / 2)]} max ${g[g.length - 1]}` : '';
    console.log(`${k.padEnd(22)} n ${String(v.n).padStart(4)} (strict ${v.strict}, tolerant ${v.tolerant}) TRUE ${v.TRUE} FALSE ${v.FALSE} UNKNOWN ${v.UNKNOWN}${gs}`);
}
