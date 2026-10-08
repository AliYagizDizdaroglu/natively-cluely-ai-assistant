// b5 (flight-eq registration §7.b5 + A2.4/A2.10, A3.1b, A4.1/A4.2, A5.1, A6): the post-hour reader.
//
//   node eq-flight-read.mjs <run-dir> [--played <json>] [--referents] [--prompts] [--gstar <ids>] [--gstar-min <n>] [--twin-min <n>] [--no-window-check]
//
// Reads the run window of a flight-eq run folder (natively_debug.log, interview60.timeline.json, and when present
// verbal-diag.log, verbal-prompts.log, interview60.prompts.json) and prints, per rule: the startup lines (1a), the
// dispatch windows with their diag lines and roster item (by play window), the `gate=` histogram, G / G* / G*∩G, G_twin
// with causes, ms percentiles (2a), 1(b)(c)(e)(f)(g-less)(i), 4d, 5a, 5b (`--referents`), 5c, 5d, and the LABEL counts
// (`--prompts`, 1(e)). It prints ids, counts, line numbers and classes ONLY: never a question, a parent line, a prompt or an
// answer. No model call, no write, no key. `--played <json>` is the smoke's mode ({played:[{id,startedMs,endedMs}]}).
//
// Exit codes: 0 reading complete, no VOID/FAIL clause named | 1 reading complete, at least one clause VOID or FAIL named |
// 2 usage / unreadable input | 4 crash.
//
// Rulings made while building (reported in b5-b10-build-report.md):
//  S1 diag/override/knowledge/route lines belong to the window of the pinned line BEFORE them (the app logs pinned, then
//     the diag line, then the override line - check-smoke-eq's own rule); the screen-reference line, which the app logs
//     BEFORE the pinned line, belongs to the next pinned line (A3.1b/A4.2 m3 "before" read literally for that line only).
//  S2 p90 = nearest rank, sorted[ceil(0.9 n) - 1].
//  S3 a roster match picks the best-scoring sameAnchor id (ties listed); the registration says "matched against the
//     roster's texts (sameAnchor)", not how to rank several loose matches.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const url = (p) => pathToFileURL(path.join(MAIN, p)).href;
const GSTAR_DEFAULT = ['S1Q04F', 'S1Q06F', 'S2Q05F', 'S2Q08F'];
const EXPECT_PIP = ['S1Q08', 'S2Q08', 'S2Q09F', 'S2Q01F'];                  // cue fires, parent present -> '' (registration §3)
const GATES_ALL = ['block', 'no-cue', 'parent-in-prompt', 'parent-in-pinned', 'supersede', 'no-parent', 'error', 'no-turn'];
const PINNED_RE = /^(\S+) \[LOG\] \[IntelligenceEngine\] runWhatShouldISay: pinned question (".*")$/;
const DIAG_RE = /^(\S+) \[LOG\] \[IntelligenceEngine\] earlier question: gate=(\S+)(?: cue=(\S+))?(?: chars=(\d+))?(?: turn=(\S+))?(?: ms=(\d+))?(.*)$/;
const SCREEN_RE = /^(\S+) \[LOG\] \[Main\] screen reference: captured /;     // prefix only: the line quotes 60 chars of the question
const KNOW_RE = /Knowledge mode \(stream\): returning generated intro response|__negotiationCoaching/;
const OVERRIDE_BEH_RE = /runWhatShouldISay: intent override → behavioral/;
const ROUTE_RE = /^\[(\S+)\] route: (FAST-OVERRIDE|BEHAVIORAL)\b/;
const ROUTE_ANY_RE = /^\[(\S+)\] route: /;
const nearestRank = (arr, p) => { if (!arr.length) return null; const s = [...arr].sort((a, b) => a - b); return s[Math.ceil(p * s.length) - 1]; };
const words4 = (s) => (s.match(/[A-Za-z]{4,}/g) ?? []).length;

let M = null;                                                               // lazily loaded MAIN modules (read-only imports)
export async function loadMain() {
    if (M) return M;
    const [qr, eq, pc, arm, sq] = await Promise.all([
        import(url('dist-electron/electron/services/questionReconcile.js')), import(url('dist-electron/electron/llm/earlierQuestion.js')),
        import(url('dist-electron/electron/llm/promptCapture.js')), import(url('electron/test/golden/earlierQuestionArm.mjs')),
        import(url('electron/test/golden/scenario50.questions.mjs'))]);
    const roster = sq.SCENARIO50.filter((x) => x.scenario === 'S1' || x.scenario === 'S2').map((x) => ({ id: x.id, q: x.q, chain: x.chain ?? null }));
    M = { sameAnchor: qr.sameAnchor, overlap: qr.overlap, LABEL: eq.LABEL, pair: pc.pairCapturesToDispatches, split: arm.splitEarlierQuestion, roster };
    return M;
}

/** Best roster match for a text: sameAnchor-qualified ids ranked by max directional overlap (S3). */
function rosterMatch(text, mods) {
    const hits = mods.roster.filter((r) => mods.sameAnchor(text, r.q)).map((r) => ({ id: r.id, score: Math.max(mods.overlap(text, r.q), mods.overlap(r.q, text)) }));
    if (!hits.length) return { ids: [], best: null };
    const top = Math.max(...hits.map((h) => h.score));
    const ids = hits.filter((h) => h.score === top).map((h) => h.id);
    return { ids, best: ids[0], all: hits.map((h) => h.id) };
}

/**
 * The whole analysis, on already-read inputs (so the calibration can feed synthetic logs).
 * in: { debugText, diagText|null, timeline:{startedAt,endedAt,items:[{id,playedAt}]}, window:{fromMs,toMs}, captures:[{at,user,...}]|null,
 *       prompts:{id:{user}}|null, gstar, gstarMin, twinMin, wantReferents, wantPrompts }
 */
export async function analyze(inp) {
    const mods = await loadMain();
    const { debugText, diagText, timeline, window: W, captures, prompts, gstar = GSTAR_DEFAULT, gstarMin = 3, twinMin = 3 } = inp;
    const out = []; const flags = [];                                          // flags: VOID / FAIL / NAMED clauses
    const say = (s) => out.push(s);
    const flag = (kind, clause, text) => { flags.push({ kind, clause, text }); say(`${kind} ${clause}: ${text}`); };
    const inWin = (t) => Number.isFinite(t) && t >= W.fromMs && t <= W.toMs;
    const lines = debugText.split('\n');
    const ts = (l) => Date.parse(l.slice(0, 24));

    // ---- 1(a) startup lines, last match each, from before the run window -------------------------------------------
    const lastBefore = (re) => { let v = null; for (const l of lines) { const t = ts(l); if (Number.isFinite(t) && t >= W.fromMs) break; const m = l.match(re); if (m) v = m[1]; } return v; };
    const startup = { earlier: lastBefore(/\[Main\] earlier question: (\S+)/), hedge: lastBefore(/\[Main\] verbal hedge: (on trigger=\d+ms|off\S*)/), parent: lastBefore(/\[Main\] follow-up parent: (\S+)/) };
    say(`READ startup (before the run window, last match each): earlier question: ${startup.earlier ?? 'ABSENT'}; verbal hedge: ${startup.hedge ?? 'ABSENT'}; follow-up parent: ${startup.parent ?? 'ABSENT'}`);
    const okA = startup.earlier === 'on' && startup.hedge === 'on trigger=5000ms' && startup.parent === 'off';
    const flagOn = startup.earlier === 'on';
    // B1: any startup mismatch (flag off, a value that is not `on`, an ABSENT line such as a rotated log) is VOID 1(a), named by line
    const sDiff = [startup.earlier !== 'on' && `earlier question=${startup.earlier ?? 'ABSENT'}`, startup.hedge !== 'on trigger=5000ms' && `verbal hedge=${startup.hedge ?? 'ABSENT'}`, startup.parent !== 'off' && `follow-up parent=${startup.parent ?? 'ABSENT'}`].filter(Boolean);
    if (!okA) flag('VOID', '1(a)', `startup lines are not exactly "earlier question: on", "verbal hedge: on trigger=5000ms", "follow-up parent: off": ${sDiff.join('; ')}`);
    else say('1(a) startup lines as registered');

    // ---- the dispatch windows ----------------------------------------------------------------------------------------
    const pinned = [];                                                          // every pinned line in the log (pairing uses them all)
    lines.forEach((l, i) => { const m = l.match(PINNED_RE); if (m) { let txt = ''; try { txt = JSON.parse(m[2]); } catch { /* keep '' */ } pinned.push({ n: i + 1, i, t: Date.parse(m[1]), text: txt }); } });
    const wins = pinned.filter((p) => inWin(p.t)).map((p) => ({ ...p }));
    const endIdx = (p) => { const k = pinned.findIndex((q) => q.n === p.n); return pinned[k + 1]?.i ?? lines.length; };
    const items = [...(timeline.items ?? [])].filter((x) => Number.isFinite(x.playedAt)).sort((a, b) => a.playedAt - b.playedAt);
    const itemAt = (t) => { let id = null; items.forEach((it, k) => { const to = k + 1 < items.length ? items[k + 1].playedAt : it.playedAt + 300_000; if (t >= it.playedAt && t < to) id = it.id; }); return id; };
    const diagByWin = new Map(); const orphanDiag = [];
    const diagLines = [];
    lines.forEach((l, i) => {
        const m = l.match(DIAG_RE);
        if (!m || /\[Main\] earlier question: /.test(l)) return;               // K3: the startup line is never a diag line
        const t = Date.parse(m[1]); if (!inWin(t)) return;
        // anchored regex of A2.4: must carry turn= and ms= fields; trailing text allowed. gate=error is counted whatever the suffix (K2).
        const full = /\bturn=\S+ ms=\d+/.test(l);
        const isErr = m[2] === 'error';
        if (!full && !isErr) return;
        const d = { n: i + 1, t, gate: m[2], cue: m[3] ?? null, chars: m[4] != null ? +m[4] : null, turn: m[5] ?? null, ms: m[6] != null ? +m[6] : null, suffix: (m[7] ?? '').trim() };
        diagLines.push(d);
        const w = [...wins].reverse().find((x) => x.n < d.n);
        if (!w) { orphanDiag.push(d); return; }
        if (!diagByWin.has(w.n)) diagByWin.set(w.n, []);
        diagByWin.get(w.n).push(d);
    });
    // per-window signature lines
    const diagTxt = diagText ?? null;
    const routeLines = diagTxt ? diagTxt.split('\n').map((l) => { const m = l.match(ROUTE_ANY_RE); return m ? { t: Date.parse(m[1]), fast: ROUTE_RE.test(l) } : null; }).filter(Boolean) : [];
    const routeIn = routeLines.filter((r) => inWin(r.t)), routeOut = routeLines.length - routeIn.length;
    const routeOutFast = routeLines.filter((r) => !inWin(r.t) && r.fast).length;     // A4.2's 'ignored' count (s50m: 23) is the out-of-window FAST-OVERRIDE/BEHAVIORAL lines
    // captures
    const capAll = (captures ?? []).map((c) => ({ ...c, tMs: Date.parse(c.at) }));
    const capIn = capAll.filter((c) => !Number.isFinite(c.tMs) || inWin(c.tMs));               // A6 m3: an unparseable `at` reads as in the window
    const capOutLabel = capAll.filter((c) => Number.isFinite(c.tMs) && !inWin(c.tMs) && typeof c.user === 'string' && c.user.includes(mods.LABEL)).length;
    const paired = captures ? mods.pair(capAll.map((c) => ({ ...c })), pinned.map((p, k) => ({ id: String(k), dispatchedAt: new Date(p.t).toISOString() }))) : {};
    const pinnedIdx = new Map(pinned.map((p, k) => [p.n, k]));

    const rows = wins.map((w) => {
        const k = pinnedIdx.get(w.n);
        const to = endIdx(w);
        const own = lines.slice(w.i, to);
        const prevPinI = pinned[k - 1]?.i ?? 0;
        const before = lines.slice(prevPinI + 1, w.i);                         // lines between the previous pinned line and this one
        const diags = diagByWin.get(w.n) ?? [];
        const sigScreen = before.some((l) => SCREEN_RE.test(l));
        const sigKnow = own.some((l) => KNOW_RE.test(l));
        const nextT = pinned[k + 1]?.t ?? Infinity;
        const sigFast = routeIn.some((r) => r.fast && r.t >= w.t && r.t < nextT);
        const sigOverrideLine = own.some((l) => OVERRIDE_BEH_RE.test(l));
        const cap = paired[String(k)] ?? null;
        const capHasLabel = !!cap && typeof cap.user === 'string' && cap.user.includes(mods.LABEL);
        const capSplit = capHasLabel ? mods.split(cap.user, mods.LABEL) : null;
        const rm = rosterMatch(w.text, mods);
        // S4: `short` is tested FIRST, so WHY ("Why that one?": one content word, which sameAnchor's overlap rule would match to
        // almost any roster text) reads `short`, as A2 m2 / A2.10's known answer says; "Thank you." likewise.
        const cls = words4(w.text) < 3 ? 'short' : rm.ids.length ? `roster:${rm.best}` : 'STRAY';
        return { n: w.n, t: w.t, id: itemAt(w.t), diags, gate: diags[0]?.gate ?? null, sig: { screen: sigScreen, know: sigKnow, fast: sigFast, overrideLine: sigOverrideLine }, cap, capHasLabel, capWellFormed: !!capSplit, capMalformed: capHasLabel && !capSplit, cls, rm, textLen: w.text.length, block: capSplit?.block ?? null };
    });

    say(`READ run window ${new Date(W.fromMs).toISOString()} .. ${Number.isFinite(W.toMs) ? new Date(W.toMs).toISOString() : 'end of log'}; dispatch windows ${rows.length}; diag lines in window ${diagLines.length}; captures ${captures ? `${capAll.length} (in window ${capIn.length}, LABEL outside window ignored ${capOutLabel})` : 'UNAVAILABLE (no verbal-prompts.log)'}; verbal-diag route lines in window ${routeIn.length} (fast/behavioral ${routeIn.filter((r) => r.fast).length}); ignored out-of-window: fast/behavioral ${routeOutFast} (all routes ${routeOut})`);
    for (const d of orphanDiag) flag('NAMED', 'diag', `diag line at log line ${d.n} follows no in-window pinned line`);

    // ---- per-window table ------------------------------------------------------------------------------------------------
    for (const r of rows) {
        const d = r.diags[0];
        const sigs = [r.sig.screen && 'screen', r.sig.know && 'knowledge', r.sig.fast && 'verbal-diag-fast', r.sig.overrideLine && 'override-behavioral'].filter(Boolean).join('+') || '-';
        say(`WINDOW line ${r.n} item ${r.id ?? 'NONE'} ${r.cls} ${d ? `gate=${d.gate} cue=${d.cue} chars=${d.chars} turn=${d.turn} ms=${d.ms}${d.suffix ? ' +suffix' : ''}` : 'NO DIAG LINE'} sig=${sigs} capture=${!captures ? 'n/a' : r.cap ? (r.capHasLabel ? (r.capWellFormed ? 'label-ok' : 'label-MALFORMED') : 'no-label') : 'none'}${r.diags.length > 1 ? ` diag-lines=${r.diags.length}` : ''}`);
    }

    // ---- STRAY / short (A2.4, rule 1(i)) -------------------------------------------------------------------------------------
    const stray = rows.filter((r) => r.cls === 'STRAY'), shorts = rows.filter((r) => r.cls === 'short');
    say(`READ roster windows ${rows.filter((r) => r.cls.startsWith('roster:')).length}, short ${shorts.length}${shorts.length ? ` (lines ${shorts.map((r) => r.n).join(',')}; items ${shorts.map((r) => r.id ?? 'NONE').join(',')})` : ''}, STRAY ${stray.length}${stray.length ? ` (lines ${stray.map((r) => r.n).join(',')})` : ''}`);
    if (stray.length) flag('VOID', '1(i)', `${stray.length} STRAY window(s) at log line(s) ${stray.map((r) => r.n).join(',')} (a pinned question matching no S1+S2 text with >= 3 words of >= 4 letters)`);

    // ---- gate histogram, ms, 1(b), 5a ----------------------------------------------------------------------------------------
    const hist = {}; for (const d of diagLines) hist[d.gate] = (hist[d.gate] ?? 0) + 1;
    say(`READ gate= histogram: ${GATES_ALL.map((g) => `${g}=${hist[g] ?? 0}`).join(' ')}${Object.keys(hist).filter((g) => !GATES_ALL.includes(g)).map((g) => ` OTHER:${g}=${hist[g]}`).join('')}`);
    const msVals = diagLines.filter((d) => d.ms != null).map((d) => d.ms);
    if (msVals.length) { const p90 = nearestRank(msVals, 0.9); say(`READ ms= p50 ${nearestRank(msVals, 0.5)} p90 ${p90} max ${Math.max(...msVals)} (n ${msVals.length})`); if (p90 > 50) flag('FAIL', '2a', `ms p90 ${p90} > 50 (feature-attributable)`); else say('2a PASS ms p90 <= 50'); }
    else say('2a n/a no diag ms values');
    const turnOk = rows.filter((r) => r.diags.some((d) => /^\d+$/.test(d.turn ?? ''))).length;
    const turnNone = diagLines.filter((d) => d.turn === 'none');
    if (turnNone.length) flag('NAMED', '1(b)/5c', `turn=none diag line(s) at log line(s) ${turnNone.map((d) => d.n).join(',')} (expected 0; counts against the 95%)`);
    const turnIds = rows.map((r) => r.diags.find((d) => /^\d+$/.test(d.turn ?? ''))?.turn).filter((x) => x != null).map(Number);
    const increasing = turnIds.every((t, i) => i === 0 || t > turnIds[i - 1]);
    say(`READ turn ids ${turnIds.length ? (increasing ? 'increasing' : 'NOT increasing') : 'none'} (${turnIds.length} numeric)`);
    if (turnIds.length && !increasing) flag('NAMED', '1(b)', `turn ids not increasing: ${turnIds.join(',')}`);
    if (flagOn || diagLines.length) {
        const frac = rows.length ? turnOk / rows.length : 0;
        say(`1(b) ${turnOk} of ${rows.length} windows carry a numeric turn= (${(frac * 100).toFixed(1)}%)`);
        if (rows.length && frac < 0.95) flag('VOID', '1(b)', `${turnOk} of ${rows.length} (< 95%) windows carry a numeric turn=`);
    }
    const errs = diagLines.filter((d) => d.gate === 'error');
    if (errs.length) for (const d of errs) { const mm = d.suffix.match(/error=("(?:[^"\\]|\\.)*")/); let msg = ''; if (mm) { try { msg = JSON.parse(mm[1]); } catch { msg = mm[1]; } } flag('FAIL', '5a', `gate=error at log line ${d.n} (window ${rows.find((r) => r.diags.includes(d))?.id ?? 'NONE'}, ms=${d.ms})${msg ? ` error="${String(msg).slice(0, 120)}"` : ' (no error text)'} (feature-attributable)`); }
    else say('5a PASS gate=error 0');

    // ---- NOT EXERCISED (flag off) / G, G*, 1(c) --------------------------------------------------------------------------------
    const noDiag = diagLines.length === 0;
    if (noDiag) {
        say(`NOT EXERCISED (${flagOn ? 'flag on, no diag line' : startup.earlier === null ? 'startup line ABSENT' : 'flag off'}): the run window carries no earlier-question diag line`);
        flag('VOID', '1(c)', 'NOT EXERCISED: no earlier-question diag line in the run window (4 G* ids cannot read gate=block)');
    } else if (!flagOn) flag('NAMED', '1(a)', 'diag lines exist but the startup line does not read "on"');

    // block classification (A3.1b / A4.1)
    // I7: the cause is keyed by LOG LINE (two gate=block windows of one id keep their own cause); `cause` is returned by id as an array in line order.
    const causeL = {}; const inserted = []; const unexplained = []; const malformed = []; const fast = [];
    for (const r of rows.filter((x) => x.gate === 'block')) {
        if (r.capMalformed) { malformed.push(r); causeL[r.n] = 'malformed'; continue; }
        if (r.capWellFormed) { inserted.push(r); causeL[r.n] = 'inserted'; continue; }
        if (r.sig.screen) { causeL[r.n] = 'coding'; continue; }
        if (r.sig.know) { causeL[r.n] = 'knowledge-short-circuit'; continue; }
        if (r.sig.fast) { fast.push(r); causeL[r.n] = 'fast-route'; continue; }              // I10: the verbal-diag route line is THE signature (A4.2 m4); the debug-log override line alone is not
        if (!captures) { causeL[r.n] = 'capture-unreadable'; continue; }
        unexplained.push(r); causeL[r.n] = 'UNEXPLAINED';
    }
    const idKey = (r) => r.id ?? `L${r.n}`;
    const cause = {}; for (const r of rows.filter((x) => x.gate === 'block')) (cause[idKey(r)] ??= []).push(causeL[r.n]);
    const shortBlock = rows.filter((r) => r.gate === 'block' && r.cls === 'short');
    for (const r of shortBlock) flag('NAMED', 'm8', `short window at log line ${r.n} (item ${r.id ?? 'NONE'}) reads gate=block: excluded from G, answer still read under 4a`);
    const G = [...new Set([...inserted, ...rows.filter((r) => causeL[r.n] === 'capture-unreadable')].filter((r) => r.cls !== 'short').map(idKey))];
    for (const r of rows.filter((x) => x.gate === 'block')) say(`BLOCK line ${r.n} item ${r.id ?? 'NONE'} cause=${causeL[r.n]}${r.cls === 'short' ? ' (short: out of G)' : ''}`);
    for (const r of rows.filter((x) => x.diags.length > 1 && x.diags.slice(1).some((d) => d.gate === 'block'))) flag('NAMED', 'm4', `window at log line ${r.n} carries ${r.diags.length} diag lines and a later one reads gate=block (only the first is used for the gate)`);
    for (const r of rows.filter((x) => x.gate === 'block' && x.diags[0].chars != null && !(x.diags[0].chars >= 200 && x.diags[0].chars <= 578))) flag('NAMED', 'm3', `block chars=${r.diags[0].chars} at log line ${r.diags[0].n} (item ${r.id ?? 'NONE'}) outside 200..578`);
    const flagged5d = new Set();
    for (const r of malformed) { flagged5d.add(r.n); flag('FAIL', '5d', `malformed EARLIER QUESTION block in the gate=block window at log line ${r.n} (item ${r.id ?? 'NONE'}) (feature-attributable)`); }
    for (const r of unexplained) flag('VOID', '1(e)', `gate=block window at log line ${r.n} (item ${r.id ?? 'NONE'}) has no capture carrying the LABEL and no screenshot / knowledge / fast-route signature: UNEXPLAINED`);
    // 1(e) second half: every in-window LABEL capture has a gate=block window; capture -> nearest preceding pinned window
    const blockLines = new Set(rows.filter((x) => x.gate === 'block').map((x) => x.n));
    let labelCaps = 0, labelCapsInBlock = 0;
    for (const c of capIn) {
        if (typeof c.user !== 'string' || !c.user.includes(mods.LABEL)) continue;
        labelCaps++;
        const t = Number.isFinite(c.tMs) ? c.tMs : Infinity;
        const w = [...rows].reverse().find((x) => x.t <= t + 1000) ?? null;
        const wf = !!mods.split(c.user, mods.LABEL);
        if (w && blockLines.has(w.n)) {
            labelCapsInBlock++;
            // I6: A4.1 reads 5d first on EVERY capture carrying the LABEL, a hedge's second capture included
            if (!wf && !flagged5d.has(w.n)) { flagged5d.add(w.n); flag('FAIL', '5d', `a malformed EARLIER QUESTION capture (not the window's paired one) in the gate=block window at log line ${w.n} (item ${w.id ?? 'NONE'}) (feature-attributable)`); }
            continue;
        }
        flag('VOID', '1(e)', `a capture carrying the LABEL falls in a non-block window (${w ? `log line ${w.n}, item ${w.id ?? 'NONE'}` : 'no window'}); its 5d reading: ${wf ? 'well-formed' : 'MALFORMED'}`);
    }
    if (captures) say(`READ LABEL captures in the run window ${labelCaps} (in gate=block windows ${labelCapsInBlock}); LABEL captures outside the window ignored ${capOutLabel}`);
    const gblockWithCap = rows.filter((x) => x.gate === 'block' && x.capHasLabel).length;
    if (inp.wantPrompts) {
        const kept = prompts ? Object.entries(prompts).filter(([, v]) => v && typeof v.user === 'string' && v.user.includes(mods.LABEL)).map(([k]) => k) : null;
        say(`PROMPTS LABEL count: per-dispatch captures in window ${labelCaps}; gate=block windows that have a captured prompt carrying the LABEL ${gblockWithCap}; ${labelCaps === gblockWithCap ? 'EQUAL' : 'NOT EQUAL'}`);
        say(`PROMPTS interview60.prompts.json: ${kept ? `${kept.length} entries carry the LABEL (ids ${kept.join(',') || '-'})` : 'file absent'}`);
        if (captures && labelCaps !== gblockWithCap) flag('NAMED', '1(e)', `LABEL captures ${labelCaps} != gate=block windows with a LABEL capture ${gblockWithCap} (informational: a hedge's second capture of one dispatch also counts here; the recast 1(e) halves above decide)`);
    }

    // G*, 1(c)
    const gAll = new Set(rows.filter((r) => r.gate === 'block').map(idKey));
    const gstarRead = gstar.map((id) => { const rs = rows.filter((r) => r.id === id); const reached = rs.some((r) => r.gate === 'block' && ['inserted', 'fast-route', 'capture-unreadable'].includes(causeL[r.n])); return { id, reached, gate: rs.map((r) => r.gate ?? 'no-diag').join('/') || 'NO WINDOW (lost before dispatch)' }; });
    const interG = gstarRead.filter((x) => x.reached).map((x) => x.id);
    say(`READ G = {${G.join(', ')}} (${G.length})`);
    say(`READ G* = {${gstar.join(', ')}}; G*∩G = {${interG.join(', ')}} (${interG.length} of ${gstar.length}); G not in G* = {${G.filter((x) => !gstar.includes(x)).join(', ') || '-'}}`);
    for (const x of gstarRead.filter((y) => !y.reached)) say(`READ G* miss ${x.id}: gate=${x.gate}`);
    if (!noDiag) {
        if (interG.length < gstarMin) flag('VOID', '1(c)', `NOT EXERCISED: ${interG.length} of ${gstar.length} G* ids read gate=block (need ${gstarMin}); missing: ${gstarRead.filter((x) => !x.reached).map((x) => `${x.id}(${x.gate})`).join(', ')}`);
        else say(`1(c) ${interG.length} of ${gstar.length} G* ids read gate=block (>= ${gstarMin})`);
    }
    // G_twin
    const dispatchCount = (id) => rows.filter((r) => r.id === id).length;
    const gtwin = []; const gtwinOut = [];
    for (const id of G) {
        const rb = rows.filter((x) => x.id === id && x.gate === 'block');
        if (rb.length && rb.every((x) => causeL[x.n] === 'fast-route')) { gtwinOut.push(`${id}(fast-route)`); continue; }
        const kept = prompts?.[id]?.user;
        if (kept && mods.split(kept, mods.LABEL)) gtwin.push(id);
        else gtwinOut.push(`${id}(${dispatchCount(id) >= 2 ? 'double' : 'other'})`);
    }
    say(`READ G_twin = {${gtwin.join(', ')}} (${gtwin.length}); in G but out of G_twin: ${gtwinOut.join(', ') || '-'}${prompts ? '' : ' [interview60.prompts.json absent: G_twin unavailable]'}`);
    // I4: missing inputs and a short G_twin are INCOMPLETE and count in the exit code and the summary
    if (!prompts) flag('INCOMPLETE', 'G_twin', 'UNREAD: no interview60.prompts.json in the run folder (G_twin, 2b-2d, 3a, 4b, 4c cannot be computed)');
    else if (gtwin.length < twinMin) flag('INCOMPLETE', 'A2.4', `|G_twin| ${gtwin.length} < ${twinMin}: 2b-2d, 3a, 4b, 4c INCOMPLETE (re-fly)`);
    if (!captures) flag('INCOMPLETE', '1(e)', 'UNREAD: no verbal-prompts.log in the run folder (1(e) and 5d cannot be read; G is provisional, from diag lines alone)');
    if (inp.captureDropped > 0) flag('INCOMPLETE', '1(e)', `UNREAD: ${inp.captureDropped} unparseable line(s) in verbal-prompts.log (index ${inp.captureDroppedAt.join(',')}): a truncated LABEL capture would vanish from 1(e) and 5d`);

    // 1(f) lost before dispatch; coverage of items
    const played = items.map((x) => x.id);
    const lost = played.filter((id) => !rows.some((r) => r.id === id));
    say(`READ items with no dispatch window ${lost.length}${lost.length ? ` (${lost.join(',')})` : ''} of ${played.length}`);
    if (lost.length > 2) flag('VOID', '1(f)', `${lost.length} items lost before dispatch (> 2): ${lost.join(',')}`);
    const unplaced = rows.filter((r) => !r.id);
    if (unplaced.length) flag('NAMED', 'window', `${unplaced.length} dispatch window(s) joined to no roster item (log lines ${unplaced.map((r) => r.n).join(',')})`);
    const doubles = [...new Set(rows.map((r) => r.id).filter(Boolean))].filter((id) => dispatchCount(id) >= 2);
    if (doubles.length) say(`5c doubles (>= 2 dispatches of one item): ${doubles.join(',')}`);
    const dupBlock = doubles.filter((id) => rows.filter((r) => r.id === id && r.gate === 'block').length >= 2);
    if (dupBlock.length) flag('NAMED', '5c', `duplicate ledger entry (two gate=block windows for one item): ${dupBlock.join(',')}`);

    // 4d
    // I8: inserted / fast-route (both in G) are 4d; a malformed block is 5d + 4d; only coding / knowledge-short-circuit (built, not inserted) are 4e
    for (const r of rows.filter((x) => x.gate === 'block' && x.id && !x.id.endsWith('F'))) { const c = causeL[r.n]; flag('NAMED', '4d', `main ${r.id} reads gate=block (${c}${['inserted', 'fast-route'].includes(c) ? ': a wrong in-app answer here = feature-attributable FAIL (4d)' : c === 'malformed' ? ': 5d + 4d, a wrong in-app answer here = feature-attributable FAIL' : ['coding', 'knowledge-short-circuit'].includes(c) ? ': built, not inserted: a wrong answer here is 4e' : ': read by hand'})`); }
    const mainsBlock = rows.filter((x) => x.gate === 'block' && x.id && !x.id.endsWith('F')).length;
    if (!mainsBlock) say('4d mains: 0 with gate=block');
    const mainsChars = rows.filter((x) => x.id && !x.id.endsWith('F') && x.gate !== 'block' && x.diags[0] && x.diags[0].chars !== 0);
    for (const r of mainsChars) flag('NAMED', '4d', `main ${r.id} has chars=${r.diags[0].chars} on gate=${r.gate}`);

    // 5c rows, expected parent-in-prompt ids
    const reached = GATES_ALL.filter((g) => hist[g]);
    say(`5c gate rows reached: ${reached.join(', ') || '-'}; NOT EXERCISED: ${GATES_ALL.filter((g) => !hist[g]).join(', ') || '-'}`);
    say(`5c cue-fired-parent-present ids: ${EXPECT_PIP.map((id) => `${id}=${rows.filter((r) => r.id === id).map((r) => r.gate ?? 'no-diag').join('/') || 'absent'}`).join(' ')}`);

    // 5b referents
    if (inp.wantReferents) {
        const byId = Object.fromEntries(mods.roster.map((r, k) => [r.id, { ...r, k }]));
        for (const r of inserted.concat(malformed)) {
            const id = r.id;
            const exp = id ? byId[id]?.chain ?? null : null;
            const parentLine = r.block ? r.block.split('\n')[1]?.slice(2) ?? '' : '';
            const mt = parentLine ? rosterMatch(parentLine, mods) : { ids: [] };
            let verdict;
            // I9: a main (or an unplaced window) has no chain parent; 4d needs its parent identified, so the matched ids are printed and the line is NAMED
            if (!exp) verdict = `PARENT IDENTIFIED for a window with no expected parent (${id ? 'main' : 'unplaced'}, log line ${r.n}): ${mt.ids.length ? `matches ${mt.ids.join('|')}` : 'UNMATCHED'}`;
            else if (!mt.ids.length) verdict = `UNMATCHED (matches no roster item; read by hand from ids only), expected ${exp}`;
            else if (mt.ids.includes(exp)) verdict = `RIGHT -> ${mt.ids.join('|')} expected ${exp}`;
            else { const k = byId[mt.best].k, ke = byId[exp].k; verdict = `WRONG REFERENT -> ${mt.ids.join('|')} expected ${exp} (${k === ke ? 'same' : k < ke ? 'earlier than the parent' + (k === ke - 1 ? ' - the grandparent / previous item' : '') : 'later than the parent'})`; }
            const line = `REFERENT ${id ?? `L${r.n}`} ${verdict}`;
            if (/^REFERENT \S+ (WRONG|UNMATCHED|PARENT IDENTIFIED)/.test(line)) flag('NAMED', '5b', line.replace(/^REFERENT /, '') + ' (FAIL only if the in-app answer is wrong)'); else say(line);
        }
        for (const r of fast) say(`REFERENT ${r.id ?? `L${r.n}`} referent UNREAD (fast-route)`);
    }
    // A4.2 real-shape counters, for the cal
    say(`READ signatures: debug-log override→behavioral lines in window ${rows.filter((r) => r.sig.overrideLine).length}; verbal-diag fast route lines in window ${routeIn.filter((r) => r.fast).length}`);
    const bad = flags.filter((f) => f.kind === 'VOID' || f.kind === 'FAIL' || f.kind === 'INCOMPLETE');
    say(`READER ${bad.length ? `${bad.length} VOID/FAIL/INCOMPLETE clause(s) named: ${bad.map((f) => `${f.kind} ${f.clause}`).join(', ')}` : 'no VOID/FAIL/INCOMPLETE clause named'}`);
    return { out, flags, bad, rows, G, gtwin, hist, cause, startup, labelCaps, capOutLabel, stray, shorts, interG, lost, diagLines, routeIn, routeOut, turnIds };
}

// ---------------------------------------------------------------------------------------------------------------------------
export function windowFrom(timeline, played) {
    if (played) { const p = played.played; return { timeline: { items: p.map((x) => ({ id: x.id, playedAt: x.startedMs })) }, window: { fromMs: Math.min(...p.map((x) => x.startedMs)) - 2000, toMs: Infinity }, note: 'window = the smoke\'s: first clip start - 2 s .. end of log (--played)' }; }
    const s = Date.parse(timeline.startedAt), e = Date.parse(timeline.endedAt);
    if (!Number.isFinite(s) || !Number.isFinite(e)) throw Object.assign(new Error('timeline startedAt/endedAt unreadable (pass --played for a smoke dir)'), { usage: true });   // fixed text, no input quoted
    return { timeline, window: { fromMs: s, toMs: e }, note: 'window = the timeline\'s startedAt..endedAt' };
}
/** { caps, dropped, droppedAt } or null when absent. Unparseable JSONL lines are counted by index, never printed (I5, B2). */
export function readCaptures(file) {
    if (!fs.existsSync(file)) return null;
    const caps = [], droppedAt = [];
    fs.readFileSync(file, 'utf8').split('\n').forEach((l, i) => { if (!l.trim()) return; try { caps.push(JSON.parse(l)); } catch { droppedAt.push(i + 1); } });
    return { caps, dropped: droppedAt.length, droppedAt };
}
// B2: errors print the class, the file name and a line number only, never the message (a JSON.parse error quotes input text)
export const safeErr = (e) => { const m = String(e?.stack ?? '').match(/([^\\/()\s]+):(\d+):\d+\)?\s*$/m); return `${e?.name ?? 'Error'} at ${m ? `${m[1]}:${m[2]}` : 'unknown'}`; };
const readJson = (p, what) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { const err = new Error('x'); err.readerUnreadable = `${what} (${path.basename(p)}) is not readable JSON (${e?.name ?? 'Error'})`; throw err; } };
export const CAL_ENV = 'EQ_CAL_OVERRIDES';              // m7: the override flags below exist for calibration fixtures only

async function main() {
    const argv = process.argv.slice(2);
    const opt = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
    const flag = (n) => argv.includes(n);
    const valueFlags = new Set(['--played', '--gstar', '--gstar-min', '--twin-min']);
    const pos = argv.filter((a, i) => !a.startsWith('--') && !valueFlags.has(argv[i - 1]));
    if (pos.length !== 1) { console.log('usage: node eq-flight-read.mjs <run-dir> [--played <json>] [--referents] [--prompts] [--gstar <ids>] [--gstar-min <n>] [--twin-min <n>]'); process.exit(2); }
    const dir = pos[0];
    // m7: --gstar / --gstar-min / --twin-min change registered floors; refused unless the calibration driver set the env marker
    const overrides = ['--gstar', '--gstar-min', '--twin-min'].filter((f) => argv.includes(f));
    if (overrides.length && process.env[CAL_ENV] !== '1') { console.log(`READER REFUSED: ${overrides.join(', ')} change registered values and are for calibration fixtures only`); process.exit(2); }
    if (overrides.length) console.log('NON-REGISTERED: calibration overrides active (' + overrides.join(', ') + ')');
    const need = (f) => { const p = path.join(dir, f); if (!fs.existsSync(p)) { console.log(`READER UNREADABLE: missing ${f} in the run dir`); process.exit(2); } return p; };
    const debugText = fs.readFileSync(need('natively_debug.log'), 'utf8');
    let played, tl;
    try { played = opt('--played') ? readJson(opt('--played'), '--played file') : null; tl = played ? null : readJson(need('interview60.timeline.json'), 'timeline'); }
    catch (e) { if (e.readerUnreadable) { console.log(`READER UNREADABLE: ${e.readerUnreadable}`); process.exit(2); } throw e; }
    let wf;
    try { wf = windowFrom(tl, played); } catch (e) { if (e.usage) { console.log(`READER UNREADABLE: ${e.message}`); process.exit(2); } throw e; }
    const diagP = path.join(dir, 'verbal-diag.log'), promptsP = path.join(dir, 'interview60.prompts.json');
    const cr = readCaptures(path.join(dir, 'verbal-prompts.log'));
    let promptsObj = null;
    try { promptsObj = fs.existsSync(promptsP) ? readJson(promptsP, 'interview60.prompts.json') : null; } catch (e) { if (e.readerUnreadable) { console.log(`READER UNREADABLE: ${e.readerUnreadable}`); process.exit(2); } throw e; }
    const r = await analyze({
        debugText, diagText: fs.existsSync(diagP) ? fs.readFileSync(diagP, 'utf8') : null, timeline: wf.timeline, window: wf.window,
        captures: cr ? cr.caps : null, captureDropped: cr?.dropped ?? 0, captureDroppedAt: cr?.droppedAt ?? [], prompts: promptsObj,
        gstar: opt('--gstar') ? opt('--gstar').split(',').filter(Boolean) : GSTAR_DEFAULT, gstarMin: opt('--gstar-min') != null ? +opt('--gstar-min') : 3, twinMin: opt('--twin-min') != null ? +opt('--twin-min') : 3,
        wantReferents: flag('--referents'), wantPrompts: flag('--prompts'),
    });
    console.log(`READER ${path.basename(path.resolve(dir))}: ${wf.note}`);
    for (const l of r.out) console.log(l);
    process.exit(r.bad.length ? 1 : 0);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch((e) => { console.log(`READER CRASH: ${safeErr(e)}`); process.exit(4); });
