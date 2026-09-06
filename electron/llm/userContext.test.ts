import { describe, it, expect } from 'vitest';
import { userContextBlock } from './userContext';

describe('userContextBlock', () => {
    it('no notes → nothing appended', () => {
        expect(userContextBlock('')).toBe('');
        expect(userContextBlock('   \n ')).toBe('');
        expect(userContextBlock(undefined)).toBe('');
        expect(userContextBlock(null)).toBe('');
    });
    it('notes → the <user_context> block generateSuggestion already used, trimmed, with the usage rule', () => {
        const block = userContextBlock('  Led the payments migration at Acme.\n\nTarget: staff engineer.  ');
        expect(block).toBe(
            '\n\n<user_context>\nLed the payments migration at Acme.\n\nTarget: staff engineer.\n</user_context>\n' +
            'Use this context naturally if relevant. Never quote it verbatim.',
        );
    });
});
