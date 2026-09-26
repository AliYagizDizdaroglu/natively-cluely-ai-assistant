import { describe, it, expect } from 'vitest';
import { withParentExchange, followUpParentEnabled, describeFollowUpParentAtStartup, FOLLOWUP_PARENT_ENV, PARENT_MAX_AGE_MS } from './followUpParent';

const ON = { [FOLLOWUP_PARENT_ENV]: '1' } as NodeJS.ProcessEnv;
const OFF = {} as NodeJS.ProcessEnv;
const NOW = 1_000_000_000;
const parent = { text: 'I would rank salaries per department with dense rank and keep rank two.', questionContext: 'Give me the SQL for the second highest salary in each department.', timestamp: NOW - 150_000 };
const followUp = [{ role: 'interviewer' as const, text: 'Can you do it with a window function?', timestamp: NOW }];

describe('followUpParentEnabled', () => {
    it('is off unless the flag is exactly 1', () => {
        expect(followUpParentEnabled(OFF)).toBe(false);
        expect(followUpParentEnabled({ [FOLLOWUP_PARENT_ENV]: '0' } as any)).toBe(false);
        expect(followUpParentEnabled({ [FOLLOWUP_PARENT_ENV]: '' } as any)).toBe(false);
        expect(followUpParentEnabled(ON)).toBe(true);
        expect(() => followUpParentEnabled({ [FOLLOWUP_PARENT_ENV]: 'yes' } as any)).toThrow(/NATIVELY_FOLLOWUP_PARENT/);
    });
});
describe('describeFollowUpParentAtStartup (h40c review M4: the hedge gets a startup check, this flag did not)', () => {
    it('names on/off for a valid value, and throws the flag\'s own message for a junk one', () => {
        expect(describeFollowUpParentAtStartup(ON)).toBe('follow-up parent: on');
        expect(describeFollowUpParentAtStartup(OFF)).toBe('follow-up parent: off');
        expect(describeFollowUpParentAtStartup({ [FOLLOWUP_PARENT_ENV]: '0' } as any)).toBe('follow-up parent: off');
        expect(describeFollowUpParentAtStartup({ [FOLLOWUP_PARENT_ENV]: '' } as any)).toBe('follow-up parent: off');
        expect(() => describeFollowUpParentAtStartup({ [FOLLOWUP_PARENT_ENV]: 'yes' } as any)).toThrow(/NATIVELY_FOLLOWUP_PARENT/);
    });
});
describe('withParentExchange', () => {
    it('flag off: returns the very same array (the shipped prompt is untouched)', () => {
        expect(withParentExchange(followUp, [parent], NOW, OFF)).toBe(followUp);
    });
    it('flag on, the window lost the previous exchange (holdout40: parent 156 s before the follow-up, eviction at 120 s): the exchange comes back ahead of the window', () => {
        const out = withParentExchange(followUp, [parent], NOW, ON);
        expect(out.map((t) => [t.role, t.text])).toEqual([
            ['interviewer', parent.questionContext], ['assistant', parent.text], ['interviewer', followUp[0].text],
        ]);
        expect(out[0].timestamp).toBeLessThan(out[1].timestamp);
        expect(out[1].timestamp).toBeLessThan(followUp[0].timestamp);
    });
    it('flag on, the window still holds the previous answer (a short gap): unchanged', () => {
        const turns = [{ role: 'interviewer' as const, text: parent.questionContext, timestamp: NOW - 80_000 }, { role: 'assistant' as const, text: parent.text, timestamp: NOW - 74_000 }, ...followUp];
        expect(withParentExchange(turns, [parent], NOW, ON)).toBe(turns);
    });
    it('flag on, the previous exchange is older than PARENT_MAX_AGE_MS: not restored', () => {
        expect(withParentExchange(followUp, [{ ...parent, timestamp: NOW - PARENT_MAX_AGE_MS - 1 }], NOW, ON)).toBe(followUp);
    });
    it('flag on, no usable history: unchanged', () => {
        expect(withParentExchange(followUp, [], NOW, ON)).toBe(followUp);
        expect(withParentExchange(followUp, [{ ...parent, questionContext: 'unknown' }], NOW, ON)).toBe(followUp);
    });
});
