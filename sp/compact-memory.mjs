// compact-memory.mjs — throwaway: shorten three oversized index lines in MEMORY.md (the detail
// already lives in their topic files; verified by grep before writing this). Replaces a line by
// its exact prefix; refuses unless each prefix matches exactly one line.
import fs from 'node:fs';

const FILE = 'C:/Users/sotka/.claude/projects/C--Users-sotka-OneDrive-Masa-st--natively-cluely-ai-assistant/memory/MEMORY.md';
const replacements = [
    ['- [Thinking-level flights + bench](project_thinking_flights.md)',
     '- [Thinking-level flights + bench](project_thinking_flights.md) — 2026-09-16→21: lite honours LOW/HIGH not MEDIUM; bench proved LOW (+21/117) → shipped d2a6c72 (LOW default, stall budget 10 s); 3.5-lite ignores LOW, at HIGH ties 3.1 LOW but is much SHORTER (the open length lever); per-model thinking fix 78b0671 (fallback 3.5-lite gets HIGH); the BAND METHOD (offline twin ×3 = noise floor of 4–5, band vs band decides, any single arm judged against one rep overstates by up to 4); s50i/s50j/s50k records (live hour above the 3.1 band twice, zero wrong, length row fails as predicted); s50l 2026-09-21 = PROOF FLIGHT for 3.5-lite HIGH via NATIVELY_VERBAL_PRIMARY_MODEL (main 4903f2d, LaTeX-number fix, filterCodeFences moved so offline arms suppress fences — arm delivery scores no longer comparable with earlier flights), behavioural launcher guard guard-s50l.mjs; every number, prediction and lesson is in the file'],
    ['- [Whole-turn design](project_whole_turn_design.md)',
     '- [Whole-turn design](project_whole_turn_design.md) — 2026-09-09 spec: answer the whole interviewer turn (VAD-gated 1.2 s, unfinished hold 2.5 s, 8 s continuation supersedes in place, both ears) + part-scaled structured shape; replay lessons (fail-safe clocked from VAD off-transitions, never clamp replay timestamps); s50b→s50e flights: General-mode prompt leak root-caused (e0829dd), the app\'s own word cut replaced by SPOKEN_WORD_GUARD (200 words), delivery-0 cliff ≤154 ok / ≥158 dead, s50e 16/20 with every miss length alone → next lever = shorter answers via the PROMPT, not a clamp; the user allowed ONE local-only pass over a recording, never upload or name it'],
    ['- [Cue mode next](project_cue_mode_next.md)',
     '- [Cue mode next](project_cue_mode_next.md) — spec APPROVED and plan EXECUTED 2026-09-21 via subagent-driven-development (all seats sonnet): ALL 7 TASKS LANDED on the whole-turn worktree branch (8682b32 … 49183fc), gates green, live --cues smoke passed on 2 captured ids, final whole-branch review in flight; ledger at worktree .superpowers/sdd/2026-09-21-cue-mode/progress.md; NO merge to MAIN until Tasks 8–9 (bench on s50m twins on a flight-free day, scheduled-task smoke, s50m graded, holdout baseline flown)'],
];

const before = fs.readFileSync(FILE, 'utf8');
const lines = before.split('\n');
for (const [prefix, line] of replacements) {
    const hits = lines.map((l, i) => (l.startsWith(prefix) ? i : -1)).filter((i) => i >= 0);
    if (hits.length !== 1) { console.error(`refusing: prefix matched ${hits.length} lines: ${prefix}`); process.exit(2); }
    lines[hits[0]] = line;
}
const after = lines.join('\n');
fs.writeFileSync(FILE, after);
console.log(`MEMORY.md ${Buffer.byteLength(before)} -> ${Buffer.byteLength(after)} bytes`);
