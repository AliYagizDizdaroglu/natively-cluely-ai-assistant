import { describe, it, expect } from 'vitest';
import { decideDispatch } from './detectionDispatch';

describe('decideDispatch', () => {
    it('auto: the first admitted detection answers, whichever detector it came from', () => {
        expect(decideDispatch('auto', { admitted: true })).toBe('answer');
    });
    it('auto: a duplicate never answers a second time', () => {
        expect(decideDispatch('auto', { admitted: false, duplicateOfSource: 'whisper', alreadyAnswered: true })).toBe('drop');
        expect(decideDispatch('auto', { admitted: false, duplicateOfSource: 'live', alreadyAnswered: true })).toBe('drop');
    });
    it('auto: a duplicate of a detection that was NOT answered answers now — this is the 2026-09-02 race', () => {
        expect(decideDispatch('auto', { admitted: false, duplicateOfSource: 'whisper', alreadyAnswered: false })).toBe('answer');
    });
    it('suggest: admitted → chip, duplicate → drop', () => {
        expect(decideDispatch('suggest', { admitted: true })).toBe('chip');
        expect(decideDispatch('suggest', { admitted: false, duplicateOfSource: 'live', alreadyAnswered: false })).toBe('drop');
    });
    it('off: nothing is surfaced', () => {
        expect(decideDispatch('off', { admitted: true })).toBe('drop');
    });
});
