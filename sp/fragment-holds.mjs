// Throwaway: the hold gates on the DISPATCHED QUESTION text, not the anchor the
// earlier spike scored. Recount per run: which dispatched questions
// looksFragmentary would hold, and how many of those were whole questions
// (false holds, each costing one hold length of latency).
// usage: node fragment-holds.mjs <run-dir> [<run-dir> ...]
import fs from 'node:fs';
import path from 'node:path';

const wc = (s) => (String(s).trim().match(/\S+/g) ?? []).length;
const OPENER = /^(what|why|how|when|where|which|who|whom|can|could|would|should|do|does|did|is|are|was|were|tell|walk|describe|explain|give|say|imagine|suppose|your|you|a|an|the|there|someone|inference|training|the same|to start)\b/i;
function looksFragmentary(t) {
    const s = String(t).trim();
    const n = wc(s);
    if (n < 4) return true;
    if (/^(and|so|but|or|then|because|which means)\b/i.test(s)) return true;
    if (!/\?\s*$/.test(s) && n <= 6 && !OPENER.test(s)) return true;
    return false;
}
const ts = (s) => Date.parse(s);
for (const dir of process.argv.slice(2)) {
    const dbg = fs.readFileSync(path.join(dir, 'natively_debug.log'), 'utf8');
    const timeline = JSON.parse(fs.readFileSync(path.join(dir, 'interview60.timeline.json'), 'utf8'));
    const items = timeline.items.map((i) => ({ ...i, spokeEnd: i.playedAt + Math.round((i.clipSecs ?? 0) * 1000) }));
    const liveQ = [...dbg.matchAll(/^(\S+) \[LOG\] \[Main\] Live question \((\w+), mode=\w+\): "([^"]*)"/gm)].map((m) => ({ at: ts(m[1]), text: m[3] }));
    const chips = [...dbg.matchAll(/^(\S+) \[LOG\] \[QuestionDetector\] chip emitted: intent=\w+ confidence=([\d.]+) q="([^"]*)"/gm)].map((m) => ({ at: ts(m[1]), conf: m[2], text: m[3] }));
    const dispatches = [...dbg.matchAll(/^(\S+) \[LOG\] \[Main\] dispatch: (answer|chip) source=(live|whisper) anchor="((?:[^"\\]|\\.)*)" verdict=(\w+)/gm)].map((m) => ({ at: ts(m[1]), action: m[2], source: m[3], anchor: JSON.parse('"' + m[4] + '"'), verdict: m[5] }));
    let held = 0, falseHolds = 0;
    console.log('\n=== ' + path.basename(dir) + ': ' + dispatches.length + ' dispatched (answer/chip); detector chips ' + chips.length + ' (conf 0.60 = degraded heuristic: ' + chips.filter((c) => c.conf === '0.60').length + ')');
    for (const d of dispatches) {
        // whisper: anchor === question (main.ts sets anchor: question); live: the Live question line just before.
        const q = d.source === 'whisper' ? d.anchor : (liveQ.filter((l) => l.at <= d.at && d.at - l.at <= 200).sort((a, b) => b.at - a.at)[0]?.text ?? d.anchor);
        if (!looksFragmentary(q)) continue;
        held++;
        const it = items.filter((i) => d.at >= i.playedAt - 2000 && d.at <= i.spokeEnd + 60000).sort((a, b) => b.playedAt - a.playedAt)[0];
        const whole = it && wc(q) >= 4 && (q.toLowerCase().replace(/[^a-z ]/g, '') === it.q.toLowerCase().replace(/[^a-z ]/g, ''));
        if (whole) falseHolds++;
        console.log('  hold  ' + (it?.id ?? '?').padEnd(4) + ' ' + d.source.padEnd(7) + ' ' + JSON.stringify(q.slice(0, 70)) + (whole ? '   <- whole question (false hold)' : ''));
    }
    console.log('held ' + held + ' of ' + dispatches.length + ' dispatches; false holds ' + falseHolds);
}
