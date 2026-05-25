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
