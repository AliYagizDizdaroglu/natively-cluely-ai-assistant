# Stealth Mode — Design

**Status:** Draft
**Date:** 2026-05-26

## Problem

In live interviews where the candidate shares their screen, looking at the Natively overlay while typing in the IDE produces obvious eye movement on the interviewer's webcam view. Even with the screen-share undetectability feature hiding the overlay from the captured stream, the *physical* glance toward a fixed region of the screen is a tell.

The candidate doesn't actually need to read the overlay while typing — only between thoughts. The overlay only needs to be legible during pauses.

## Solution

A "Stealth" toggle that, while active, fades the overlay to near-invisible whenever the user is typing outside of our window and restores it shortly after typing stops. The faded overlay is also click-through, so it does not interfere with the IDE underneath.

## Behavior

**Activation**
- A chip labeled "Stealth" sits in the TopPill next to the existing ContextToggle.
- Click toggles on/off. The on/off state is persisted across sessions.
- The chip visually reflects two pieces of state: whether Stealth is *enabled*, and (when enabled) whether the overlay is currently *faded*.

**While enabled**
- A global keyboard listener watches for keydown events from any application.
- Key events are ignored if Natively's own window currently has keyboard focus — typing in our own input field never triggers a fade.
- On a qualifying external keypress:
  - Window opacity drops to **0.10**.
  - Window becomes click-through via `setIgnoreMouseEvents(true, { forward: true })`.
- **800 ms** after the most recent qualifying keypress (debounced):
  - Opacity restores to **1.0**.
  - Click-through state restores to whatever it was *before* the fade began (preserving any user-set mouse-passthrough preference).

**While disabled**
- The global keyboard listener is fully unsubscribed (no background CPU cost).
- Window opacity and click-through revert immediately to their pre-Stealth values.

## Architecture

Three small units, each independently testable.

### 1. `electron/services/StealthModeManager.ts`

Owns all main-process state for the feature.

**Responsibilities**
- Subscribe / unsubscribe `uiohook-napi` keydown events.
- Track "is currently faded" with a debounce timer (800 ms).
- On keydown: check if our window is focused (`BrowserWindow.getFocusedWindow()?.id === overlayWindow.id`). If focused, return — do not fade.
- On qualifying keydown: if not already faded, snapshot the current opacity and ignoreMouseEvents state, then apply faded state. Reset the debounce timer.
- On debounce fire: restore the snapshotted state.
- Expose `enable()`, `disable()`, `isEnabled()`, and an event emitter for state changes.

**Dependencies**
- `WindowHelper` (to apply opacity and click-through to the overlay window).
- Settings store (to persist the enabled flag).

**Why a separate service:** the existing mouse-passthrough feature already mutates `setIgnoreMouseEvents`. Centralizing Stealth's opacity/passthrough management in one service keeps the "who owns this property right now" question answerable — the service snapshots and restores rather than blindly setting.

### 2. IPC bridge

Two channels, defined alongside existing IPC:

- `stealth:set-enabled` (renderer → main, payload `{ enabled: boolean }`) — flips the manager on/off and persists the setting.
- `stealth:state` (main → renderer, payload `{ enabled: boolean, faded: boolean }`) — emitted on every state change so the chip can reflect both bits.

On renderer mount, request the current state once via `stealth:get-state` (renderer → main, returns the same shape) to seed the UI.

### 3. Renderer pieces

**`src/hooks/useStealthToggle.ts`**
- Mirrors `useContextToggle` in shape.
- Subscribes to `stealth:state` on mount, calls `stealth:get-state` for the initial value.
- Returns `{ enabled, faded, setEnabled }`.

**`src/components/ui/StealthToggle.tsx`**
- Mirrors `ContextToggle` in shape.
- Renders a chip in the TopPill. Visual states: off, on-idle, on-faded (a subtle activity dot or pulse while faded is sufficient — final styling decided during implementation).

**`src/components/ui/TopPill.tsx`**
- Mount `<StealthToggle />` next to the existing `<ContextToggle />`.

## Interaction with existing features

**Mouse passthrough toggle.** Both Stealth and the existing passthrough toggle mutate `setIgnoreMouseEvents`. The manager handles this by snapshotting the click-through state at the moment of fade-in and restoring exactly that state on fade-out. If the user toggles passthrough while Stealth is *currently faded*, the next restore will clobber that change — acceptable trade-off, since toggling passthrough during a fade is unlikely; we can revisit if it bites.

**Screen-share undetectability.** Independent feature; Stealth makes no assumptions about whether the overlay is captured. The two features compose: undetectability hides us from the recording, Stealth hides us from the candidate's gaze.

**Existing `setOpacity(0)` / `setOpacity(1)` paths.** Several flows (hide animation suppression, screenshot capture) temporarily set opacity. Stealth must not race these. Concretely: the manager only touches opacity when transitioning fade-state, and uses its own snapshot rather than reading the live value. If another feature has the window at opacity 0 (e.g., mid-hide), Stealth's fade-in does nothing visible and its fade-out restores the *snapshotted* value, not 1.0.

## Platform notes

**macOS.** `uiohook-napi` requires Accessibility / Input Monitoring permission. First-time enable should detect the missing permission and surface a one-time prompt with a "Open System Settings" link. If permission is denied, the chip stays toggled off and shows an explanatory tooltip.

**Windows.** No permission prompt needed; `uiohook-napi` works out of the box.

**Linux.** Out of scope for v1 (and consistent with the rest of the app's primary targets).

## Settings persistence

A single boolean: `stealthMode.enabled`. Stored in the existing settings store. No other tunables in v1 — opacity (0.10) and restore delay (800 ms) are constants. If users push back, we promote them to settings later.

## Testing

- **Unit:** `StealthModeManager` with a fake key-event source and a fake `WindowHelper`. Verify focused-window check, debounce timing, snapshot/restore correctness.
- **Hook:** `useStealthToggle` test mirroring `useContextToggle.test.tsx`.
- **Manual:** typing in IDE fades overlay; typing in Natively input does not; toggling chip off mid-fade restores immediately; permission-denied path on macOS shows the prompt.

## Out of scope (v1)

- User-tunable opacity or restore delay.
- A global hotkey for toggling Stealth (the user has the screen-share undetectability feature, so fast in-interview toggling is less critical).
- Reacting to mouse movement (only keyboard).
- Per-application rules ("only fade when IDE X is foreground").
