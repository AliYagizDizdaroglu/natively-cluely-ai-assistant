// Memory updates after the h40d result commit (MAIN 2178890). Exact-substring replacements; refuses if any is missing.
import fs from 'node:fs';
const D = 'C:/Users/sotka/.claude/projects/C--Users-sotka-OneDrive-Masa-st--natively-cluely-ai-assistant/memory/';
const edits = [
    ['project_h40d_flight.md',
        'refreshed); uncommitted until the result note `passes/2026-10-02-h40d-result.md` lands (the first commit after 2b0906f).',
        'refreshed). COMMITTED 2026-10-02 as MAIN 2178890 with the result note `passes/2026-10-02-h40d-result.md` (Opus\n  fact-check: 466 claims, 5 wrong, 7 unsupported, 19 omissions, all corrected) and `PREREGISTER-h40d-flash38-sidecar.md`.'],
    ['project_h40d_flight.md',
        '  - That is about +0.56 s of model time: offline TTFT p50 is 3973 against 3414 ms.',
        '  - Time cost is an ESTIMATE, not measured per answer: ~0.47 s at the registered ~2.9 ms/token (~0.56 s at a\n    Theil–Sen slope inflated by cue r1\'s slow spell); offline TTFT p50 3973 against 3414 ms.'],
    ['feedback_grade_bare_arms.md',
        'The flight already RUNS them every hour; h40c\'s and h40d\'s dispatch texts left them ungraded.',
        'The flight actually runs FOUR scripted-text arms: `high`, `low`, and the UNTAGGED `gemini-3.1-flash-lite` /\n`gemini-3.5-flash-lite` (no thinking flag; the registrations call THESE "bare"). On h40d only `high`/`low` were graded;\nthe untagged two printed SKIPPED-MISSING bare35/bare31. Say which arms ran and which were graded; a new\npre-registration should decide whether the untagged pair is graded too.'],
    ['MEMORY.md',
        'bare 27/30 vs in-app 28 of 33 mains',
        'bare 27/30 vs in-app 28 of 33 mains; result note committed MAIN 2178890'],
    ['MEMORY.md',
        'next: cue ruling → h40d result note → side fixes',
        'next: cue ruling → side fixes (h40d note committed 2178890)'],
];
for (const [f, a, b] of edits) {
    const t = fs.readFileSync(D + f, 'utf8');
    if (!t.includes(a)) { console.log(`REFUSED: ${f} lacks: ${a.slice(0, 60)}`); process.exit(2); }
}
for (const [f, a, b] of edits) {
    fs.writeFileSync(D + f, fs.readFileSync(D + f, 'utf8').replace(a, b));
    console.log(`ok ${f}`);
}
