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
