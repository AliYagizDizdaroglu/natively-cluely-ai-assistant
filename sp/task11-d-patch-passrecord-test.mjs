import fs from 'node:fs';

const file = 'C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-cluely-ai-assistant\\electron\\test\\golden\\interview60.pass-record.test.ts';
const text = fs.readFileSync(file, 'utf8');

const oldStr = `    it('says plainly when a pass has not been graded yet, and still shows the answers', () => {
        const ungraded = pass({ meta: { ...pass().meta, graded: false, graderPrompt: null, judgeModel: null }, summary: { ...pass().summary, inApp: null, inAppPairs: null, followups: null, arms: [{ model: 'qwen/qwen3.8-27b', n: 20, acceptable: 0, weak: 0, wrong: 0, error: 0, ttftP50: 512, ttftP90: 681, graded: false }] } });
        ungraded.questions[0].inApp.forEach((a: any) => { a.grade = null; });
        ungraded.questions[0].arms.forEach((a: any) => { a.grade = null; });
        const out = renderPassRecord(ungraded);
        expect(out).toContain('not graded');
        expect(out).toContain('The F1 of the extraction model rose from 0.72 to 0.84.');
        expect(out).not.toContain('undefined');
    });
});
`;

const newStr = `    it('says plainly when a pass has not been graded yet, and still shows the answers', () => {
        const ungraded = pass({ meta: { ...pass().meta, graded: false, graderPrompt: null, judgeModel: null }, summary: { ...pass().summary, inApp: null, inAppPairs: null, followups: null, arms: [{ model: 'qwen/qwen3.8-27b', n: 20, acceptable: 0, weak: 0, wrong: 0, error: 0, ttftP50: 512, ttftP90: 681, graded: false }] } });
        ungraded.questions[0].inApp.forEach((a: any) => { a.grade = null; });
        ungraded.questions[0].arms.forEach((a: any) => { a.grade = null; });
        const out = renderPassRecord(ungraded);
        expect(out).toContain('not graded');
        expect(out).toContain('The F1 of the extraction model rose from 0.72 to 0.84.');
        expect(out).not.toContain('undefined');
    });

    it('h40c review M6: no verbal-hedge startup line (every run before da28f25) — renders exactly as before, no new line', () => {
        expect(md).not.toContain('Verbal hedge');
        expect(md).toContain('| answers | gemini-3.1-flash-lite (in-app) · arms: qwen/qwen3.8-27b |');
    });

    it('h40c review M6: verbal hedge off — one extra summary line names it, the answers row is unchanged', () => {
        const md2 = renderPassRecord(pass({ meta: { ...pass().meta, verbalHedge: 'off' } }));
        expect(md2).toContain('- Verbal hedge: off');
        expect(md2).toContain('| answers | gemini-3.1-flash-lite (in-app) · arms: qwen/qwen3.8-27b |');
    });

    it('h40c review M6: verbal hedge on — the summary line names the trigger, and the answers row names both lites instead of 3.1-lite alone', () => {
        const md2 = renderPassRecord(pass({ meta: { ...pass().meta, verbalHedge: 'on trigger=5000ms' } }));
        expect(md2).toContain('- Verbal hedge: on trigger=5000ms (3.5-flash-lite front, 3.1-flash-lite back; answers name their model in the won-by lines)');
        expect(md2).toContain('| answers | hedge (gemini-3.5-flash-lite front, gemini-3.1-flash-lite back) (in-app) · arms: qwen/qwen3.8-27b |');
    });
});
`;

const count = text.split(oldStr).length - 1;
if (count !== 1) {
    console.error(`FAIL: expected exactly 1 occurrence, found ${count}`);
    process.exit(1);
}
fs.writeFileSync(file, text.split(oldStr).join(newStr), 'utf8');
console.log('OK: interview60.pass-record.test.ts patched with 3 verbal-hedge tests (RED)');
