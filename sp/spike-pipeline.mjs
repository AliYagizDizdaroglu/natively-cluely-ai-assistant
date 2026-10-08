// SPIKE (throwaway, read-only over run logs): two pipeline rules for weak answers.
//   R1 deduper window 20 s → 60 s: for every answer dispatch, would the NEXT answer
//      dispatch within 60 s have been suppressed by the deduper's rules (containment
//      or Jaccard ≥ 0.7)? Same script item → a true double removed; different item →
//      a legitimate question wrongly suppressed (the cost).
//   R2 supersede: an answered question followed within 30 s by a longer text (any ear,
//      answered or dropped-as-duplicate) that contains it / shares ≥ 60 % of its content
//      words and adds ≥ 3 content words → regenerate for the fuller question. Counts the
//      rescues per run and whether the answered head was non-acceptable in that run.
// usage: node spike-pipeline.mjs <repo-root> <runDir> [<runDir> ...]
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const [root, ...runs] = process.argv.slice(2);
const require = createRequire(path.join(root, 'package.json'));
const { jaccardSimilarity } = require(path.join(root, 'dist-electron/electron/services/jaccardSimilarity.js'));
const RUNS = path.join(root, 'electron/test/golden/interview60.runs');
const DISPATCH = /^(\S+) \[LOG\] \[Main\] dispatch: (answer|chip|drop|hold) source=(live|whisper) anchor="((?:[^"\\]|\\.)*)" verdict=(\w+)(?: duplicateOf=(\w+) answered=(true|false))?(?: reason=(\w+))?(?: question=("(?:[^"\\]|\\.)*"))?/gm;
const norm = (t) => t.toLowerCase().replace(/\s+/g, ' ').trim().replace(/[?.!,;:]+$/, '');
const cw = (t) => new Set((t.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter((w) => w.length > 3));
const dedupeHit = (a, b) => { const na = norm(a), nb = norm(b); return (nb.length >= 3 && (na.includes(nb) || nb.includes(na))) || jaccardSimilarity(a, b) >= 0.7; };
const cls = (r) => !r ? '?' : (r.correctness === 0 || r.on_topic === 0) ? 'wrong' : (r.correctness === 2 && r.on_topic === 2 && r.delivery >= 1) ? 'ok' : 'weak';

let T = { doublesRemoved: 0, falseSuppressed: 0, rescues: 0, rescuesNonAcceptable: 0, rescuesGraded: 0 };
for (const run of runs) {
    const dir = path.join(RUNS, run);
    const dbg = fs.readFileSync(path.join(dir, 'natively_debug.log'), 'utf8');
    const tl = fs.existsSync(path.join(dir, 'interview60.timeline.json')) ? JSON.parse(fs.readFileSync(path.join(dir, 'interview60.timeline.json'), 'utf8')).items : [];
    const verdicts = fs.existsSync(path.join(dir, 'interview60.judge.verdicts.json')) ? JSON.parse(fs.readFileSync(path.join(dir, 'interview60.judge.verdicts.json'), 'utf8')) : null;
    const itemAt = (t) => { let b = null; for (const it of tl) if (it.playedAt <= t + 2000 && (!b || it.playedAt > b.playedAt)) b = it; return b?.id ?? '?'; };
    const disp = [...dbg.matchAll(DISPATCH)].map((m) => ({ at: Date.parse(m[1]), action: m[2], source: m[3], text: m[9] ? JSON.parse(m[9]) : JSON.parse('"' + m[4] + '"'), dup: m[6] }));
    const answers = disp.filter((d) => d.action === 'answer');
    let doublesRemoved = 0, falseSuppressed = 0, rescues = 0, rescuesNA = 0, rescuesGraded = 0;
    const lines = [];
    for (let i = 0; i < answers.length; i++) {
        const a = answers[i];
        // R1: the next answer within 60 s (but beyond the current 20 s window, where the deduper already looks)
        const nxt = answers.slice(i + 1).find((b) => b.at - a.at <= 60000);
        if (nxt && nxt.at - a.at > 20000 && dedupeHit(a.text, nxt.text)) {
            const same = itemAt(a.at) === itemAt(nxt.at);
            if (same) { doublesRemoved++; lines.push(`  R1 double removed  ${itemAt(a.at)} +${((nxt.at - a.at) / 1000).toFixed(0)}s ${JSON.stringify(nxt.text.slice(0, 60))}`); }
            else { falseSuppressed++; lines.push(`  R1 FALSE suppress  ${itemAt(a.at)}→${itemAt(nxt.at)} +${((nxt.at - a.at) / 1000).toFixed(0)}s ${JSON.stringify(a.text.slice(0, 50))} vs ${JSON.stringify(nxt.text.slice(0, 50))}`); }
        }
        // R2: a fuller text within 30 s
        const ca = cw(a.text);
        const fuller = disp.find((d) => d.at > a.at && d.at - a.at <= 30000 && d !== a && (d.action === 'answer' || d.dup) && (() => { const cd = cw(d.text); const shared = [...ca].filter((w) => cd.has(w)).length; const added = [...cd].filter((w) => !ca.has(w)).length; return (norm(d.text).includes(norm(a.text)) || (ca.size > 0 && shared / ca.size >= 0.6)) && added >= 3 && cw(d.text).size > ca.size; })());
        if (fuller) {
            rescues++;
            const id = itemAt(a.at);
            const v = verdicts ? (verdicts[id] ?? null) : null;
            if (v) { rescuesGraded++; if (cls(v) !== 'ok') rescuesNA++; }
            lines.push(`  R2 rescue ${id.padEnd(4)} ${v ? cls(v).padEnd(5) : '     '} +${((fuller.at - a.at) / 1000).toFixed(1)}s head=${JSON.stringify(a.text.slice(0, 48))} fuller=${JSON.stringify(fuller.text.slice(0, 70))}`);
        }
    }
    console.log(`=== ${run}: answers ${answers.length} | R1 doubles removed ${doublesRemoved}, false suppressions ${falseSuppressed} | R2 rescues ${rescues} (${rescuesNA} of ${rescuesGraded} graded heads were non-acceptable)`);
    for (const l of lines) console.log(l);
    T.doublesRemoved += doublesRemoved; T.falseSuppressed += falseSuppressed; T.rescues += rescues; T.rescuesNonAcceptable += rescuesNA; T.rescuesGraded += rescuesGraded;
}
console.log('\nTOTAL', JSON.stringify(T));
