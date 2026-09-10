import { describe, it, expect } from 'vitest';
import { mentionsScreen } from './screenReference';

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
