// L38F reader (PREREGISTER-l38f.md): per set (QP, QF, AP, AF) over one rep's extracted answers (et10/et-extract.mjs,
// answerWords 1). Classes as L38R. Bars per rep: QF routed+carries >= 5/6; AF answered (routed|long) <= 1/6; QF holes
// (nothing|apology) <= 1; pooled QF routed first word p50 <= 2500 ms. Prints answer lines and counts only.
//   node read.mjs runs/l38f-r1.answers.json [runs/l38f-r2.answers.json]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ITEMS = JSON.parse(fs.readFileSync(`${HERE}/items.json`, 'utf8'));
const words = (s) => String(s ?? '').trim().split(/\s+/).filter(Boolean).length;
// Amendment 15:5x (mid rep 1, before any reading): Live's transcript spells big-O as "Order of one" / "Order of n"
// (seen on QP1/QF1 console lines), so the spoken "order of" forms count; ORIGINAL_TERMS keeps the registered ones.
const ON0 = String.raw`O\s*\(\s*n\s*\)|\blinear\b|\bO of n\b|\bo n\b`;
const ON = String.raw`${ON0}|\border of n\b(?!\s*log)`;
export const ORIGINAL_TERMS = { QP1: /O\s*\(\s*1\s*\)|\bconstant\b|\bO of (one|1)\b/i, QF1: new RegExp(ON0, 'i'), QF4: new RegExp(ON0, 'i') };
export const TERMS = {
    QP1: /O\s*\(\s*1\s*\)|\bconstant\b|\bO of (one|1)\b|\border of (one|1)\b/i, QF1: new RegExp(ON, 'i'),
    QP2: /\byes\b|\bmutable/i, QF2: /\bno\b|immutable|not mutable/i,
    QP3: /404/, QF3: /500/,
    QP4: /\byes\b|\blog/i, QF4: new RegExp(ON, 'i'),
    QP5: /\byes\b/i, QF5: /\bno\b|doesn'?t|does not|not guaranteed/i,
    QP6: /\bL\s*-?\s*(1|one)\b|lasso/i, QF6: /\bL\s*-?\s*(2|two)\b|ridge/i,
};
export function classify(rec) {
    if (!rec?.played) return 'notPlayed';
    const a = String(rec.answer ?? '').trim();
    if (!a) return 'nothing';
    if (/system error/i.test(a)) return 'apology';
    if (/^\W*hard\W*$/i.test(a)) return 'hard';
    if (words(a) <= 12) return 'routed';
    return 'long';
}
const set = (p) => p === 'RP' ? ITEMS.roster.map((c) => c[0]) : p === 'RF' ? ITEMS.roster.map((c) => c[1]) : ITEMS.chains.flat().filter((id) => id.startsWith(p));
export function readRep(A) {
    const r = {};
    for (const p of ['QP', 'QF', 'AP', 'AF', 'RP', 'RF']) {
        const ids = set(p);
        const cls = Object.fromEntries(ids.map((id) => [id, classify(A[id])]));
        const n = (k) => ids.filter((id) => cls[id] === k).length;
        r[p] = { ids, cls, routed: n('routed'), hard: n('hard'), nothing: n('nothing'), apology: n('apology'), long: n('long'), notPlayed: n('notPlayed'),
            carries: ids.filter((id) => cls[id] === 'routed' && TERMS[id]?.test(A[id].answer)).length,
            carriesOriginal: ids.filter((id) => cls[id] === 'routed' && (ORIGINAL_TERMS[id] ?? TERMS[id])?.test(A[id].answer)).length };
    }
    const qfTimes = r.QF.ids.filter((id) => r.QF.cls[id] === 'routed').map((id) => A[id].ttftMs).filter(Number.isFinite);
    const bars = {
        qfCarry: r.QF.carries >= 5,
        afAnswered: r.AF.routed + r.AF.long <= 1,
        qfHoles: r.QF.nothing + r.QF.apology <= 1,
    };
    return { sets: r, bars, qfTimes };
}
const p50 = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length * 0.5)] : null; };
export function readAll(reps) {
    const R = reps.map(readRep);
    const times = R.flatMap((x) => x.qfTimes);
    const t50 = p50(times);
    return { R, firstWordP50: t50, timeBar: t50 != null && t50 <= 2500, allMet: R.every((x) => Object.values(x.bars).every(Boolean)) && t50 != null && t50 <= 2500 };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const files = process.argv.slice(2);
    if (!files.length) { console.log('usage: read.mjs <answers.json> ...'); process.exit(2); }
    const reps = files.map((f) => JSON.parse(fs.readFileSync(f, 'utf8')));
    const s = (x) => (Number.isFinite(x) ? `${(x / 1000).toFixed(1)} s` : '-');
    const all = readAll(reps);
    all.R.forEach((x, i) => {
        const A = reps[i];
        console.log(`\n${path.basename(files[i])}`);
        for (const p of ['QP', 'QF', 'AP', 'AF', 'RP', 'RF']) {
            const r = x.sets[p];
            console.log(`  ${p}: routed ${r.routed} (carries ${r.carries}; registered terms ${r.carriesOriginal}), hard ${r.hard}, nothing ${r.nothing}, apology ${r.apology}, long ${r.long}, not played ${r.notPlayed}`);
            for (const id of r.ids) {
                const c = r.cls[id];
                const flag = c === 'routed' && TERMS[id] ? (TERMS[id].test(A[id].answer) ? 'routed, carries' : 'routed, MISSES the term') : c;
                console.log(`    ${id.padEnd(4)} ${flag.padEnd(24)} ${s(A[id]?.ttftMs).padStart(7)}  ${JSON.stringify(c === 'routed' || c === 'long' ? A[id].answer : null)}`);
            }
        }
        console.log(`  bars: QF carries >=5 ${x.bars.qfCarry}; AF answered <=1 ${x.bars.afAnswered}; QF holes <=1 ${x.bars.qfHoles}`);
    });
    console.log(`\npooled QF routed first word p50 ${s(all.firstWordP50)} (bar <= 2.5 s: ${all.timeBar})`);
    console.log(`ALL BARS MET: ${all.allMet}`);
}
