// Compacts the memory index: each listed entry's line is replaced by a one-line pointer (details verified present in
// the topic file first), the placeholder line is removed, two new entries are added. Refuses unless every key matches
// exactly one line. Prints sizes only.
import fs from 'node:fs';
const F = 'C:/Users/sotka/.claude/projects/C--Users-sotka-OneDrive-Masa-st--natively-cluely-ai-assistant/memory/MEMORY.md';
const src = fs.readFileSync(F, 'utf8');
let lines = src.split('\n');
const REPL = {
    'project_agenda.md': '- [Agenda](project_agenda.md) — lives in SP AGENDA.md; h40d done (cue FAIL); next: cue ruling → h40d result note → side fixes → Sat follow-up re-run → pipeline reliability checkpoint → paid 3.8 Flash',
    'project_hedge_simulation.md': '- [Hedge simulation + live probe](project_hedge_simulation.md) — 3.5-lite front + 3.1-lite back; h40c PASS 2026-09-29 → default ON in MAIN (f745d7e); read the won-by line, not the first answer-source line',
    'project_not_a_question_close.md': '- [not-a-question close](project_not_a_question_close.md) — the turn machine forgets closed turns, so late evidence is misassigned (23 of 24 closes were real questions); fix proposed, lands after Fri',
    'project_offers_before_answer.md': '- [Offers before answer](project_offers_before_answer.md) — cue replies with `__MORE__` offers BEFORE the spoken answer lost the answer (9 of 624; fixed d83fdfe); test filters through the BUILT chain',
    'project_flight_leaves_app_open.md': "- [Flight leaves app open](project_flight_leaves_app_open.md) — flights left the app open in its meeting; fixed by process.on('exit', appStop) (97fc38d); Ctrl+C or a killed task still needs app:stop",
    'project_model_fitness_by_path.md': '- [Model fitness by path](project_model_fitness_by_path.md) — Gemma without thinking never wins on accuracy; its fit is offline/Ollama + an uncorrelated fallback leg',
    'tooling_flight_launchers.md': "- [Flight launcher guards](tooling_flight_launchers.md) — run a launcher's guard chain before arming; worktree launchers need the key wrapper, their own preconditions and MAIN's untracked assets; edit CRLF .cmd files with node, never `sed -i`",
    'tooling_powershell_bom_nonascii.md': '- [PowerShell BOM + non-ASCII](tooling_powershell_bom_nonascii.md) — Masaüstü paths: save .ps1 with a BOM, copy long paths with node, filter the Masa* wildcard by .git, run npm via `cmd /c`',
    'project_followup_earlier_questions.md': '- [Follow-up earlier questions](project_followup_earlier_questions.md) — gated questions-only block (94adb6f); replay INCONCLUSIVE 2026-10-01 (+3, needs +4) → ONE pooled s50l re-run Sat 3 Oct after 10:00 on the pre-cue dist snapshot; nothing built before it',
};
for (const [file, line] of Object.entries(REPL)) {
    const hits = lines.map((l, i) => (l.startsWith('- [') && l.includes(`](${file})`) ? i : -1)).filter((i) => i >= 0);
    if (hits.length !== 1) { console.log(`REFUSED: ${file} matched ${hits.length} lines`); process.exit(2); }
    lines[hits[0]] = line;
}
const del = lines.filter((l) => l.startsWith('- DELETE-ME-OLD-38:')).length;
if (del !== 1) { console.log(`REFUSED: placeholder lines ${del}`); process.exit(2); }
lines = lines.filter((l) => !l.startsWith('- DELETE-ME-OLD-38:'));
const add = [
    ['feedback_grade_bare_arms.md', '- [Grade a feature\'s own output](feedback_grade_feature_output.md) — user 2026-10-02: grade the cues themselves, not only their shape and their effect on the answer'],
    ['project_system_audio_contamination.md', '- [h40d flight](project_h40d_flight.md) — 2026-10-02 cue validation hour: CUE-ATTRIBUTABLE FAIL (2c +161 vs +150); 36/44; misses 4 pipeline / 1 premise / 4 sampling; bare 27/30 vs in-app 28 of 33 mains'],
];
for (const [after, line] of add) {
    if (lines.some((l) => l.includes(line.slice(3, 30)))) { console.log(`skip (present): ${line.slice(0, 40)}`); continue; }
    const i = lines.findIndex((l) => l.startsWith('- [') && l.includes(`](${after})`));
    if (i < 0) { console.log(`REFUSED: anchor ${after} absent`); process.exit(2); }
    lines.splice(i + 1, 0, line);
}
const out = lines.join('\n');
fs.writeFileSync(F, out);
console.log(`MEMORY.md: ${Buffer.byteLength(src)} -> ${Buffer.byteLength(out)} bytes, ${src.split('\n').length} -> ${lines.length} lines`);
