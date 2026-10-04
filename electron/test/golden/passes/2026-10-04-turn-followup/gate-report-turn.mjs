// Gate/ledger report for the turn-based follow-up context replay (PREREGISTER-turn-followup.md section 1, 12.2).
// Derived from followup-context/gate-report.mjs / gate-report-s50l.mjs for the parsing, the window lines, the D-case
// builder (`withoutPreview`) and the output shape; its selection section is REPLACED (I4):
//   * a turn ledger rebuilt from the hour's `dispatch: answer|supersede` lines, cut at the id's OWN dispatch (design 2's
//     `answeredBefore` rule: the last dispatch at or before the capture whose text is the pinned line);
//   * a supersede is removed-and-pushed through `replaces=` (the logs carry no turn id) and REFUSES on 0 or > 1 matching
//     earlier entries (m5);
//   * the reference's `supersede` input comes from the KIND of the dispatch line that matches the capture;
//   * no age cap; parent-only selection; head + tail clip; the new label; D-cases built through the same reference.
// Text only, no model calls, MAIN read-only, holdout40 never opened. Prints ids, cues, chars and hashes ONLY: no
// question text, no block text (m10: gate-report.mjs:241's `${blockText}` line is dropped).
//
//   node gate-report-turn.mjs              the three hours (s50m, s50l, s50k) -> R/<hour>-gated-turn.json, R/turn-parity-<hour>.json
//   import { rebuildLedger, ... }          for stamp-turn.mjs (guarded: importing runs nothing)
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildEarlierQuestion, recordAsked, insertBlock, sameAnchor } from './earlierQuestion.ref.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
export const R_DIR = path.join(HERE, 'R');
export const HOURS = {
    s50m: '2026-09-22T08-22-50-s50m',
    s50l: '2026-09-21T08-22-34-s50l',
    s50k: '2026-09-20T11-22-43-s50k',   // the one allowed re-run (I3): frozen now, run only if the first run is INCONCLUSIVE
};
export const runDir = (hour) => path.join(MAIN, 'electron', 'test', 'golden', 'interview60.runs', HOURS[hour]);
export const DROPPED = [{ key: 'D1', id: 'S1Q06F' }, { key: 'D2', id: 'S2Q05F' }, { key: 'D3', id: 'S2Q08F' }];   // spec 6 / registration section 3
export const sha256 = (s) => createHash('sha256').update(s).digest('hex');
const sha12 = (s) => sha256(s).slice(0, 12);

// ── dispatch lines ─────────────────────────────────────────────────────────────────────────────────────────────────
// interview60.prompts.mjs's DISPATCH, widened to capture the kind and replaces=.
const DISPATCH = /^(\S+) \[LOG\] \[Main\] dispatch: (answer|supersede) source=(?:live|whisper) anchor="(?:[^"\\]|\\.)*" verdict=\w+ (?:replaces="((?:[^"\\]|\\.)*)" )?question="((?:[^"\\]|\\.)*)"/gm;
/** [{ iso, at, kind: 'answer'|'supersede', replaces: string|null, text }], in log order. */
export function parseDispatches(debugLog) {
    return [...debugLog.matchAll(DISPATCH)].map((m) => ({
        iso: m[1], at: Date.parse(m[1]), kind: m[2],
        replaces: m[3] === undefined ? null : JSON.parse(`"${m[3]}"`), text: JSON.parse(`"${m[4]}"`),
    }));
}

/**
 * The turn ledger the app would hold just BEFORE dispatches[ownIdx] ran, rebuilt from the log. The logs carry no turn
 * id, so each `answer` gets a fresh synthetic id and a `supersede` finds its turn through `replaces=`: exactly one
 * earlier dispatch must carry that text, else this REFUSES (throws). `skip`: dispatch indices left out (the D-cases'
 * never-dispatched parent). Returns { ledger, history, nextTurnId }.
 */
export function rebuildLedger(dispatches, ownIdx, skip = new Set()) {
    let ledger = [], seq = 0, nextTurnId = 1;
    const history = [];                                   // one entry per machine turn: { text (latest), turnId, idx }
    for (let i = 0; i < ownIdx; i++) {
        if (skip.has(i)) continue;
        const d = dispatches[i];
        if (d.kind === 'answer') {
            const turnId = nextTurnId++;
            history.push({ text: d.text, turnId, idx: i });
            ledger = recordAsked(ledger, { text: d.text, turnId, seq: ++seq });
        } else {
            const hit = history.filter((h) => h.text === d.replaces);
            if (hit.length !== 1) throw new Error(`supersede at ${d.iso}: replaces= matches ${hit.length} earlier entries, expected exactly 1`);
            hit[0].text = d.text;
            ledger = recordAsked(ledger, { text: d.text, turnId: hit[0].turnId, seq: ++seq });
        }
    }
    return { ledger, history, nextTurnId };
}

/** The turn id dispatches[ownIdx] runs under: a fresh one for an answer, the matched turn's for a supersede. */
export function ownTurnId(dispatches, ownIdx, skip = new Set()) {
    const { history, nextTurnId } = rebuildLedger(dispatches, ownIdx, skip);
    const d = dispatches[ownIdx];
    if (d.kind === 'answer') return nextTurnId;
    const hit = history.filter((h) => h.text === d.replaces);
    if (hit.length !== 1) throw new Error(`supersede at ${d.iso}: replaces= matches ${hit.length} earlier entries, expected exactly 1`);
    return hit[0].turnId;
}

/** Design 2's answeredBefore cut: the last dispatch at or before the capture whose text is the pinned line. */
export function ownIndex(dispatches, captureAt, pinned, label) {
    for (let i = dispatches.length - 1; i >= 0; i--) if (dispatches[i].at <= captureAt && dispatches[i].text === pinned) return i;
    throw new Error(`${label}: no dispatch line carries its pinned question`);
}

// m5: the rebuild must refuse a corrupted replaces=. Pure self-test on synthetic dispatch lines (no captured text).
export function selfTestReplaces() {
    const d = (kind, text, replaces = null, n = 0) => ({ kind, text, replaces, iso: `t${n}`, at: n });
    const base = [d('answer', 'alpha question', null, 1), d('answer', 'bravo question', null, 2), d('supersede', 'bravo question plus tail', 'bravo question', 3), d('answer', 'charlie question', null, 4)];
    const refuses = (list, idx, skip) => { try { rebuildLedger(list, idx, skip); return null; } catch (e) { return e.message.replace(/supersede at \S+: /, ''); } };
    const good = rebuildLedger(base, 4);
    const out = [];
    out.push(['valid replaces= is removed-and-pushed (4 lines, 3 turns: alpha, merged bravo, charlie; the head entry is gone)', good.ledger.map((e) => e.text).join('|') === 'alpha question|bravo question plus tail|charlie question' && good.ledger[1].turnId === 2]);
    out.push(['corrupted replaces= (0 matches) refused', (refuses(base.map((x, i) => (i === 2 ? { ...x, replaces: 'bravo question CORRUPTED' } : x)), 4) ?? '').startsWith('replaces= matches 0')]);
    out.push(['replaces= matching 2 earlier entries refused', (refuses([d('answer', 'bravo question', null, 0), ...base], 5) ?? '').startsWith('replaces= matches 2')]);
    out.push(['replaces= naming a skipped dispatch refused', (refuses(base, 4, new Set([1])) ?? '').startsWith('replaces= matches 0')]);
    return out;
}

// ── captured prompt anatomy (as design 2's gate-report) ─────────────────────────────────────────────────────────────
const BEFORE_MARKER = 'INTERVIEWER JUST SAID:\n';
const AFTER_MARKERS = ['\n\nTHE LIVE LISTENER', '\n\nYOUR RESPONSE'];
const INTERVIEWER_LINE = /^\[INTERVIEWER\]:\s*(.*)$/;
export function splitUser(user) {
    const mi = user.indexOf(BEFORE_MARKER);
    if (mi < 0) throw new Error('no INTERVIEWER JUST SAID marker');
    const rest = user.slice(mi + BEFORE_MARKER.length);
    const hits = AFTER_MARKERS.map((m) => rest.indexOf(m)).filter((i) => i >= 0);
    if (!hits.length) throw new Error('no end marker after INTERVIEWER JUST SAID');
    return { block: rest.slice(0, Math.min(...hits)) };
}
const PREVIEW_HEAD = '\n\nPREVIOUS RESPONSES (Avoid Repetition):\n';
/** Arm A of a D-case: the captured prompt with exactly the PREVIOUS RESPONSES part removed (refuses any other shape). */
export function withoutPreview(user, label) {
    const i = user.indexOf(PREVIEW_HEAD);
    if (i < 0) throw new Error(`${label}: no PREVIOUS RESPONSES part`);
    const j = user.indexOf(`\n\n${BEFORE_MARKER}`, i);
    if (j < 0) throw new Error(`${label}: no marker after the preview`);
    const part = user.slice(i + PREVIEW_HEAD.length, j);
    const n = (part.match(/^\d+\. "/gm) ?? []).length;
    if (n !== 1) throw new Error(`${label}: the preview holds ${n} responses, expected 1`);
    const outUser = user.slice(0, i) + user.slice(j);
    if (outUser.includes('PREVIOUS RESPONSES')) throw new Error(`${label}: preview not removed`);
    return outUser;
}
/** The pinned question and the [INTERVIEWER] lines before it, as the prepared transcript shows them. */
export function interviewerLines(user) {
    const lines = splitUser(user).block.split('\n').map((l) => l.trim()).filter(Boolean);
    const all = lines.map((l) => INTERVIEWER_LINE.exec(l)?.[1]).filter(Boolean);
    return { current: all[all.length - 1], promptLines: all.slice(0, -1) };
}

// ── one hour ─────────────────────────────────────────────────────────────────────────────────────────────────────────
/** Loads and derives everything for one hour. Returns { dispatches, gated, parity, rows, dcases, PROMPTS } (no writes). */
export async function reportHour(hour) {
    const dir = runDir(hour);
    const { SCENARIO50 } = await import(pathToFileURL(path.join(MAIN, 'electron/test/golden/scenario50.questions.mjs')).href);
    const { readDispatches } = await import(pathToFileURL(path.join(MAIN, 'electron/test/golden/interview60.prompts.mjs')).href);
    const rosterQ = (id) => SCENARIO50.find((i) => i.id === id).q;
    const PROMPTS = JSON.parse(fs.readFileSync(path.join(dir, 'interview60.prompts.json'), 'utf8'));
    const TL = JSON.parse(fs.readFileSync(path.join(dir, 'interview60.timeline.json'), 'utf8'));
    const dbg = fs.readFileSync(path.join(dir, 'natively_debug.log'), 'utf8');
    const dispatches = parseDispatches(dbg);
    if (dispatches.length !== readDispatches(dbg).length) throw new Error(`${hour}: parseDispatches and MAIN's readDispatches disagree on the line count`);

    const gated = {}, parity = {}, rows = [];
    for (const id of Object.keys(PROMPTS)) {
        const p = PROMPTS[id];
        const { current, promptLines } = interviewerLines(p.user);
        const idx = ownIndex(dispatches, Date.parse(p.at), current, `${hour}:${id}`);
        const own = dispatches[idx];
        const { ledger } = rebuildLedger(dispatches, idx);
        const turnId = ownTurnId(dispatches, idx);
        const input = { question: current, turnId, supersede: own.kind === 'supersede', ledger, promptLines };
        const r = buildEarlierQuestion(input);
        const ageS = r.parent && idx > 0 ? Math.round((own.at - dispatches[idx - 1].at) / 1000) : null;
        const key = `${hour}:${id}`;
        parity[key] = { hour, id, kind: 'roster', ...input, expectedCue: r.cue, expectedBlock: r.block, expectedSha: sha12(r.block), expectedSha256: sha256(r.block), ownKind: own.kind };
        rows.push({ key, id, cue: r.cue, why: r.why, blockChars: r.block.length, sha: r.block ? sha12(r.block) : '-', ageS, ownKind: own.kind });
        if (r.block) {
            gated[key] = { hour, id, kind: 'roster', chain: TL.items.find((i) => i.id === id)?.chain ?? null, cue: r.cue, current, block: r.block, blockSha: sha12(r.block), blockSha256: sha256(r.block), userA: p.user, userB: insertBlock(p.user, r.block), system: p.system };
        }
    }

    // D1-D3: the true parent was never dispatched, so the previous dispatched question stands in (design 2 section 3b).
    const dcases = [];
    for (const d of DROPPED) {
        const key = `${hour}:${d.key}`;
        try {
            const p = PROMPTS[d.id];
            const tl = TL.items.find((i) => i.id === d.id);
            const { current, promptLines } = interviewerLines(p.user);
            const idx = ownIndex(dispatches, Date.parse(p.at), current, key);
            const parentIdx = idx - 1, standInIdx = idx - 2;
            if (standInIdx < 0) throw new Error('no stand-in before the true parent');
            if (!sameAnchor(dispatches[parentIdx].text, rosterQ(tl.chain))) throw new Error(`the dispatch before it is not ${tl.chain}`);
            const gapS = Math.round((dispatches[idx].at - dispatches[standInIdx].at) / 1000);
            if (gapS <= 180) throw new Error(`stand-in dispatched ${gapS} s before; its preview would be present (needs > 180 s)`);
            const skip = new Set([parentIdx]);
            const { ledger } = rebuildLedger(dispatches, idx, skip);
            if (ledger[ledger.length - 1]?.text !== dispatches[standInIdx].text) throw new Error('the newest entry without the parent is not the stand-in');
            const turnId = ownTurnId(dispatches, idx, skip);
            const input = { question: current, turnId, supersede: dispatches[idx].kind === 'supersede', ledger, promptLines };
            const r = buildEarlierQuestion(input);
            const userA = withoutPreview(p.user, key);
            const standInId = TL.items.find((i) => sameAnchor(i.q, dispatches[standInIdx].text))?.id ?? '?';
            if (!r.block) throw new Error(`the reference returns '' (${r.why})`);
            const userB = insertBlock(userA, r.block);
            gated[key] = { hour, id: d.key, kind: 'dropped', rosterId: d.id, chain: tl.chain, standInParent: standInId, cue: r.cue, current, block: r.block, blockSha: sha12(r.block), blockSha256: sha256(r.block), userA, userB, system: p.system };
            parity[key] = { hour, id: d.key, kind: 'dropped', rosterId: d.id, ...input, expectedCue: r.cue, expectedBlock: r.block, expectedSha: sha12(r.block), expectedSha256: sha256(r.block), ownKind: dispatches[idx].kind };
            dcases.push({ key, rosterId: d.id, standInId, gapS, cue: r.cue, blockChars: r.block.length, sha: sha12(r.block), userAChars: p.user.length, userA2Chars: userA.length, ok: true });
        } catch (e) { dcases.push({ key, rosterId: d.id, ok: false, why: e.message }); }
    }
    return { dispatches, gated, parity, rows, dcases, PROMPTS };
}

const REGISTERED_SECTION3 = { gated: ['S1Q04F', 'S1Q06F', 'S2Q05F', 'S2Q08F'], cueSilentInPrompt: ['S1Q08', 'S2Q08', 'S2Q09F', 'S2Q01F'] };   // registration section 3 (expected from design 2's reports)

// ── CLI ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    fs.mkdirSync(R_DIR, { recursive: true });
    console.log('=== m5: the ledger rebuild refuses a corrupted replaces= (synthetic dispatch lines) ===');
    const st = selfTestReplaces();
    for (const [name, ok] of st) console.log(`${ok ? 'OK  ' : 'BAD '} ${name}`);
    if (st.some(([, ok]) => !ok)) { console.log('SELF-TEST FAILED'); process.exit(1); }

    const hours = Object.keys(HOURS);
    const all = {};
    for (const hour of hours) {
        const res = await reportHour(hour);
        all[hour] = res;
        const sup = res.dispatches.map((d, i) => [d, i]).filter(([d]) => d.kind === 'supersede');
        console.log(`\n=== ${hour.toUpperCase()} (${HOURS[hour]}): ${res.dispatches.length} dispatch lines (${res.dispatches.filter((d) => d.kind === 'answer').length} answer / ${sup.length} supersede), ${Object.keys(res.PROMPTS).length} captured ids ===`);
        // m5 on the real hour: every real supersede line, corrupted, must refuse
        for (const [, i] of sup) {
            const bad = res.dispatches.map((x, j) => (j === i ? { ...x, replaces: `${x.replaces} CORRUPTED` } : x));
            let refused = false; try { rebuildLedger(bad, res.dispatches.length); } catch { refused = true; }
            console.log(`${refused ? 'OK  ' : 'BAD '} ${hour}: the real supersede line ${i} with a corrupted replaces= is refused`);
            if (!refused) process.exit(1);
        }
        console.log('id | own dispatch | cue | why | block chars | sha12 | parent age s');
        for (const r of res.rows) console.log(`${r.id} | ${r.ownKind} | ${r.cue} | ${r.why || 'BLOCK'} | ${r.blockChars} | ${r.sha} | ${r.ageS ?? '-'}`);
        const gatedIds = res.rows.filter((r) => r.blockChars).map((r) => r.id);
        const cueSilent = res.rows.filter((r) => r.cue !== 'none' && !r.blockChars);
        console.log(`\nGATED IDS WITH A BLOCK (${gatedIds.length}): ${gatedIds.join(' ') || 'none'}`);
        console.log(`cue fired, block '' (id:why): ${cueSilent.map((r) => `${r.id}:${r.why}`).join(' ') || 'none'}`);
        console.log(`ids with no cue: ${res.rows.filter((r) => r.cue === 'none').length}; ids where the own dispatch is a supersede: ${res.rows.filter((r) => r.ownKind === 'supersede').map((r) => r.id).join(' ') || 'none'}`);
        if (hour !== 's50k') {
            const sameGated = JSON.stringify(gatedIds) === JSON.stringify(REGISTERED_SECTION3.gated);
            const silentIds = cueSilent.map((r) => r.id);
            const sameSilent = REGISTERED_SECTION3.cueSilentInPrompt.every((x) => silentIds.includes(x));
            console.log(`registration section 3 expectation (gated ${REGISTERED_SECTION3.gated.join(' ')}; '' with cue ${REGISTERED_SECTION3.cueSilentInPrompt.join(' ')}): gated set ${sameGated ? 'MATCHES' : 'DIFFERS'}; cue-silent set ${sameSilent ? 'MATCHES (all four are cue-silent)' : 'DIFFERS'}`);
        }
        console.log('D-cases:');
        for (const d of res.dcases) console.log(d.ok ? `  ${d.key} = ${d.rosterId}, stand-in ${d.standInId} (${d.gapS} s earlier), cue ${d.cue}, block ${d.blockChars} chars sha12 ${d.sha}, userA ${d.userAChars} -> ${d.userA2Chars} chars` : `  ${d.key} = ${d.rosterId}: REFUSED (${d.why})`);
        fs.writeFileSync(path.join(R_DIR, `${hour}-gated-turn.json`), JSON.stringify(res.gated, null, 1));
        fs.writeFileSync(path.join(R_DIR, `turn-parity-${hour}.json`), JSON.stringify(res.parity, null, 1));
        const withBlock = Object.values(res.parity).filter((p) => p.expectedBlock).length;
        console.log(`wrote R/${hour}-gated-turn.json (${Object.keys(res.gated).length} items) and R/turn-parity-${hour}.json (${Object.keys(res.parity).length} entries: ${withBlock} with a block, ${Object.keys(res.parity).length - withBlock} empty)`);
    }

    // s50k's userA overlap with s50m / s50l (I3): ids and booleans only, byte comparison in memory.
    console.log('\n=== s50k userA overlap with s50m / s50l (ids; identical = byte-identical captured user prompt; same pinned = same pinned question text) ===');
    for (const other of ['s50m', 's50l']) {
        const idsK = Object.keys(all.s50k.PROMPTS);
        const ident = idsK.filter((id) => all[other].PROMPTS[id] && all[other].PROMPTS[id].user === all.s50k.PROMPTS[id].user);
        const samePinned = idsK.filter((id) => all[other].PROMPTS[id] && interviewerLines(all[other].PROMPTS[id].user).current === interviewerLines(all.s50k.PROMPTS[id].user).current);
        const gatedK = Object.values(all.s50k.gated).filter((g) => g.kind === 'roster').map((g) => g.id);
        console.log(`vs ${other}: userA byte-identical ${ident.length}/${idsK.length} [${ident.join(' ') || 'none'}]; same pinned text ${samePinned.length}/${idsK.length}; s50k gated ids: ${gatedK.map((id) => `${id}{userA identical: ${ident.includes(id)}, same pinned: ${samePinned.includes(id)}}`).join(' ')}`);
    }
    console.log('\n=== GATED LIST (key, kind, cue, sha12, block chars, added chars incl. separator) ===');
    for (const hour of hours) for (const [k, g] of Object.entries(all[hour].gated)) console.log(`${k}\t${g.kind}\t${g.cue}\t${g.blockSha}\t${g.block.length}\t${g.userB.length - g.userA.length}`);
}
