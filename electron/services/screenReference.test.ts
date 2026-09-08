import { describe, it, expect } from 'vitest';
import { mentionsScreen, extendOfAfterCapture } from './screenReference';

// after8 (2026-09-07): the three "on screen" cues were answered from the transcript
// (C02 replayed the previous Docker answer) because nothing captured the screen.
describe('mentionsScreen — the interviewer points at something on screen', () => {
    it('is true for the flight cues', () => {
        expect(mentionsScreen('Now take a look at this problem on screen and walk me through how you would solve it.')).toBe(true);
        expect(mentionsScreen('Here is another one on screen. Take a look and talk me through your approach.')).toBe(true);
        expect(mentionsScreen('Last one on screen. Walk me through it, and mention the time complexity.')).toBe(true);
        expect(mentionsScreen("Take a look at this problem on screen and talk me through your approach.")).toBe(true);
        expect(mentionsScreen('Can you solve the problem on the screen?')).toBe(true);
        expect(mentionsScreen("I've shared my screen — walk me through this code.")).toBe(true);
    });
    it('is false for spoken questions that happen to mention images, looking or problems', () => {
        expect(mentionsScreen('The same image behaves differently on your laptop and in the cluster. How do you track that down?')).toBe(false);
        expect(mentionsScreen('A SageMaker endpoint serving ten thousand requests per second has p99 latency creeping up. How do you diagnose and fix it?')).toBe(false);
        expect(mentionsScreen('What problem does infrastructure as code actually solve?')).toBe(false);
        expect(mentionsScreen('How would you look for data drift in a model that is already running in production?')).toBe(false);
        expect(mentionsScreen('')).toBe(false);
    });
});

describe('extendOfAfterCapture — an extend that captures cannot build on the blind answer', () => {
    // after9 C03: the head "Walk me through it and mention the time" carried no screen
    // reference, so it was answered blind — about drift and retraining, for a circular-queue
    // problem. The fuller sentence arrived through the extend branch, which now captures the
    // screen. extensionShape then tells the model it has ALREADY answered the first part, to
    // add only the delta in under 30 words, and not to reintroduce that answer — muzzling the
    // one answer that can finally see the screen, and anchoring it to a wrong one.
    const HEAD = 'Walk me through it and mention the time';
    it('drops extendOf when the screen was captured for this answer', () => {
        expect(extendOfAfterCapture(HEAD, true)).toBeUndefined();
    });
    it('keeps extendOf when nothing was captured, so ordinary extends stay short', () => {
        // after8 measured the default shape at 104-114 words on six extensions against 27 with
        // the extension shape: this path must not lose that.
        expect(extendOfAfterCapture(HEAD, false)).toBe(HEAD);
        expect(extendOfAfterCapture(undefined, false)).toBeUndefined();
        expect(extendOfAfterCapture(undefined, true)).toBeUndefined();
    });
});
