# Q4 review: overlay auto-scroll toggle (75c16d93, feat/overlay-autoscroll-toggle, parent 3737daf)

Verdict: APPROVE (no blocking findings). Static review only: no app run, no tests run by the reviewer.

## Request checklist
| Must | Status | Where |
|---|---|---|
| Reuse `natively_auto_scroll`, no new key | yes | NativelyInterface.tsx:3024 |
| Same sync mechanism as Settings | yes: setItem + `window.dispatchEvent(new Event('storage'))`, the same pair SettingsOverlay.tsx:1576-1577 uses | :3024-3025 |
| aria-label "Auto-scroll", aria-pressed | yes | :3018-3019 |
| Toggling on jumps to newest once | yes, via the existing effect (:188-192, deps `[messages, autoScroll]`); no new scroll code | |
| No answer/dispatch change | yes: diff touches only the import and the button JSX | |
| No new chrome row | yes: a 7x7 button inside the existing input chrome row, after the passthrough toggle | :3015-3039 |
| Match button style | yes: classes and `appearance.iconStyle` copied from the passthrough toggle (:2993-3012) | |

## Hunt results
1. Settings live update, overlay -> Settings. Settings is mounted in a separate settings window (App.tsx:531; main.ts settingsWindowHelper). The synthetic `dispatchEvent` reaches only the overlay's own document, so it does NOT reach Settings. What reaches Settings is Chromium's native cross-document StorageEvent from `localStorage.setItem` (same origin/partition), which SettingsOverlay.tsx:762-768 listens to. The existing Settings -> overlay direction depends on exactly the same native event (Settings' own synthetic dispatch can't reach the overlay window either), so the new direction is symmetric with a path that already ships. Not live-verified by anyone; the report says so. Residual risk, not a defect.
2. The synthetic event in the overlay re-runs the overlay's own storage handlers (auto-scroll :175-182, transcript :166-172). Both re-read their keys and set the same value. Harmless.
3. Focus/clicks vs passthrough/stealth: no new behaviour. Passthrough makes the whole overlay window ignore the mouse (FadeManager/WindowHelper interaction policy), so the new button is unreachable exactly like its neighbours; Settings stays the way to flip it then. Clicking it takes focus from the chat input, same as the passthrough and settings buttons. Minor, pre-existing pattern: a focused button toggles again on Space/Enter.
4. Scroll jumps while streaming with OFF: none from the effect, since it returns early on `!autoScroll` (:189). Toggling OFF re-runs the effect, which returns immediately. Toggling ON with 0 messages does nothing.
   Pre-existing, outside this diff: five unconditional `scrollIntoView({behavior:'smooth'})` calls after the USER sends a message (:1278, :1393, :1428, :1649, :1753) ignore the setting. They fire on user sends, not on streamed answers. With a visible OFF toggle on the overlay, a user may now notice them. Mention only, do not fix here.
5. Do the tests fail without the change? RED is reported (3/3 failed, all on the missing button lookup), so RED shows only that the button was missing. Each assertion is still discriminating: test 2's `seen` count of 1 catches a missing dispatch; test 3 fires `onLiveQuestion`, which really appends a message via applyLiveQuestion (:863), so "not called while OFF" is not vacuous, and the ON jump plus "no further scroll on OFF" are both checked. Not asserted: scrolling while ON during streaming (pre-existing effect); the cross-window path (jsdom has one document).

## Not shown
- Real Electron run: the visual fit of the row at the narrowest overlay width, the tooltip, and overlay <-> Settings sync across the two windows.
- Whether the settings window shares the overlay's origin/partition in a packaged build (dev and prod load URLs may differ). It ships today for the reverse direction, so it is likely the same.
