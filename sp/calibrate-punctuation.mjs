// THROWAWAY calibration: does the dispatched text's ENDING predict that the interviewer was
// still speaking? Deepgram punctuates, so a final that stops on a comma or on no terminal
// mark at all is mid-sentence. Ground truth is the timeline: dispatched before the clip ended.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const RUNS = path.join(ROOT, 'electron/test/golden/interview60.runs');

// Candidate predicates, each a pure function of the dispatched text.
const PREDICATES = {
    'no terminal ? or .': (q) => !/[?.!]["')\]]*\s*$/.test(q.trim()),
    'ends with a comma': (q) => /,["')\]]*\s*$/.test(q.trim()),
    'no ? anywhere': (q) => !q.includes('?'),
    'no terminal ? (period ok)': (q) => !/[?!]["')\]]*\s*$/.test(q.trim()),
};

for (const run of process.argv.slice(2)) {
    const D = path.join(RUNS, run);
    const log = fs.readFileSync(path.join(D, 'natively_debug.log'), 'utf8').split('\n');
    const items = JSON.parse(fs.readFileSync(path.join(D, 'interview60.timeline.json'), 'utf8')).items
        .filter((i) => (i.kind ?? 'spoken') === 'spoken' && i.playedAt && i.clipSecs);

    const answers = [];
    for (const l of log) {
        const m = l.match(/^(\S+) \[LOG\] \[Main\] dispatch: (answer|extend) source=(\w+) .*? question=("(?:[^"\\]|\\.)*")$/);
        if (m) answers.push({ at: Date.parse(m[1]), action: m[2], src: m[3], q: JSON.parse(m[4]) });
    }
    const owner = (at) => items.find((i) => at >= i.playedAt && at <= i.playedAt + i.clipSecs * 1000 + 12000);

    const rows = [];
    for (const a of answers) {
        const it = owner(a.at);
        if (!it) continue;
        const end = it.playedAt + it.clipSecs * 1000;
        // Only count it premature if a MEANINGFUL amount of question remains: W04/H10/L03F1
        // land 0.0-1.2s before the clip's audio tail ends and are effectively complete.
        rows.push({ ...a, id: it.id, level: it.level, remaining: (end - a.at) / 1000 });
    }
    const badly = rows.filter((r) => r.remaining >= 2);
    const fine = rows.filter((r) => r.remaining < 2);

    console.log(`\n=== ${run}: ${rows.length} answers, ${badly.length} dispatched with >=2s of question still to come`);
    console.log('predicate                       catches premature   fires on the rest (false holds)');
    for (const [name, p] of Object.entries(PREDICATES)) {
        const tp = badly.filter((r) => p(r.q));
        const fp = fine.filter((r) => p(r.q));
        console.log('  ' + name.padEnd(30) + String(tp.length).padStart(3) + '/' + String(badly.length).padEnd(4)
            + '            ' + String(fp.length).padStart(3) + '/' + fine.length
            + (tp.length === badly.length && fp.length === 0 ? '   <= clean separation' : ''));
    }
    const p = PREDICATES['no terminal ? or .'];
    console.log('\n  premature ones this predicate MISSES:');
    for (const r of badly.filter((x) => !p(x.q))) console.log('    ' + r.id.padEnd(6) + JSON.stringify(r.q.slice(-70)));
    console.log('  complete ones it would wrongly hold:');
    for (const r of fine.filter((x) => p(x.q)).slice(0, 12)) console.log('    ' + r.id.padEnd(6) + JSON.stringify(r.q.slice(-70)));
}
