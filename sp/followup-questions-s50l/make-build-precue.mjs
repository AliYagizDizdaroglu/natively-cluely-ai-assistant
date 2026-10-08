// §6.2 of PREREGISTER-followup-questions.md: the calibration builder must load the PRE-cue dist when MAIN's dist no
// longer reproduces the pre-cue prompts (cue mode is merged). Copies MAIN's followup-replay-build.mjs into this folder
// with ONLY its three dist-electron requires pointed at the snapshot main-precue-73d7f01; everything else (the judge,
// the roster, the logic) is the file as committed. Refuses unless each anchor matches exactly once.
import fs from 'node:fs';
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
let s = fs.readFileSync(`${MAIN}/electron/test/golden/passes/2026-09-26-followup-replay/scripts/followup-replay-build.mjs`, 'utf8');
const SNAP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/dist-snapshots/main-precue-73d7f01';
for (const mod of ['followUpParent', 'transcriptCleaner', 'lastInterviewerTurn']) {
    const a = `require(path.join(MAIN, 'dist-electron/electron/llm/${mod}.js'))`;
    const n = s.split(a).length - 1;
    if (n !== 1) { console.log(`REFUSED: ${mod} anchor found ${n} times`); process.exit(2); }
    s = s.replace(a, `require(path.join('${SNAP}', 'dist-electron/electron/llm/${mod}.js'))`);
}
s = `// COPY of MAIN passes/2026-09-26-followup-replay/scripts/followup-replay-build.mjs with its three dist requires\n// pointed at the PRE-cue snapshot (make-build-precue.mjs). Do not edit by hand.\n${s}`;
fs.writeFileSync(new URL('./followup-replay-build.precue.mjs', import.meta.url), s);
console.log('wrote followup-replay-build.precue.mjs');
