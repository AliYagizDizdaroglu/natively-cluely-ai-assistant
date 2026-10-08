// Reviewer throwaway: before (07a0e5e copies) vs after (MAIN working tree) attribution on every run
// folder that has question= dispatch lines. Reads run folders read-only.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const G = 'C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-cluely-ai-assistant\\electron\\test\\golden';
const ORIG = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), 'orig');
const load = async (dir) => ({
    judge: await import(pathToFileURL(path.join(dir, 'interview60.judge.mjs'))),
    metrics: await import(pathToFileURL(path.join(dir, 'interview60.metrics.mjs'))),
    lib: await import(pathToFileURL(path.join(dir, 'interview60.lib.mjs'))),
});
const before = await load(ORIG), after = await load(process.env.AFTER_DIR || G);
if (before.judge.pairAnswers === after.judge.pairAnswers) throw new Error('same module loaded twice');

const runsDir = path.join(G, 'interview60.runs');
const runs = fs.readdirSync(runsDir).filter((r) => fs.existsSync(path.join(runsDir, r, 'natively_debug.log')) && fs.existsSync(path.join(runsDir, r, 'interview60.timeline.json')));
const snap = (mods, dir) => {
    const tl = JSON.parse(fs.readFileSync(path.join(dir, 'interview60.timeline.json'), 'utf8'));
    const dbg = mods.lib.logSince(path.join(dir, 'natively_debug.log'), tl.startDebug, tl.endDebug);
    const pairs = mods.judge.pairAnswers(dbg, tl);
    const run = mods.metrics.computeRun(dir);
    return { pairs, run };
};
let totalChanged = 0;
for (const r of runs) {
    const dir = path.join(runsDir, r);
    const log = fs.readFileSync(path.join(dir, 'natively_debug.log'), 'utf8');
    if (!/dispatch: answer .* question="/.test(log)) continue;
    let b, a;
    try { b = snap(before, dir); a = snap(after, dir); } catch (e) { console.log(`${r}: ERROR ${e.message}`); continue; }
    const lines = [];
    b.pairs.forEach((bp, i) => { const ap = a.pairs[i]; if (bp.id !== ap.id) lines.push(`  judge pair ${bp.dispatchedAt} ${bp.id} -> ${ap.id}  heard=${JSON.stringify(bp.heard).slice(0, 90)}`); });
    if (b.run.answersToNobody !== a.run.answersToNobody) lines.push(`  answersToNobody ${b.run.answersToNobody} -> ${a.run.answersToNobody}`);
    const keys = ['answered', 'answeredAt', 'dispatches', 'heardBy', 'extended', 'supersedes', 'coverage', 'raceLoss', 'verdict'];
    b.run.items.forEach((bi, i) => { const ai = a.run.items[i]; const ch = keys.filter((k) => JSON.stringify(bi[k]) !== JSON.stringify(ai[k])); if (ch.length) lines.push(`  item ${bi.id}: ${ch.map((k) => `${k} ${JSON.stringify(bi[k])}->${JSON.stringify(ai[k])}`).join(', ')}`); });
    // cross-site agreement AFTER: judge pair id vs metrics item whose answeredAt is that dispatch
    const byAt = new Map(a.run.items.filter((i) => i.answeredAt != null).map((i) => [i.answeredAt, i.id]));
    const judgeNobody = a.pairs.filter((p) => p.id === '?').length;
    const disagree = a.pairs.filter((p) => byAt.has(Date.parse(p.dispatchedAt)) && byAt.get(Date.parse(p.dispatchedAt)) !== p.id)
        .map((p) => `${p.dispatchedAt} judge=${p.id} metrics=${byAt.get(Date.parse(p.dispatchedAt))}`);
    const bByAt = new Map(b.run.items.filter((i) => i.answeredAt != null).map((i) => [i.answeredAt, i.id]));
    const bDisagree = b.pairs.filter((p) => bByAt.has(Date.parse(p.dispatchedAt)) && bByAt.get(Date.parse(p.dispatchedAt)) !== p.id).length;
    totalChanged += lines.length;
    console.log(`${r}: ${lines.length ? 'CHANGED' : 'identical'}  (after: judge '?'=${judgeNobody}, metrics toNobody=${a.run.answersToNobody}, judge/metrics disagreements before=${bDisagree} after=${disagree.length})`);
    for (const l of lines) console.log(l);
    for (const d of disagree) console.log(`  disagree: ${d}`);
}
console.log(`total changed lines: ${totalChanged}`);
