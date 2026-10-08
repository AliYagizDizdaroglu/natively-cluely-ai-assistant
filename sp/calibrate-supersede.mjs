// THROWAWAY calibration: does "the later text covers the answered one and adds a lot"
// separate the real half-then-whole pairs from genuinely different questions?
//
// POSITIVES: within one long question's spoken window, an answered detection followed by
// a later, fuller one (the doubles we want to collapse).
// NEGATIVES: every consecutive pair of ANSWERED detections that belong to DIFFERENT roster
// items. If a threshold fires on any of these it would suppress a real question.
import fs from 'node:fs';

const D = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs/2026-09-08T08-44-56-after9/';
const items = JSON.parse(fs.readFileSync(D + 'interview60.timeline.json', 'utf8')).items;
const log = fs.readFileSync(D + 'natively_debug.log', 'utf8').split('\n');

// question=... is logged with JSON.stringify and is NOT truncated (only anchor= is).
const RE = /^(\S+) \[LOG\] \[Main\] dispatch: (\w+) source=(\w+) .*? question=("(?:[^"\\]|\\.)*")$/;
const disp = [];
for (const l of log) {
    const m = l.match(RE);
    if (!m) continue;
    let q; try { q = JSON.parse(m[4]); } catch { continue; }
    disp.push({ at: Date.parse(m[1]), action: m[2], src: m[3], q });
}

const contentWords = (s) => new Set((String(s).toLowerCase().match(/[a-z0-9]+/g) ?? []).filter((w) => w.length > 3));
const overlap = (a, b) => { const A = contentWords(a), B = contentWords(b); if (!A.size) return 0; let n = 0; for (const w of A) if (B.has(w)) n++; return n / A.size; };
const added = (answered, later) => contentWords(later).size - contentWords(answered).size;

// Attribute every dispatch to the roster item whose play window contains it (+10s tail
// for the Live lag, measured at 3.3-5.3s).
const owner = (at) => items.find((r) => at >= r.playedAt && at <= r.playedAt + r.clipSecs * 1000 + 10000);

const answers = disp.filter((d) => d.action === 'answer' || d.action === 'extend').map((d) => ({ ...d, item: owner(d.at) })).filter((d) => d.item);

console.log('POSITIVES — a later detection following an answered one inside the SAME item\n');
console.log('item   gap_s  cover  added  later_src  answered -> later');
const pos = [];
for (let i = 1; i < answers.length; i++) {
    const a = answers[i - 1], b = answers[i];
    if (a.item.id !== b.item.id) continue;
    const cover = overlap(a.q, b.q), add = added(a.q, b.q);
    pos.push({ id: a.item.id, cover, add, gap: (b.at - a.at) / 1000 });
    console.log(a.item.id.padEnd(6), ((b.at - a.at) / 1000).toFixed(1).padStart(5), cover.toFixed(2).padStart(6), String(add).padStart(6), '  ' + b.src.padEnd(9), JSON.stringify(a.q.slice(0, 44)) + ' -> ' + JSON.stringify(b.q.slice(0, 44)));
}

console.log('\nNEGATIVES — consecutive answered detections belonging to DIFFERENT items\n');
const neg = [];
for (let i = 1; i < answers.length; i++) {
    const a = answers[i - 1], b = answers[i];
    if (a.item.id === b.item.id) continue;
    const cover = overlap(a.q, b.q), add = added(a.q, b.q), gap = (b.at - a.at) / 1000;
    neg.push({ from: a.item.id, to: b.item.id, cover, add, gap });
}
neg.sort((x, y) => y.cover - x.cover);
console.log('n=' + neg.length + '; the 10 highest coverage scores (the ones a rule could wrongly collapse):');
console.log('from -> to     gap_s  cover  added');
for (const n of neg.slice(0, 10)) console.log((n.from + ' -> ' + n.to).padEnd(14), n.gap.toFixed(1).padStart(6), n.cover.toFixed(2).padStart(6), String(n.add).padStart(6));

const inWindow = neg.filter((n) => n.gap <= 30);
console.log('\nnegatives within a 30s gap: ' + inWindow.length + ' of ' + neg.length);
for (const th of [0.5, 0.6, 0.7, 0.8]) {
    for (const k of [3, 5, 8]) {
        const p = pos.filter((x) => x.cover >= th && x.add >= k && x.gap <= 30).length;
        const f = inWindow.filter((x) => x.cover >= th && x.add >= k).length;
        console.log(`  cover>=${th} added>=${k}:  fires on ${p}/${pos.length} positives, ${f} false on negatives`);
    }
}
