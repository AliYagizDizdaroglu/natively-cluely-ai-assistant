// THROWAWAY calibration: every dispatch the real ChipDeduper drops as a duplicate of an
// ALREADY-ANSWERED question, with the coverage/added-words statistics a supersede rule
// would decide on. Blast radius, measured on real hours, before choosing a threshold.
//
//   node calibrate-drop-path.mjs <bundleDir> <repo-root> <run> [<run> ...]
// Calibration of the calibration: the replay must reproduce the log's own actions
// (mismatches 0) or its "drop" set is not the app's drop set.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const [bundleDir, root, ...runs] = process.argv.slice(2);
const require = createRequire(import.meta.url);
const { ChipDeduper } = require(path.join(bundleDir, 'ChipDeduper.js'));
const { shouldExtend } = require(path.join(bundleDir, 'extendOnClause.js'));
const RUNS = path.join(root, 'electron/test/golden/interview60.runs');

const LINE = /^(\S+) \[LOG\] \[Main\] dispatch: (answer|chip|drop|hold|extend) source=(live|whisper) anchor="((?:[^"\\]|\\.)*)" verdict=(\w+)(?: duplicateOf=(\w+) answered=(true|false))?(?: reason=(\w+))?(?: extends="((?:[^"\\]|\\.)*)")? question="((?:[^"\\]|\\.)*)"$/;
const unq = (s) => { try { return JSON.parse('"' + s + '"'); } catch { return s; } };

// Same content-word definition ChipDeduper and questionReconcile use: > 3 letters.
const cw = (s) => new Set((String(s).toLowerCase().match(/[a-z0-9]+/g) ?? []).filter((w) => w.length > 3));
const cover = (answered, later) => { const A = cw(answered), B = cw(later); if (!A.size) return 0; let n = 0; for (const w of A) if (B.has(w)) n++; return n / A.size; };
const added = (answered, later) => cw(later).size - cw(answered).size;

function candidates(dbg) {
    const parsed = [];
    for (const l of dbg.split('\n')) {
        const m = l.match(LINE);
        if (m) parsed.push({ at: Date.parse(m[1]), action: m[2], source: m[3], anchor: unq(m[4]), verdict: m[5], dupOf: m[6], answered: m[7], question: unq(m[10]) });
    }
    const out = [];
    for (let i = 0; i < parsed.length; i++) {
        const p = parsed[i], next = parsed[i + 1];
        if (p.action === 'hold') continue;
        if (p.action === 'drop' && p.verdict === 'fragment') continue;
        if (p.action === 'drop' && p.verdict === 'unverifiable' && p.dupOf === 'live' && p.answered === 'false') continue;
        if (p.action === 'drop' && next && next.action === 'hold' && next.at - p.at <= 5) continue;
        out.push(p);
    }
    return out;
}

for (const run of runs) {
    const dir = path.join(RUNS, run);
    const dbg = fs.readFileSync(path.join(dir, 'natively_debug.log'), 'utf8');
    const tl = JSON.parse(fs.readFileSync(path.join(dir, 'interview60.timeline.json'), 'utf8'));
    const items = tl.items.filter((i) => i.kind === 'spoken').map((i) => ({ key: i.id, q: i.q, at: Number(i.playedAt) }));
    const cands = candidates(dbg).filter((c) => c.at >= Number(tl.startedMs ?? Date.parse(tl.startedAt)) - 5000);

    const dd = new ChipDeduper();
    const realNow = Date.now;
    const rows = [];
    let mismatches = 0;
    for (const c of cands) {
        Date.now = () => c.at;
        const r = dd.admit({ question: c.question, source: c.source, anchor: c.anchor });
        let action;
        if (r.admitted) { action = 'answer'; dd.markAnswered(r.id); }
        else if (r.alreadyAnswered === true && r.duplicateOfQuestion !== undefined && shouldExtend(r.duplicateOfQuestion, c.question, r.duplicateAgeMs)) { action = 'extend'; dd.extend(r.id, c.question); }
        else action = 'drop';
        if ((c.action === 'chip' ? 'answer' : c.action) !== action) mismatches++;
        if (action === 'drop' && r.alreadyAnswered === true && r.duplicateOfQuestion) {
            rows.push({ at: c.at, src: c.source, q: c.question, dup: r.duplicateOfQuestion, age: r.duplicateAgeMs, cover: cover(r.duplicateOfQuestion, c.question), added: added(r.duplicateOfQuestion, c.question) });
        }
    }
    Date.now = realNow;

    const attr = (at) => { const it = items.find((i) => at >= i.at - 2000 && at <= i.at + 95000 && items.indexOf(i) === items.findIndex((j) => at >= j.at - 2000 && at <= j.at + 95000)); return it ? it.key : '?'; };
    const near = (at) => { let best = '?', bd = Infinity; for (const i of items) { const d = at - i.at; if (d >= -2000 && d < bd) { bd = d; best = i.key; } } return best; };

    console.log(`\n=== ${run}  (replay mismatches vs the log: ${mismatches} — must be 0 for this to mean anything)`);
    console.log(`drops of an already-answered question: ${rows.length}`);
    console.log('item   age_s  cover  added  src      later text');
    for (const r of rows.sort((a, b) => b.cover - a.cover)) {
        console.log(near(r.at).padEnd(6), (r.age / 1000).toFixed(1).padStart(5), r.cover.toFixed(2).padStart(6), String(r.added).padStart(6), ' ' + r.src.padEnd(8), JSON.stringify(r.q.slice(0, 70)));
    }
    for (const th of [0.7, 0.8, 0.9]) for (const k of [5, 8, 12]) {
        const hit = rows.filter((r) => r.cover >= th && r.added >= k);
        console.log(`  cover>=${th} added>=${k}: ${hit.length} would supersede  [${hit.map((r) => near(r.at)).join(' ')}]`);
    }
}
