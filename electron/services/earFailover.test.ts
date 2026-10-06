import { describe, it, expect } from 'vitest';
import { shouldFailOver, shouldRestartEar, EAR_FAILOVER_MODEL, EAR_PRIMARY_MODEL } from './earFailover';

describe('shouldRestartEar (review I1: the deferred restart guard)', () => {
  const ok = { failedEarIsCurrent: true, meetingActive: true, liveModeOff: false };
  it('restarts when the failed ear is still current in a live meeting', () => { expect(shouldRestartEar(ok)).toBe(true); });
  it('not when the failed ear was replaced or nulled (endMeeting, mode toggle)', () => { expect(shouldRestartEar({ ...ok, failedEarIsCurrent: false })).toBe(false); });
  it('not when the meeting is no longer active', () => { expect(shouldRestartEar({ ...ok, meetingActive: false })).toBe(false); });
  it('not when live mode is off', () => { expect(shouldRestartEar({ ...ok, liveModeOff: true })).toBe(false); });
});

const base = { flag: true, model: EAR_PRIMARY_MODEL, state: 'failed', reason: 'quick reconnects exhausted', alreadyFailedOver: false };

describe('shouldFailOver (SPEC 4.4)', () => {
  it("constants are the plan's ids", () => {
    expect(EAR_FAILOVER_MODEL).toBe('gemini-2.5-flash-native-audio-latest');
    expect(EAR_PRIMARY_MODEL).toBe('gemini-3.1-flash-live-preview');
  });
  it('a 3.1 failed fails over', () => { expect(shouldFailOver(base)).toBe(true); });
  it('a failed with no reason still fails over', () => { expect(shouldFailOver({ ...base, reason: undefined })).toBe(true); });
  it('a second time does not', () => { expect(shouldFailOver({ ...base, alreadyFailedOver: true })).toBe(false); });
  it('a 2.5 start never fails over', () => { expect(shouldFailOver({ ...base, model: EAR_FAILOVER_MODEL })).toBe(false); });
  it('any other model never fails over', () => { expect(shouldFailOver({ ...base, model: 'gemini-x' })).toBe(false); });
  it('flag off does not', () => { expect(shouldFailOver({ ...base, flag: false })).toBe(false); });
  it.each(['reconnecting', 'connecting', 'connected', 'stopped', 'idle'])('state %s does not', (state) => {
    expect(shouldFailOver({ ...base, state })).toBe(false);
  });
  it('the no-key reason does not', () => { expect(shouldFailOver({ ...base, reason: 'No Gemini API key configured' })).toBe(false); });
  it('a NATIVELY_LIVE_MODEL override disables it', () => { expect(shouldFailOver({ ...base, modelOverridden: true })).toBe(false); });
});
