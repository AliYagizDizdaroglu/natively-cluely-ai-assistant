// THROWAWAY calibration for the "still speaking" gate.
//
// GROUND TRUTH (from the timeline, which knows exactly when each clip played): a dispatched
// answer is PREMATURE if it went out before the interviewer's clip finished.
// CANDIDATE SIGNAL (available at runtime): at dispatch time, has an interviewer FINAL landed
// within the last GAP ms? If the question is over, the finals have stopped.
//
// The question this answers: does the signal fire on the premature answers WITHOUT firing on
// the ones that were correctly answered? Every false positive is latency added to a question
// that was already finished.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const RUNS = path.join(ROOT, 'electron/test/golden/interview60.runs');

for (const run of process.argv.slice(2)) {
    const D = path.join(RUNS, run);
    const log = fs.readFileSync(path.join(D, 'natively_debug.log'), 'utf8').split('\n');
    const items = JSON.parse(fs.readFileSync(path.join(D, 'interview60.timeline.json'), 'utf8')).items
        .filter((i) => (i.kind ?? 'spoken') === 'spoken' && i.playedAt && i.clipSecs);

    const finals = [];
    for (const l of log) {
        const m = l.match(/^(\S+) \[LOG\] \[DeepgramStreaming\] Transcript event — isFinal=true, text="((?:[^"\\]|\\.)*)"$/);
        if (!m) continue;
        let t; try { t = JSON.parse('"' + m[2] + '"'); } catch { t = m[2]; }
        if (t.trim()) finals.push({ at: Date.parse(m[1]), text: t });
    }
    const answers = [];
    for (const l of log) {
        const m = l.match(/^(\S+) \[LOG\] \[Main\] dispatch: (answer|extend) source=(\w+) .*? question=("(?:[^"\\]|\\.)*")$/);
        if (m) answers.push({ at: Date.parse(m[1]), action: m[2], src: m[3], q: JSON.parse(m[4]) });
    }

    // Which clip was playing (or had just played) when this answer went out?
    const owner = (at) => items.find((i) => at >= i.playedAt && at <= i.playedAt + i.clipSecs * 1000 + 12000);

    const rows = [];
    for (const a of answers) {
        const it = owner(a.at);
        if (!it) continue;
        const end = it.playedAt + it.clipSecs * 1000;
        rows.push({ ...a, id: it.id, level: it.level, premature: a.at < end, endsIn: (end - a.at) / 1000 });
    }

    console.log(`\n=== ${run}: ${rows.length} dispatched answers attributed to a clip`);
    const prem = rows.filter((r) => r.premature);
    console.log(`premature (dispatched before the clip finished): ${prem.length}`);
    for (const r of prem) console.log(`   ${r.id.padEnd(6)} ${(r.level ?? 'base').padEnd(9)} ${r.endsIn.toFixed(1).padStart(5)}s of question still to come   ${JSON.stringify(r.q.slice(0, 60))}`);

    const lastFinalBefore = (t) => { let best = null; for (const f of finals) { if (f.at <= t && (!best || f.at > best.at)) best = f; } return best; };
    console.log('\n  GAP      fires on premature   fires on complete (= latency added for nothing)');
    for (const gap of [1000, 1500, 2000, 2500, 3000, 4000]) {
        const fires = (r) => { const f = lastFinalBefore(r.at); return !!f && r.at - f.at <= gap; };
        const tp = prem.filter(fires).length;
        const fp = rows.filter((r) => !r.premature && fires(r)).length;
        console.log(`  ${String(gap).padStart(5)}ms  ${String(tp).padStart(3)}/${String(prem.length).padEnd(3)}              ${String(fp).padStart(3)}/${rows.length - prem.length}`);
    }
}
