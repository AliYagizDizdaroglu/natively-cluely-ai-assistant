import fs from 'node:fs';

const file = 'C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-cluely-ai-assistant\\electron\\test\\golden\\interview60.pass-record.test.ts';
const text = fs.readFileSync(file, 'utf8');

// 1. imports
const oldImports = `import { collectPass, renderPassRecord, renderPassIndex, passRow, graderOf } from './interview60.pass-record.mjs';`;
const newImports = `import { collectPass, renderPassRecord, renderPassIndex, passRow, graderOf, verbalHedgeFromLog } from './interview60.pass-record.mjs';
import { describeVerbalHedgeAtStartup } from '../../llm/verbalHedge';`;

// 2. Minor 3: a test for the non-lite case, added right after the existing M6 "on" test.
const oldOnTest = `    it('h40c review M6: verbal hedge on — the summary line names the trigger, and the answers row names both lites instead of 3.1-lite alone', () => {
        const md2 = renderPassRecord(pass({ meta: { ...pass().meta, verbalHedge: 'on trigger=5000ms' } }));
        expect(md2).toContain('- Verbal hedge: on trigger=5000ms (3.5-flash-lite front, 3.1-flash-lite back; answers name their model in the won-by lines)');
        expect(md2).toContain('| answers | hedge (gemini-3.5-flash-lite front, gemini-3.1-flash-lite back) (in-app) · arms: qwen/qwen3.8-27b |');
    });
});
`;
const newOnTest = `    it('h40c review M6: verbal hedge on — the summary line names the trigger, and the answers row names both lites instead of 3.1-lite alone', () => {
        const md2 = renderPassRecord(pass({ meta: { ...pass().meta, verbalHedge: 'on trigger=5000ms' } }));
        expect(md2).toContain('- Verbal hedge: on trigger=5000ms (3.5-flash-lite front, 3.1-flash-lite back; answers name their model in the won-by lines)');
        expect(md2).toContain('| answers | hedge (gemini-3.5-flash-lite front, gemini-3.1-flash-lite back) (in-app) · arms: qwen/qwen3.8-27b |');
    });

    it('h40c review M6 fix round 1 (Minor 3): the hedge can only engage on one of the two lites — a different answer model keeps its own name even with the hedge on', () => {
        const md2 = renderPassRecord(pass({ meta: { ...pass().meta, verbalHedge: 'on trigger=5000ms', answerModel: 'gemini-3.5-flash' } }));
        // The flag was still on for the run, so the summary bullet still names it.
        expect(md2).toContain('- Verbal hedge: on trigger=5000ms (3.5-flash-lite front, 3.1-flash-lite back; answers name their model in the won-by lines)');
        // But the hedge never raced for THIS primary, so the answers row keeps naming it, not the hedge pair.
        expect(md2).toContain('| answers | gemini-3.5-flash (in-app) · arms: qwen/qwen3.8-27b |');
        expect(md2).not.toContain('hedge (gemini-3.5-flash-lite front');
    });
});
`;

// 3. Minor 1: an end-to-end test of the regex, against the real describe function's output.
const oldTail = `describe.skipIf(!fs.existsSync(path.join(S50A, 'interview60.judge.json')))('collectPass on the real s50a run (skipped where the run folder is absent)', () => {`;
const newTail = `describe('verbalHedgeFromLog (h40c review, fix round 1, Minor 1): the regex M6 exists for, proved against the real describe function', () => {
    // A debug log line looks like "<ISO> [LOG] <text>" — the timestamp and level prefix that
    // M6's regex must see past, not just a hand-typed "[Main] verbal hedge: …" fixture.
    const at = (line: string) => \`2026-09-26T10:00:00.000Z [LOG] \${line}\`;

    it('reads off and on-trigger from the real describeVerbalHedgeAtStartup output', () => {
        expect(verbalHedgeFromLog(at(describeVerbalHedgeAtStartup({})))).toBe('off');
        expect(verbalHedgeFromLog(at(describeVerbalHedgeAtStartup({ NATIVELY_VERBAL_HEDGE: '1' } as any)))).toBe('on trigger=5000ms');
    });

    it('is null when the log holds no hedge line at all (every run before da28f25)', () => {
        expect(verbalHedgeFromLog(at('=== Natively session started 2026-09-26T10:00:00.000Z ==='))).toBeNull();
    });
});

describe.skipIf(!fs.existsSync(path.join(S50A, 'interview60.judge.json')))('collectPass on the real s50a run (skipped where the run folder is absent)', () => {`;

let out = text;
for (const [oldStr, newStr, label] of [[oldImports, newImports, 'imports'], [oldOnTest, newOnTest, 'Minor 3 test'], [oldTail, newTail, 'Minor 1 test']]) {
    const count = out.split(oldStr).length - 1;
    if (count !== 1) {
        console.error(`FAIL: expected exactly 1 occurrence of the ${label}, found ${count}`);
        process.exit(1);
    }
    out = out.split(oldStr).join(newStr);
}
fs.writeFileSync(file, out, 'utf8');
console.log('OK: interview60.pass-record.test.ts patched (fix round 1: Minor 1 + Minor 3 tests, RED)');
