import fs from 'node:fs';

const file = 'C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-cluely-ai-assistant\\electron\\llm\\followUpParent.test.ts';
const text = fs.readFileSync(file, 'utf8');

const oldImport = `import { withParentExchange, followUpParentEnabled, FOLLOWUP_PARENT_ENV, PARENT_MAX_AGE_MS } from './followUpParent';`;
const newImport = `import { withParentExchange, followUpParentEnabled, describeFollowUpParentAtStartup, FOLLOWUP_PARENT_ENV, PARENT_MAX_AGE_MS } from './followUpParent';`;

const oldBlockEnd = `describe('followUpParentEnabled', () => {
    it('is off unless the flag is exactly 1', () => {
        expect(followUpParentEnabled(OFF)).toBe(false);
        expect(followUpParentEnabled({ [FOLLOWUP_PARENT_ENV]: '0' } as any)).toBe(false);
        expect(followUpParentEnabled({ [FOLLOWUP_PARENT_ENV]: '' } as any)).toBe(false);
        expect(followUpParentEnabled(ON)).toBe(true);
        expect(() => followUpParentEnabled({ [FOLLOWUP_PARENT_ENV]: 'yes' } as any)).toThrow(/NATIVELY_FOLLOWUP_PARENT/);
    });
});
`;

const newBlockEnd = `describe('followUpParentEnabled', () => {
    it('is off unless the flag is exactly 1', () => {
        expect(followUpParentEnabled(OFF)).toBe(false);
        expect(followUpParentEnabled({ [FOLLOWUP_PARENT_ENV]: '0' } as any)).toBe(false);
        expect(followUpParentEnabled({ [FOLLOWUP_PARENT_ENV]: '' } as any)).toBe(false);
        expect(followUpParentEnabled(ON)).toBe(true);
        expect(() => followUpParentEnabled({ [FOLLOWUP_PARENT_ENV]: 'yes' } as any)).toThrow(/NATIVELY_FOLLOWUP_PARENT/);
    });
});
describe('describeFollowUpParentAtStartup (h40c review M4: the hedge gets a startup check, this flag did not)', () => {
    it('names on/off for a valid value, and throws the flag\\'s own message for a junk one', () => {
        expect(describeFollowUpParentAtStartup(ON)).toBe('follow-up parent: on');
        expect(describeFollowUpParentAtStartup(OFF)).toBe('follow-up parent: off');
        expect(describeFollowUpParentAtStartup({ [FOLLOWUP_PARENT_ENV]: '0' } as any)).toBe('follow-up parent: off');
        expect(describeFollowUpParentAtStartup({ [FOLLOWUP_PARENT_ENV]: '' } as any)).toBe('follow-up parent: off');
        expect(() => describeFollowUpParentAtStartup({ [FOLLOWUP_PARENT_ENV]: 'yes' } as any)).toThrow(/NATIVELY_FOLLOWUP_PARENT/);
    });
});
`;

for (const [oldStr, newStr, label] of [[oldImport, newImport, 'import'], [oldBlockEnd, newBlockEnd, 'describe block']]) {
    const count = text.split(oldStr).length - 1;
    if (count !== 1) {
        console.error(`FAIL: expected exactly 1 occurrence of the ${label}, found ${count}`);
        process.exit(1);
    }
}
let out = text.split(oldImport).join(newImport);
out = out.split(oldBlockEnd).join(newBlockEnd);
fs.writeFileSync(file, out, 'utf8');
console.log('OK: followUpParent.test.ts patched with describeFollowUpParentAtStartup test (RED)');
