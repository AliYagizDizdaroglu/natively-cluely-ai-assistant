/**
 * A switchable STT channel.
 *
 * Wraps an STT provider so audio can be stopped at the door without tearing the
 * provider down. Exists because when Live Mode is on, transcribing the
 * interviewer is largely redundant — measured 2026-07-28, Live detects every
 * question ~2.5s sooner (1211ms vs 3690ms median) and finds nothing the
 * whisper→Groq path finds — so users should be able to stop paying for it.
 *
 * Gating rather than disposing: Live is preview-tier and hard-fails visibly, so
 * the transcript has to be able to come back instantly.
 */

export interface SttWritable {
  write(chunk: Buffer): void;
  notifySpeechEnded?(): void;
}

export class SttChannel {
  private enabled = true;

  constructor(
    private readonly getProvider: () => SttWritable | null | undefined,
    private readonly onChange?: (enabled: boolean) => void
  ) {}

  write(chunk: Buffer): void {
    if (!this.enabled) return;
    this.getProvider()?.write(chunk);
  }

  setEnabled(enabled: boolean): void {
    if (this.enabled === enabled) return; // no-op, so no duplicate flush/broadcast
    this.enabled = enabled;
    if (!enabled) {
      // Close out whatever is half-transcribed, so a partial can't land later
      // and be attributed to speech from after the switch-off.
      this.getProvider()?.notifySpeechEnded?.();
    }
    this.onChange?.(enabled);
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}
