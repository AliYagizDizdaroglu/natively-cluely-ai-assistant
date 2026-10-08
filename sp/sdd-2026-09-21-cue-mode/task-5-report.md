# Task 5 Report — Renderer: cues on the bubble and the `CueBlock` above the answer

## What I implemented

1. **`src/lib/answerMessages.ts`**
   - Added `cues?: string[]` to `AnswerMessage` (documented as "Cue mode: the key phrases the answer opened with, rendered above the text.").
   - Added a 5th optional parameter `cues?: string[]` to `applyAnswerToken`. A local `withCues = cues && cues.length ? { cues } : {}` is spread into all three message-construction sites (restart, append-to-streaming, fresh-append):
     - On a **restart** (`replace: true`), the new stream's cues (or none) are attached — the old message's cues never survive, consistent with the "restart is a NEW answer" rule already governing that branch (R23).
     - On an **append to an already-streaming bubble**, `withCues` is `{}` when the token carries no cues, so the spread of `...lastMsg` (which already carries `cues` from the first token) is left untouched — later tokens keep the cues already on the bubble without needing to re-supply them.
     - On a **fresh bubble** (nothing streaming), the first token's cues land directly.
   - `applyFinalAnswer` needed no change — it already delegates message construction entirely to the caller's `finalize()`, so whatever the caller's `finalize` spreads (including `cues`) survives untouched.

2. **`src/components/CueBlock.tsx`** (new) — a small presentational component: an `<ol>` of numbered `<li>` cues (index span + text span), returns `null` for an empty list. Matches the style/precedent of `MessageMetricsBar.tsx` (functional component, `Props` interface, `className = ''` default, theme-agnostic classes using the existing `overlay-text-*` tokens).

3. **`src/components/NativelyInterface.tsx`** — four minimal edits at the anchors the brief named:
   - Import `CueBlock` next to the `MessageMetricsBar` import.
   - Added `cues?: string[];` to `interface Message`, next to `isStreaming?: boolean;`.
   - The `onIntelligenceSuggestedAnswerToken` handler now passes `data.cues` as the 5th argument to `applyAnswerToken`.
   - Directly before `{renderMessageText(msg)}` in the message-bubble JSX, render `<CueBlock cues={msg.cues} .../>` guarded by `msg.role === 'system' && msg.cues && msg.cues.length > 0`, with a bottom border/margin (`mb-2 pb-2 border-b`, theme-aware) separating it from the answer prose below (layout B).

No changes were needed to `src/types/electron.d.ts` or `electron/preload.ts` — both already declare `cues?: string[]` on the token payload from Task 4.

## What I tested, and the results

Ran exactly the two files the brief names, together, before and after implementation:

`node node_modules/vitest/vitest.mjs run src/lib/answerMessages.test.ts src/components/CueBlock.test.tsx`

Final (GREEN) result: **2 test files passed, 25/25 tests passed**, output pristine (only the pre-existing, unrelated "CJS build of Vite's Node API is deprecated" notice, present on every vitest invocation in this repo regardless of the code under test).

## TDD evidence

### RED

Command: `node node_modules/vitest/vitest.mjs run src/lib/answerMessages.test.ts src/components/CueBlock.test.tsx`

Run immediately after appending the brief's test block to `answerMessages.test.ts` and creating `CueBlock.test.tsx` verbatim from the brief, before touching any implementation file.

Relevant output:
```
 ❯ src/components/CueBlock.test.tsx (0 test)
 ❯ src/lib/answerMessages.test.ts (23 tests | 2 failed)
   × cues on the answer bubble (cue mode, spec 2026-09-20 §6.8) > the first token of a new answer carries the cues onto the bubble it creates
     → expected { id: 'id-0', role: 'system', …(3) } to match object { text: 'Ten ', …(3) }
(2 matching properties omitted from actual)
   × cues on the answer bubble (cue mode, spec 2026-09-20 §6.8) > a supersede restart takes the new stream's cues, or drops the old ones when it has none
     → expected { id: 'a1', role: 'system', …(3) } to deeply equal { id: 'a1', role: 'system', …(4) }

FAIL src/components/CueBlock.test.tsx [ src/components/CueBlock.test.tsx ]
Error: Failed to resolve import "./CueBlock" from "src/components/CueBlock.test.tsx". Does the file exist?

 Test Files  2 failed (2)
      Tests  2 failed | 21 passed (23)
```

Why this failure was expected: `applyAnswerToken` did not yet accept a `cues` argument, so the two new tests that assert `cues` lands on the produced message failed exactly as predicted ("cues never lands on the message"); `CueBlock.tsx` did not exist yet, so its test file failed to even resolve the import ("`./CueBlock` cannot be resolved") — 0 tests collected from that file. The other two new cue tests ("a following token without cues keeps the cues already on the bubble" and "applyFinalAnswer keeps the cues…") passed even before implementation, because they only exercise code paths that already preserve arbitrary extra properties via object spread (`{...lastMsg, ...}` for the former, the test's own caller-supplied `finalize` for the latter) — this is consistent with the brief's design, not a test bug.

### GREEN

Command: `node node_modules/vitest/vitest.mjs run src/lib/answerMessages.test.ts src/components/CueBlock.test.tsx`

Run after implementing `answerMessages.ts` and `CueBlock.tsx` and wiring `NativelyInterface.tsx`.

Output:
```
 ✓ src/lib/answerMessages.test.ts (23 tests) 19ms
 ✓ src/components/CueBlock.test.tsx (2 tests) 203ms

 Test Files  2 passed (2)
      Tests  25 passed (25)
```

## Renderer tsc error count

- Before any edit: `node node_modules/typescript/bin/tsc --noEmit 2>&1 | grep -c "error TS"` → **0**
- After implementation: same command → **0** (full output empty — no `error TS` lines at all)

Count did not grow (0 → 0).

## Files changed

- `src/lib/answerMessages.ts` — modified (`AnswerMessage.cues`, `applyAnswerToken` cues parameter/threading)
- `src/lib/answerMessages.test.ts` — modified (appended the brief's cue-mode `describe` block verbatim)
- `src/components/CueBlock.tsx` — created
- `src/components/CueBlock.test.tsx` — created (verbatim from the brief)
- `src/components/NativelyInterface.tsx` — modified (import, `Message.cues`, token-handler arg, `CueBlock` render before `renderMessageText(msg)`)

Commit: `51424e4` — "feat(cues): render the cue block above the answer" (trailer `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` present). `git status --porcelain` is clean after the commit; nothing outside these five files was staged or touched (confirmed the pre-existing tracked `src/components/NativelyInterface.tsx.orig` was left untouched).

## Self-review findings

- **Completeness**: all four interface points from the brief (`AnswerMessage`, `applyAnswerToken`, `CueBlock`, `NativelyInterface` wiring) implemented exactly as specified, at the named anchors. Edge cases — token without cues, supersede with/without cues, finalize preserving cues, empty-cues rendering nothing — are each covered by a named test, and all pass.
- **Quality**: `CueBlock` follows the existing `MessageMetricsBar` precedent (functional component, `Props` interface, `className` default, theme tokens rather than hardcoded colors). The `withCues` helper in `applyAnswerToken` keeps the three construction sites (restart/append/fresh) each a single expression instead of three near-duplicate `if (cues) {...} else {...}` blocks.
- **Discipline**: `git diff` against the brief's literal code blocks is byte-for-byte identical for all three implementation snippets ((a), (b), (c)) and both test files. Only the five named files are staged; nothing else in the working tree was touched (verified via `git status --porcelain` before and after). No new dependencies were added or needed — `@testing-library/react` and the `jsdom` vitest environment were already present and already used by five other `.test.tsx` files, and the brief's tests use only plain DOM assertions (no `jest-dom` matchers), so no additional setup was required.
- **Testing**: tests assert real DOM output (`getAllByRole('listitem')`, `querySelector`, `textContent`) and real object shape (`toEqual`/`toMatchObject` on the function's return value), not mocks. RED was observed for the right reason before implementing (see above) and GREEN after. Test output is pristine — no console warnings/errors beyond the pre-existing, tool-level Vite CJS deprecation notice that appears on every vitest run in this repo.

## Issues or concerns

None. The task was self-contained, the brief's anchors matched the file content exactly (no drift), and both the electron IPC contract (`cues?: string[]`) and the final-answer handler's `...streaming` spread (which I did not need to touch) were verified by reading the actual code rather than assumed.
