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
    vi.advanceTimersByTime(1000);
    expect(adapter.faded).toBe(false);
  });
});

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
    expect(cb).toHaveBeenCalledTimes(1);
  });
});
