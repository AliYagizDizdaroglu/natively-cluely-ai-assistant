// Step 16: stages the s50l pass record (RUNBOOK 16) in F/record/ and writes MANIFEST.txt with every file's sha256.
// s50l-gated.json (captured prompts = the user's profile) is NEVER copied: only its sha256 goes into the MANIFEST,
// as adb25a8 did for s50m-gated.json. Prints the MAIN-relative paths for copy-to-main / the commit.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
const F = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1'));
const SP = path.dirname(F), FC = path.join(SP, 'followup-context');
const OUT = path.join(F, 'record'), REL = 'electron/test/golden/passes/2026-10-03-followup-questions';
const sha = (p) => createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const files = [
    ...fs.readdirSync(F).filter((f) => /^interview60\.answers\./.test(f)).map((f) => [path.join(F, f), f]),
    ...fs.readdirSync(path.join(F, 'blind')).filter((f) => /^(key|pairs|verdicts)\.blind-\d|^graders\.json$/.test(f)).map((f) => [path.join(F, 'blind', f), `blind/${f}`]),
    ...['run.log', 'run-pass.out.txt', 'RESULT-pooled.txt', 'RESULT-s50l-alone.txt', 'grader-agents.txt', 'grader-models.out.txt', 'probe-model.out.txt', 'audit-graders.out.txt',
        'AMENDMENT-s50l.fable.md', 'AMENDMENT-s50l.md', 'AMENDMENT-REVIEW.md', 'PREP-REVIEW.md', 'RUNBOOK.md'].map((f) => [path.join(F, f), f]),
    [path.join(FC, 's50l-parity-fixture.json'), 's50l-parity-fixture.json'],
];
for (const [src] of files) if (!fs.existsSync(src)) { console.log(`MISSING ${src}`); process.exit(2); }
for (const [src, dst] of files) { if (/s50l-gated\.json$/.test(src)) { console.log('REFUSED: s50l-gated.json'); process.exit(2); } }
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, 'blind'), { recursive: true });
const lines = [];
for (const [src, dst] of files) { fs.copyFileSync(src, path.join(OUT, dst)); lines.push(`${sha(src)}  ${dst}`); }
const notCommitted = [
    ['followup-context/s50l-gated.json', path.join(FC, 's50l-gated.json')],
    ['followup-context/PREREGISTER-followup-questions.md (committed in adb25a8)', path.join(FC, 'PREREGISTER-followup-questions.md')],
    ['followup-context/earlierQuestions.ref.mjs', path.join(FC, 'earlierQuestions.ref.mjs')],
    ['followup-context/gate-report-s50l.mjs', path.join(FC, 'gate-report-s50l.mjs')],
    ['followup-context/stamp-s50l.mjs', path.join(FC, 'stamp-s50l.mjs')],
    ['pooled-decide.mjs', path.join(F, 'pooled-decide.mjs')],
    ['audit-graders.mjs', path.join(F, 'audit-graders.mjs')],
];
const manifest = [
    '# MANIFEST — the ONE pooled s50l re-run (PREREGISTER-followup-questions.md §7 + AMENDMENT-s50l.fable.md), run 2026-10-03',
    '# Thursday\'s half (s50m) is committed in adb25a8 (passes/2026-10-01-followup-questions/); it is cited, not copied.',
    '',
    '## Files in this folder (sha256)',
    ...lines,
    '',
    '## Not committed, recorded by hash (s50l-gated.json holds the captured prompts = the user\'s profile; never committed)',
    ...notCommitted.map(([label, p]) => `${sha(p)}  ${label}`),
    '',
];
fs.writeFileSync(path.join(OUT, 'MANIFEST.txt'), manifest.join('\n'));
const rels = [...files.map(([, dst]) => dst), 'MANIFEST.txt'];
fs.writeFileSync(path.join(F, 'record-paths.txt'), rels.map((r) => `${REL}/${r}`).join('\n') + '\n');
console.log(`staged ${rels.length} files in record/; paths in record-paths.txt`);
