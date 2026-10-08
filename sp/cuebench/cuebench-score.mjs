// Cue bench score + decision (SP\PREREGISTER-cuebench.md §2-§3, the cue-mode plan's Task 8 Step 5 table).
// `benchDecide(reps)` is exported PURE and calibrated by cuebench-calibrate.mjs before it reads a real verdict.
//   node cuebench-score.mjs --cue-dir <dir with the cue answer files>
// Per rep and arm: acceptable = the MEAN over the two graders of verdictOf === 'acceptable'; wrong = consensus
// (both graders correctness 0). Empty prose was not graded and counts wrong for both graders (0/0/0). A missing or
// out-of-range verdict stops the run: a half-graded bench cannot decide.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * reps: [{ rep, control: { acc, wrong }, cue: { acc, wrong, n, present, shape, ttftP90 }, controlTtftP90 }]
 *   acc = mean-of-graders acceptable count; wrong = consensus-wrong count; n = ids compared in that rep;
 *   present = cue-arm ids whose RAW block has at least one line; shape = ids whose RAW block has 1..maxLines lines,
 *   none empty, none with "?", none with "you" — cues_wellformed WITHOUT its word count (the amendment of
 *   2026-09-30: lines gated, words reported, because the app cuts a long line but a dropped line loses a part).
 * Rules (plan Task 8 Step 5, its cue row replaced by the 2026-09-30 amendment of PREREGISTER-cuebench.md):
 *   band      ship if max(cue acc) >= min(control acc) (overlaps or exceeds); entirely below -> STOP
 *   wrong     any cue rep with more wrong than the worst control rep -> STOP
 *   cues      present AND shape on >= 90% of the rep's ids, in every rep -> else STOP
 *   words, ttft   reported, not gating
 */
export function benchDecide(reps) {
    if (reps.length !== 3) throw new Error(`the bench has 3 reps, got ${reps.length}`);
    const ctrl = reps.map((r) => r.control.acc), cue = reps.map((r) => r.cue.acc);
    const band = { control: [Math.min(...ctrl), Math.max(...ctrl)], cue: [Math.min(...cue), Math.max(...cue)] };
    const bandOk = band.cue[1] >= band.control[0];
    const worstControlWrong = Math.max(...reps.map((r) => r.control.wrong));
    const wrongStops = reps.filter((r) => r.cue.wrong > worstControlWrong).map((r) => r.rep);
    const cueFails = reps.filter((r) => r.cue.present < 0.9 * r.cue.n || r.cue.shape < 0.9 * r.cue.n).map((r) => r.rep);
    const reasons = [];
    if (!bandOk) reasons.push(`prose band: cue [${band.cue.join(', ')}] sits entirely below control [${band.control.join(', ')}]`);
    if (wrongStops.length) reasons.push(`wrong: cue rep(s) ${wrongStops.join(',')} exceed the worst control rep's ${worstControlWrong}`);
    if (cueFails.length) reasons.push(`cue blocks present + shaped under 90% in rep(s) ${cueFails.join(',')}`);
    return { outcome: reasons.length ? 'STOP' : 'PASS', reasons, band, worstControlWrong, wrongStops, cueFails };
}

/** The gated shape of one RAW cue block (see benchDecide), and the reported word overrun. */
export function blockShape(cues, maxLines, maxWords) {
    const list = Array.isArray(cues) ? cues.map((c) => String(c).trim()) : [];
    const present = list.length > 0;
    const shape = list.length >= 1 && list.length <= maxLines && list.every((t) => t && !t.includes('?') && !/\byou\b/i.test(t));
    const longLines = list.filter((t) => (t.match(/\S+/g) || []).length > maxWords).length;
    return { present, shape, lines: list.length, longLines };
}

if (process.argv[1] && path.resolve(process.argv[1]).endsWith('cuebench-score.mjs')) {
    const { BLIND, REPS, controlFile, cueFile } = await import('./cuebench-pairs.mjs');
    const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
    const J = await import(pathToFileURL(`${MAIN}/electron/test/golden/interview60.judge.mjs`).href);
    const i = process.argv.indexOf('--cue-dir'); const cueDir = i > 0 ? process.argv[i + 1] : null;
    if (!cueDir) { console.error('usage: cuebench-score.mjs --cue-dir <dir> [--dist <checkout>]'); process.exit(2); }
    // The limits and the rule benched come from the build the cue arm ran on (--dist, default the cue worktree).
    const di = process.argv.indexOf('--dist');
    const DIST = di > 0 ? process.argv[di + 1] : `${MAIN}/.claude/worktrees/whole-turn`;
    const { createRequire } = await import('node:module');
    const { createHash } = await import('node:crypto');
    const P = createRequire(`${DIST}/package.json`)(`${DIST}/dist-electron/electron/llm/prompts.js`);
    if (!Number.isInteger(P.CUE_MAX_LINES) || !Number.isInteger(P.CUE_MAX_WORDS) || typeof P.CUE_RULE !== 'string') { console.error(`${DIST}'s dist carries no cue limits/rule`); process.exit(2); }
    console.log(`benched rule: CUE_MAX_LINES ${P.CUE_MAX_LINES}, CUE_MAX_WORDS ${P.CUE_MAX_WORDS}, CUE_RULE sha256/12 ${createHash('sha256').update(P.CUE_RULE).digest('hex').slice(0, 12)}${typeof P.CUE_SHAPE_RULE === 'string' ? `\n  shape bullet: ${P.CUE_SHAPE_RULE}` : ''}`);
    const valid = (v) => v && [v.correctness, v.on_topic, v.delivery].every((x) => [0, 1, 2].includes(x));
    const pct = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(s.length * p))]; };
    const reps = [];
    for (const r of REPS) {
        const tally = { control: { acc: 0, wrong: 0 }, cue: { acc: 0, wrong: 0 } };
        const ids = new Set();
        for (const h of [1, 2]) {
            const key = JSON.parse(fs.readFileSync(path.join(BLIND, `key.r${r}.h${h}.json`), 'utf8'));
            const g = ['g1', 'g2'].map((gr) => {
                const f = path.join(BLIND, `verdicts.r${r}.h${h}.${gr}.json`);
                if (!fs.existsSync(f)) { console.error(`missing ${f}`); process.exit(2); }
                return JSON.parse(fs.readFileSync(f, 'utf8'));
            });
            for (const [k, meta] of Object.entries(key)) {
                ids.add(meta.id);
                const vs = meta.empty ? [{ correctness: 0, on_topic: 0, delivery: 0 }, { correctness: 0, on_topic: 0, delivery: 0 }] : g.map((v) => v[k]);
                if (!vs.every(valid)) { console.error(`r${r} h${h} ${k}: a grader gave no valid verdict`); process.exit(2); }
                tally[meta.arm].acc += vs.filter((v) => J.verdictOf(v) === 'acceptable').length / 2;
                if (vs.every((v) => v.correctness === 0)) tally[meta.arm].wrong++;
            }
        }
        const cueRecs = JSON.parse(fs.readFileSync(cueFile(cueDir, r), 'utf8'));
        const ctrlRecs = JSON.parse(fs.readFileSync(controlFile(r), 'utf8'));
        const idList = [...ids];
        const ttft = (recs) => pct(idList.map((id) => recs[id]?.ttft).filter((t) => Number.isFinite(t)), 0.9);
        const shapes = idList.map((id) => blockShape(cueRecs[id]?.cues, P.CUE_MAX_LINES, P.CUE_MAX_WORDS));
        reps.push({
            rep: r,
            control: tally.control,
            cue: {
                ...tally.cue, n: idList.length, present: shapes.filter((s) => s.present).length, shape: shapes.filter((s) => s.shape).length,
                longBlocks: shapes.filter((s) => s.longLines > 0).length, longLines: shapes.reduce((a, s) => a + s.longLines, 0), allLines: shapes.reduce((a, s) => a + s.lines, 0),
                overLines: shapes.filter((s) => s.lines > P.CUE_MAX_LINES).length, ttftP90: ttft(cueRecs),
            },
            controlTtftP90: ttft(ctrlRecs),
        });
    }
    const d = benchDecide(reps);
    for (const r of reps) console.log(`rep ${r.rep}: n=${r.cue.n}  acceptable control ${r.control.acc} / cue ${r.cue.acc}  consensus-wrong control ${r.control.wrong} / cue ${r.cue.wrong}  blocks present ${r.cue.present}/${r.cue.n}  shaped ${r.cue.shape}/${r.cue.n} (over ${P.CUE_MAX_LINES} lines: ${r.cue.overLines})  words over ${P.CUE_MAX_WORDS}, reported: blocks ${r.cue.longBlocks}/${r.cue.n}, lines ${r.cue.longLines}/${r.cue.allLines}  ttft p90 control ${r.controlTtftP90} / cue ${r.cue.ttftP90} ms`);
    console.log(`band: control [${d.band.control.join(', ')}]  cue [${d.band.cue.join(', ')}]`);
    console.log(`DECISION: ${d.outcome}${d.reasons.length ? `  (${d.reasons.join('; ')})` : ''}`);
}
