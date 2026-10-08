// SPIKE (throwaway, read-only over run logs): precision of "extend on an added clause" variants.
// For every answered question, look at the dispatch lines (answered or dropped-as-duplicate) within
// 30 s after it. A variant fires when the later text CONTAINS the answered text (normalised) and
// adds at least N tokens (any length) / M content words (>3 letters). Reports, per run and variant:
// fires, fires whose answered head was NON-acceptable (a real rescue), and fires on acceptable heads
// (a wasted second answer). Also shows the after7 W10/M27 cases explicitly.
// usage: node spike-extend.mjs <repo-root> <runDir> [<runDir> ...]
import fs from 'node:fs';
import path from 'node:path';

const [root, ...runs] = process.argv.slice(2);
const RUNS = path.join(root, 'electron/test/golden/interview60.runs');
const DISPATCH = /^(\S+) \[LOG\] \[Main\] dispatch: (answer|chip|drop|hold) source=(live|whisper) anchor="((?:[^"\\]|\\.)*)" verdict=(\w+)(?: duplicateOf=(\w+) answered=(true|false))?(?: reason=(\w+))?(?: question=("(?:[^"\\]|\\.)*"))?/gm;
const norm = (t) => t.toLowerCase().replace(/\s+/g, ' ').trim().replace(/[?.!,;:]+$/, '');
const toks = (t) => t.toLowerCase().match(/[a-z0-9']+/g) ?? [];
const cw = (t) => new Set(toks(t).filter((w) => w.length > 3));
const cls = (r) => !r ? '?' : (r.correctness === 0 || r.on_topic === 0) ? 'wrong' : (r.correctness === 2 && r.on_topic === 2 && r.delivery >= 1) ? 'ok' : 'weak';
const VARIANTS = [
    { name: 'contain + >=3 tokens', ok: (a, b) => toks(b).length - toks(a).length >= 3 },
    { name: 'contain + >=2 content', ok: (a, b) => [...cw(b)].filter((w) => !cw(a).has(w)).length >= 2 },
    { name: 'contain + >=3 content', ok: (a, b) => [...cw(b)].filter((w) => !cw(a).has(w)).length >= 3 },
];
const totals = Object.fromEntries(VARIANTS.map((v) => [v.name, { fires: 0, rescues: 0, wasted: 0 }]));
for (const run of runs) {
    const dir = path.join(RUNS, run);
    const dbg = fs.readFileSync(path.join(dir, 'natively_debug.log'), 'utf8');
    const tl = fs.existsSync(path.join(dir, 'interview60.timeline.json')) ? JSON.parse(fs.readFileSync(path.join(dir, 'interview60.timeline.json'), 'utf8')).items : [];
    const verdicts = fs.existsSync(path.join(dir, 'interview60.judge.verdicts.json')) ? JSON.parse(fs.readFileSync(path.join(dir, 'interview60.judge.verdicts.json'), 'utf8')) : {};
    const itemAt = (t) => { let b = null; for (const it of tl) if (it.playedAt <= t + 2000 && (!b || it.playedAt > b.playedAt)) b = it; return b?.id ?? '?'; };
    const disp = [...dbg.matchAll(DISPATCH)].map((m) => ({ at: Date.parse(m[1]), action: m[2], source: m[3], text: m[9] ? JSON.parse(m[9]) : JSON.parse('"' + m[4] + '"'), dup: m[6] }));
    const answers = disp.filter((d) => d.action === 'answer');
    console.log(`=== ${run}: ${answers.length} answers`);
    for (const v of VARIANTS) {
        let fires = 0, rescues = 0, wasted = 0; const lines = [];
        for (const a of answers) {
            const later = disp.find((d) => d !== a && d.at > a.at && d.at - a.at <= 30000 && (d.action === 'answer' || d.dup) && norm(d.text).includes(norm(a.text)) && norm(d.text) !== norm(a.text) && v.ok(a.text, d.text));
            if (!later) continue;
            fires++;
            const id = itemAt(a.at); const c = cls(verdicts[id]);
            if (c === 'ok') wasted++; else rescues++;
            lines.push(`    ${id.padEnd(4)} ${c.padEnd(5)} +${((later.at - a.at) / 1000).toFixed(1)}s head=${JSON.stringify(a.text.slice(0, 45))} fuller=${JSON.stringify(later.text.slice(0, 70))}`);
        }
        console.log(`  ${v.name.padEnd(24)} fires ${fires}  rescues(head not ok) ${rescues}  wasted(head ok) ${wasted}`);
        for (const l of lines) console.log(l);
        totals[v.name].fires += fires; totals[v.name].rescues += rescues; totals[v.name].wasted += wasted;
    }
}
console.log('\nTOTAL', JSON.stringify(totals));
