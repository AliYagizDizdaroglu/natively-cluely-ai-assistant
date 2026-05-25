# Stealth Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Stealth" chip to the TopPill that fades the overlay to 10% opacity and makes it click-through while the user is typing outside our window, restoring to normal 800ms after typing stops.

**Architecture:** A main-process `StealthModeManager` owns a `uiohook-napi` global keyboard subscription, a debounce timer, and a window adapter. Two IPC channels (`stealth:get-state`, `stealth:set-enabled`) and one broadcast (`stealth:state`) bridge to a renderer hook and a chip component mirroring the existing `useContextToggle` / `ContextToggle` pattern. Restoring click-through delegates to the existing `WindowHelper.syncOverlayInteractionPolicy()` so the user's persistent passthrough preference remains the source of truth.

**Tech Stack:** Electron, React, TypeScript, vitest, `uiohook-napi` (new dep), existing `SettingsManager` for persistence.

**Spec:** [docs/superpowers/specs/2026-05-26-stealth-mode-design.md](../specs/2026-05-26-stealth-mode-design.md)

## File Structure

**New files**
- `electron/services/StealthModeManager.ts` — the service (event source / debounce / state machine).
- `electron/services/StealthModeManager.test.ts` — unit tests with fake key source and fake window adapter.
- `src/hooks/useStealthToggle.ts` — renderer hook.
- `src/hooks/useStealthToggle.test.tsx` — hook tests.
- `src/components/ui/StealthToggle.tsx` — chip component.

**Modified files**
- `package.json` — add `uiohook-napi` dependency.
- `electron/AppState.ts` — own a `StealthModeManager` instance; expose `getStealthModeManager()`.
- `electron/main.ts` — wire manager startup (apply persisted enabled flag).
- `electron/ipcHandlers.ts` — register `stealth:get-state` / `stealth:set-enabled` handlers; broadcast `stealth:state`.
- `electron/preload.ts` — expose `stealthGetState`, `stealthSetEnabled`, `onStealthStateChanged`.
- `src/types/electron.d.ts` — add the three API entries.
- `src/components/ui/TopPill.tsx` — mount `<StealthToggle />` next to `<ContextToggle />`.

---

### Task 1: Add `uiohook-napi` dependency

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install the dependency**

Run: `npm install uiohook-napi`
Expected: `package.json` gains `"uiohook-napi": "^<latest>"` in `dependencies`; `package-lock.json` updated.

- [ ] **Step 2: Verify it loads on this platform**

Run (PowerShell): `node -e "const u = require('uiohook-napi'); console.log(typeof u.uIOhook);"`
Expected: prints `object` (no native-module load error). If it fails on Windows with a missing toolchain error, `npm rebuild uiohook-napi` typically resolves it.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "deps: add uiohook-napi for global keyboard activity"
```

---

### Task 2: Define the manager's public types and interfaces

**Files:**
- Create: `electron/services/StealthModeManager.ts`

- [ ] **Step 1: Write the type declarations only (no logic yet)**

Create `electron/services/StealthModeManager.ts` with:

```typescript
export interface StealthKeyEventSource {
  start(): void;
  stop(): void;
  /** Subscribe to keydown events. Returns an unsubscriber. */
  onKeyDown(cb: () => void): () => void;
}

export interface StealthWindowAdapter {
  /** True if our overlay window currently has keyboard focus. */
  isOverlayFocused(): boolean;
  /** Apply faded state: opacity 0.10 + click-through on. */
  applyFaded(): void;
  /** Restore: opacity 1.0 + delegate click-through to existing passthrough policy. */
  applyRestored(): void;
}

export interface StealthState {
  enabled: boolean;
  faded: boolean;
}

export interface StealthModeManagerOptions {
  /** Milliseconds after the last keypress before restoring. Default 800. */
  restoreDelayMs?: number;
}
```

- [ ] **Step 2: Commit**

```bash
git add electron/services/StealthModeManager.ts
git commit -m "feat(stealth): define manager interfaces"
```

---

### Task 3: TDD the manager — enable/disable subscription lifecycle

**Files:**
- Modify: `electron/services/StealthModeManager.ts`
- Create: `electron/services/StealthModeManager.test.ts`

- [ ] **Step 1: Write the failing test**

Create `electron/services/StealthModeManager.test.ts`:

```typescript
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StealthModeManager, StealthKeyEventSource, StealthWindowAdapter } from './StealthModeManager';

function fakes() {
  let listener: (() => void) | null = null;
  const source: StealthKeyEventSource & { fireKey: () => void; started: boolean } = {
    started: false,
    start() { this.started = true; },
    stop() { this.started = false; },
    onKeyDown(cb) { listener = cb; return () => { listener = null; }; },
    fireKey() { listener?.(); },
  };
  const adapter: StealthWindowAdapter & { faded: boolean; focused: boolean } = {
    faded: false,
    focused: false,
    isOverlayFocused() { return this.focused; },
    applyFaded() { this.faded = true; },
    applyRestored() { this.faded = false; },
  };
  return { source, adapter };
}

describe('StealthModeManager — lifecycle', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('starts the key source when enabled and stops it when disabled', () => {
    const { source, adapter } = fakes();
    const mgr = new StealthModeManager(source, adapter);

    expect(source.started).toBe(false);
    mgr.enable();
    expect(source.started).toBe(true);
    expect(mgr.isEnabled()).toBe(true);

    mgr.disable();
    expect(source.started).toBe(false);
    expect(mgr.isEnabled()).toBe(false);
  });

  it('does nothing if enable() is called twice', () => {
    const { source, adapter } = fakes();
    const startSpy = vi.spyOn(source, 'start');
    const mgr = new StealthModeManager(source, adapter);
    mgr.enable();
    mgr.enable();
    expect(startSpy).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run electron/services/StealthModeManager.test.ts`
Expected: FAIL — `StealthModeManager is not a constructor`.

- [ ] **Step 3: Implement minimal lifecycle**

Append to `electron/services/StealthModeManager.ts`:

```typescript
export class StealthModeManager {
  private enabled = false;
  private faded = false;
  private keyUnsub: (() => void) | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private readonly restoreDelayMs: number;

  constructor(
    private readonly source: StealthKeyEventSource,
    private readonly adapter: StealthWindowAdapter,
    opts: StealthModeManagerOptions = {},
  ) {
    this.restoreDelayMs = opts.restoreDelayMs ?? 800;
  }

  isEnabled(): boolean { return this.enabled; }
  isFaded(): boolean { return this.faded; }

  enable(): void {
    if (this.enabled) return;
    this.enabled = true;
    this.source.start();
    this.keyUnsub = this.source.onKeyDown(() => this.handleKey());
  }

  disable(): void {
    if (!this.enabled) return;
    this.enabled = false;
    this.keyUnsub?.();
    this.keyUnsub = null;
    this.source.stop();
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    if (this.faded) {
      this.faded = false;
      this.adapter.applyRestored();
    }
  }

  private handleKey(): void {
    // Filled in Task 4.
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run electron/services/StealthModeManager.test.ts`
Expected: PASS (both cases).

- [ ] **Step 5: Commit**

```bash
git add electron/services/StealthModeManager.ts electron/services/StealthModeManager.test.ts
git commit -m "feat(stealth): manager enable/disable lifecycle"
```

---

### Task 4: TDD the manager — fade on external keypress, restore on debounce

**Files:**
- Modify: `electron/services/StealthModeManager.ts`
- Modify: `electron/services/StealthModeManager.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `electron/services/StealthModeManager.test.ts` (inside the same `describe` or a new one):

```typescript
describe('StealthModeManager — fade/restore', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('fades on external keypress, restores 800ms after last keypress', () => {
    const { source, adapter } = fakes();
    const mgr = new StealthModeManager(source, adapter);
    mgr.enable();

    source.fireKey();
    expect(adapter.faded).toBe(true);
    expect(mgr.isFaded()).toBe(true);

    vi.advanceTimersByTime(799);
    expect(adapter.faded).toBe(true);

    vi.advanceTimersByTime(1);
    expect(adapter.faded).toBe(false);
    expect(mgr.isFaded()).toBe(false);
  });

  it('ignores keypresses while our overlay window is focused', () => {
    const { source, adapter } = fakes();
    adapter.focused = true;
    const mgr = new StealthModeManager(source, adapter);
    mgr.enable();

    source.fireKey();
    expect(adapter.faded).toBe(false);
  });

  it('continuing to type extends the restore delay', () => {
    const { source, adapter } = fakes();
    const mgr = new StealthModeManager(source, adapter);
    mgr.enable();

    source.fireKey();
    vi.advanceTimersByTime(700);
    source.fireKey();
    vi.advanceTimersByTime(799);
    expect(adapter.faded).toBe(true);
    vi.advanceTimersByTime(1);
    expect(adapter.faded).toBe(false);
  });

  it('disable() while faded restores immediately and cancels the timer', () => {
    const { source, adapter } = fakes();
    const mgr = new StealthModeManager(source, adapter);
    mgr.enable();
    source.fireKey();
    expect(adapter.faded).toBe(true);

    mgr.disable();
    expect(adapter.faded).toBe(false);
    // Timer firing after disable must not re-apply anything.
    vi.advanceTimersByTime(1000);
    expect(adapter.faded).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run electron/services/StealthModeManager.test.ts`
Expected: FAIL on the new tests — `adapter.faded` stays false because `handleKey` is empty.

- [ ] **Step 3: Implement `handleKey`**

Replace the empty `handleKey()` in `electron/services/StealthModeManager.ts` with:

```typescript
  private handleKey(): void {
    if (!this.enabled) return;
    if (this.adapter.isOverlayFocused()) return;

    if (!this.faded) {
      this.faded = true;
      this.adapter.applyFaded();
      this.emitState();
    }

    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = null;
      if (!this.faded) return;
      this.faded = false;
      this.adapter.applyRestored();
      this.emitState();
    }, this.restoreDelayMs);
  }

  private emitState(): void {
    // Subscribers wired in Task 5.
  }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run electron/services/StealthModeManager.test.ts`
Expected: PASS (all six cases).

- [ ] **Step 5: Commit**

```bash
git add electron/services/StealthModeManager.ts electron/services/StealthModeManager.test.ts
git commit -m "feat(stealth): fade on external keypress with debounced restore"
```

---

### Task 5: TDD the manager — state-change subscribers

**Files:**
- Modify: `electron/services/StealthModeManager.ts`
- Modify: `electron/services/StealthModeManager.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `StealthModeManager.test.ts`:

```typescript
describe('StealthModeManager — onStateChange', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('emits state on enable, fade, restore, and disable', () => {
    const { source, adapter } = fakes();
    const mgr = new StealthModeManager(source, adapter);
    const events: Array<{ enabled: boolean; faded: boolean }> = [];
    mgr.onStateChange(s => events.push({ ...s }));

    mgr.enable();
    source.fireKey();
    vi.advanceTimersByTime(800);
    mgr.disable();

    expect(events).toEqual([
      { enabled: true,  faded: false },
      { enabled: true,  faded: true  },
      { enabled: true,  faded: false },
      { enabled: false, faded: false },
    ]);
  });

  it('unsubscriber stops further emissions', () => {
    const { source, adapter } = fakes();
    const mgr = new StealthModeManager(source, adapter);
    const cb = vi.fn();
    const unsub = mgr.onStateChange(cb);
    mgr.enable();
    unsub();
    source.fireKey();
    expect(cb).toHaveBeenCalledTimes(1); // only the enable event
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run electron/services/StealthModeManager.test.ts`
Expected: FAIL — `mgr.onStateChange is not a function`.

- [ ] **Step 3: Implement subscribers**

Add to the `StealthModeManager` class (replacing the placeholder `emitState`):

```typescript
  private listeners = new Set<(s: StealthState) => void>();

  onStateChange(cb: (s: StealthState) => void): () => void {
    this.listeners.add(cb);
    return () => { this.listeners.delete(cb); };
  }

  private emitState(): void {
    const snapshot: StealthState = { enabled: this.enabled, faded: this.faded };
    this.listeners.forEach(cb => {
      try { cb(snapshot); } catch (e) { console.error('[StealthModeManager] listener threw', e); }
    });
  }
```

Then add `this.emitState()` calls at the end of `enable()` and `disable()` (after their existing logic), so the test's first and last events fire.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run electron/services/StealthModeManager.test.ts`
Expected: PASS (all eight cases).

- [ ] **Step 5: Commit**

```bash
git add electron/services/StealthModeManager.ts electron/services/StealthModeManager.test.ts
git commit -m "feat(stealth): emit state-change events on transitions"
```

---

### Task 6: Concrete adapters — `uiohook-napi` key source and Electron window adapter

**Files:**
- Modify: `electron/services/StealthModeManager.ts`

- [ ] **Step 1: Append the concrete `UioHookKeySource`**

Append to `electron/services/StealthModeManager.ts`:

```typescript
// --- Concrete key source backed by uiohook-napi (main process only) ---

import { uIOhook } from 'uiohook-napi';

export class UioHookKeySource implements StealthKeyEventSource {
  private static refCount = 0;
  private listeners = new Set<() => void>();
  private bound: ((...args: any[]) => void) | null = null;

  start(): void {
    if (UioHookKeySource.refCount === 0) {
      try { uIOhook.start(); } catch (e) { console.error('[stealth] uIOhook.start failed', e); }
    }
    UioHookKeySource.refCount++;

    if (!this.bound) {
      this.bound = () => this.listeners.forEach(cb => {
        try { cb(); } catch (e) { console.error('[stealth] key listener threw', e); }
      });
      uIOhook.on('keydown', this.bound);
    }
  }

  stop(): void {
    if (this.bound) {
      uIOhook.off('keydown', this.bound);
      this.bound = null;
    }
    UioHookKeySource.refCount = Math.max(0, UioHookKeySource.refCount - 1);
    if (UioHookKeySource.refCount === 0) {
      try { uIOhook.stop(); } catch (e) { console.error('[stealth] uIOhook.stop failed', e); }
    }
  }

  onKeyDown(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => { this.listeners.delete(cb); };
  }
}
```

- [ ] **Step 2: Append the Electron window adapter**

Append to `electron/services/StealthModeManager.ts`:

```typescript
// --- Window adapter wired to the actual overlay window ---

import type { AppState } from '../main';

const STEALTH_OPACITY = 0.10;

export class ElectronStealthWindowAdapter implements StealthWindowAdapter {
  constructor(private readonly appState: AppState) {}

  private overlay() {
    const win = this.appState.getWindowHelper().getOverlayWindow();
    return win && !win.isDestroyed() ? win : null;
  }

  isOverlayFocused(): boolean {
    const win = this.overlay();
    return !!win && win.isFocused();
  }

  applyFaded(): void {
    const win = this.overlay();
    if (!win) return;
    win.setOpacity(STEALTH_OPACITY);
    win.setIgnoreMouseEvents(true, { forward: true });
  }

  applyRestored(): void {
    const win = this.overlay();
    if (!win) return;
    win.setOpacity(1);
    // Re-derive click-through from the user's persistent passthrough preference.
    this.appState.getWindowHelper().syncOverlayInteractionPolicy();
  }
}
```

- [ ] **Step 3: Verify the file still compiles**

Run: `npx tsc --noEmit -p tsconfig.electron.json` (or whatever TS project covers `electron/`; if there is no separate one, `npx tsc --noEmit`).
Expected: no errors. If `AppState` import path is different in this repo (e.g. `../AppState`), adjust.

- [ ] **Step 4: Commit**

```bash
git add electron/services/StealthModeManager.ts
git commit -m "feat(stealth): concrete uiohook key source and electron window adapter"
```

---

### Task 7: Wire the manager into `AppState` and apply persisted enable on startup

**Files:**
- Modify: `electron/AppState.ts` (or wherever `AppState` is defined — search for `class AppState`)
- Modify: `electron/main.ts`

- [ ] **Step 1: Locate `AppState`**

Run: `npx rg -l "class AppState" electron`
Expected: prints the file (likely `electron/main.ts` or `electron/AppState.ts`). Use that path in the next steps.

- [ ] **Step 2: Add a manager field + getter to `AppState`**

Inside the `AppState` class, near the other private fields, add:

```typescript
  private stealthModeManager: import('./services/StealthModeManager').StealthModeManager | null = null;

  public getStealthModeManager() {
    return this.stealthModeManager;
  }

  public initStealthModeManager(): void {
    if (this.stealthModeManager) return;
    const {
      StealthModeManager,
      UioHookKeySource,
      ElectronStealthWindowAdapter,
    } = require('./services/StealthModeManager');
    this.stealthModeManager = new StealthModeManager(
      new UioHookKeySource(),
      new ElectronStealthWindowAdapter(this),
    );
  }
```

(If `AppState` is in `electron/main.ts`, drop the `import('./services/StealthModeManager').` prefix and add a top-of-file `import type` instead — match the style of nearby fields.)

- [ ] **Step 3: Initialize on app ready + apply persisted enabled flag**

In `electron/main.ts`, find the `app.whenReady().then(...)` block (or the function that runs once `initializeIpcHandlers` has been called) and add, after `initializeIpcHandlers(appState)`:

```typescript
  appState.initStealthModeManager();
  try {
    const { SettingsManager } = require('./services/SettingsManager');
    const persisted = SettingsManager.getInstance().get('stealthMode.enabled');
    if (persisted === true) {
      appState.getStealthModeManager()?.enable();
    }
  } catch (e) {
    console.error('[stealth] could not apply persisted state', e);
  }
```

- [ ] **Step 4: Verify the app still starts**

Run: `npm run dev` (or whichever script launches the Electron dev build).
Expected: app starts; no new errors in main-process console.

- [ ] **Step 5: Commit**

```bash
git add electron/main.ts electron/AppState.ts
git commit -m "feat(stealth): initialize manager on app ready and apply persisted state"
```

(Adjust `git add` paths to whatever you actually modified.)

---

### Task 8: IPC handlers — get-state, set-enabled, state broadcast

**Files:**
- Modify: `electron/ipcHandlers.ts`

- [ ] **Step 1: Register handlers at the end of `initializeIpcHandlers`**

Inside `initializeIpcHandlers`, near where `profile:set-mode` lives (so neighboring handlers stay grouped logically) or at the bottom, add:

```typescript
  safeHandle("stealth:get-state", async () => {
    const mgr = appState.getStealthModeManager();
    return {
      enabled: !!mgr?.isEnabled(),
      faded: !!mgr?.isFaded(),
    };
  });

  safeHandle("stealth:set-enabled", async (_, enabled: boolean) => {
    try {
      const mgr = appState.getStealthModeManager();
      if (!mgr) return { success: false, error: 'Stealth manager not initialized' };

      if (enabled) mgr.enable();
      else mgr.disable();

      const { SettingsManager } = require('./services/SettingsManager');
      SettingsManager.getInstance().set('stealthMode.enabled', enabled);
      return { success: true };
    } catch (error: any) {
      console.error('[stealth:set-enabled] failed', error);
      return { success: false, error: error?.message ?? 'unknown error' };
    }
  });
```

- [ ] **Step 2: Subscribe to state changes and broadcast**

Still inside `initializeIpcHandlers`, after the two handlers above, add:

```typescript
  const mgrForBroadcast = appState.getStealthModeManager();
  if (mgrForBroadcast) {
    mgrForBroadcast.onStateChange((state) => {
      BrowserWindow.getAllWindows().forEach(win => {
        if (!win.isDestroyed()) win.webContents.send('stealth:state', state);
      });
    });
  }
```

(`BrowserWindow` is already imported in `ipcHandlers.ts` — no new import needed.)

- [ ] **Step 3: Verify with a smoke test**

Run: `npm run dev`. Once the app is up, in the main process devtools console (or via a temporary log) invoke `appState.getStealthModeManager().enable()` and confirm `'stealth:state'` is logged in the renderer devtools after subscribing.

(If a no-code smoke check is preferred, defer manual verification to Task 13.)

- [ ] **Step 4: Commit**

```bash
git add electron/ipcHandlers.ts
git commit -m "feat(stealth): IPC handlers for get-state, set-enabled, and broadcast"
```

---

### Task 9: Expose the IPC in `preload.ts` and TypeScript types

**Files:**
- Modify: `electron/preload.ts`
- Modify: `src/types/electron.d.ts`

- [ ] **Step 1: Add to preload's `electronAPI` object**

In `electron/preload.ts`, near the existing `profileGetStatus` / `profileSetMode` entries (around line 1188), add:

```typescript
  stealthGetState: () => ipcRenderer.invoke('stealth:get-state'),
  stealthSetEnabled: (enabled: boolean) => ipcRenderer.invoke('stealth:set-enabled', enabled),
```

And near the existing `onProfileStatusChanged` definition (around line 627), add:

```typescript
  onStealthStateChanged: (callback: (state: { enabled: boolean; faded: boolean }) => void) => {
    const subscription = (_: any, state: { enabled: boolean; faded: boolean }) => callback(state);
    ipcRenderer.on('stealth:state', subscription);
    return () => { ipcRenderer.removeListener('stealth:state', subscription); };
  },
```

- [ ] **Step 2: Add type definitions**

In `src/types/electron.d.ts`, alongside the existing `profileGetStatus` / `profileSetMode` / `onProfileStatusChanged` type entries, add:

```typescript
  stealthGetState: () => Promise<{ enabled: boolean; faded: boolean }>;
  stealthSetEnabled: (enabled: boolean) => Promise<{ success: boolean; error?: string }>;
  onStealthStateChanged: (callback: (state: { enabled: boolean; faded: boolean }) => void) => () => void;
```

- [ ] **Step 3: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: no errors related to the new entries.

- [ ] **Step 4: Commit**

```bash
git add electron/preload.ts src/types/electron.d.ts
git commit -m "feat(stealth): expose IPC bridge to renderer"
```

---

### Task 10: TDD the renderer hook `useStealthToggle`

**Files:**
- Create: `src/hooks/useStealthToggle.ts`
- Create: `src/hooks/useStealthToggle.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/hooks/useStealthToggle.test.tsx`:

```typescript
import { renderHook, act, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useStealthToggle } from './useStealthToggle';

type State = { enabled: boolean; faded: boolean };

function setupElectronAPI(initial: State) {
  let listener: ((s: State) => void) | null = null;
  const stealthGetState = vi.fn().mockResolvedValue(initial);
  const stealthSetEnabled = vi.fn().mockResolvedValue({ success: true });
  const onStealthStateChanged = vi.fn((cb: (s: State) => void) => {
    listener = cb;
    return () => { listener = null; };
  });
  (window as any).electronAPI = { stealthGetState, stealthSetEnabled, onStealthStateChanged };
  return {
    stealthGetState,
    stealthSetEnabled,
    emit: (s: State) => listener?.(s),
  };
}

afterEach(() => {
  delete (window as any).electronAPI;
  vi.restoreAllMocks();
});

describe('useStealthToggle', () => {
  it('reads initial state on mount', async () => {
    setupElectronAPI({ enabled: true, faded: false });
    const { result } = renderHook(() => useStealthToggle());
    await waitFor(() => expect(result.current.enabled).toBe(true));
    expect(result.current.faded).toBe(false);
  });

  it('setEnabled(true) calls stealthSetEnabled and updates optimistically', async () => {
    const { stealthSetEnabled } = setupElectronAPI({ enabled: false, faded: false });
    const { result } = renderHook(() => useStealthToggle());
    await waitFor(() => expect(result.current.enabled).toBe(false));

    await act(async () => { await result.current.setEnabled(true); });

    expect(stealthSetEnabled).toHaveBeenCalledWith(true);
    expect(result.current.enabled).toBe(true);
  });

  it('reacts to stealth:state broadcasts', async () => {
    const { emit } = setupElectronAPI({ enabled: true, faded: false });
    const { result } = renderHook(() => useStealthToggle());
    await waitFor(() => expect(result.current.enabled).toBe(true));

    act(() => { emit({ enabled: true, faded: true }); });
    expect(result.current.faded).toBe(true);

    act(() => { emit({ enabled: false, faded: false }); });
    expect(result.current.enabled).toBe(false);
    expect(result.current.faded).toBe(false);
  });

  it('rolls back on setEnabled failure', async () => {
    (window as any).electronAPI = {
      stealthGetState: vi.fn().mockResolvedValue({ enabled: false, faded: false }),
      stealthSetEnabled: vi.fn().mockResolvedValue({ success: false, error: 'nope' }),
      onStealthStateChanged: vi.fn(() => () => {}),
    };
    const { result } = renderHook(() => useStealthToggle());
    await waitFor(() => expect(result.current.enabled).toBe(false));

    await act(async () => { await result.current.setEnabled(true); });
    expect(result.current.enabled).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/hooks/useStealthToggle.test.tsx`
Expected: FAIL — `useStealthToggle` not found.

- [ ] **Step 3: Implement the hook**

Create `src/hooks/useStealthToggle.ts`:

```typescript
import { useCallback, useEffect, useState } from 'react';

export interface UseStealthToggleResult {
    enabled: boolean;
    faded: boolean;
    setEnabled: (enabled: boolean) => Promise<void>;
}

export function useStealthToggle(): UseStealthToggleResult {
    const [enabled, setEnabledState] = useState(false);
    const [faded, setFaded] = useState(false);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const state = await window.electronAPI?.stealthGetState?.();
                if (cancelled || !state) return;
                setEnabledState(state.enabled);
                setFaded(state.faded);
            } catch (err) {
                console.error('[useStealthToggle] stealthGetState failed:', err);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        const unsub = window.electronAPI?.onStealthStateChanged?.((state) => {
            setEnabledState(state.enabled);
            setFaded(state.faded);
        });
        return () => { unsub?.(); };
    }, []);

    const setEnabled = useCallback(async (next: boolean) => {
        const prev = enabled;
        setEnabledState(next); // optimistic
        try {
            const result = await window.electronAPI?.stealthSetEnabled?.(next);
            if (!result?.success) {
                console.warn('[useStealthToggle] stealthSetEnabled failed:', result?.error);
                setEnabledState(prev);
            }
        } catch (err) {
            console.error('[useStealthToggle] stealthSetEnabled threw:', err);
            setEnabledState(prev);
        }
    }, [enabled]);

    return { enabled, faded, setEnabled };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/hooks/useStealthToggle.test.tsx`
Expected: PASS (all four cases).

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useStealthToggle.ts src/hooks/useStealthToggle.test.tsx
git commit -m "feat(stealth): renderer hook with IPC bridge and state subscription"
```

---

### Task 11: Build the `StealthToggle` chip component

**Files:**
- Create: `src/components/ui/StealthToggle.tsx`

- [ ] **Step 1: Implement the component**

Create `src/components/ui/StealthToggle.tsx`:

```typescript
import React from 'react';
import { EyeOff } from 'lucide-react';
import type { OverlayAppearance } from '../../lib/overlayAppearance';
import { useStealthToggle } from '../../hooks/useStealthToggle';

interface StealthToggleProps {
    appearance: OverlayAppearance;
}

export const StealthToggle: React.FC<StealthToggleProps> = ({ appearance }) => {
    const { enabled, faded, setEnabled } = useStealthToggle();

    const label = enabled ? 'Stealth: ON' : 'Stealth: OFF';
    const ariaLabel = enabled
        ? 'Stealth mode is ON. Overlay fades while typing outside the app. Click to disable.'
        : 'Stealth mode is OFF. Click to enable typing-aware fade.';

    // Visual states: off | on-idle | on-faded (subtle pulse).
    const stateClasses = !enabled
        ? 'opacity-80'
        : faded
            ? 'opacity-60 animate-pulse'
            : 'opacity-100';

    const dotClass = !enabled
        ? 'bg-white/30'
        : faded
            ? 'bg-amber-400'
            : 'bg-emerald-400';

    const handleClick = async () => {
        await setEnabled(!enabled);
    };

    return (
        <button
            type="button"
            onClick={handleClick}
            aria-label={ariaLabel}
            aria-pressed={enabled}
            className={`
                flex items-center gap-1.5
                px-3 py-1.5
                rounded-full
                backdrop-blur-md
                overlay-chip-surface
                overlay-text-interactive
                text-[11px]
                font-medium
                border
                interaction-base interaction-hover interaction-press
                ${stateClasses}
            `}
            style={appearance.chipStyle}
        >
            <EyeOff className="w-3 h-3" />
            <span className="tracking-wide">{label}</span>
            <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
        </button>
    );
};

export default StealthToggle;
```

- [ ] **Step 2: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/StealthToggle.tsx
git commit -m "feat(stealth): TopPill chip component with on/off/faded visual states"
```

---

### Task 12: Mount the chip in `TopPill`

**Files:**
- Modify: `src/components/ui/TopPill.tsx`

- [ ] **Step 1: Add the import and mount the chip**

At the top of `src/components/ui/TopPill.tsx`, alongside the existing `import { ContextToggle } from "./ContextToggle";`, add:

```typescript
import { StealthToggle } from "./StealthToggle";
```

Then, inside the pill, immediately after the existing `<ContextToggle appearance={appearance} />` line, add:

```typescript
                {/* STEALTH TOGGLE — fades overlay while typing outside our window */}
                <StealthToggle appearance={appearance} />
```

- [ ] **Step 2: Verify the renderer builds**

Run: `npm run dev` (or `npm run build` if dev is heavy).
Expected: no compile errors. The TopPill renders with the new chip visible next to "Context: …".

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/TopPill.tsx
git commit -m "feat(stealth): mount Stealth chip in TopPill"
```

---

### Task 13: Manual verification

**Files:** none modified — verification only.

- [ ] **Step 1: Run the app**

Run: `npm run dev`. Wait for the overlay to appear.

- [ ] **Step 2: Verify default state**

Open the overlay. The Stealth chip reads "Stealth: OFF" with a dim dot. No global keyboard listener should be active (no perf or permission prompt yet on macOS).

- [ ] **Step 3: Enable Stealth and test external typing**

Click the Stealth chip. Confirm it flips to "Stealth: ON" with a green dot. (On macOS, an Accessibility / Input Monitoring prompt may appear on first enable — grant it and re-click.)

Switch focus to another app (e.g., VS Code, Notepad). Begin typing. Confirm:
- Overlay opacity drops to ~10%.
- Overlay becomes click-through — clicks in the editor under the overlay region land on the editor.
- Chip dot turns amber while faded.

- [ ] **Step 4: Verify restore**

Stop typing. After ~800ms, overlay returns to full opacity and click-through reverts to whatever the user's passthrough setting is.

- [ ] **Step 5: Verify our-window-focus exemption**

Click into the overlay's own input field. Type. Overlay must NOT fade — typing into our UI is always exempt.

- [ ] **Step 6: Verify disable restores immediately**

While faded (typing in the IDE), quickly switch focus and click the Stealth chip OFF. Overlay restores immediately, click-through reverts, no further fade triggers when typing.

- [ ] **Step 7: Verify persistence**

Leave Stealth ON, quit the app, relaunch. Confirm chip shows "Stealth: ON" and external typing still fades.

- [ ] **Step 8: Verify interaction with existing mouse passthrough**

If the app has a passthrough toggle that the user has set to ON, fade-in keeps the overlay click-through, and fade-out restores it to click-through (not interactive). If passthrough is OFF, fade-out restores it to interactive.

- [ ] **Step 9: If any check fails, file the symptom**

Note the failing step in a follow-up issue rather than patching ad hoc — keeps the plan's task boundaries clean.

---

## Self-Review Notes

- **Spec coverage:** all eight spec sections map to tasks — chip (T11/T12), persistence (T7/T8), focused-window exemption (T4), debounce (T4), opacity + click-through (T6), state events (T5), platform notes (T13 manual step), out-of-scope items intentionally omitted.
- **Type consistency:** `StealthState`, `StealthKeyEventSource`, `StealthWindowAdapter`, `stealthGetState`, `stealthSetEnabled`, `onStealthStateChanged` used consistently across main, preload, types file, and renderer.
- **Placeholder scan:** no `TBD`/`TODO`/`similar to`. Each code step contains the full code to write.
