/**
 * One record per pass, so a change to the pipeline can be read against the same golden
 * questions later: what was flown, the gate, and — per question — the scripted text, what
 * was heard, every answer the app gave with the grader's scores and reason, and each
 * bare-prompt arm's answer to the same question. Plus INDEX.md, one row per pass.
 *
 *   node electron/test/golden/interview60.pass-record.mjs <run-dir>   writes passes/<run>.md and refreshes passes/INDEX.md
 *   node electron/test/golden/interview60.pass-record.mjs --index     refreshes the index only
 *
 * The run folders themselves are git-ignored (multi-MB logs); passes/ is tracked, so the
 * record is the durable copy. It is regenerated at the flight's DONE (ungraded) and again
 * by interview60.judge.mjs whenever a judge file is merged, so grades appear on their own.
 * Everything here is derived from the run folder — nothing is measured a second way.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeRun, evaluateGate } from './interview60.metrics.mjs';
import { pairAnswers, pairsFromAnswers, keyPairs } from './interview60.judge.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const RUNS_DIR = path.join(HERE, 'interview60.runs');
export const PASSES_DIR = path.join(HERE, 'passes');

const readJson = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const wordsOf = (q) => (String(q ?? '').match(/[A-Za-z0-9']+/g) ?? []).length;
const tagOf = (model) => String(model).replace(/\//g, '_');
const pct = (arr, p) => { const s = arr.filter((x) => typeof x === 'number').sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : null; };
const lastMatch = (text, re) => { let m = null; for (const x of text.matchAll(re)) m = x; return m; };
const isMain = (i) => (i.kind ?? 'spoken') === 'spoken' && i.level !== 'long' && i.level !== 'followup';
const RANK = { acceptable: 3, weak: 2, wrong: 1, error: 0 };

/** The grade the judge file holds for one pair key, or null when that key was never graded. */
function gradeOf(v) {
    if (!v) return null;
    const num = (x) => (typeof x === 'number' ? x : null);
    return { correctness: num(v.correctness), on_topic: num(v.on_topic), delivery: num(v.delivery), verdict: v.verdict ?? 'error', reason: String(v.reason ?? '') };
}

function countVerdicts(grades) {
    const c = { acceptable: 0, weak: 0, wrong: 0, error: 0 };
    for (const g of grades) if (g && g.verdict in c) c[g.verdict]++;
    return c;
}

/** Everything the record shows, gathered from one run folder. Throws when the run is unreadable. */
export function collectPass(runDir) {
    runDir = path.resolve(runDir);
    const dirName = path.basename(runDir);
    const timeline = readJson(path.join(runDir, 'interview60.timeline.json'));
    const dbg = fs.readFileSync(path.join(runDir, 'natively_debug.log'), 'utf8');
    const m = computeRun(runDir);
    const gate = evaluateGate(m);
    const donePath = path.join(runDir, 'interview60.flight.done.json');
    const done = fs.existsSync(donePath) ? readJson(donePath) : {};
    const judgePath = path.join(runDir, 'interview60.judge.json');
    const judge = fs.existsSync(judgePath) ? readJson(judgePath) : null;

    const startedAt = timeline.startedAt ?? done.startedAt ?? null;
    const endedAt = timeline.endedAt ?? done.finishedAt ?? null;
    const meta = {
        label: done.label ?? (dirName.replace(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-?/, '') || dirName),
        dirName, runDir, startedAt, endedAt,
        durationMin: startedAt && endedAt ? Math.round((Date.parse(endedAt) - Date.parse(startedAt)) / 6000) / 10 : null,
        roster: done.roster ?? null, rosterLabel: done.rosterLabel ?? null,
        liveModel: done.liveModel ?? null,
        stt: lastMatch(dbg, /\[Main\] Using ([^\n]+?) for interviewer/g)?.[1] ?? null,
        answerModel: lastMatch(dbg, /Default Model set to: (\S+)/g)?.[1] ?? null,
        commit: done.commit ?? null,
        graded: !!judge, graderPrompt: judge?.graderPrompt ?? null, judgeModel: judge?.model ?? null,
    };

    // In-app answers: the judge's own pairing (dispatch → [Answer] full), keyed the way the
    // judge file is keyed (S1Q02, S1Q02#2 …), so each answer meets its own grade.
    const byId = new Map();
    for (const { key, pair } of keyPairs(pairAnswers(dbg, timeline))) {
        if (!byId.has(pair.id)) byId.set(pair.id, []);
        byId.get(pair.id).push({ key, pair });
    }
    const metricsById = new Map(m.items.map((i) => [i.id, i]));
    const questions = timeline.items.map((it) => {
        const spokeEnd = it.playedAt + Math.round((it.clipSecs ?? 0) * 1000);
        const mi = metricsById.get(it.id);
        return {
            id: it.id, level: it.level ?? null, kind: it.kind ?? 'spoken', long: !!it.long || it.level === 'long', words: wordsOf(it.q), q: it.q,
            clipSecs: it.clipSecs ?? null, detectMs: mi?.detectMs ?? null, coverage: mi?.coverage ?? null,
            inApp: (byId.get(it.id) ?? []).map(({ key, pair }, i) => ({
                n: i + 1, key, source: pair.source, dispatchedAt: pair.dispatchedAt,
                offsetS: pair.dispatchedAt ? Math.round((Date.parse(pair.dispatchedAt) - spokeEnd) / 100) / 10 : null,
                heard: pair.heard, heardExtended: pair.heardExtended ?? null, extended: !!pair.extended,
                heardSuperseded: pair.heardSuperseded ?? null, superseded: !!pair.superseded, answer: pair.answer ?? null,
                grade: gradeOf(judge?.items?.[key]),
            })),
            arms: [],
        };
    });
    const qById = new Map(questions.map((q) => [q.id, q]));

    // Arms: one answers file per model, graded (when it is) in interview60.judge.<model>.json.
    const arms = [];
    for (const f of fs.readdirSync(runDir).filter((x) => /^interview60\.answers(\..+)?\.json$/.test(x) && !/stale/.test(x)).sort()) {
        const store = readJson(path.join(runDir, f));
        const pairs = pairsFromAnswers(store);
        if (!pairs.length) continue;
        // Items carry the model since the arms existed (2026-09-04); the unsuffixed file of
        // an older answer-only pass does not, and it is not guessed.
        const model = pairs[0].model ?? (f.replace(/^interview60\.answers\.?/, '').replace(/\.json$/, '') || 'answers pass (model not recorded)');
        const armJudgePath = path.join(runDir, `interview60.judge.${tagOf(model)}.json`);
        const armJudge = fs.existsSync(armJudgePath) ? readJson(armJudgePath) : null;
        const grades = [];
        for (const { key, pair } of keyPairs(pairs)) {
            const grade = gradeOf(armJudge?.items?.[key]);
            grades.push(grade);
            const src = store[pair.id] ?? Object.values(store).find((v) => v?.id === pair.id) ?? {};
            qById.get(pair.id)?.arms.push({ model, answer: pair.answer, ttft: typeof src.ttft === 'number' ? src.ttft : null, words: typeof src.words === 'number' ? src.words : wordsOf(pair.answer), grade });
        }
        const ttfts = Object.values(store).map((v) => v?.ttft);
        arms.push({ model, n: pairs.length, ...countVerdicts(grades), ttftP50: pct(ttfts, .5), ttftP90: pct(ttfts, .9), graded: !!armJudge });
    }

    // Per QUESTION, the best of a main's answers — the judge's own counts are per PAIR, and a
    // doubled question contributes two of them.
    const mains = questions.filter(isMain);
    const best = mains.map((q) => q.inApp.map((a) => a.grade).filter(Boolean).sort((a, b) => (RANK[b.verdict] ?? -1) - (RANK[a.verdict] ?? -1))[0] ?? null);
    const inApp = judge ? { questions: mains.length, ...countVerdicts(best) } : null;
    const summary = {
        items: m.items.length, heard: m.heard, answered: m.answered, delivered: m.delivered, doubles: m.surfacedMulti, extends: m.extendsTotal, supersedes: m.supersedesTotal,
        longs: m.longs, longWhole: m.longWhole, ttftP90: m.ttftP90 ?? null, detectP50: m.detectP50 ?? null, liveReconnects: m.liveReconnects ?? null, lostUtterances: m.lostUtterances ?? null,
        inApp,
        inAppPairs: m.judge ? { n: m.judge.n, acceptable: m.judge.acceptable, weak: m.judge.weak, wrong: m.judge.wrong, error: m.judge.errors ?? 0 } : null,
        followups: m.judge?.followup?.n ? { n: m.judge.followup.n, acceptable: m.judge.followup.acceptable, weak: m.judge.followup.weak, wrong: m.judge.followup.wrong, error: 0 } : null,
        arms,
    };
    return { meta, gate: { pass: gate.pass, rows: gate.rows.map((r) => ({ label: r.label, value: r.value, pass: r.pass })) }, summary, questions };
}

// ── rendering ───────────────────────────────────────────────────────────────
const secs = (ms) => (ms == null ? '—' : `${(ms / 1000).toFixed(1)} s`);
const signed = (s) => (s == null ? '—' : `${s < 0 ? '−' : '+'}${Math.abs(s).toFixed(1)} s`);
const short = (commit) => (commit ? String(commit).slice(0, 7) : 'unknown');
const cell = (s) => String(s ?? '—').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
const counts = (c) => (c ? `${c.acceptable} acceptable, ${c.weak} weak, ${c.wrong} wrong${c.error ? `, ${c.error} error` : ''}` : null);
const scores = (g) => (g && g.correctness != null ? `correctness ${g.correctness} · on_topic ${g.on_topic} · delivery ${g.delivery}` : null);
const quote = (text) => String(text ?? '').split(/\r?\n/).map((l) => `> ${l}`).join('\n');

function renderGrade(g) {
    if (!g) return '_not graded_';
    const head = `**${g.verdict}**${scores(g) ? ` (${scores(g)})` : ''}`;
    return g.reason ? `${head}\n_grader: ${g.reason}_` : head;
}

/** The whole pass as Markdown. Every field may be missing on an old or ungraded run; nothing prints as "undefined". */
export function renderPassRecord(p) {
    const { meta: t, summary: s } = p;
    const out = [];
    out.push(`# Pass ${t.label} — ${t.dirName}`, '');
    out.push('| | |', '|---|---|');
    out.push(`| started | ${t.startedAt ?? 'unknown'}${t.durationMin != null ? ` (${t.durationMin} min)` : ''} |`);
    out.push(`| roster | ${t.rosterLabel ?? t.roster ?? 'unknown'} |`);
    out.push(`| ear | Live ${t.liveModel ?? 'unknown'} · STT ${t.stt ?? 'unknown'} |`);
    out.push(`| answers | ${t.answerModel ?? 'unknown'} (in-app)${s.arms.length ? ` · arms: ${s.arms.map((a) => a.model).join(', ')}` : ''} |`);
    out.push(`| commit | ${short(t.commit)} |`);
    out.push(`| grader | ${t.graded ? `${t.judgeModel ?? 'unknown'}, prompt ${t.graderPrompt ?? 'unstamped'}` : 'not graded yet'} |`);
    out.push(`| run folder | ${t.runDir} |`, '');

    out.push('## Summary', '');
    out.push(`- Heard ${s.heard}/${s.items} · answered ${s.answered} · delivered ${s.delivered} · ${s.doubles} doubles · ${s.extends} extends · ${s.supersedes} supersedes · long whole ${s.longWhole} of ${s.longs} · TTFT p90 ${secs(s.ttftP90)} · detect p50 ${secs(s.detectP50)} · Live reconnects ${s.liveReconnects ?? '—'} · lost utterances ${s.lostUtterances ?? '—'}`);
    if (s.inApp) {
        const unanswered = s.inApp.questions - (s.inApp.acceptable + s.inApp.weak + s.inApp.wrong + s.inApp.error);
        out.push(`- In-app, best answer per question: **${counts(s.inApp)} of ${s.inApp.questions} mains**${unanswered > 0 ? ` (${unanswered} unanswered)` : ''}${s.inAppPairs ? ` — per pair: ${counts(s.inAppPairs)} of ${s.inAppPairs.n}` : ''}${s.followups ? `; follow-ups ${s.followups.acceptable} acceptable of ${s.followups.n}` : ''}`);
    } else {
        out.push('- In-app answers: not graded yet');
    }
    for (const a of s.arms) out.push(`- Arm ${a.model} (${a.n} mains): ${a.graded ? counts(a) : 'not graded'} · TTFT p50 ${secs(a.ttftP50)} p90 ${secs(a.ttftP90)}`);
    out.push('');

    out.push('## Gate', '', `Overall: **${p.gate.pass ? 'PASS' : 'FAIL'}**`, '', '| | row | value |', '|---|---|---|');
    for (const r of p.gate.rows) out.push(`| ${r.pass ? 'PASS' : 'FAIL'} | ${cell(r.label)} | ${cell(r.value)} |`);
    out.push('');

    out.push('## Questions', '');
    for (const q of p.questions) {
        const tags = [q.level ?? 'unknown', q.kind !== 'spoken' ? q.kind : null, q.long ? 'long' : null, `${q.words} words`, q.clipSecs != null ? `clip ${q.clipSecs.toFixed(1)} s` : null,
            q.detectMs != null ? `first detection ${signed(q.detectMs / 1000)} from the end of the clip` : null,
            q.coverage != null ? `coverage ${Math.round(q.coverage * 100)} %` : null].filter(Boolean);
        out.push(`### ${q.id} · ${tags.join(' · ')}`, '', quote(q.q), '');
        if (!q.inApp.length) out.push('_No in-app answer was dispatched for this question._', '');
        for (const a of q.inApp) {
            out.push(`**In-app answer ${a.n}** — ${a.source}, ${signed(a.offsetS)}${a.extended ? ', extended' : ''}${a.superseded ? ', superseded' : ''} → ${renderGrade(a.grade)}`, '');
            out.push(`heard: "${a.heard ?? ''}"${a.heardExtended ? `\nextended with: "${a.heardExtended}"` : ''}${a.heardSuperseded ? `\nsuperseded with: "${a.heardSuperseded}"` : ''}`, '');
            out.push(a.answer ? quote(a.answer) : '_no answer was delivered_', '');
        }
        for (const a of q.arms) {
            out.push(`**Arm ${a.model}** — TTFT ${secs(a.ttft)}${a.words != null ? `, ${a.words} words` : ''} → ${renderGrade(a.grade)}`, '');
            out.push(quote(a.answer), '');
        }
    }
    return out.join('\n');
}

/** The index row for one pass. */
export function passRow(p) {
    const { meta: t, summary: s } = p;
    return {
        dirName: t.dirName, file: `${t.dirName}.md`, startedAt: t.startedAt, label: t.label, rosterLabel: t.rosterLabel ?? t.roster ?? null, commit: t.commit,
        items: s.items, heard: s.heard, delivered: s.delivered, doubles: s.doubles, supersedes: s.supersedes, longWhole: s.longWhole, longs: s.longs, ttftP90: s.ttftP90, detectP50: s.detectP50,
        graded: t.graded, inApp: s.inApp, arms: s.arms.map((a) => ({ model: a.model, acceptable: a.acceptable, n: a.n, graded: a.graded })),
    };
}

/** INDEX.md: one row per pass, oldest first, so the golden set reads as a trend. */
export function renderPassIndex(rows) {
    const sorted = [...rows].sort((a, b) => String(a.startedAt ?? a.dirName).localeCompare(String(b.startedAt ?? b.dirName)));
    const out = ['# Passes', '', 'One row per pass over the golden questions, oldest first. "in-app" is the best answer per main question under the frozen grader; arms are the bare-prompt models on the same mains.', '',
        '| pass | record | roster | commit | heard | delivered | doubles | supersedes | long whole | TTFT p90 | in-app | arms |', '|---|---|---|---|---|---|---|---|---|---|---|---|'];
    for (const r of sorted) {
        if (r.error) { out.push(`| ${r.dirName} | — | — | — | — | — | — | — | — | — | unreadable: ${cell(r.error)} | — |`); continue; }
        const inApp = r.inApp ? `${r.inApp.acceptable}/${r.inApp.questions} (${r.inApp.weak} weak, ${r.inApp.wrong} wrong)` : 'not graded';
        const arms = r.arms.length ? r.arms.map((a) => `${a.model.split('/').pop()} ${a.graded ? `${a.acceptable}/${a.n}` : 'not graded'}`).join(' · ') : '—';
        out.push(`| ${r.dirName} | [record](${r.file}) | ${cell(r.rosterLabel ?? 'unknown')} | ${short(r.commit)} | ${r.heard}/${r.items} | ${r.delivered} | ${r.doubles} | ${r.supersedes} | ${r.longs ? `${r.longWhole}/${r.longs}` : '—'} | ${secs(r.ttftP90)} | ${inApp} | ${arms} |`);
    }
    return out.join('\n') + '\n';
}

/** Rows for every run folder that can be read; an unreadable one becomes a row that says so. */
export function indexRows(runsDir = RUNS_DIR) {
    if (!fs.existsSync(runsDir)) return [];
    return fs.readdirSync(runsDir)
        .filter((d) => fs.existsSync(path.join(runsDir, d, 'interview60.timeline.json')))
        .map((d) => { try { return passRow(collectPass(path.join(runsDir, d))); } catch (e) { return { dirName: d, error: e?.message ?? String(e) }; } });
}

/** Writes passes/<run>.md for one run and refreshes passes/INDEX.md over all runs. */
export function writePassRecord(runDir, { passesDir = PASSES_DIR, runsDir = RUNS_DIR } = {}) {
    fs.mkdirSync(passesDir, { recursive: true });
    const p = collectPass(runDir);
    const recordPath = path.join(passesDir, `${p.meta.dirName}.md`);
    fs.writeFileSync(recordPath, renderPassRecord(p));
    const indexPath = writePassIndex({ passesDir, runsDir });
    return { recordPath, indexPath, graded: p.meta.graded };
}

export function writePassIndex({ passesDir = PASSES_DIR, runsDir = RUNS_DIR } = {}) {
    fs.mkdirSync(passesDir, { recursive: true });
    const indexPath = path.join(passesDir, 'INDEX.md');
    fs.writeFileSync(indexPath, renderPassIndex(indexRows(runsDir)));
    return indexPath;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const args = process.argv.slice(2);
    const dir = args.find((a) => !a.startsWith('--'));
    if (args.includes('--index') && !dir) {
        console.log(`PASS-RECORD  index refreshed: ${writePassIndex()}`);
    } else if (dir) {
        const r = writePassRecord(dir);
        console.log(`PASS-RECORD  ${r.graded ? 'graded' : 'ungraded'} record written: ${r.recordPath}\nPASS-RECORD  index refreshed: ${r.indexPath}`);
    } else {
        console.log('usage: interview60.pass-record.mjs <run-dir> | --index');
        process.exit(2);
    }
}
