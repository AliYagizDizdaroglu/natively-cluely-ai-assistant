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
    this.emitState();
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
    this.emitState();
  }

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
}
