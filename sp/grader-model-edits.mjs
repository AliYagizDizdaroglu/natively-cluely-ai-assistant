// Throwaway: applies the grader-model change to the private worktree in TDD phases, by
// exact-match replacement (each `old` must occur exactly once, or nothing is written).
//   node grader-model-edits.mjs <phase>     phases: existing | red | green
import fs from 'node:fs';
import path from 'node:path';

const WT = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/.claude/worktrees/grader-model';
const G = path.join(WT, 'electron/test/golden');
const F = {
    judge: path.join(G, 'interview60.judge.mjs'),
    judgeTest: path.join(G, 'interview60.judge.test.ts'),
    pass: path.join(G, 'interview60.pass-record.mjs'),
    passTest: path.join(G, 'interview60.pass-record.test.ts'),
};
if (!fs.existsSync(WT)) throw new Error(`worktree missing: ${WT}`);

// Collect every edit first; write only if all of them match exactly once.
const pending = new Map(); // file -> text
const text = (f) => pending.get(f) ?? fs.readFileSync(f, 'utf8');
function rep(f, oldS, newS) {
    const t = text(f);
    const eol = t.includes('\r\n') ? '\r\n' : '\n';
    const o = oldS.replace(/\r?\n/g, eol), n = newS.replace(/\r?\n/g, eol);
    const count = t.split(o).length - 1;
    if (count !== 1) throw new Error(`${path.basename(f)}: expected exactly 1 match, found ${count}, for:\n${oldS.slice(0, 200)}`);
    pending.set(f, t.replace(o, () => n));
}

const phase = process.argv[2];
if (phase === 'existing') {
    // Existing mergeVerdicts calls that leaned on the silent JUDGE_MODEL default now name it.
    rep(F.judgeTest, `            'W01#2': { correctness: 3, on_topic: 2, delivery: 2, reason: 'out of range' },
            // C01 has no verdict at all
        });`, `            'W01#2': { correctness: 3, on_topic: 2, delivery: 2, reason: 'out of range' },
            // C01 has no verdict at all
        }, 'claude-opus-5');`);
    rep(F.judgeTest, `expect(mergeVerdicts(pairAnswers(dbg, timeline), {}).graderPrompt).toBeNull();`,
        `expect(mergeVerdicts(pairAnswers(dbg, timeline), {}, 'claude-opus-5').graderPrompt).toBeNull();`);
    rep(F.judgeTest, `            L01F1: { correctness: 1, on_topic: 2, delivery: 2, reason: 'vague on the alert path' },
        });`, `            L01F1: { correctness: 1, on_topic: 2, delivery: 2, reason: 'vague on the alert path' },
        }, 'claude-opus-5');`);
    rep(F.judgeTest, `expect(Object.keys(mergeVerdicts(pairs, { W01: { correctness: 2, on_topic: 2, delivery: 2, reason: 'ok' } }).items)).toEqual(['W01']);`,
        `expect(Object.keys(mergeVerdicts(pairs, { W01: { correctness: 2, on_topic: 2, delivery: 2, reason: 'ok' } }, 'claude-opus-5').items)).toEqual(['W01']);`);
} else if (phase === 'red') {
    rep(F.judgeTest, `    it('keeps each item id and roster level, so the summary can report long questions and follow-ups beside the base roster', () => {`,
        `    it('records the model that graded the verdicts, so the pass names its grader instead of a default label', () => {
        // The grading agents' "opus" alias moved from claude-opus-5 to claude-opus-5-5 between two
        // passes (2026-09-22 → 09-24) and the same answers lost 4-7 of 39 acceptable, while every
        // judge file still said claude-opus-5: this merge wrote JUDGE_MODEL whoever graded.
        const merged = mergeVerdicts(pairAnswers(dbg, timeline), {
            W01: { correctness: 2, on_topic: 2, delivery: 2, reason: 'ok' },
        }, 'claude-opus-5-5', 'a1b2c3d4e5f6');
        expect(merged.graderModel).toBe('claude-opus-5-5');
        expect(merged.model).toBe('claude-opus-5-5');
    });

    it('refuses to merge without the grader model, or with an alias that names no version', () => {
        const pairs = pairAnswers(dbg, timeline);
        const verdicts = { W01: { correctness: 2, on_topic: 2, delivery: 2, reason: 'ok' } };
        expect(() => mergeVerdicts(pairs, verdicts)).toThrow(/--model/);
        expect(() => mergeVerdicts(pairs, verdicts, 'opus')).toThrow(/--model/);
    });

    it('keeps each item id and roster level, so the summary can report long questions and follow-ups beside the base roster', () => {`);

    rep(F.passTest, `import { collectPass, renderPassRecord, renderPassIndex, passRow } from './interview60.pass-record.mjs';`,
        `import { collectPass, renderPassRecord, renderPassIndex, passRow, graderOf } from './interview60.pass-record.mjs';`);
    rep(F.passTest, `describe.skipIf(!fs.existsSync(path.join(S50A, 'interview60.judge.json')))`,
        `describe('the grader model — a pass names the model that graded it', () => {
    // The grading agents moved from claude-opus-5 to claude-opus-5-5 between two passes
    // (2026-09-22 → 09-24): the same answers lost 4-7 of 39 acceptable, and nothing on the
    // record showed it, because every judge file carried the same default label.
    const opus55 = 'claude-opus-5-5';
    const graded55 = (over: Record<string, unknown> = {}) => pass({ meta: { ...pass().meta, graderModel: opus55, ...over }, summary: { ...pass().summary, arms: [{ ...pass().summary.arms[0], graderModel: opus55 }] } });

    it('reads the grader from a judge file only where the file recorded it', () => {
        expect(graderOf({ model: opus55, graderModel: opus55, effort: null })).toBe(opus55);
        // The API route wrote the model it called, together with its effort.
        expect(graderOf({ model: 'claude-opus-5', effort: 'high' })).toBe('claude-opus-5');
        // A --verdicts merge from before the model was recorded: its label is not evidence.
        expect(graderOf({ model: 'claude-opus-5', effort: null })).toBeNull();
        expect(graderOf(null)).toBeNull();
    });

    it('prints the recorded grader in the record header and on each graded arm', () => {
        const md = renderPassRecord(graded55());
        expect(md).toContain('| grader | claude-opus-5-5, prompt e53dff6256aa |');
        expect(md).toMatch(/- Arm qwen\\/qwen3\\.8-27b [^\\n]*grader claude-opus-5-5/);
    });

    it('says the grader is unrecorded instead of printing the default label as fact', () => {
        const md = renderPassRecord(pass({ meta: { ...pass().meta, graderModel: null } }));
        expect(md).toMatch(/\\| grader \\| unrecorded[^\\n]*claude-opus-5[^\\n]*prompt e53dff6256aa \\|/);
        expect(md).toMatch(/- Arm qwen\\/qwen3\\.8-27b [^\\n]*grader unrecorded/);
    });

    it('gives the index a grader column, so passes graded by different models read as not comparable', () => {
        const allNew = passRow(graded55());
        const allOld = passRow(pass({ meta: { ...pass().meta, dirName: '2026-09-10T07-10-00-s50b', startedAt: '2026-09-10T07:10:00.000Z', graderModel: null } }));
        const mixed = passRow(pass({ meta: { ...pass().meta, dirName: '2026-09-11T07-10-00-s50c', startedAt: '2026-09-11T07:10:00.000Z', graderModel: opus55 } }));
        const ungraded = passRow(pass({ meta: { ...pass().meta, dirName: '2026-09-12T07-10-00-s50d', startedAt: '2026-09-12T07:10:00.000Z', graded: false, graderModel: null }, summary: { ...pass().summary, inApp: null, arms: [] } }));
        const md = renderPassIndex([allNew, allOld, mixed, ungraded]);
        expect(md).toContain('| arms | grader |');
        const rows = md.split('\\n').filter((l) => l.startsWith('| 2026-'));
        expect(rows[0]).toMatch(/\\| claude-opus-5-5 \\|$/);
        expect(rows[1]).toMatch(/\\| unrecorded \\|$/);
        expect(rows[2]).toMatch(/\\| claude-opus-5-5 \\+ unrecorded \\|$/);
        expect(rows[3]).toMatch(/\\| — \\|$/);
    });
});

describe.skipIf(!fs.existsSync(path.join(S50A, 'interview60.judge.json')))`);
} else if (phase === 'green') {
    // judge.mjs: the merge records the grader it is given and refuses to run without one.
    rep(F.judge, ` * No key: --export writes <run>/interview60.judge.pairs.json (the pairs plus this rubric)
 * for an Opus subagent in Claude Code to grade into <run>/interview60.judge.verdicts.json,
 * then --verdicts <that file> writes the same judge file the gate reads:
 *   node electron/test/golden/interview60.judge.mjs <run-dir> --export
 *   node electron/test/golden/interview60.judge.mjs <run-dir> --verdicts <run>/interview60.judge.verdicts.json`,
        ` * No key: --export writes <run>/interview60.judge.pairs.json (the pairs plus this rubric)
 * for an Opus subagent in Claude Code to grade into <run>/interview60.judge.verdicts.json,
 * then --verdicts <that file> writes the same judge file the gate reads. --model names the
 * exact model the grading agent ran on (its transcript's "model" field), never an alias:
 *   node electron/test/golden/interview60.judge.mjs <run-dir> --export
 *   node electron/test/golden/interview60.judge.mjs <run-dir> --verdicts <run>/interview60.judge.verdicts.json --model claude-opus-5-5`);
    rep(F.judge, `export function mergeVerdicts(pairs, verdicts, model = JUDGE_MODEL, graderPrompt = null) {`,
        `export function mergeVerdicts(pairs, verdicts, graderModel, graderPrompt = null) {
    // graderModel: the exact model the grading agent ran on. An alias cannot stand in: "opus"
    // moved from claude-opus-5 to claude-opus-5-5 between two passes (2026-09-22 → 09-24), the
    // same answers lost 4-7 of 39 acceptable, and every judge file still said claude-opus-5,
    // because this merge wrote JUDGE_MODEL whoever graded.
    if (!/\\d/.test(String(graderModel ?? ''))) throw new Error(\`grader model \${JSON.stringify(graderModel ?? null)} is not an exact model id: pass the one the grading agent ran on, with its version, as --model (e.g. claude-opus-5-5, from the agent transcript's "model" field). An alias such as "opus" moves between versions.\`);`);
    rep(F.judge, `    return { model, effort: null, graderPrompt, items, usage: { input: 0, output: 0 } };`,
        `    return { model: graderModel, graderModel, effort: null, graderPrompt, items, usage: { input: 0, output: 0 } };`);
    rep(F.judge, `| --export | --verdicts <file> [--model <name>]'); process.exit(2); }`,
        `| --export | --verdicts <file> --model <grader model id>'); process.exit(2); }`);
    rep(F.judge, `mergeVerdicts(pairs, JSON.parse(fs.readFileSync(verdictsPath, 'utf8')), opt('model', JUDGE_MODEL), graderPromptVersion());`,
        `mergeVerdicts(pairs, JSON.parse(fs.readFileSync(verdictsPath, 'utf8')), opt('model', null), graderPromptVersion());`);

    // pass-record.mjs: the record and the index name the grader where the judge file recorded it.
    rep(F.pass, `function countVerdicts(grades) {`,
        `/**
 * The model that graded a judge file, where the file recorded it: a --verdicts merge names it
 * as graderModel (from 2026-09-24); the API route wrote the model it called, with its effort.
 * An older merge carries only JUDGE_MODEL as a default label, which is not evidence — the
 * grading agents moved from claude-opus-5 to claude-opus-5-5 under that same label.
 */
export function graderOf(judge) {
    return judge?.graderModel ?? (judge?.effort ? judge.model ?? null : null);
}

function countVerdicts(grades) {`);
    rep(F.pass, `graded: !!judge, graderPrompt: judge?.graderPrompt ?? null, judgeModel: judge?.model ?? null,`,
        `graded: !!judge, graderPrompt: judge?.graderPrompt ?? null, judgeModel: judge?.model ?? null, graderModel: graderOf(judge),`);
    rep(F.pass, `arms.push({ model, n: pairs.length, ...countVerdicts(grades), ttftP50: pct(ttfts, .5), ttftP90: pct(ttfts, .9), graded: !!armJudge });`,
        `arms.push({ model, n: pairs.length, ...countVerdicts(grades), ttftP50: pct(ttfts, .5), ttftP90: pct(ttfts, .9), graded: !!armJudge, graderModel: graderOf(armJudge) });`);
    rep(F.pass, "out.push(`| grader | ${t.graded ? `${t.judgeModel ?? 'unknown'}, prompt ${t.graderPrompt ?? 'unstamped'}` : 'not graded yet'} |`);",
        "out.push(`| grader | ${t.graded ? `${t.graderModel ?? `unrecorded (the judge file's default label says ${t.judgeModel ?? 'nothing'})`}, prompt ${t.graderPrompt ?? 'unstamped'}` : 'not graded yet'} |`);");
    rep(F.pass, "for (const a of s.arms) out.push(`- Arm ${a.model} (${a.n} mains): ${a.graded ? counts(a) : 'not graded'} · TTFT p50 ${secs(a.ttftP50)} p90 ${secs(a.ttftP90)}`);",
        "for (const a of s.arms) out.push(`- Arm ${a.model} (${a.n} mains): ${a.graded ? counts(a) : 'not graded'} · TTFT p50 ${secs(a.ttftP50)} p90 ${secs(a.ttftP90)}${a.graded ? ` · grader ${a.graderModel ?? 'unrecorded'}` : ''}`);");
    rep(F.pass, `        graded: t.graded, inApp: s.inApp, arms: s.arms.map((a) => ({ model: a.model, acceptable: a.acceptable, n: a.n, graded: a.graded })),
    };`,
        `        graded: t.graded, inApp: s.inApp, arms: s.arms.map((a) => ({ model: a.model, acceptable: a.acceptable, n: a.n, graded: a.graded })),
        // Every model that graded part of the pass: two passes are comparable only under the same one.
        graders: [...new Set([...(t.graded ? [t.graderModel ?? 'unrecorded'] : []), ...s.arms.filter((a) => a.graded).map((a) => a.graderModel ?? 'unrecorded')])],
    };`);
    rep(F.pass, `'| pass | record | roster | commit | heard | delivered | doubles | supersedes | long whole | TTFT p90 | in-app | arms |', '|---|---|---|---|---|---|---|---|---|---|---|---|'];`,
        `'| pass | record | roster | commit | heard | delivered | doubles | supersedes | long whole | TTFT p90 | in-app | arms | grader |', '|---|---|---|---|---|---|---|---|---|---|---|---|---|'];`);
    rep(F.pass, "if (r.error) { out.push(`| ${r.dirName} | — | — | — | — | — | — | — | — | — | unreadable: ${cell(r.error)} | — |`); continue; }",
        "if (r.error) { out.push(`| ${r.dirName} | — | — | — | — | — | — | — | — | — | unreadable: ${cell(r.error)} | — | — |`); continue; }");
    rep(F.pass, "| ${secs(r.ttftP90)} | ${inApp} | ${arms} |`);",
        "| ${secs(r.ttftP90)} | ${inApp} | ${arms} | ${r.graders?.length ? r.graders.join(' + ') : '—'} |`);");
} else {
    throw new Error('phase must be existing | red | green');
}
for (const [f, t] of pending) fs.writeFileSync(f, t);
console.log(`phase ${phase}: ${pending.size} file(s) written — ${[...pending.keys()].map((f) => path.basename(f)).join(', ')}`);
