// Throwaway: same recount as fragment-holds.mjs but with the PRODUCTION-shaped
// opener list (question words, auxiliaries, imperative openers only — none of
// the script-specific words the spike list had). Reports holds over dispatched
// question texts and which of them were whole questions (false holds).
// usage: node fragment-holds-narrow.mjs <run-dir> [<run-dir> ...]
import fs from 'node:fs';
import path from 'node:path';

const wc = (s) => (String(s).trim().match(/\S+/g) ?? []).length;
const OPENER = /^(what|why|how|when|where|which|who|whom|whose|can|could|would|should|do|does|did|is|are|was|were|will|have|has|tell|walk|describe|explain|give|compare|imagine|suppose|say|let)\b/i;
const CONJ = /^(and|so|but|or|then|because|which means)\b/i;
function looksFragmentary(t) {
    const s = String(t).trim();
    const n = wc(s);
    if (n < 4) return true;
    if (CONJ.test(s)) return true;
    if (!/[?？]\s*$/.test(s) && n <= 6 && !OPENER.test(s)) return true;
    return false;
}
const ts = (s) => Date.parse(s);
for (const dir of process.argv.slice(2)) {
    const dbg = fs.readFileSync(path.join(dir, 'natively_debug.log'), 'utf8');
    const timeline = JSON.parse(fs.readFileSync(path.join(dir, 'interview60.timeline.json'), 'utf8'));
    const items = timeline.items.map((i) => ({ ...i, spokeEnd: i.playedAt + Math.round((i.clipSecs ?? 0) * 1000) }));
    const liveQ = [...dbg.matchAll(/^(\S+) \[LOG\] \[Main\] Live question \((\w+), mode=\w+\): "([^"]*)"/gm)].map((m) => ({ at: ts(m[1]), text: m[3] }));
    const dispatches = [...dbg.matchAll(/^(\S+) \[LOG\] \[Main\] dispatch: (answer|chip) source=(live|whisper) anchor="((?:[^"\\]|\\.)*)" verdict=(\w+)/gm)].map((m) => ({ at: ts(m[1]), action: m[2], source: m[3], anchor: JSON.parse('"' + m[4] + '"'), verdict: m[5] }));
    let held = 0, falseHolds = 0;
    console.log('\n=== ' + path.basename(dir) + ': ' + dispatches.length + ' dispatched');
    for (const d of dispatches) {
        const q = d.source === 'whisper' ? d.anchor : (liveQ.filter((l) => l.at <= d.at && d.at - l.at <= 200).sort((a, b) => b.at - a.at)[0]?.text ?? d.anchor);
        if (!looksFragmentary(q)) continue;
        held++;
        const it = items.filter((i) => d.at >= i.playedAt - 2000 && d.at <= i.spokeEnd + 60000).sort((a, b) => b.playedAt - a.playedAt)[0];
        const whole = it && wc(q) >= 4 && (q.toLowerCase().replace(/[^a-z ]/g, '') === it.q.toLowerCase().replace(/[^a-z ]/g, ''));
        if (whole) falseHolds++;
        console.log('  hold  ' + (it?.id ?? '?').padEnd(4) + ' ' + d.source.padEnd(7) + ' ' + JSON.stringify(q.slice(0, 70)) + (whole ? '   <- whole question (false hold)' : ''));
    }
    console.log('held ' + held + ' of ' + dispatches.length + '; false holds ' + falseHolds);
    // Also: every whisper chip text and Live question text of the hour, so the
    // heuristic is checked against ALL candidate texts, not only dispatched ones.
    const chips = [...dbg.matchAll(/\[QuestionDetector\] chip emitted: intent=\w+ confidence=[\d.]+ q="([^"]*)"/g)].map((m) => m[1]);
    const all = [...chips, ...liveQ.map((l) => l.text)];
    const flagged = all.filter(looksFragmentary);
    console.log('all candidate texts ' + all.length + ' (chips ' + chips.length + ', live ' + liveQ.length + '): flagged ' + flagged.length + (flagged.length ? '  e.g. ' + flagged.slice(0, 6).map((t) => JSON.stringify(t.slice(0, 50))).join(' ') : ''));
}
