# Q4 overlay auto-scroll toggle

Branch feat/overlay-autoscroll-toggle (from fix/short-followup-dedup 3737daf), commit 75c16d93.

RED (before implementation): 3 of 3 failed in src/components/NativelyInterface.autoscroll.test.tsx
- `Unable to find an accessible element with the role "button" and name "Auto-scroll"` (all three tests)

GREEN: autoscroll test 3/3; src/components 6 files, 23 tests; full vitest 1602 passed, 9 skipped, 1 file failed
(electron/test/golden/interview60.prompts.test.ts: missing dist-electron/.../promptCapture.js, unbuilt, pre-existing, unrelated).
tsc root: 0 errors. tsc -p electron/tsconfig.json: 6 errors (= baseline).

Where: NativelyInterface.tsx input chrome row, after the Mouse Passthrough toggle (lucide ArrowDownToLine, w-7 h-7,
sky-400 when on). aria-label "Auto-scroll", aria-pressed, title "Auto-scroll on/off". Click writes
natively_auto_scroll and dispatches window 'storage' (the event Settings uses). The ON jump reuses the existing
autoScroll effect (no new scroll code). Test stubs getKeybinds to [] (router test's stub leaves an unhandled error).

Not exercised: real Electron/visual look and fit of the row at the overlay's narrowest width; SettingsOverlay
reacting live (it listens to 'storage', not asserted in a test); a real tooltip render; the full suite's
interview60.prompts failure was not checked against a clean baseline run (cause is the missing build).
