// Assembles the replay's evidence folder (PREREGISTER-followup-questions.md §9) under ./evidence, for the controller
// to copy into MAIN's passes/2026-10-01-followup-questions/ after the cue merge: prompts.A.json / prompts.B.json
// (derived from the frozen s50m-gated.json: {id: {system, user}} per arm), parity-fixture.json, the six answer
// files, blind/ (pairs, keys, verdicts, graders.json), RESULT.txt, run.log, grader-models.out.txt, the
// pre-registration (byte copy) and a MANIFEST.txt with every file's sha256 and the pre-registration's mtime.
// Refuses to overwrite an existing evidence folder. Prints names, sizes and hashes only.
//   node assemble-evidence.mjs
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { CONTEXT, IDS, REPS, ARMS, fileFor, loadGated } from './scripts/common.mjs';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, 'evidence');
if (fs.existsSync(OUT)) { console.log(`REFUSED: ${OUT} exists`); process.exit(2); }
fs.mkdirSync(path.join(OUT, 'blind'), { recursive: true });
const sha = (b) => createHash('sha256').update(b).digest('hex');
const manifest = [];
const put = (name, buf, note = '') => { const p = path.join(OUT, name); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, buf); if (Buffer.compare(buf, fs.readFileSync(p)) !== 0) { console.log(`COPY MISMATCH ${name}`); process.exit(3); } manifest.push(`${sha(buf)}  ${String(buf.length).padStart(8)}  ${name}${note ? `  (${note})` : ''}`); };
const copy = (src, name, note) => put(name, fs.readFileSync(src), note);

const { G } = await loadGated();
const A = {}, B = {};
for (const id of IDS) { A[id] = { system: G[id].system, user: G[id].userA }; B[id] = { system: G[id].system, user: G[id].userB }; }
put('prompts.A.json', Buffer.from(JSON.stringify(A, null, 1)), 'derived from s50m-gated.json: system + userA');
put('prompts.B.json', Buffer.from(JSON.stringify(B, null, 1)), 'derived from s50m-gated.json: system + userB');
copy(path.join(CONTEXT, 's50m-gated.json'), 's50m-gated.json');
copy(path.join(CONTEXT, 'parity-fixture.json'), 'parity-fixture.json');
for (const arm of ARMS) for (const r of REPS) copy(fileFor(arm, r), path.basename(fileFor(arm, r)));
for (const f of fs.readdirSync(path.join(HERE, 'blind'))) copy(path.join(HERE, 'blind', f), `blind/${f}`);
for (const f of ['RESULT.txt', 'run.log', 'grader-models.out.txt', 'grader-agents.txt', 'dry-run.out.txt', 'blind.out.txt', 'quota.out.txt', 'cal-ok.out.txt', 'cal-break.out.txt', 'stamp.out.txt', 'decide-calibrate.out.txt', '2026-10-01-followup-questions-result.md']) copy(path.join(HERE, f), f);
const pre = path.join(CONTEXT, 'PREREGISTER-followup-questions.md');
copy(pre, 'PREREGISTER-followup-questions.md', `mtime ${fs.statSync(pre).mtime.toISOString()}`);
const keyCount = fs.readdirSync(path.join(OUT, 'blind')).filter((f) => f.startsWith('key.')).length;
if (keyCount !== 4) { console.log(`REFUSED: expected 4 key files in blind/, found ${keyCount} (were they moved back?)`); process.exit(2); }
fs.writeFileSync(path.join(OUT, 'MANIFEST.txt'), `evidence assembled ${new Date().toISOString()}\n${manifest.join('\n')}\n`);
console.log(`${manifest.length} files -> ${OUT}`);
for (const m of manifest) console.log(m.slice(0, 12) + m.slice(64));
