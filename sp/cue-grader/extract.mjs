// extract.mjs: the cue blocks of a run, joined to roster ids (SPEC 4.1, 3.1). Read-only on RUNS. Returns blocks IN MEMORY; the CLI prints ids and counts only.
// interview60.prompts.json ids are never used (they are mis-keyed for 16-17 of 42; REVIEW diag38 B1). The id of an in-app block comes from the judge pair its
// answer equals EXACTLY, and (r1, h40d, eq) is cross-checked against the play window of interview60.timeline.json; a disagreement is refused and listed.
import fs from 'node:fs';
import { RUNS, RUN_NAMES, SP, readJson, shapeFlags } from './lib.mjs';
import { displayedArmBlock } from './trim.mjs';

const runDir = (run) => `${RUNS}/${RUN_NAMES[run]}`;
const ARM_FILES = {
    high: { answers: 'interview60.answers.gemini-3.5-flash-lite_high.json', pairs: 'interview60.judge.pairs.gemini-3.5-flash-lite_high.json' },
    low: { answers: 'interview60.answers.gemini-3.1-flash-lite_low.json', pairs: 'interview60.judge.pairs.gemini-3.1-flash-lite_low.json' },
};
const ROUTER_RX = /\[Router\] turn=(\d+) .*shown=(pipeline|live)/;
const stamp = (line) => { const m = /^(\d{4}-\d\d-\d\dT[\d:.]+Z) /.exec(line); return m ? Date.parse(m[1]) : null; };

/** The ordered [Answer] cues / [Answer] full / [Router] events of a natively_debug.log. */
export function logEvents(logPath) {
    const ev = [];
    fs.readFileSync(logPath, 'utf8').split('\n').forEach((line, n) => {
        let m;
        if ((m = /\[Answer\] cues: (.*)$/.exec(line))) { let v = null; try { v = JSON.parse(m[1]); } catch { /* unparsable */ } ev.push({ n, ts: stamp(line), t: 'cues', v: Array.isArray(v) ? v : null }); }
        else if ((m = /\[Answer\] full: (.*)$/.exec(line))) { let v = null; try { v = JSON.parse(m[1]); } catch { /* unparsable */ } ev.push({ n, ts: stamp(line), t: 'full', v: typeof v === 'string' ? v : null }); }
        else if ((m = /\[Answer\] cues trimmed: (.*)$/.exec(line))) { let v = null; try { v = JSON.parse(m[1]); } catch { /* unparsable */ } ev.push({ n, ts: stamp(line), t: 'trimmed', v }); }
        else if ((m = ROUTER_RX.exec(line))) ev.push({ n, ts: stamp(line), t: 'router', turn: +m[1], shown: m[2] });
    });
    return ev;
}

/** The id whose play window holds `ts` (windows start at playedAt; the last item runs to endedMs). */
function windowId(timeline, ts) {
    if (ts == null) return null;
    const items = [...timeline.items].sort((a, b) => a.playedAt - b.playedAt);
    let id = null;
    for (const it of items) if (it.playedAt <= ts) id = it.id; else break;
    return ts > timeline.endedMs + 120000 ? null : id;
}

function loadRun(run) {
    const d = runDir(run);
    const pairs = readJson(`${d}/interview60.judge.pairs.json`).items;
    const byAnswer = new Map(); for (const p of pairs) { if (!byAnswer.has(p.answer)) byAnswer.set(p.answer, []); byAnswer.get(p.answer).push(p); }
    const timeline = fs.existsSync(`${d}/interview60.timeline.json`) ? readJson(`${d}/interview60.timeline.json`) : null;
    return { d, pairs, byAnswer, timeline };
}

export function makeBlock({ run, cuesEv, answer, pair, turn, why }) {
    const logged = cuesEv.v ?? [];
    const tr = cuesEv.trim ?? null;
    const cues = logged.filter((l) => typeof l === 'string' && l.trim() !== '');
    return { run, source: 'inapp', id: pair?.id ?? null, pairKey: pair?.key ?? null, question: pair?.question ?? null, answer: pair ? pair.answer : answer, cues, loggedLines: logged.length, emptyDropped: logged.length - cues.length, empty: cues.length === 0, shape: shapeFlags(cues), turn: turn ?? null, displayCut: !!tr && (tr.cut?.length > 0 || tr.dropped?.length > 0), displayAltered: !!tr && (tr.cut?.length > 0 || tr.dropped?.length > 0 || tr.cleaned?.length > 0), ts: cuesEv.ts, line: cuesEv.n, why: why ?? null };
}

/**
 * The in-app blocks of a run.
 *   r1 ('router'): each cue line belongs to the turn closed by the next matched [Router] line; only shown=pipeline turns are displayed blocks (shown=live are the shadow, excluded).
 *   h40d, eq ('seq'): each cue line is paired with the next [Answer] full: line before the next cue line.
 * Returns { blocks (joined, id-bearing), unjoined: [{turn|line, reason}], report }.
 */
export function extractInApp(run, opts = {}) {
    const { d, byAnswer, timeline: tl0, pairs } = loadRun(run);
    // opts.timelineShift (a calibration seam): the play windows are given the id of the item k places later, so every window then disagrees with its judge pair
    const timeline = tl0 && opts.timelineShift ? { ...tl0, items: [...tl0.items].sort((a, b) => a.playedAt - b.playedAt).map((it, i, a) => ({ ...it, id: a[(i + opts.timelineShift) % a.length].id })) } : tl0;
    const ev = logEvents(`${d}/natively_debug.log`);
    for (let k = 0; k < ev.length; k++) if (ev[k].t === 'cues') { const p = ev[k - 1]; if (p && p.t === 'trimmed' && ev[k].n - p.n <= 3) ev[k].trim = p.v; }
    const cand = []; // { cuesEv, fullEv|null, turn, shown }
    const report = { run, cueLines: ev.filter((e) => e.t === 'cues').length, fullLines: ev.filter((e) => e.t === 'full').length, judgePairs: pairs.length };
    if (run === 'r1') {
        let cur = { cues: [], fulls: [] }, routers = 0, pipeline = 0, live = 0, anomalies = 0, assigned = 0;
        for (const e of ev) {
            if (e.t === 'cues') cur.cues.push(e); else if (e.t === 'full') cur.fulls.push(e);
            else if (e.t === 'router') {
                routers++; assigned += cur.cues.length; if (e.shown === 'pipeline') pipeline += cur.cues.length; else live += cur.cues.length;
                if (cur.cues.length !== 1 || cur.fulls.length !== 1) anomalies++;
                if (e.shown === 'pipeline') for (const c of cur.cues) cand.push({ cuesEv: c, fullEv: cur.fulls[0] ?? null, turn: e.turn });
                cur = { cues: [], fulls: [] };
            }
        }
        Object.assign(report, { routerTurns: routers, cuesToPipelineTurns: pipeline, cuesToLiveTurns: live, unassignedCues: report.cueLines - assigned, segmentsNotOneCueOneFull: anomalies });
    } else {
        const cues = ev.filter((e) => e.t === 'cues');
        cues.forEach((c, k) => {
            const nextCue = cues[k + 1]?.n ?? Infinity;
            const f = ev.find((e) => e.t === 'full' && e.n > c.n && e.n < nextCue);
            cand.push({ cuesEv: c, fullEv: f ?? null, turn: null });
        });
        report.pairedToFull = cand.filter((c) => c.fullEv).length; report.unpaired = cand.filter((c) => !c.fullEv).length;
    }
    const blocks = [], unjoined = [], seenIds = new Map();
    for (const c of cand) {
        const where = c.turn != null ? `turn ${c.turn}` : `log line ${c.cuesEv.n + 1}`;
        if (!c.fullEv) { unjoined.push({ where, reason: 'no [Answer] full: line before the next boundary' }); continue; }
        if (c.fullEv.v == null) { unjoined.push({ where, reason: 'the [Answer] full: text is not a JSON string' }); continue; }
        if (c.cuesEv.v == null) { unjoined.push({ where, reason: 'the [Answer] cues: text is not a JSON array' }); continue; }
        const ps = byAnswer.get(c.fullEv.v);
        if (!ps) { unjoined.push({ where, reason: 'the answer equals no judge pair answer (replaced, doubled or unjudged)' }); continue; }
        if (ps.length > 1) { unjoined.push({ where, reason: `the answer equals ${ps.length} judge pair answers (ambiguous)` }); continue; }
        const pair = ps[0];
        const wid = timeline ? windowId(timeline, c.cuesEv.ts) : null;
        if (timeline && wid !== pair.id) { unjoined.push({ where, reason: `id disagreement: judge pair ${pair.id}, play window ${wid ?? 'none'}` }); continue; }
        if (seenIds.has(pair.id)) { unjoined.push({ where, reason: `duplicate id ${pair.id} (first at ${seenIds.get(pair.id)})` }); continue; }
        seenIds.set(pair.id, where);
        blocks.push(makeBlock({ run, cuesEv: c.cuesEv, answer: c.fullEv.v, pair, turn: c.turn }));
    }
    Object.assign(report, { windowChecked: !!timeline, joined: blocks.length, distinctIds: new Set(blocks.map((b) => b.id)).size, unjoined: unjoined.length, emptyBlocks: blocks.filter((b) => b.empty).length, emptyLineDrops: blocks.reduce((s, b) => s + b.emptyDropped, 0), shapeFlagged: blocks.filter((b) => b.shape.length).length });
    return { blocks, unjoined, report };
}

/** The bare-arm blocks (high | low) of a run: the question from the matching judge pairs file, the answer = `spoken`, the cues = the SHIPPED trimCues of the raw cues. */
export function extractArm(run, arm, { trim } = {}) {
    const d = runDir(run), f = ARM_FILES[arm];
    const answers = readJson(`${d}/${f.answers}`), pairs = readJson(`${d}/${f.pairs}`).items;
    const blocks = []; let changed = 0, over = 0, emptyDrops = 0, answerMismatch = 0, noCues = 0;
    for (const p of pairs) {
        const a = answers[p.id];
        if (!a) { noCues++; continue; }
        if (a.spoken !== p.answer) answerMismatch++;
        if (!Array.isArray(a.cues)) { noCues++; continue; }
        const b = trim ? displayedArmBlock(a.cues, trim) : displayedArmBlock(a.cues);
        changed += b.changed ? 1 : 0; over += b.over ? 1 : 0; emptyDrops += b.emptyDropped;
        blocks.push({ run, source: arm, id: p.id, pairKey: p.key, question: p.question, answer: a.spoken, cues: b.cues, emptyDropped: b.emptyDropped, empty: b.cues.length === 0, shape: shapeFlags(b.cues), trimChanged: b.changed, rawOverLimit: b.over });
    }
    return { blocks, report: { run, arm, pairs: pairs.length, withCues: blocks.length, noCues, answerMismatch, trimChanged: changed, rawOverLimit: over, emptyLineDrops: emptyDrops, emptyBlocks: blocks.filter((b) => b.empty).length, shapeFlagged: blocks.filter((b) => b.shape.length).length } };
}

// ---------------------------------------------------------------- answer grades (SPEC 3.1.1)
const gradeOf = (v) => (v && v.correctness === 0 ? 'wrong' : v && v.correctness === 2 && v.on_topic === 2 ? 'acceptable' : 'weak');
/** { [pairKey]: 'acceptable'|'weak'|'wrong' } by the per-run rule. r1 in-app: two graders (BOTH acceptable; EITHER correctness 0 = wrong). */
export function answerGrades(run) {
    const d = runDir(run);
    const files = run === 'r1' ? [`${SP}/router-default/grade/verdicts/verdicts.inapp.g1.json`, `${SP}/router-default/grade/verdicts/verdicts.inapp.g2.json`] : [`${d}/interview60.judge.verdicts.json`];
    const vs = files.map(readJson), out = {};
    for (const k of Object.keys(vs[0])) {
        const gs = vs.map((v) => gradeOf(v[k]));
        out[k] = gs.includes('wrong') ? 'wrong' : gs.every((g) => g === 'acceptable') ? 'acceptable' : 'weak';
    }
    return out;
}

if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('/extract.mjs')) {
    for (const run of ['r1', 'h40d', 'eq']) {
        const x = extractInApp(run), g = answerGrades(run);
        console.log(`${run} in-app: ${JSON.stringify(x.report)}`);
        for (const u of x.unjoined) console.log(`  unjoined ${u.where}: ${u.reason}`);
        const acc = x.blocks.filter((b) => g[b.pairKey] === 'acceptable').length, wr = x.blocks.filter((b) => g[b.pairKey] === 'wrong').length;
        console.log(`  joined blocks by answer grade: acceptable ${acc}, wrong ${wr}, weak ${x.blocks.length - acc - wr}`);
    }
    for (const run of ['r1', 'h40d']) for (const arm of ['high', 'low']) console.log(`${run} ${arm}: ${JSON.stringify(extractArm(run, arm).report)}`);
}
