// Deterministic tests of earlierQuestion.ref.mjs: every row of spec 3.6 that a PURE reference can hold, as a case with
// INVENTED sentences only (PREREGISTER-turn-followup.md section 1, m4), plus the gate's 19/10 calibration set re-run.
// Fixture inputs are stored in the spec 3.5 buildEarlierQuestion shape (question, turnId, supersede, ledger[{text,turnId,seq}],
// promptLines) so the app test feeds them with no translation layer (I6); `CASES` is exported for that.
// Rows a pure reference cannot hold (junk flag refuses to start, coding framing drops the block, a ledger-write exception
// leaves the answer untouched, the hedge gets the same bytes, reset() clears) are BUILD tests (registration section 9).
//
//   node earlierQuestion.ref.test.mjs            prints one line per case and a summary line; exit 1 on any failure
//   EQ_REF=./earlierQuestion.mutant.mjs node earlierQuestion.ref.test.mjs     (used by ref-mutate.mjs)
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REF_URL = process.env.EQ_REF ? pathToFileURL(path.resolve(process.cwd(), process.env.EQ_REF)).href : pathToFileURL(path.join(HERE, 'earlierQuestion.ref.mjs')).href;
const R = await import(REF_URL);
const { buildEarlierQuestion, recordAsked, formatBlock, clip, insertBlock, gate, LABEL, LEDGER_DEPTH } = R;

// ── invented sentences (none is a scenario50 or holdout sentence) ───────────────────────────────────────────────────
const P_CACHE = 'Which eviction policy would you pick for the session cache, so that hot users stay resident?';   // parent with the frame word "that"
const F_WHY = 'Why that one?';
const P_QUEUE = 'How would you size the worker pool that drains the invoice queue during month end?';
const F_PRON = 'What happens to it when a worker crashes halfway?';
const P_SHARD = 'Describe how you would shard the telemetry store by tenant.';
const Q_AUDIT = 'Explain how you would audit access to the telemetry store.';
const P_SAME = 'How would you keep the same shard layout with twice the tenants?';          // a parent that itself carries a cue ("the same")
const P_REF = 'How would your design for the invoice queue survive a regional outage?';     // "your design": the reference cue anywhere in the text
const F_THOSE ='How would you rebalance those shards after a tenant doubles in size?';
const P_LONG = `Design the ingestion path for a fleet of ${'regional '.repeat(20)}edge collectors that batch readings, sign each batch, and upload them to a central lake; then say how you would verify, end to end, that no batch was lost, duplicated or reordered before the nightly roll-up reads it, while preserving the per-device ordering guarantee.`;

const L = (...texts) => texts.map((text, i) => ({ text, turnId: i + 1, seq: i + 1 }));      // a ledger of turns 1..n
const block = (parent) => `${LABEL}\n- ${parent}`;

/** Each case: { row, input (spec 3.5 shape), expect: { block, why?, cue? } , check? (extra assertion on the result) }. */
export const CASES = [
    { row: 'ledger empty (first question)', input: { question: F_PRON, turnId: 2, ledger: [], promptLines: [] }, expect: { block: '', why: 'no-parent' } },
    { row: 'settled null (manual with nothing dispatched)', input: { question: null, turnId: null, ledger: L(P_SHARD), promptLines: [] }, expect: { block: '', why: 'no-question' } },
    { row: 'settled blank', input: { question: '   ', turnId: 3, ledger: L(P_SHARD), promptLines: [] }, expect: { block: '', why: 'no-question' } },
    { row: 'flag off', input: { enabled: false, question: F_THOSE, turnId: 2, ledger: L(P_SHARD), promptLines: [] }, expect: { block: '', why: 'off', cue: 'none' } },
    { row: 'evicted parent + cue: the block (control for every silent row below)', input: { question: F_THOSE, turnId: 2, ledger: L(P_SHARD), promptLines: [] }, expect: { block: block(P_SHARD), why: '' } },
    { row: 'parent in the prompt (short gap)', input: { question: F_THOSE, turnId: 2, ledger: L(P_SHARD), promptLines: [P_SHARD] }, expect: { block: '', why: 'parent-in-prompt' } },
    { row: 'parent in the prompt, older question absent: the grandparent is never read (S2Q09F shape)', input: { question: 'How would your design change if the audit trail had to be tamper evident?', turnId: 3, ledger: L(P_SHARD, P_QUEUE), promptLines: [P_QUEUE] }, expect: { block: '', why: 'parent-in-prompt' } },
    { row: 'parent contained in the pinned line (Live merge)', input: { question: `${P_SHARD} Then how would your design change if a tenant doubled in size?`, turnId: 2, ledger: L(P_SHARD), promptLines: [] }, expect: { block: '', why: 'parent-in-pinned', cue: 'reference' } },
    { row: 're-ask of the parent (same text, earlier copy evicted)', input: { question: P_SAME, turnId: 3, ledger: L(P_SAME), promptLines: [] }, expect: { block: '', why: 'parent-in-pinned' }, mustHaveCue: true },
    { row: 'quick follow-up < 60 s sharing a frame word ("Why that one?"), parent in the prompt', input: { question: F_WHY, turnId: 2, ledger: L(P_CACHE), promptLines: [P_CACHE] }, expect: { block: '', why: 'parent-in-prompt' } },
    { row: 'quick follow-up, its 90 s control: identical inputs, identical output (the reference holds no clock)', input: { question: F_WHY, turnId: 2, ledger: L(P_CACHE), promptLines: [P_CACHE] }, expect: { block: '', why: 'parent-in-prompt' } },
    { row: 'supersede, continuation of the same question', input: { question: `${P_QUEUE} Include the retry policy.`, turnId: 4, supersede: true, ledger: [{ text: P_QUEUE, turnId: 4, seq: 4 }], promptLines: [] }, expect: { block: '', why: 'supersede' } },
    { row: 'two questions in one turn: supersede of a different question, older parent absent', input: { question: 'And how would you rebalance those shards afterwards?', turnId: 5, supersede: true, ledger: [{ text: P_SHARD, turnId: 4, seq: 4 }, { text: Q_AUDIT, turnId: 5, seq: 5 }], promptLines: [] }, expect: { block: '', why: 'supersede', cue: 'leading' } },
    { row: 'two questions in one turn, control without supersede: the same inputs would add the previous turn', input: { question: 'And how would you rebalance those shards afterwards?', turnId: 5, supersede: false, ledger: [{ text: P_SHARD, turnId: 4, seq: 4 }, { text: Q_AUDIT, turnId: 5, seq: 5 }], promptLines: [] }, expect: { block: block(Q_AUDIT), why: '' } },
    { row: 'R21 supersede re-entering as answer, head dropped by the deduper (duplicate of an answered question still in the prompt)', input: { question: `${P_REF} Include the retry policy.`, turnId: 6, supersede: false, ledger: L(P_REF), promptLines: [P_REF] }, expect: { block: '', why: 'parent-in-pinned', cue: 'reference' },
      ledgerWrite: { text: `${P_REF} Include the retry policy.`, turnId: 6, seq: 6, before: L(P_REF), after: [...L(P_REF), { text: `${P_REF} Include the retry policy.`, turnId: 6, seq: 6 }] } },
    { row: 'R21 supersede, head dropped by isFragment (Live-sourced, under 4 words): the normal gated block, parent = the previous turn', input: { question: 'Right so. How would you rebalance those shards after a tenant doubles in size?', turnId: 7, supersede: false, ledger: L(P_QUEUE, P_SHARD), promptLines: [P_QUEUE] }, expect: { block: block(P_SHARD), why: '' },
      ledgerWrite: { text: 'Right so. How would you rebalance those shards after a tenant doubles in size?', turnId: 7, seq: 7, before: L(P_QUEUE, P_SHARD), after: [...L(P_QUEUE, P_SHARD), { text: 'Right so. How would you rebalance those shards after a tenant doubles in size?', turnId: 7, seq: 7 }] } },
    { row: 'supersede after an answer-now re-ran the head (turnId null entry newer than the head): remove + push newest',
      input: { question: `${P_QUEUE} Include the retry policy.`, turnId: 4, supersede: true, ledger: [{ text: P_QUEUE, turnId: 4, seq: 4 }, { text: P_QUEUE, turnId: null, seq: 5 }], promptLines: [] }, expect: { block: '', why: 'supersede' },
      ledgerWrite: { text: `${P_QUEUE} Include the retry policy.`, turnId: 4, seq: 6, before: [{ text: P_QUEUE, turnId: 4, seq: 4 }, { text: P_QUEUE, turnId: null, seq: 5 }], after: [{ text: P_QUEUE, turnId: null, seq: 5 }, { text: `${P_QUEUE} Include the retry policy.`, turnId: 4, seq: 6 }] } },
    { row: 'double dispatch past the deduper: duplicate entry, parent unchanged', input: { question: F_THOSE, turnId: 9, ledger: [{ text: P_SHARD, turnId: 7, seq: 7 }, { text: P_SHARD, turnId: 8, seq: 8 }], promptLines: [] }, expect: { block: block(P_SHARD), why: '' },
      ledgerWrite: { text: P_SHARD, turnId: 8, seq: 8, before: L(P_SHARD), after: [{ text: P_SHARD, turnId: 1, seq: 1 }, { text: P_SHARD, turnId: 8, seq: 8 }] } },
    { row: 'chip click / answer-now / manual in auto mode (turnId null): ledger written, block ""', input: { question: F_THOSE, turnId: null, ledger: L(P_SHARD), promptLines: [] }, expect: { block: '', why: 'no-turn', cue: 'pronoun' },
      ledgerWrite: { text: F_THOSE, turnId: null, seq: 2, before: L(P_SHARD), after: [...L(P_SHARD), { text: F_THOSE, turnId: null, seq: 2 }] } },
    { row: 'late Live echo of Q dispatched at 61 s (before the next question R): harmless duplicate parent', input: { question: F_PRON, turnId: 12, ledger: [{ text: P_QUEUE, turnId: 10, seq: 10 }, { text: P_QUEUE, turnId: 11, seq: 11 }], promptLines: [] }, expect: { block: block(P_QUEUE), why: '' } },
    { row: 'late Live echo of Q at 76 s AFTER the next question R: the WRONG referent, bounded by the label (ledger [Q, R, Q-echo])', input: { question: F_THOSE, turnId: 13, ledger: [{ text: P_QUEUE, turnId: 10, seq: 10 }, { text: P_SHARD, turnId: 11, seq: 11 }, { text: P_QUEUE, turnId: 12, seq: 12 }], promptLines: [P_SHARD] }, expect: { block: block(P_QUEUE), why: '' },
      wrongReferent: { shown: P_QUEUE, truth: P_SHARD } },
    { row: 'never-dispatched parent: the previous DISPATCHED question becomes the referent (measured by the D-cases)', input: { question: F_THOSE, turnId: 3, ledger: L(P_QUEUE), promptLines: [] }, expect: { block: block(P_QUEUE), why: '' } },
    { row: 'suggest/off mode: click Q1, skip Q2 and Q3, click a follow-up chip: ledger [Q1], turnId null -> ""', input: { question: F_PRON, turnId: null, ledger: [{ text: P_QUEUE, turnId: null, seq: 1 }], promptLines: [] }, expect: { block: '', why: 'no-turn' },
      ledgerWrite: { text: F_PRON, turnId: null, seq: 2, before: [{ text: P_QUEUE, turnId: null, seq: 1 }], after: [{ text: P_QUEUE, turnId: null, seq: 1 }, { text: F_PRON, turnId: null, seq: 2 }] } },
    { row: 'parent over 450 chars: head 150 + ellipsis + tail 299', input: { question: 'How would you test that end to end?', turnId: 2, ledger: L(P_LONG), promptLines: [] }, expect: { block: `${LABEL}\n- ${P_LONG.replace(/\s+/g, ' ').trim().slice(0, 150)}…${P_LONG.replace(/\s+/g, ' ').trim().slice(-299)}`, why: '' } },
    { row: 'parent present only as a tail fragment after the sparsify cut counts as present', input: { question: F_THOSE, turnId: 2, ledger: L(P_SHARD), promptLines: ['store by tenant.'] }, expect: { block: '', why: 'parent-in-prompt' } },
    { row: 'no cue: a standalone question gets nothing', input: { question: 'Describe how you would design a retention policy for audit logs.', turnId: 2, ledger: L(P_SHARD), promptLines: [] }, expect: { block: '', why: 'no-cue', cue: 'none' } },
    { row: 'blank parent text', input: { question: F_THOSE, turnId: 2, ledger: [{ text: '  ', turnId: 1, seq: 1 }], promptLines: [] }, expect: { block: '', why: 'no-parent' } },
    { row: 'exception in select (a null prompt line) -> "" and gate=error, never a throw', input: { question: F_THOSE, turnId: 2, ledger: L(P_SHARD), promptLines: [null] }, expect: { block: '', why: 'error', cue: 'none' } },
    { row: 'exception: ledger missing', input: { question: F_THOSE, turnId: 2, ledger: null, promptLines: [] }, expect: { block: '', why: 'error' } },
];

// ── runner ───────────────────────────────────────────────────────────────────────────────────────────────────────────
const results = [];
const test = (name, fn) => { try { fn(); results.push([name, true]); } catch (e) { results.push([name, false, e.message]); } };
const eq = (a, b, what) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${what}: got ${JSON.stringify(a).slice(0, 160)}, expected ${JSON.stringify(b).slice(0, 160)}`); };
const truthy = (v, what) => { if (!v) throw new Error(what); };

for (const c of CASES) {
    test(`3.6 row: ${c.row}`, () => {
        const r = buildEarlierQuestion(c.input);
        eq(r.block, c.expect.block, 'block');
        if (c.expect.why !== undefined) eq(r.why, c.expect.why, 'why');
        if (c.expect.cue !== undefined) eq(r.cue, c.expect.cue, 'cue');
        if (c.mustHaveCue) truthy(r.cue !== 'none', 'the gate should fire on a re-ask of a cue-bearing question');
        if (c.wrongReferent) { truthy(r.block.includes(c.wrongReferent.shown), 'shows the echoed question'); truthy(!r.block.includes(c.wrongReferent.truth), 'does not show the true parent (it is still in the prompt)'); }
        if (c.expect.block) {
            eq(r.block.split('\n').length, 2, 'a block is exactly two lines: the label and ONE parent line');
            eq(r.cue, gate(c.input.question).cue, 'a block reports the gate cue that fired');
            truthy(r.cue !== 'none', 'a block never carries cue none');
        }
        if (c.ledgerWrite) {
            const w = c.ledgerWrite;
            eq(recordAsked(w.before, { text: w.text, turnId: w.turnId, seq: w.seq }), w.after, 'ledger after the write');
        }
    });
}

// ── ledger rules (spec 3.1 table) ─────────────────────────────────────────────────────────────────────────────────
test('ledger: a settled call whose turnId the ledger does not hold pushes', () => eq(recordAsked(L(P_QUEUE), { text: P_SHARD, turnId: 9, seq: 9 }), [...L(P_QUEUE), { text: P_SHARD, turnId: 9, seq: 9 }], 'push'));
test('ledger: the 8 s supersede (turnId held) removes the head and pushes the merged text newest', () => {
    const before = [{ text: 'old', turnId: 1, seq: 1 }, { text: 'head', turnId: 2, seq: 2 }, { text: 'other', turnId: 3, seq: 3 }];
    eq(recordAsked(before, { text: 'head tail', turnId: 2, seq: 4 }), [{ text: 'old', turnId: 1, seq: 1 }, { text: 'other', turnId: 3, seq: 3 }, { text: 'head tail', turnId: 2, seq: 4 }], 'remove-and-push, not replace in place');
});
test('ledger: turnId null never removes (two null entries coexist)', () => eq(recordAsked([{ text: 'a', turnId: null, seq: 1 }], { text: 'a', turnId: null, seq: 2 }), [{ text: 'a', turnId: null, seq: 1 }, { text: 'a', turnId: null, seq: 2 }], 'null'));
test('ledger: no text dedup (a follow-up sharing a frame word does not replace its parent; review C1)', () => {
    const after = recordAsked(L(P_CACHE), { text: F_WHY, turnId: 2, seq: 2 });
    eq(after.map((e) => e.text), [P_CACHE, F_WHY], 'both kept');
    const next = buildEarlierQuestion({ question: 'What about the writes then, how do they reach it?', turnId: 3, ledger: after, promptLines: [] });
    eq(next.block, block(F_WHY), 'the next question gets the newest entry, the follow-up');
});
test('3.6 row: aborted or stalled parent is recorded (the write happens at dispatch, before any answer exists), so its follow-up gets it', () => {
    const afterDispatch = recordAsked([], { text: P_SHARD, turnId: 1, seq: 1 });                 // nothing else ever happens: the answer was aborted by a stall / supersede
    eq(afterDispatch.map((e) => e.text), [P_SHARD], 'recorded at dispatch');
    eq(buildEarlierQuestion({ question: F_THOSE, turnId: 2, ledger: afterDispatch, promptLines: [] }).block, block(P_SHARD), 'the follow-up gets the aborted parent');
});
test('ledger: depth is 3, oldest dropped', () => {
    let l = [];
    for (let i = 1; i <= 5; i++) l = recordAsked(l, { text: `q${i}`, turnId: i, seq: i });
    eq(l.map((e) => e.text), ['q3', 'q4', 'q5'], 'depth');
    eq(LEDGER_DEPTH, 3, 'LEDGER_DEPTH');
});
test('ledger: settled null / blank text writes nothing', () => { const l = L(P_QUEUE); truthy(recordAsked(l, { text: null, turnId: 2, seq: 2 }) === l && recordAsked(l, { text: '  ', turnId: 2, seq: 2 }) === l, 'unchanged'); });
test('ledger: flag off writes nothing', () => { const l = L(P_QUEUE); truthy(recordAsked(l, { text: P_SHARD, turnId: 2, seq: 2, enabled: false }) === l, 'unchanged'); });
test('ledger: the write does not mutate its input', () => { const l = Object.freeze(L(P_QUEUE).map(Object.freeze)); recordAsked(l, { text: P_SHARD, turnId: 1, seq: 9 }); recordAsked(l, { text: P_SHARD, turnId: 5, seq: 9 }); });

// ── label, clip, insertBlock ──────────────────────────────────────────────────────────────────────────────────────────
test('label: 125 chars, says asked earlier and context only and do not answer it again, not "answered"', () => {
    eq(LABEL.length, 125, 'label length');
    truthy(LABEL.includes('asked earlier') && LABEL.includes('context only') && LABEL.includes('do not answer it again'), 'three facts');
    truthy(!/answered/i.test(LABEL), 'must not say answered (the ledger holds aborted parents)');
});
test('clip: exactly 450 stays whole, 451 is cut to head 150 + ellipsis + tail 299 (length 450)', () => {
    const t450 = 'x'.repeat(450), t451 = `${'h'.repeat(150)}${'m'.repeat(152)}${'t'.repeat(149)}`;
    eq(clip(t450), t450, '450');
    const c = clip(t451);
    eq(c.length, 450, 'cut length');
    eq(c, `${'h'.repeat(150)}…${'m'.repeat(150)}${'t'.repeat(149)}`, 'slices');
});
test('clip: the tail keeps the referent of a long parent', () => truthy(clip(P_LONG).endsWith('per-device ordering guarantee.') && clip(P_LONG).startsWith('Design the ingestion path'), 'head names the task, tail keeps the constraint'));
test('clip: whitespace is collapsed before measuring', () => eq(clip('  a \n\n b\t c  '), 'a b c', 'ws'));
test('formatBlock: label, newline, dash, parent', () => eq(formatBlock('Why X?'), `${LABEL}\n- Why X?`, 'format'));
test('insertBlock: ${block}\\n\\n immediately before INTERVIEWER JUST SAID:\\n; "" block is identity; a missing marker throws', () => {
    const user = 'TRANSCRIPT\n\nPREVIOUS RESPONSES (Avoid Repetition):\n1. "x"\n\nINTERVIEWER JUST SAID:\n[INTERVIEWER]: q\n\nYOUR RESPONSE';
    const b = block('P');
    const out = insertBlock(user, b);
    eq(out, user.replace('INTERVIEWER JUST SAID:\n', `${b}\n\nINTERVIEWER JUST SAID:\n`), 'inserted');
    eq(out.length - user.length, b.length + 2, 'added chars');
    eq(insertBlock(user, ''), user, 'identity');
    let threw = false; try { insertBlock('no marker', b); } catch { threw = true; }
    truthy(threw, 'must throw');
});

// ── the gate: design 2's 19 must-fire / 10 must-not sentences re-run (scenario50 + invented), on the imported gate ─────────
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const { SCENARIO50 } = await import(pathToFileURL(`${MAIN}/electron/test/golden/scenario50.questions.mjs`).href);
const rosterQ = (id) => SCENARIO50.find((i) => i.id === id).q;
const SHOULD_FIRE = [
    ['leading', 'Now without a cache, how would you meet the same latency?'], ['pronoun', rosterQ('S1Q06F')], ['pronoun', rosterQ('S2Q06F')], ['pronoun', rosterQ('S2Q08F')],
    ['constraint', rosterQ('S1Q04F')], ['reference', rosterQ('S2Q09F')], ['leading', rosterQ('S3Q04F')], ['leading', rosterQ('S4Q09F')], ['short', 'Why?'],
    ['leading', 'And in production?'], ['pronoun', 'Does that scale?'], ['leading', 'What about Redis instead?'], ['leading', 'Okay, and if it fails?'],
    ['callback', 'Going back to the micro-batcher, how would you shard it?'], ['callback', 'You mentioned idempotency earlier. How do you enforce it?'],
    ['pronoun', 'Would that still hold under a network partition?'], ['leading', 'Same question, but for a write-heavy workload.'],
    ['pronoun', 'How would you keep the same latency budget with twice the traffic?'], ['leading', 'And what if it has to run on a single core?'],
];
const SHOULD_NOT_FIRE = [
    'Explain the CAP theorem.', 'What is a Kubernetes readiness probe?', 'In this scenario, what would you monitor first?', 'Design a URL shortener that handles a billion requests a day.',
    'Tell me about a time you disagreed with a manager.', 'Given an array of integers, return the indices of two numbers that add up to a target.', 'How would you ensure that a nightly job never runs twice?',
    'Walk me through how you would debug a memory leak in a Python service.', 'Design the next version of the churn platform, it has to support nightly scoring for 400,000 customers.', rosterQ('S4Q04F'),
];
test(`gate: ${SHOULD_FIRE.length} must-fire sentences fire with their cue`, () => { for (const [cue, q] of SHOULD_FIRE) { const g = gate(q); if (!g.fires || g.cue !== cue) throw new Error(`"${q.slice(0, 40)}" -> ${g.fires} ${g.cue}, expected ${cue}`); } });
test(`gate: ${SHOULD_NOT_FIRE.length} must-not sentences stay silent`, () => { for (const q of SHOULD_NOT_FIRE) if (gate(q).fires) throw new Error(`"${q.slice(0, 40)}" fired`); });
test('gate: the turn reference uses the imported gate (a cue-less question never gets a block)', () => eq(buildEarlierQuestion({ question: 'Explain the CAP theorem.', turnId: 2, ledger: L(P_SHARD), promptLines: [] }).why, 'no-cue', 'no-cue'));

// ── summary ────────────────────────────────────────────────────────────────────────────────────────────────────────────
const bad = results.filter((r) => !r[1]);
if (process.env.EQ_QUIET !== '1') for (const [name, ok, msg] of results) console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${ok ? '' : `\n       ${msg}`}`);
console.log(`EARLIER-QUESTION REF TESTS: ${results.length - bad.length}/${results.length} passed${bad.length ? `, ${bad.length} FAILED` : ''}`);
process.exitCode = bad.length ? 1 : 0;
