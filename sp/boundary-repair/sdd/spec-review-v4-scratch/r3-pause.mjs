// Spec-review v4 scratch: pause semantics, independently of check-v4.mjs.
// For every stream (seam recordings: every event as recorded; run logs: Transcript lines + the Main
// `turn: deepgram utterance-end` lines, which main.ts:1246 writes synchronously from the adapter's emit):
//   - my own adapter-semantics runner around rule-v4 (empty FINAL -> clear, empty INTERIM -> skip,
//     UtteranceEnd -> clear, speech_final passed) vs rule-v3 as wired in Task 2 (empties skipped, no clear);
//   - for every v3 repair: what lies between F1 and F2 (empty finals / empty interims / UEs / speech-started),
//     F1's and F2's speech_final;
//   - for every cut (v3 definition) followed by a final: how often a clear signal lies inside it, by class.
import fs from 'node:fs';
import path from 'node:path';
import * as v3 from '../../rule-v3.mjs';
import * as v4 from '../../rule-v4.mjs';
const RUNS = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs';
const SEAM = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '../../seam-probe');
const unq = (s) => JSON.parse(`"${s}"`);

const streams = [];
for (const f of fs.readdirSync(SEAM).filter((f) => /^events-.*\.jsonl$/.test(f)).sort()) {
    const ev = [];
    for (const l of fs.readFileSync(path.join(SEAM, f), 'utf8').split('\n').filter(Boolean)) {
        const e = JSON.parse(l);
        if (e.kind === 'transcript') ev.push({ type: 'T', text: e.text, isFinal: e.isFinal, at: e.at, sf: e.speechFinal === true });
        else if (e.kind === 'utterance-end') ev.push({ type: 'UE', at: e.at });
        else if (e.kind === 'speech-started') ev.push({ type: 'SS', at: e.at });
    }
    streams.push({ name: `seam ${f.slice(7, 26)}`, kind: 'seam', ev });
}
let ueRuns = 0;
for (const dir of fs.readdirSync(RUNS).filter((d) => fs.existsSync(path.join(RUNS, d, 'natively_debug.log'))).sort()) {
    const ev = [];
    let ue = 0;
    for (const l of fs.readFileSync(path.join(RUNS, dir, 'natively_debug.log'), 'utf8').split('\n')) {
        const m = l.match(/^(\S+) \[LOG\] \[DeepgramStreaming\] Transcript event — isFinal=(true|false), text="((?:[^"\\]|\\.)*)"/);
        if (m) { ev.push({ type: 'T', text: m[3] === '(empty)' ? '' : unq(m[3]), isFinal: m[2] === 'true', at: Date.parse(m[1]), sf: false }); continue; }
        const u = l.match(/^(\S+) \[LOG\] \[Main\] turn: deepgram utterance-end /);
        if (u) { ev.push({ type: 'UE', at: Date.parse(u[1]) }); ue++; continue; }
        const s = l.match(/^(\S+) \[LOG\] \[Main\] turn: deepgram speech-started /);
        if (s) ev.push({ type: 'SS', at: Date.parse(s[1]) });
    }
    if (ue) ueRuns++;
    streams.push({ name: dir, kind: /h40/.test(dir) ? 'holdout' : 'other', ev, ue });
}
console.log(`streams: ${streams.filter((s) => s.kind === 'seam').length} seam, ${streams.filter((s) => s.kind === 'other').length} non-holdout logs, ${streams.filter((s) => s.kind === 'holdout').length} holdout logs; logs carrying utterance-end lines: ${ueRuns}`);

function runV3(ev) { const r = v3.createRepair(); return ev.map((e) => (e.type !== 'T' || !e.text ? null : r.onTranscript(e.text, e.isFinal, e.at).restored ?? null)); }
function runV4(ev) {
    const r = v4.createRepair();
    return ev.map((e) => {
        if (e.type === 'UE') { r.clear(); return null; }
        if (e.type !== 'T') return null;
        if (!e.text) { if (e.isFinal) r.clear(); return null; }
        return r.onTranscript(e.text, e.isFinal, e.at, e.sf).restored ?? null;
    });
}
const tot = { seam: [0, 0], other: [0, 0], holdout: [0, 0] };
const diffs = [];
const between = [];
for (const s of streams) {
    const a = runV3(s.ev), b = runV4(s.ev);
    tot[s.kind][0] += a.filter(Boolean).length; tot[s.kind][1] += b.filter(Boolean).length;
    a.forEach((x, i) => { if (JSON.stringify(x) !== JSON.stringify(b[i])) diffs.push(`${s.kind} ${s.name} v3=${JSON.stringify(x)} v4=${JSON.stringify(b[i])} "${s.ev[i].text?.slice(0, 40)}"`); });
    // for each v3 repair: locate F1 (the previous non-empty final) and list the events strictly between
    a.forEach((x, i) => {
        if (!x) return;
        let j = i - 1;
        while (j >= 0 && !(s.ev[j].type === 'T' && s.ev[j].isFinal && s.ev[j].text)) j--;
        const mid = s.ev.slice(j + 1, i);
        const c = { emptyFinal: mid.filter((e) => e.type === 'T' && e.isFinal && !e.text).length, emptyInterim: mid.filter((e) => e.type === 'T' && !e.isFinal && !e.text).length, UE: mid.filter((e) => e.type === 'UE').length, SS: mid.filter((e) => e.type === 'SS').length, interims: mid.filter((e) => e.type === 'T' && !e.isFinal && e.text).length };
        between.push({ kind: s.kind, name: s.name, restored: x, gap: s.ev[i].at - s.ev[j].at, f1sf: s.ev[j].sf, f2sf: s.ev[i].sf, c, ue: s.ue });
    });
}
console.log(`\nrepairs v3 -> v4 (adapter semantics, my runner): seam ${tot.seam[0]} -> ${tot.seam[1]}, non-holdout ${tot.other[0]} -> ${tot.other[1]}, holdout ${tot.holdout[0]} -> ${tot.holdout[1]}; ${diffs.length} event(s) differ`);
for (const d of diffs) console.log(`  DIFF ${d}`);
console.log('\nper v3 repair: events strictly between F1 and F2 (seam + non-holdout listed; holdout counted)');
for (const b of between.filter((b) => b.kind !== 'holdout')) console.log(`  ${b.kind.padEnd(5)} ${b.name.slice(0, 26).padEnd(26)} ${JSON.stringify(b.restored).padEnd(18)} gap ${String(b.gap).padStart(5)} F1.sf=${b.f1sf} F2.sf=${b.f2sf} ${JSON.stringify(b.c)}${b.kind === 'other' ? ` (log has UE lines: ${b.ue > 0})` : ''}`);
const hb = between.filter((b) => b.kind === 'holdout');
console.log(`  holdout: ${hb.length} repairs; any clear signal between: ${hb.filter((b) => b.c.emptyFinal || b.c.UE).length}; logs with UE lines: ${hb.filter((b) => b.ue > 0).length}`);
const nh = between.filter((b) => b.kind === 'other');
console.log(`  non-holdout: ${nh.length} repairs, ${nh.filter((b) => b.ue > 0).length} in logs that carry UE lines (the rest cannot show an UtteranceEnd at all)`);

// every cut (v3 definition) that is followed by a final: is there a clear signal inside it?
console.log('\ncuts followed by a final, by stream kind: clear signal inside (empty final / UE / F1 speech_final) by F2 class');
for (const kind of ['seam', 'other']) {
    const agg = {};
    for (const s of streams.filter((x) => x.kind === kind)) {
        let lastInterim = null, cut = null;
        for (const e of s.ev) {
            if (e.type === 'UE') { if (cut) cut.ue++; continue; }
            if (e.type !== 'T') continue;
            if (!e.text) { if (e.isFinal && cut) cut.ef++; continue; }
            if (!e.isFinal) { lastInterim = e.text; continue; }
            if (cut) {
                const f = v4.tok(e.text);
                const cls = f[0] === cut.T[0] ? 'NORMAL' : cut.T.length === 1 ? 'TAIL1' : 'OTHER/REPAIR';
                const k = `${cls}`;
                agg[k] ??= { n: 0, withEmptyFinal: 0, withUE: 0, f1sf: 0 };
                agg[k].n++; if (cut.ef) agg[k].withEmptyFinal++; if (cut.ue) agg[k].withUE++; if (cut.sf) agg[k].f1sf++;
            }
            cut = null;
            if (lastInterim) {
                const iw = v4.tok(lastInterim), fw = v4.tok(e.text);
                if (fw.length > 0 && fw.length < iw.length) {
                    const strict = fw.every((w, i) => w === iw[i]);
                    const tol = !strict && fw.length >= 2 && fw.slice(0, -1).every((w, i) => w === iw[i]);
                    if (strict || tol) cut = { T: iw.slice(fw.length), ef: 0, ue: 0, sf: e.sf };
                }
            }
            lastInterim = null;
        }
    }
    console.log(`  ${kind}: ${JSON.stringify(agg)}`);
}
