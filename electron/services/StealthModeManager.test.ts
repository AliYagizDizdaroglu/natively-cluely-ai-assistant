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
