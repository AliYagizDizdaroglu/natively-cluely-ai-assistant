// The pre-registered decision (PREREGISTER-turn-followup.md section 7) for the turn-based follow-up context replay.
// `decide({ front, back }, verdictOf, opts)` is exported PURE and calibrated by scripts/legs-decide-calibrate.mjs on synthetic
// verdicts for every branch of section 7 (and mutation-tested by scripts/mutate-decide.mjs) before it reads a real verdict.
//
//   node legs-decide.mjs --calibrate      runs the calibration (every clause holding / failing / inconclusive; VOID; refusals)
//   node legs-decide.mjs                  the real decision: (1) section 2 of the registered file verifies, (2) the parity set
//                                         re-derives -- BOTH before any verdict file is opened (I5) -- then merges the key files,
//                                         both graders' verdict files and the answer files and prints section 7 verbatim
//   node legs-decide.mjs --rerun          the one allowed s50k re-run: pooled over the three hours; a second INCONCLUSIVE = FAIL;
//                                         additivity (pooled = first run + re-run, every count) enforced before a decision prints
//
// Consensus (section 5): wrong = both graders correctness 0; off-topic = both on_topic <= 1; acceptable = both graders'
// verdictOf = acceptable. A completed call whose filtered answer is empty was not graded and scores 0/0/0 for both graders (the
// judge's mergeVerdicts scores an undelivered answer that way). A pair missing an answer after every retry leaves the decision
// and is named; a MISSING VERDICT is an instrument failure and stops the run. A record whose model/thinking/leg does not match
// its leg is a REFUSAL (I4); so is a null `thoughts` in any FRONT record (m8).
//
// blind/graders.json schema (A2 point 5: DERIVED from the three tools' stdout, kept beside it as graders.models.out.txt,
//   graders.memory.out.txt, graders.audit.out.txt; decide refuses on any disagreement):
//   { instrument, departure?: true, graders: { "blind-N.gX": { agent, model, memory: 'ABSENT'|'LOADED', projectMemory: n, claudeMem: n,
//   audit: 'clean'|'FLAGGED', bash: ['<len>:<sha12>', ...], replaced: [agentIds the slot replaced, at most one] } } }.
// Memory LOADED is accepted only under the section 6 departure (A2 point 2): departure: true AND a section 3 note starting
// DEPARTURE-S6-ACCEPTED in the registered file; claude-mem markers, mcp__* calls and an audit FLAG refuse the slot in every case.
// Refused without printing VOID: any R/STOPPED-*.txt, any record whose end is at or after the hard stop (A2 point 3). VOID is never printed
// after a DECISION line is on file (INCIDENT instead, A2 M5).
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const LEG_SPEC = { front: { model: 'gemini-3.5-flash-lite', thinking: 'HIGH' }, back: { model: 'gemini-3.1-flash-lite', thinking: 'LOW' } };   // section 4

/** Element min(n-1, floor(n*p)) of the ascending list (section 7). */
export const pct = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(s.length * p))]; };
const SCORE = (v) => v && [v.correctness, v.on_topic, v.delivery].every((x) => [0, 1, 2].includes(x));
const num = (x) => typeof x === 'number' && Number.isFinite(x);

function validate(pairs, leg) {
    for (const p of pairs) {
        const tag = `${leg} ${p.key}#${p.rep}`;
        if (!['roster', 'dropped'].includes(p.kind)) throw new Error(`${tag}: unknown kind ${p.kind}`);
        if (leg === 'back' && p.kind !== 'roster') throw new Error(`${tag}: the back leg runs roster items only`);
        for (const arm of ['A', 'B']) {
            const s = p[arm];
            if (!s || !SCORE(s.g1) || !SCORE(s.g2)) throw new Error(`${tag} ${arm}: missing or out-of-range grader scores`);
            if (!num(s.ttft) || !num(s.words)) throw new Error(`${tag} ${arm}: ttft/words not numbers`);
            if (s.leg !== leg || s.model !== LEG_SPEC[leg].model || s.thinking !== LEG_SPEC[leg].thinking) throw new Error(`${tag} ${arm}: REFUSED, the record says leg=${s.leg} model=${s.model} thinking=${s.thinking}, the ${leg} leg is ${LEG_SPEC[leg].model} ${LEG_SPEC[leg].thinking}`);
            if (leg === 'front' && !num(s.thoughts)) throw new Error(`${tag} ${arm}: REFUSED, a front record has no thoughts count (null/missing): clause 5 cannot be decided (m8)`);
        }
    }
}

/**
 * pairs: { front: [pair], back: [pair] }, pair = { key: '<hour>:<id>', hour, id, kind: 'roster'|'dropped', rep, A, B }, each side
 * { g1, g2, ttft, words, thoughts, model, thinking, leg } with g1/g2 = { correctness, on_topic, delivery } (0-2).
 * opts.parity: { ok, why } -- section 6 / precondition 6.4, checked by the caller BEFORE any verdict is opened; ok false -> VOID and NOTHING else.
 * opts.rerun: the pooled s50k re-run of section 7, where a second INCONCLUSIVE is a FAIL (bars are formulas on the pooled complete roster pairs).
 */
export function decide({ front, back }, verdictOf, { parity = { ok: true }, rerun = false } = {}) {
    if (!parity.ok) return { outcome: 'VOID', clauses: null, numbers: null, why: parity.why ?? 'parity failed', lines: ['VOID'] };   // I5: VOID prints no clause line
    validate(front, 'front'); validate(back, 'back');
    const wrong = (s) => s.g1.correctness === 0 && s.g2.correctness === 0;
    const offTopic = (s) => s.g1.on_topic <= 1 && s.g2.on_topic <= 1;
    const acceptable = (s) => verdictOf(s.g1) === 'acceptable' && verdictOf(s.g2) === 'acceptable';
    const count = (set, arm, f) => set.filter((p) => f(p[arm])).length;

    const roster = front.filter((p) => p.kind === 'roster');
    const R = roster.length;
    if (!R) throw new Error('no complete front roster pairs: nothing to decide on');

    // 1. no new wrong, per leg, either leg failing fails
    const wrongAf = count(front, 'A', wrong), wrongBf = count(front, 'B', wrong), wrongAb = count(back, 'A', wrong), wrongBb = count(back, 'B', wrong);
    const c1front = wrongBf <= wrongAf, c1back = wrongBb <= wrongAb;
    const c1 = c1front && c1back ? 'holds' : 'FAIL';
    // 2. no rise in off-topic, all front pairs (back reported)
    const offAf = count(front, 'A', offTopic), offBf = count(front, 'B', offTopic), offAb = count(back, 'A', offTopic), offBb = count(back, 'B', offTopic);
    const c2 = offBf <= offAf ? 'holds' : 'FAIL';

    // 3-5 on R (the front leg's complete roster pairs); the all-front-pairs figures are reported only
    const med = (set, f) => pct(set.map(f), 0.5);
    const dTtft = med(roster, (p) => p.B.ttft - p.A.ttft);
    const c3a = dTtft <= 500 ? 'holds' : dTtft > 1000 ? 'FAIL' : 'INCONCLUSIVE';
    const p90A = pct(roster.map((p) => p.A.ttft), 0.9), p90B = pct(roster.map((p) => p.B.ttft), 0.9);
    const c3b = p90B <= p90A + 2000 ? 'holds' : 'INCONCLUSIVE';
    const slowA = roster.filter((p) => p.A.ttft > 10000).length, slowB = roster.filter((p) => p.B.ttft > 10000).length;
    const allow3c = Math.ceil((2 * R) / 39);
    const c3c = slowB <= slowA + allow3c ? 'holds' : 'FAIL';
    const dWords = med(roster, (p) => p.B.words - p.A.words);
    const c4 = dWords <= 5 ? 'holds' : dWords > 10 ? 'FAIL' : 'INCONCLUSIVE';
    const dThoughts = med(roster, (p) => p.B.thoughts - p.A.thoughts);
    const c5 = dThoughts <= 150 ? 'holds' : 'FAIL';
    // 7. gain on R
    const accA = count(roster, 'A', acceptable), accB = count(roster, 'B', acceptable);
    const delta = accB - accA;
    const passBar = Math.ceil((4 * R) / 21), failBar = Math.ceil(R / 21);
    const c7 = delta >= passBar ? 'PASS' : delta <= failBar ? 'FAIL' : 'INCONCLUSIVE';

    const nF = front.length;
    const all = {
        dTtft: med(front, (p) => p.B.ttft - p.A.ttft), p90A: pct(front.map((p) => p.A.ttft), 0.9), p90B: pct(front.map((p) => p.B.ttft), 0.9),
        slowA: front.filter((p) => p.A.ttft > 10000).length, slowB: front.filter((p) => p.B.ttft > 10000).length, allow3c: Math.ceil((2 * nF) / 39),
        dWords: med(front, (p) => p.B.words - p.A.words), dThoughts: med(front, (p) => p.B.thoughts - p.A.thoughts),
    };
    const backR = back.length;
    const backAcc = backR ? { A: count(back, 'A', acceptable), B: count(back, 'B', acceptable) } : { A: 0, B: 0 };
    const backThoughts = backR && back.every((p) => num(p.A.thoughts) && num(p.B.thoughts)) ? med(back, (p) => p.B.thoughts - p.A.thoughts) : null;

    const clauses = { c1, c2, c3a, c3b, c3c, c4, c5, c7 };
    let outcome = Object.values(clauses).includes('FAIL') ? 'FAIL'
        : ['c1', 'c2', 'c3a', 'c3b', 'c3c', 'c4', 'c5'].every((k) => clauses[k] === 'holds') && c7 === 'PASS' ? 'PASS' : 'INCONCLUSIVE';
    if (rerun && outcome === 'INCONCLUSIVE') outcome = 'FAIL';
    return {
        outcome, clauses, nFront: nF, nBack: backR, R, c1legs: { front: c1front ? 'holds' : 'FAIL', back: c1back ? 'holds' : 'FAIL' },
        numbers: {
            wrongAf, wrongBf, wrongAb, wrongBb, offAf, offBf, offAb, offBb, dTtft, p90A, p90B, slowA, slowB, allow3c, dWords, dThoughts, accA, accB, delta, passBar, failBar,
            all, backAcc, backDelta: backAcc.B - backAcc.A, backThoughts,
        },
    };
}

const sgn = (n) => (n >= 0 ? '+' : '') + n;
export function formatResult(r) {
    if (r.outcome === 'VOID') return 'VOID';
    const x = r.numbers, a = x.all;
    return [
        `n_front = ${r.nFront} complete front pairs (roster + D); R = ${r.R} complete roster pairs (the bars below are formulas on R); n_back = ${r.nBack} complete back pairs`,
        `1. no new wrong, per leg       front: consensus-wrong B ${x.wrongBf} <= A ${x.wrongAf}: ${r.c1legs.front}; back: B ${x.wrongBb} <= A ${x.wrongAb}: ${r.c1legs.back}  =>  ${r.clauses.c1}`,
        `2. no rise in off-topic        front consensus-off-topic B ${x.offBf} <= A ${x.offAf}: ${r.clauses.c2}   (back, reported: B ${x.offBb}, A ${x.offAb})`,
        `3a. not later (median)         median paired TTFT B-A on R ${x.dTtft} ms (holds <= +500, FAIL > +1000): ${r.clauses.c3a}   (all ${r.nFront} front pairs, reported: ${a.dTtft} ms)`,
        `3b. not later (p90)            p90 B ${x.p90B} ms vs p90 A ${x.p90A} ms + 2000: ${r.clauses.c3b}   (all front pairs, reported: B ${a.p90B} vs A ${a.p90A})`,
        `3c. stalls                     TTFT > 10 s on R: B ${x.slowB} <= A ${x.slowA} + ${x.allow3c}: ${r.clauses.c3c}   (all front pairs, reported: B ${a.slowB} <= A ${a.slowA} + ${a.allow3c})`,
        `4. not longer                  median paired words B-A on R ${x.dWords} (holds <= +5, FAIL > +10): ${r.clauses.c4}   (all front pairs, reported: ${a.dWords})`,
        `5. not more thinking           median paired thoughts B-A on R ${x.dThoughts} tokens (holds <= +150): ${r.clauses.c5}   (all front pairs, reported: ${a.dThoughts}; back leg at LOW, reported: ${x.backThoughts ?? 'n/a'})`,
        `6. parity                      checked before any verdict was opened: holds`,
        `7. gain, on R                  consensus-acceptable B ${x.accB} - A ${x.accA} = ${sgn(x.delta)} (PASS >= +${x.passBar}, FAIL <= +${x.failBar}): ${r.clauses.c7}   (back leg, descriptive: ${sgn(x.backDelta)} on ${r.nBack} pairs)`,
        `DECISION: ${r.outcome}`,
    ].join('\n');
}

/** Per-item rows (section 7.7 + descriptive): one row per hour:id with A/B symbols per rep, per-hour deltas on roster pairs. */
export function itemTables(pairs, verdictOf, leg) {
    const sym = (s) => (s.g1.correctness === 0 && s.g2.correctness === 0 ? 'X' : verdictOf(s.g1) === 'acceptable' && verdictOf(s.g2) === 'acceptable' ? 'Y' : s.g1.on_topic <= 1 && s.g2.on_topic <= 1 ? 'o' : 'w');
    const acc = (s) => verdictOf(s.g1) === 'acceptable' && verdictOf(s.g2) === 'acceptable';
    const keys = [...new Set(pairs.map((p) => p.key))];
    const lines = [`${leg} leg, per item (reps in order; Y both graders acceptable, X both correctness 0, o both on_topic <= 1, w otherwise):`];
    for (const key of keys) {
        const ps = pairs.filter((p) => p.key === key).sort((a, b) => a.rep - b.rep);
        lines.push(`  ${key.padEnd(11)} ${ps[0].kind.padEnd(8)} A ${ps.map((p) => sym(p.A)).join('')}  B ${ps.map((p) => sym(p.B)).join('')}   acceptable A ${ps.filter((p) => acc(p.A)).length} B ${ps.filter((p) => acc(p.B)).length} of ${ps.length}`);
    }
    const hours = [...new Set(pairs.map((p) => p.hour))];
    for (const h of hours) {
        const rs = pairs.filter((p) => p.hour === h && p.kind === 'roster');
        lines.push(`  hour ${h}: roster pairs ${rs.length}, consensus-acceptable A ${rs.filter((p) => acc(p.A)).length} B ${rs.filter((p) => acc(p.B)).length}, delta ${sgn(rs.filter((p) => acc(p.B)).length - rs.filter((p) => acc(p.A)).length)}`);
    }
    return lines;
}

/** Additivity of the re-run (section 7): every pooled count equals the first run's plus the re-run's, each read alone. */
export function checkAdditivity(pooled, first, second) {
    const sums = ['wrongAf', 'wrongBf', 'wrongAb', 'wrongBb', 'offAf', 'offBf', 'offAb', 'offBb', 'slowA', 'slowB', 'accA', 'accB'];
    const bad = sums.filter((k) => pooled.numbers[k] !== first.numbers[k] + second.numbers[k]);
    if (pooled.R !== first.R + second.R || pooled.nFront !== first.nFront + second.nFront || pooled.nBack !== first.nBack + second.nBack) bad.push('pair counts');
    return bad;
}

// ── grader labels, derived not typed (A2 points 2 and 5; prep review C2 + I4) ─────────────────────────────────────────

/** The dated section-3 note that ACCEPTS the section 6 departure (A2 point 2): a line of section 3 that STARTS with DEPARTURE-S6-ACCEPTED (after
 *  list/heading/bold punctuation, never a backtick). A mere mention of the marker -- A2's own prose, once appended to the registered file, says
 *  "the registered file contains `DEPARTURE-S6-ACCEPTED`" -- is not the note. Returns { when } (the first date time on that line or the three lines
 *  above it, null when there is none) or null. */
export function findDepartureNote(preregText) {
    const a = preregText.indexOf('\n## 3.');
    const b = a < 0 ? -1 : preregText.indexOf('\n## 4.', a);
    if (a < 0 || b < 0) return null;
    const lines = preregText.slice(a, b).split('\n');
    const i = lines.findIndex((l) => /^\s*(?:[-*>#]+\s*)*(?:\*\*)?DEPARTURE-S6-ACCEPTED(?![\w-])/.test(l));
    if (i < 0) return null;
    for (let k = i; k >= Math.max(0, i - 3); k--) { const m = /\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/.exec(lines[k]); if (m) return { when: m[0].replace('T', ' ') }; }
    return { when: null };
}

/** Parses a tool's stdout (h40d-grader-models / check-grader-memory / audit-graders) into Map tag -> [rest-of-line, ...]. A line is
 *  `<tag>: <rest>` or `<tag> (<id>): <rest>` with tag blind-N.gX or blind-N.gX.replaced. */
export function parseTagLines(text) {
    const m = new Map();
    for (const line of text.split('\n')) {
        const x = /^(blind-\d+\.g\d(?:\.replaced)?)(?: \(([^)]*)\))?:\s*(.*)$/.exec(line.trim());
        if (x) m.set(x[1], [...(m.get(x[1]) ?? []), { id: x[2] ?? null, rest: x[3] }]);
    }
    return m;
}
const readModelLine = (rest) => { const j = /^(\{.*?\})(?:\s|$)/.exec(rest); if (!j) return null; try { const ks = Object.keys(JSON.parse(j[1])); return ks.length === 1 ? ks[0] : 'MIXED'; } catch { return null; } };
const readMemoryLine = (rest) => { const x = /^(LOADED|ABSENT)\s+projectMemory=(\d+) claudeMem=(\d+)/.exec(rest); return x ? { status: x[1], projectMemory: Number(x[2]), claudeMem: Number(x[3]) } : null; };
const readAuditLine = (rest) => {
    const status = /;\s*FLAGGED \d+:/.test(rest) ? 'FLAGGED' : /;\s*clean(?:;|\s*$)/.test(rest) ? 'clean' : null;
    const b = /;\s*bash=\[([^\]]*)\]/.exec(rest);
    return status ? { status, bash: b && b[1] ? b[1].split(',') : [] } : null;
};

/**
 * Cross-checks blind/graders.json against the three tools' stdout (A2 point 5): slot names exactly blind-1..N x g1,g2 (N = 9, or 5 for the
 * re-run), each slot naming its `agent`, and `model`, `memory` + `projectMemory`/`claudeMem`, `audit` (+ `bash`) equal to what the tools printed.
 * A slot's memory may read LOADED only under the departure (graders.json.departure === true AND `departureNote` found) and only when claudeMem is 0;
 * a replacement (`replaced: [agentId]`) needs its `blind-N.gX.replaced` line in all three files with a flag or marker that justifies it.
 * Returns the list of disagreements ([] = the labels are derived from the transcripts).
 */
export function checkGraders({ gs, files, nFiles, pinned, departureNote }) {
    const problems = [];
    const tools = { models: 'graders.models.out.txt', memory: 'graders.memory.out.txt', audit: 'graders.audit.out.txt' };
    const parsed = {};
    for (const [k, name] of Object.entries(tools)) {
        if (typeof files[k] !== 'string') { problems.push(`${name} is missing: the labels must be derived from the tools' stdout`); continue; }
        parsed[k] = parseTagLines(files[k]);
        for (const [tag, ls] of parsed[k]) if (ls.length > 1) problems.push(`${name}: ${ls.length} lines for ${tag}`);
    }
    const expected = Array.from({ length: nFiles }, (_, i) => [`blind-${i + 1}.g1`, `blind-${i + 1}.g2`]).flat();
    const names = Object.keys(gs.graders ?? {});
    for (const t of expected) if (!names.includes(t)) problems.push(`graders.json: slot ${t} missing`);
    for (const t of names) if (!expected.includes(t)) problems.push(`graders.json: slot ${t} is not one of blind-1..${nFiles} x g1,g2`);
    const departureClaimed = gs.departure === true;
    if (gs.departure !== undefined && gs.departure !== true && gs.departure !== false) problems.push('graders.json: departure must be true or false');
    if (departureClaimed && !departureNote) problems.push('graders.json carries departure: true but the registered file holds no section 3 note starting DEPARTURE-S6-ACCEPTED (a departure label without the note)');
    if (departureClaimed && departureNote && !departureNote.when) problems.push('the DEPARTURE-S6-ACCEPTED note carries no date time');
    const departureOk = departureClaimed && !!departureNote?.when;
    const one = (kind, tag) => parsed[kind]?.get(tag)?.[0] ?? null;
    for (const tag of expected) {
        const g = gs.graders?.[tag];
        if (!g) continue;
        const at = (what) => `${tag}: ${what}`;
        if (typeof g.agent !== 'string' || !g.agent) problems.push(at('no agent named'));
        if ((g.replaced ?? []).length > 1) problems.push(at('replaced more than once (one re-grade only)'));
        const m = one('models', tag), mem = one('memory', tag), au = one('audit', tag);
        const model = m ? readModelLine(m.rest) : null, memory = mem ? readMemoryLine(mem.rest) : null, audit = au ? readAuditLine(au.rest) : null;
        if (parsed.models) { if (!model) problems.push(at('no readable model line in graders.models.out.txt')); else { if (g.model !== model) problems.push(at(`model ${g.model} in graders.json, ${model} in the tool output`)); if (model !== pinned) problems.push(at(`ran ${model}, not ${pinned}`)); } }
        if (parsed.memory) {
            if (!memory) problems.push(at('no readable memory line in graders.memory.out.txt'));
            else {
                if (g.memory !== memory.status) problems.push(at(`memory ${g.memory} in graders.json, ${memory.status} in the tool output`));
                if (g.projectMemory !== memory.projectMemory) problems.push(at(`projectMemory ${g.projectMemory} in graders.json, ${memory.projectMemory} in the tool output`));
                if (g.claudeMem !== memory.claudeMem) problems.push(at(`claudeMem ${g.claudeMem} in graders.json, ${memory.claudeMem} in the tool output`));
                if (memory.status === 'LOADED' && !(departureOk && memory.claudeMem === 0)) problems.push(at(memory.claudeMem > 0 ? `claude-mem context markers (${memory.claudeMem}) refuse the slot, departure or not` : 'memory LOADED without an accepted departure'));
            }
        }
        if (parsed.audit) {
            if (!audit) problems.push(at('no readable audit line in graders.audit.out.txt'));
            else {
                if (g.audit !== audit.status) problems.push(at(`audit ${g.audit} in graders.json, ${audit.status} in the tool output`));
                if (audit.status !== 'clean') problems.push(at('audit FLAGGED'));
                if (JSON.stringify(g.bash ?? []) !== JSON.stringify(audit.bash)) problems.push(at('bash length:sha12 list differs from the audit output'));
                const idShown = au.id, agent = typeof g.agent === 'string' ? g.agent.replace(/^(session|file):/, '').slice(0, 18) : '';
                if (idShown && agent && idShown !== agent) problems.push(at(`agent ${agent} in graders.json, ${idShown} in the audit output`));
            }
        }
        // replacements: the `.replaced` lines must exist in all three files and justify the replacement
        const rtag = `${tag}.replaced`;
        const rl = { models: one('models', rtag), memory: one('memory', rtag), audit: one('audit', rtag) };
        if ((g.replaced ?? []).length === 1) {
            for (const [k, v] of Object.entries(rl)) if (parsed[k] && !v) problems.push(at(`replaced, but ${tools[k]} has no ${rtag} line`));
            const why = (rl.models && readModelLine(rl.models.rest) !== pinned) || (rl.audit && readAuditLine(rl.audit.rest)?.status !== 'clean')
                || (rl.memory && (() => { const x = readMemoryLine(rl.memory.rest); return x && x.status === 'LOADED' && !(departureOk && x.claudeMem === 0); })());
            if (!why) problems.push(at('replaced, but no .replaced line shows the flag or marker that justified it'));
        } else if (Object.values(rl).some(Boolean)) problems.push(at(`${rtag} lines exist but graders.json lists no replacement`));
    }
    return problems;
}

// ── CLI ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const argv = process.argv.slice(2);
    if (argv.includes('--calibrate')) {
        const r = spawnSync(process.execPath, [path.join(HERE, 'scripts', 'legs-decide-calibrate.mjs')], { stdio: 'inherit' });
        process.exit(r.status ?? 1);
    }
    const C = await import(pathToFileURL(path.join(HERE, 'scripts', 'common.mjs')).href);
    const rerun = argv.includes('--rerun');
    const FIRST = C.PRIMARY_HOURS, RERUN = ['s50k'];

    // (0) a pass that hit the hard stop (A2 point 3): refused, never VOID, never graded -- before anything else is read
    const stoppedFiles = C.stoppedMarkers();
    if (stoppedFiles.length) { console.log(`REPORTED, NOT DECIDED: ${stoppedFiles.join(', ')} exist in ${C.OUT_DIR}: a pass hit the hard stop (09:30 local); stopped records are never graded or decided on (day-steps stop-archive moves them out)`); process.exit(3); }

    // (1) section 2 and (2) the parity set, BEFORE any verdict file is opened (I5)
    // A2 M5: once a DECISION line is on file, VOID is unavailable (a changed file after a printed decision is an INCIDENT, not a second chance).
    const decisionOnFile = () => ['RESULT-front-back.txt', 'RESULT-front-back-rerun.txt'].some((f) => { try { return /^DECISION:/m.test(fs.readFileSync(path.join(C.OUT_DIR, f), 'utf8')); } catch { return false; } });
    const fail = (why) => {
        if (decisionOnFile()) { console.log(`INCIDENT: ${why} -- a DECISION line is already on file in RESULT-front-back*.txt, so VOID is not printed (A2 M5); nothing is decided again`); process.exit(4); }
        console.log('VOID'); console.error(`VOID reason (not a clause line): ${why}`); process.exit(4);
    };
    try {
    const v = C.verifySection2();
    if (!v.ok) fail(`section 2 does not verify: ${v.problems.slice(0, 8).join(' | ')}`);
    const ref = await import(pathToFileURL(C.REF).href);
    for (const hour of rerun ? [...FIRST, ...RERUN] : FIRST) {
        const fx = JSON.parse(fs.readFileSync(path.join(C.R_DIR, `turn-parity-${hour}.json`), 'utf8'));
        const G = JSON.parse(fs.readFileSync(path.join(C.R_DIR, `${hour}-gated-turn.json`), 'utf8'));
        for (const [key, e] of Object.entries(fx)) {
            const res = ref.buildEarlierQuestion({ question: e.question, turnId: e.turnId, supersede: e.supersede, ledger: e.ledger, promptLines: e.promptLines });
            if (res.block !== e.expectedBlock || res.cue !== e.expectedCue || C.sha(res.block) !== e.expectedSha256) fail(`parity: ${key} no longer re-derives`);
            if (!e.expectedBlock && G[key]) fail(`parity: ${key} is gated but the fixture says ''`);
            if (e.expectedBlock && !G[key]) fail(`parity: ${key} has a block but is not in the gated file`);
            if (e.expectedBlock && G[key] && C.sha(G[key].block) !== e.expectedSha256) fail(`parity: ${key}'s gated block is not the fixture's block`);
        }
        for (const id of ['S2Q09F', 'S1Q08', 'S2Q08', 'S2Q01F']) if (fx[`${hour}:${id}`]?.expectedBlock !== '') fail(`parity: ${hour}:${id} must be '' by id`);
        if (Object.keys(fx).length !== 42) fail(`parity: ${hour} fixture holds ${Object.keys(fx).length} entries, not 42`);
    }
    } catch (e) { fail(`precondition error (an exception here is a VOID, never a crash): ${e.message}`); }

    // (3) only now are the key files, the graders' verdicts and the answer files opened
    const J = await import(pathToFileURL(path.join(C.MAIN, 'electron/test/golden/interview60.judge.mjs')).href);
    const stamp = J.graderPromptVersion();
    if (stamp !== C.INSTRUMENT) { console.log(`REPORTED, NOT DECIDED: instrument ${stamp} is not ${C.INSTRUMENT}`); process.exit(3); }
    const collect = async (hours, tag) => {
        const { G } = await C.loadGated(hours);
        const dir = tag === 'rerun' ? path.join(C.OUT_DIR, 'blind-rerun') : C.BLIND_DIR;
        const gj = path.join(dir, 'graders.json');
        if (!fs.existsSync(gj)) { console.log(`REPORTED, NOT DECIDED: missing ${gj}`); process.exit(3); }
        const gs = JSON.parse(fs.readFileSync(gj, 'utf8'));
        const keyFiles = fs.readdirSync(dir).filter((f) => /^key\.blind-\d+\.json$/.test(f));
        const slots = Object.entries(gs.graders ?? {});
        // A2 points 2 and 5: the labels are DERIVED -- cross-checked against the three tools' stdout kept beside graders.json -- and a LOADED
        // memory is accepted only under the accepted departure.
        const nFiles = tag === 'rerun' ? 5 : 9;
        const readTool = (name) => { try { return fs.readFileSync(path.join(dir, name), 'utf8'); } catch { return undefined; } };
        const note = findDepartureNote(fs.readFileSync(C.PREREG, 'utf8'));
        const problems = checkGraders({ gs, files: { models: readTool('graders.models.out.txt'), memory: readTool('graders.memory.out.txt'), audit: readTool('graders.audit.out.txt') }, nFiles, pinned: C.PINNED_GRADER, departureNote: note });
        if (gs.instrument !== C.INSTRUMENT) problems.unshift(`instrument ${gs.instrument} is not ${C.INSTRUMENT}`);
        if (keyFiles.length !== nFiles) problems.push(`${keyFiles.length} key files, expected ${nFiles}`);
        if (problems.length) { console.log(`REPORTED, NOT DECIDED: ${gj}: ${problems.slice(0, 12).join(' | ')}${problems.length > 12 ? ` | ... ${problems.length - 12} more` : ''}`); process.exit(3); }
        const departureUsed = gs.departure === true && slots.some(([, g]) => g.memory === 'LOADED');
        const scores = {};
        for (const kf of keyFiles) {
            const nf = kf.match(/^key\.blind-(\d+)\.json$/)[1];
            const keys = JSON.parse(fs.readFileSync(path.join(dir, kf), 'utf8'));
            for (const g of C.GRADERS) {
                const vf = path.join(dir, `verdicts.blind-${nf}.${g}.json`);
                if (!fs.existsSync(vf)) { console.error(`missing ${vf}: every blind file needs both graders' verdicts`); process.exit(2); }
                const vv = JSON.parse(fs.readFileSync(vf, 'utf8'));
                const extra = Object.keys(vv).filter((k) => !keys[k]);
                if (extra.length) { console.error(`${path.basename(vf)} grades keys that are not in ${kf}: ${extra.join(', ')}`); process.exit(2); }
                for (const [k, meta] of Object.entries(keys)) {
                    if (!SCORE(vv[k])) { console.error(`${path.basename(vf)}: no valid verdict for ${k}`); process.exit(2); }
                    ((scores[`${meta.leg}|${meta.key}|${meta.arm}|${meta.rep}`] ??= {})[g] = vv[k]);
                }
            }
        }
        const EMPTY = { correctness: 0, on_topic: 0, delivery: 0 };
        const out = { front: [], back: [] }, incomplete = [], emptied = [];
        for (const leg of ['front', 'back']) {
            const store = {};
            for (const h of hours) for (const arm of C.ARMS) for (let rep = 1; rep <= C.LEGS[leg].reps; rep++) store[`${h}|${arm}|${rep}`] = JSON.parse(fs.readFileSync(C.fileFor(leg, h, arm, rep), 'utf8'));
            // A2 point 3: a record that ended at or after the hard stop is evidence of the stop, never a pair in the decision
            const late = Object.entries(store).flatMap(([k, st]) => Object.entries(st).map(([rk, rec]) => [`${leg} ${k} ${rk}`, C.recordEndProblem(rec)]).filter(([, why]) => why));
            if (late.length) { console.log(`REPORTED, NOT DECIDED: ${late.length} record(s) end at or after the hard stop (${late.slice(0, 4).map(([w, why]) => `${w}: ${why}`).join('; ')}); stopped records are never graded or decided on`); process.exit(3); }
            for (const key of C.itemsFor(G, leg, hours)) for (let rep = 1; rep <= C.LEGS[leg].reps; rep++) {
                const o = G[key], side = {};
                for (const arm of C.ARMS) {
                    const x = store[`${o.hour}|${arm}|${rep}`][key];
                    if (!x || x.transientError) continue;
                    const meta = { thoughts: x.thoughts ?? null, model: x.model, thinking: x.thinking, leg: x.leg };
                    // No text at all (ttft null): the candidate waited `total` ms to see nothing; that wait is its first-token time.
                    if (!x.spoken) { emptied.push(`${leg}:${arm}r${rep}:${key}${x.ttft == null ? ' (no text at all)' : ''}`); side[arm] = { g1: EMPTY, g2: EMPTY, ttft: x.ttft ?? x.total, words: 0, ...meta }; continue; }
                    const s = scores[`${leg}|${key}|${arm}|${rep}`];
                    if (!s?.g1 || !s?.g2) { console.error(`${leg} ${key} r${rep} ${arm}: answered but not graded by both graders`); process.exit(2); }
                    side[arm] = { g1: s.g1, g2: s.g2, ttft: x.ttft, words: x.words, ...meta };
                }
                if (!side.A || !side.B) { incomplete.push(`${leg}:${key}#${rep} (${C.ARMS.filter((a) => !side[a]).join(',')} missing)`); continue; }
                out[leg].push({ key, hour: o.hour, id: o.id, kind: o.kind, rep, A: side.A, B: side.B });
            }
        }
        return { ...out, incomplete, emptied, nGraders: slots.length, departureUsed, noteWhen: note?.when ?? null };
    };
    const first = await collect(FIRST, 'first');
    let use = first, second = null, r;
    // A2 point 2: when the graders read LOADED under the accepted departure, the exposure statement is the FIRST line of the result
    const exposure = (s) => (s?.departureUsed ? `GRADERS LOADED PROJECT MEMORY (departure from spec §6, §3 note ${s.noteWhen})` : null);
    if (exposure(first)) console.log(exposure(first));
    if (rerun) {
        second = await collect(RERUN, 'rerun');
        if (!exposure(first) && exposure(second)) console.log(exposure(second));
        use = { front: [...first.front, ...second.front], back: [...first.back, ...second.back], incomplete: [...first.incomplete, ...second.incomplete], emptied: [...first.emptied, ...second.emptied] };
        r = decide(use, J.verdictOf, { rerun: true });
        const bad = checkAdditivity(r, decide(first, J.verdictOf), decide(second, J.verdictOf));
        if (bad.length) { console.log(`ADDITIVITY FAILED: ${bad.join(', ')}`); process.exit(4); }
        console.log('additivity OK: every pooled count equals the first run plus the re-run');
    } else r = decide(first, J.verdictOf);
    console.log(`instrument ${stamp}; graders ${C.PINNED_GRADER} x ${first.nGraders}${second ? ` + ${second.nGraders}` : ''}`);
    console.log(`incomplete pairs (excluded): ${use.incomplete.length ? use.incomplete.join(', ') : 'none'}`);
    console.log(`answers empty after the filters (scored 0/0/0): ${use.emptied.length ? use.emptied.join(', ') : 'none'}`);
    console.log(formatResult(r));
    // Reported beside the rule, never decided on
    const either = (set, arm, f) => set.filter((p) => f(p[arm].g1) || f(p[arm].g2)).length;
    console.log(`\neither grader (front): wrong A ${either(use.front, 'A', (g) => g.correctness === 0)} B ${either(use.front, 'B', (g) => g.correctness === 0)}; off-topic A ${either(use.front, 'A', (g) => g.on_topic <= 1)} B ${either(use.front, 'B', (g) => g.on_topic <= 1)}`);
    for (const line of itemTables(use.front, J.verdictOf, 'front')) console.log(line);
    for (const line of itemTables(use.back, J.verdictOf, 'back')) console.log(line);
}
