import { describe, it, expect, vi } from 'vitest';
import { SttChannel } from './SttChannel';

function makeProvider() {
  const writes: Buffer[] = [];
  let speechEndedCount = 0;
  return {
    provider: {
      write: (c: Buffer) => writes.push(c),
      notifySpeechEnded: () => { speechEndedCount++; },
    },
    writes,
    getSpeechEndedCount: () => speechEndedCount,
  };
}

const chunk = (n: number) => Buffer.alloc(n, 1);

describe('SttChannel', () => {
  it('passes audio through when enabled (default)', () => {
    const p = makeProvider();
    const ch = new SttChannel(() => p.provider);
    expect(ch.isEnabled()).toBe(true);
    ch.write(chunk(4));
    expect(p.writes).toHaveLength(1);
  });

  it('drops audio when disabled', () => {
    const p = makeProvider();
    const ch = new SttChannel(() => p.provider);
    ch.setEnabled(false);
    ch.write(chunk(4));
    ch.write(chunk(4));
    expect(p.writes).toHaveLength(0);
  });

  it('resumes immediately when re-enabled — the provider was never torn down', () => {
    const p = makeProvider();
    const ch = new SttChannel(() => p.provider);
    ch.setEnabled(false);
    ch.write(chunk(4));
    ch.setEnabled(true);
    ch.write(chunk(4));
    expect(p.writes).toHaveLength(1);
  });

  it('flushes the in-flight utterance when switched off', () => {
    // Otherwise a partial can land later and be credited to speech that
    // happened after the user switched the channel off.
    const p = makeProvider();
    const ch = new SttChannel(() => p.provider);
    ch.write(chunk(4));
    ch.setEnabled(false);
    expect(p.getSpeechEndedCount()).toBe(1);
  });

  it('ignores a redundant set to the same value', () => {
    const p = makeProvider();
    const onChange = vi.fn();
    const ch = new SttChannel(() => p.provider, onChange);
    ch.setEnabled(false);
    ch.setEnabled(false);
    ch.setEnabled(false);
    expect(p.getSpeechEndedCount()).toBe(1);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('notifies on each real transition so the UI can follow', () => {
    const p = makeProvider();
    const onChange = vi.fn();
    const ch = new SttChannel(() => p.provider, onChange);
    ch.setEnabled(false);
    ch.setEnabled(true);
    expect(onChange.mock.calls.map((c) => c[0])).toEqual([false, true]);
  });

  it('survives the provider being absent (not yet created, or reconfiguring)', () => {
    const ch = new SttChannel(() => null);
    expect(() => ch.write(chunk(4))).not.toThrow();
    expect(() => ch.setEnabled(false)).not.toThrow();
  });

  it('reads the provider late, so it follows a reconfigure', () => {
    // main.ts recreates googleSTT on device changes; the channel must not
    // capture a stale reference.
    let current = makeProvider();
    const ch = new SttChannel(() => current.provider);
    ch.write(chunk(4));
    const replaced = makeProvider();
    current = replaced;
    ch.write(chunk(4));
    expect(replaced.writes).toHaveLength(1);
  });

  it('a provider with no notifySpeechEnded does not break disabling', () => {
    const writes: Buffer[] = [];
    const ch = new SttChannel(() => ({ write: (c: Buffer) => writes.push(c) }));
    expect(() => ch.setEnabled(false)).not.toThrow();
    ch.write(chunk(4));
    expect(writes).toHaveLength(0);
  });
});
