SPEC: PASS
QUALITY: APPROVE

# Task 4 review (eac6265 on build/earlier-question) — SessionTracker question ledger

Reviewer: Opus, 2026-10-05. Read-only on WT.

## Evidence
- `git show eac6265` (from the shared object store): numstat `+40/-0` test, `+22/-0` SessionTracker.ts. Zero removed lines, so nothing existing was reformatted or touched; line endings unchanged.
- WT `electron/SessionTracker.ts` is byte-equal to `eac6265:electron/SessionTracker.ts` (cmp), and eac6265 is the branch head. The package diff matches the commit.
- Tests re-run (cwd eq-tmp, `--root` WT): `Test Files 2 passed (2)`, `Tests 10 passed (10)` (askedQuestions 5/5, existing SessionTracker.test.ts 5/5).
- Electron tsc list in task-4-tsc-electron.txt = the six baseline errors; none in SessionTracker.ts.

## Spec compliance (§3.1, plan Task 4)
- Shape `{ text, turnId: number | null, seq }`, newest last: via `AskedQuestion` from Task 2. PASS.
- Depth 3: `recordAsked` slices `-LEDGER_DEPTH` (=3); test q1..q5 -> q3,q4,q5. PASS.
- Remove-and-push for a held turn id with a fresh seq: test asserts `[other seq 2, head tail seq 3]`. PASS.
- Snapshot immutability: `recordAsked` never mutates its input (spread + slice); the field is `readonly AskedQuestion[]`; snapshot test passes (and the implementer's in-place-push mutant failed it). PASS.
- `reset()` clears ledger AND seq: the two lines sit in `reset()` (after its `recentInterviewerBuffer = []`, line 511), not in `clearCodingQuestion` (:170, untouched). Test asserts empty then `seq: 1`. PASS.
- No effect on the 120 s window or other behaviour: `contextItems`, `contextWindowDuration`, `getContext`, `addTranscript`, `addAssistantMessage` untouched; the only new state is two private fields read by nobody else yet. Existing suite green. PASS.
- Blank text writes nothing and does not consume a seq (identity check on `recordAsked`'s same-reference return). Matches the spec row "settled null -> nothing".
- Import adds no cycle: earlierQuestion -> earlierQuestionGate, services/questionReconcile -> questionShape; none imports SessionTracker.

## Findings (none blocking)
1. Minor (test gap): the `if (next === this.askedQuestions) return;` branch is not exercised in this file. A mutant dropping it would still write nothing for blank text (recordAsked returns the same ledger) but would advance `askedSeq`, leaving seq gaps. Functionally harmless (v1 orders by array position, never by seq), and the blank/null rule itself is covered in Task 2. Optional: one test `recordAskedQuestion('  ', 1)` then a real write expects `seq: 1`.
2. Nit: `SessionTracker.askedQuestions.test.ts` has no trailing newline; `afterEach(() => vi.restoreAllMocks())` restores nothing (no mocks). Both verbatim from the plan; leave.
3. Note: `getAskedQuestions()` returns the live internal reference; immutability is by construction (readonly type + recordAsked always allocates), which the snapshot test pins. Acceptable; a runtime freeze would be gold-plating.

## Not shown
- I did not run my own mutants (WT is read-only for this review); test strength relies on the implementer's four recorded mutants (M1–M4, all caught) plus reading the assertions, which compare whole objects including seq.
- Root tsc not re-run by me (report: exit 0).
- No caller writes the ledger yet (Task 6), so the "written at dispatch / every pinned call" rows are not testable here.
