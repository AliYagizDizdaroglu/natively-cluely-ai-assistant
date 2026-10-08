const fs = require('fs');
const path = require('path');

const target = path.resolve(
    'C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-cluely-ai-assistant\\electron\\services\\questionReconcile.test.ts'
);

const addition = "\n" + [
    "describe('reconcileLiveQuestion — phantom guard (2026-09-04 after5 hour, Groq REST on a noisy channel)', () => {",
    "    it('M19: a four-word Whisper hallucination is the latest thing said → unverifiable, Live wording kept', () => {",
    "        const live = 'What is your approach to health checks for a model serving container?';",
    "        const r = reconcileLiveQuestion(live, [sp(\"I'm going to go.\", 0)]);",
    "        expect(r.verdict).toBe('unverifiable');",
    "        expect(r.text).toBe(live);",
    "        expect(r.anchor).toBeNull();",
    "    });",
    "    it('the guard is looksFragmentary, not isFragment: four words with no question shape do not replace', () => {",
    "        // Four words pass isFragment (< 4); only looksFragmentary refuses this one.",
    "        const live = 'Why do Docker layers matter for build times?';",
    "        const r = reconcileLiveQuestion(live, [sp('Latency is creeping up.', 0)]);",
    "        expect(r.verdict).toBe('unverifiable');",
    "        expect(r.text).toBe(live);",
    "    });",
    "    it('W05: a whole short question the interviewer actually said still replaces an unmatched Live claim', () => {",
    "        // \"What is a DAG?\" — 4 words, ends in \"?\", question opener: not fragmentary, so the",
    "        // replacement path is intact for real speech.",
    "        const r = reconcileLiveQuestion('Tell me about a time you handled a resource constraint problem.', [sp('What is a DAG?', 0)]);",
    "        expect(r.verdict).toBe('replaced');",
    "        expect(r.text).toBe('What is a DAG?');",
    "        expect(r.anchor).toBe('What is a DAG?');",
    "    });",
    "});",
    "",
].join("\n");

const original = fs.readFileSync(target, 'utf8');
if (original.includes('phantom guard (2026-09-04 after5 hour')) {
    console.log('SKIP: addition already present');
    process.exit(0);
}
fs.writeFileSync(target, original + addition, 'utf8');
console.log('OK: appended, new length', original.length, '->', (original + addition).length);
