// Fills section 2's hash cells in a COPY of the registration (PREREGISTER-turn-followup.md is never touched): writes section2-filled.md
// with every sha256 and byte count the table asks for, the per-block sha256 sub-table (spec 6(b): "the 8 gated blocks' sha256 frozen"),
// and a clearly delimited DRAFT block of the facts the controller dates into section 3 (gated sets, D-cases, s50k overlap, counts).
// Hashes, ids and counts only: no question text, no block text, no prompt. Controller tooling, not part of the replay; re-run it after
// ANY change to a hashed file, then re-run the self-tests (they verify section 2 first).
//   node fill-section2.mjs
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { HOURS, reportHour } from './gate-report-turn.mjs';
import { verifySection2, parseSection2, MAIN, JUDGE_REL, DISPATCH_FILE } from './R/scripts/common.mjs';

const FT = path.dirname(fileURLToPath(import.meta.url));
const SP = path.dirname(FT);
const sha = (b) => createHash('sha256').update(b).digest('hex');
const rel = (f) => path.relative(FT, f).replace(/\\/g, '/');
const entry = (f, relName = rel(f)) => { const b = fs.readFileSync(f); return { rel: relName, sha: sha(b), bytes: b.length }; };
const mjsIn = (dir) => fs.readdirSync(dir).filter((f) => f.endsWith('.mjs')).sort().map((f) => path.join(dir, f));
const cell = (list, key) => list.map((e) => `${e.rel} ${e[key]}`).join('<br>');

const src = fs.readFileSync(path.join(FT, 'PREREGISTER-turn-followup.md'), 'utf8');
const registeredSha = sha(Buffer.from(src, 'utf8'));
const OLD_REF = path.join(SP, 'followup-context/earlierQuestions.ref.mjs');
const FILTER = path.join(SP, 'dist-snapshots/main-precue-73d7f01/dist-electron/electron/llm/verbalStreamFilter.js');
const rows = [
    { start: '| `followup-turn/earlierQuestion.ref.mjs`', files: [path.join(FT, 'earlierQuestion.ref.mjs'), OLD_REF] },
    { start: '| `followup-turn/earlierQuestion.ref.test.mjs`', files: [path.join(FT, 'earlierQuestion.ref.test.mjs')] },
    { start: '| `followup-turn/gate-report-turn.mjs`', files: [path.join(FT, 'gate-report-turn.mjs'), path.join(FT, 'stamp-turn.mjs')] },
    { start: '| `R/s50m-gated-turn.json`', files: Object.keys(HOURS).map((h) => path.join(FT, 'R', `${h}-gated-turn.json`)) },
    { start: '| `R/turn-parity-s50m.json`', files: Object.keys(HOURS).map((h) => path.join(FT, 'R', `turn-parity-${h}.json`)) },
    { start: '| `R/scripts/*.mjs`', files: mjsIn(path.join(FT, 'R', 'scripts')) },
    { start: '| `R/legs-decide.mjs`', files: mjsIn(path.join(FT, 'R')) },
    { start: '| `followup-questions-s50l/followup-replay-build.precue.mjs`', files: [path.join(SP, 'followup-questions-s50l/followup-replay-build.precue.mjs')] },
    { start: '| `SP/dist-snapshots/main-precue-73d7f01/', files: [FILTER] },
    { start: '| `MAIN/electron/test/golden/interview60.judge.mjs`', files: [path.join(MAIN, JUDGE_REL.slice(5))], names: [JUDGE_REL] },
    { start: '| `SP/validation-hour/h40d-grader-dispatch.txt`', files: [DISPATCH_FILE] },
];
// A2 point 6 (M1): two rows the registered table does not have yet. They are inserted (empty cells) when absent, then filled like every other row.
const NEW_ROWS = [
    '| `MAIN/electron/test/golden/interview60.judge.mjs` | | | the judge module: questionForGrader (blind builder), verdictOf (decide), graderPromptVersion; verified by the runner, the blind builder, check-grader-questions and decide (A2 M1) |',
    '| `SP/validation-hour/h40d-grader-dispatch.txt` | | | the grader dispatch text, h40d\'s verbatim, sha256 f8d64670…81cd, 9,064 bytes (A2 M1) |',
];
const lines = src.split('\n');
const a = lines.findIndex((l) => l.startsWith('| File | sha256'));
if (a < 0) throw new Error('table header not found');
let end = a + 2;
while (lines[end]?.startsWith('|')) end++;
const insertedRows = [];
for (const nr of NEW_ROWS) if (!lines.slice(a + 2, end).some((l) => l.slice(0, 40) === nr.slice(0, 40))) { lines.splice(end, 0, nr); end++; insertedRows.push(nr); }
const used = new Set();
for (let i = a + 2; i < end; i++) {
    const row = rows.find((r) => lines[i].startsWith(r.start));
    if (!row) throw new Error(`no filler for table row: ${lines[i].slice(0, 60)}`);
    used.add(row);
    const cells = lines[i].split('|');                  // ['', c1, c2, c3, c4, '']
    const es = row.files.map((f, k) => entry(f, row.names?.[k]));
    cells[2] = ` ${cell(es, 'sha')} `;
    cells[3] = ` ${cell(es, 'bytes')} `;
    if (row.start.includes('earlierQuestion.ref.mjs')) cells[4] = `${cells[4].trimEnd()} (filled: the design-2 reference row below the reference's own must read 0459f578...) `;
    lines[i] = cells.join('|');
}
if (used.size !== rows.length) throw new Error('a filler row was not used');

// facts and the per-block sha256 sub-table
const facts = [], blockRows = [];
const rep = {};
for (const hour of Object.keys(HOURS)) {
    const r = await reportHour(hour);
    rep[hour] = r;
    for (const [key, o] of Object.entries(r.gated)) blockRows.push(`| ${key} | ${sha(o.block)} | ${o.block.length} |`);
}
const sub = ['', '**Gated block hashes (sha256 of the block text, label included; spec 6(b), clause 6 "the block hashes equal section 2\'s"):**', '', '| Gated block | sha256 | chars |', '|---|---|---|', ...blockRows, ''];
lines.splice(end, 0, ...sub);

let text = lines.join('\n');
const stamp = new Date().toLocaleString('sv-SE', { hour12: false });
// A2 point 6 (M9): the facts the controller used to date into section 3 by hand are written INTO section 3 here, as the dated I3 note, between
// two markers, before the file is hashed -- there is no DRAFT block after A1 any more.
const draft = [];
draft.push('', `**I3 note (dated ${stamp}; generated by fill-section2.mjs from gate-report-turn.mjs / stamp-turn.mjs; ids, counts and hashes only; A2 point 6, M9) -- facts as recorded:**`, '');
for (const hour of Object.keys(HOURS)) {
    const r = rep[hour];
    const gatedIds = r.rows.filter((x) => x.blockChars).map((x) => `${x.id} (${x.cue}, ${x.blockChars} chars, parent ${x.ageS} s earlier)`);
    const cueSilent = r.rows.filter((x) => x.cue !== 'none' && !x.blockChars).map((x) => `${x.id}:${x.why}`);
    const dOk = r.dcases.filter((d) => d.ok).map((d) => `${d.key.split(':')[1]}=${d.rosterId} stand-in ${d.standInId} ${d.gapS} s earlier, block ${d.blockChars} chars`);
    const dBad = r.dcases.filter((d) => !d.ok).map((d) => `${d.key.split(':')[1]} REFUSED (${d.why})`);
    const withBlock = Object.values(r.parity).filter((p) => p.expectedBlock).length;
    draft.push(`- ${hour}: ${r.dispatches.length} dispatch lines (${r.dispatches.filter((d) => d.kind === 'answer').length} answer / ${r.dispatches.filter((d) => d.kind === 'supersede').length} supersede), ${Object.keys(r.PROMPTS).length} captured ids; gated set (${gatedIds.length}): ${gatedIds.join('; ')}; cue fired, block '' (${cueSilent.length}): ${cueSilent.join(' ')}; D-cases: ${dOk.join('; ')}${dBad.length ? `; ${dBad.join('; ')}` : '; none refused'}; parity fixture ${Object.keys(r.parity).length} entries (${withBlock} with a block, ${Object.keys(r.parity).length - withBlock} empty).`);
}
const idsK = Object.keys(rep.s50k.PROMPTS);
for (const other of ['s50m', 's50l']) {
    const ident = idsK.filter((id) => rep[other].PROMPTS[id] && rep[other].PROMPTS[id].user === rep.s50k.PROMPTS[id].user);
    draft.push(`- s50k userA overlap with ${other}: byte-identical ${ident.length}/${idsK.length} [${ident.join(' ') || 'none'}].`);
}
draft.push('- Registered expectations (section 3) vs the recorded reports: s50m and s50l gated sets MATCH (S1Q04F, S1Q06F, S2Q05F, S2Q08F; S1Q08, S2Q08, S2Q09F, S2Q01F cue-silent with the parent in the prompt; block sizes 537/517/461/432 chars on s50m). See gate-report-turn.out.txt.',
    `- Reviewed text sha256 (PREREGISTER-turn-followup.md as of this fill): ${registeredSha} (the reviewed revision was 1cec308c...; the controller's diff check against it is step 12.4).`, '');
const NOTE_BEGIN = '<!-- I3-NOTE-BEGIN -->', NOTE_END = '<!-- I3-NOTE-END -->';
const at4 = text.indexOf('\n## 4.');
if (at4 < 0) throw new Error('section 4 heading not found: nowhere to put the I3 note');
text = `${text.slice(0, at4)}\n${NOTE_BEGIN}${draft.join('\n')}\n${NOTE_END}\n${text.slice(at4)}`;
const outFile = path.join(FT, 'section2-filled.md');
fs.writeFileSync(outFile, text);

// Step 12.4's diff check (m3, A2 M9), made mechanical: the filled copy may differ from the registered text ONLY in section 2's hash/bytes/note
// cells, the two new rows, the "Gated block hashes" table and the dated I3 note. Everything else (rows' first cells, every other line) must be
// byte-identical once those are normalized away.
function normalizeForDiff(t) {
    t = t.split(NOTE_BEGIN).map((part, i) => (i === 0 ? part : part.slice(part.indexOf(NOTE_END) + NOTE_END.length))).join('');
    const out = [];
    let inS2 = false;
    for (const l of t.split('\n')) {
        if (l.startsWith('## ')) inS2 = l.startsWith('## 2.');
        if (inS2 && l.startsWith('|')) {
            if (/^\| s50[mlk]:/.test(l) || l.startsWith('| Gated block |') || /^\|---\|---\|---\|$/.test(l)) continue;
            const c = l.split('|');
            if (c[1].startsWith(' `MAIN/electron/test/golden/interview60.judge.mjs`') || c[1].startsWith(' `SP/validation-hour/h40d-grader-dispatch.txt`')) continue;
            out.push(`|${c[1]}|`); continue;
        }
        if (inS2 && l.startsWith('**Gated block hashes')) continue;
        if (l.trim()) out.push(l);
    }
    return out;
}
{
    const a = normalizeForDiff(src), b = normalizeForDiff(text);
    const bad = a.length !== b.length ? Math.min(a.length, b.length) : a.findIndex((l, i) => l !== b[i]);
    if (bad >= 0 && (a.length !== b.length || a[bad] !== b[bad])) { console.log(`DIFF CHECK (12.4) FAILED at normalized line ${bad + 1}: registered "${(a[bad] ?? '').slice(0, 80)}" vs filled "${(b[bad] ?? '').slice(0, 80)}"`); process.exit(1); }
    console.log(`DIFF CHECK (12.4) OK: the filled copy differs from the registered file only in section 2 cells, ${insertedRows.length ? `${insertedRows.length} inserted row(s)` : 'no inserted row (already present)'}, the Gated block hashes table and the dated I3 note (${a.length} normalized lines identical)`);
}
// R/MANIFEST.txt (registration section 8: "the three *-gated-turn.json (hash in MANIFEST.txt, file never committed)"): hashes only
const man = [`MANIFEST of followup-turn/R (generated ${stamp} by fill-section2.mjs). The gated files carry the user's profile: hash only, never committed.`, ''];
for (const h of Object.keys(HOURS)) for (const f of [`R/${h}-gated-turn.json`, `R/turn-parity-${h}.json`]) { const e = entry(path.join(FT, f)); man.push(`${e.sha}  ${e.bytes} bytes  ${f}`); }
man.push('', 'gated blocks (sha256 of the block text, chars):', ...blockRows.map((r) => r.replace(/^\| /, '').replace(/ \|$/, '').split(' | ').join('  ')));
fs.writeFileSync(path.join(FT, 'R', 'MANIFEST.txt'), `${man.join('\n')}\n`);

// verify what was written
const v = verifySection2(outFile);
const p = parseSection2(fs.readFileSync(outFile, 'utf8'));
console.log(`wrote section2-filled.md (${text.length} chars); registered file sha256 ${registeredSha} (untouched)`);
console.log(`section 2 of the copy: ${p.files.size} hashed files, ${p.blocks.size} gated block hashes -> ${v.ok ? 'VERIFIES against the files on disk' : `DOES NOT VERIFY: ${v.problems.join(' | ')}`}`);
for (const [rel_, e] of p.files) console.log(`${rel_}\t${e.sha.slice(0, 16)}...\t${e.bytes} bytes`);
process.exit(v.ok ? 0 : 1);
