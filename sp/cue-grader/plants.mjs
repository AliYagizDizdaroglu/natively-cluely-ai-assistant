// plants.mjs: the calibration plant builder (SPEC 3.1-3.3). Material: scenario50's graded eq run ONLY. Read-only on RUNS; it writes LAB\plants\ (plan, review packet, plant records) and,
// through export.mjs, the three blind calibration files + their key. No model call.
//   node plants.mjs --bases        prints the base filter and the seeded 16/rest split (ids and counts)
//   node plants.mjs --build        builds the 48 plants from plants.author.json, validates the plan, writes LAB\plants\plants.json and the review packet
// Authoring (SPEC 3.1.1): the edits are written in plants.author.json, which holds text and so lives in LAB\plants\. The plant REVIEWER (a separate Opus agent) checks every expected
// label and every base's cue block before any grader runs: this file only enforces what is mechanical (structure, minimal pairs, kind counts, file placement, the cut rule).
import fs from 'node:fs';
import path from 'node:path';
import { LAB, dirsOf, readJson, writeJson, shuffled, sha12, wordsOf, shapeFlags, CUE_MAX_LINES, CUE_MAX_WORDS } from './lib.mjs';
import { extractInApp, answerGrades } from './extract.mjs';
import { distTrimCues } from './trim.mjs';

export const KINDS = ['good', 'wrong_fact', 'off_question', 'repeats', 'filler', 'cut', 'contradicts', 'missing', 'halo'];
export const MUTANT_KINDS = KINDS.filter((k) => k !== 'good');
/** Expected derived verdict per kind (SPEC 3.2). `flag` is what the plant must show on the scorer's axes. */
export const EXPECT = {
    good: { verdict: 'good' }, wrong_fact: { verdict: 'wrong' }, off_question: { verdict: 'wrong' }, repeats: { verdict: 'wrong' },
    filler: { verdict: 'weak', note: 'G <= 1 on the changed lines' }, cut: { verdict: 'weak', note: 'G 0 on the cut line' },
    contradicts: { verdict: 'weak', note: 'K 0, every line C >= 1' }, missing: { verdict: 'weak', note: 'V 1' },
    halo: { verdict: 'weak', note: 'K 0, every line C 2; NOT wrong' },
};
export const BAD_KINDS = ['wrong_fact', 'off_question', 'repeats', 'filler', 'cut', 'contradicts'];       // planted bad = 24
export const MUST_BE_WRONG = ['wrong_fact', 'off_question', 'repeats'];                                      // 12
export const SPLIT_SEED_BASE = 'cue-grader-plants';
export const N_SHOWN = 16;
// Structural facts about the questions of the usable bases, fixed BEFORE the split (read once from the roster text; they only constrain the seeded split):
export const ONE_LINE_ELIGIBLE = ['S1Q03F', 'S1Q08F', 'S2Q07F', 'S2Q09F', 'S2Q10'];                         // single-part questions: a one-line block can be a complete answer
export const MANY_PART = ['S1Q01', 'S1Q05', 'S1Q07', 'S1Q10', 'S2Q01', 'S2Q07', 'S2Q08', 'S2Q05', 'S2Q06', 'S2Q03F', 'S2Q10F', 'S1Q10F', 'S1Q01F'];
export const MISSING_ELIGIBLE = ['S1Q01', 'S1Q07', 'S1Q10', 'S2Q08', 'S2Q06', 'S2Q05', 'S2Q03F', 'S1Q07F', 'S1Q10F', 'S2Q10F', 'S2Q08F', 'S1Q01F', 'S2Q01', 'S2Q07', 'S1Q09F', 'S1Q06F'];

// Bases the plant reviewer ruled out (REVIEW-KIT.md 2026-10-07): a 'good' block must cover every named part of its question.
export const REPLACED_BASES = ['S1Q02F', 'S2Q01', 'S1Q07', 'S2Q05'];
/**
 * The eq bases: in-app blocks whose flight answer is acceptable (SPEC 3.1.1). RULE (coordinator ruling 2026-10-07): a block whose display trimCues only CLEANED (whitespace, bullets,
 * sentinel) is admitted; a block where trimCues CUT or DROPPED lines or words is excluded (a dangling line is not a good base); the reviewer's REPLACED_BASES are excluded.
 */
export function eqBases() {
    const x = extractInApp('eq'), g = answerGrades('eq');
    const acceptable = x.blocks.filter((b) => g[b.pairKey] === 'acceptable');
    const usable = acceptable.filter((b) => !b.displayCut && !b.empty && b.cues.length >= 1 && !REPLACED_BASES.includes(b.id));
    return { acceptable, usable: usable.sort((a, b) => a.id.localeCompare(b.id)), excluded: acceptable.filter((b) => !usable.includes(b)).map((b) => b.id).sort() };
}
/** The seeded split into shown bases (16) and the hidden reserve (the rest). The seed index is bumped (and recorded) until the structural constraints hold. */
export function splitBases(usable) {
    const ids = usable.map((b) => b.id);
    for (let k = 1; k <= 200; k++) {
        const order = shuffled(ids, `${SPLIT_SEED_BASE}-${k}`), shown = order.slice(0, N_SHOWN).sort(), hidden = order.slice(N_SHOWN).sort();
        const ok = shown.filter((i) => ONE_LINE_ELIGIBLE.includes(i)).length >= 4 && shown.filter((i) => MANY_PART.includes(i)).length >= 4 && shown.filter((i) => MISSING_ELIGIBLE.includes(i)).length >= 8;
        if (ok) {
            // reviewer ruling 2026-10-07 (REVIEW-KIT-2): S2Q07's block misses named parts; the reserve base S1Q10 (a line for authentication, authorization, secrets and environments) takes its place
            const i = shown.indexOf('S2Q07'), j = hidden.indexOf('S1Q10');
            if (i >= 0 && j >= 0) { shown[i] = 'S1Q10'; hidden[j] = 'S2Q07'; shown.sort(); hidden.sort(); }
            return { seedIndex: k, shown, hidden };
        }
    }
    throw new Error('no seed in 1..200 satisfies the structural constraints');
}

// ---------------------------------------------------------------- the build
const dirs = dirsOf(LAB);
const nWords = (s) => wordsOf(s).length;

/** Applies one author edit to a base; returns { cues, answer } and throws (naming the plant) on a violated minimal-pair rule. */
export function applyEdit(base, edit, kind, ctx) {
    const label = `${base.id}/${kind}`;
    const must = (c, why) => { if (!c) throw new Error(`plant ${label}: ${why}`); };
    const lines = [...base.cues];
    let cues = lines, answer = base.answer;
    const changed = (a, b) => a.map((l, i) => (b[i] !== l ? i : -1)).filter((i) => i >= 0);
    switch (kind) {
        case 'wrong_fact': {
            must(Number.isInteger(edit.line) && edit.line >= 0 && edit.line < lines.length && typeof edit.text === 'string', 'needs {line, text}');
            cues = lines.map((l, i) => (i === edit.line ? edit.text : l)); must(changed(lines, cues).length === 1, 'exactly one line is edited');
            break;
        }
        case 'contradicts': {
            must(Number.isInteger(edit.line) && typeof edit.text === 'string', 'needs {line, text}');
            cues = lines.map((l, i) => (i === edit.line ? edit.text : l)); must(changed(lines, cues).length === 1, 'exactly one line is edited');
            break;
        }
        case 'filler': {
            must(Array.isArray(edit.replace) && edit.replace.length >= 1, 'needs {replace:[{line,text}]}');
            cues = [...lines]; for (const r of edit.replace) { must(r.line >= 0 && r.line < lines.length, 'line out of range'); cues[r.line] = r.text; }
            must(changed(lines, cues).length === edit.replace.length, 'every replaced line differs from the base');
            break;
        }
        case 'cut': {
            must(Number.isInteger(edit.line) && typeof edit.fullPhrase === 'string', 'needs {line, fullPhrase}');
            must(nWords(edit.fullPhrase) >= CUE_MAX_WORDS + 1, 'the full phrase has at least 6 words (it is the over-long line trimCues cuts)');
            const t = distTrimCues()(lines.map((l, i) => (i === edit.line ? edit.fullPhrase : l)), CUE_MAX_LINES, CUE_MAX_WORDS);
            must(t.cut.length === 1 && t.cut[0] === edit.fullPhrase, 'trimCues cuts exactly that one line');
            cues = t.cues; must(changed(lines, cues).length === 1 && nWords(cues[edit.line]) === CUE_MAX_WORDS, 'the displayed line is the first 5 words');
            break;
        }
        case 'missing': {
            must(lines.length >= 2 && Number.isInteger(edit.removeLine) && edit.removeLine >= 0 && edit.removeLine < lines.length, 'needs a base of >= 2 lines and {removeLine}');
            cues = lines.filter((_, i) => i !== edit.removeLine);
            break;
        }
        case 'off_question': {
            const donor = ctx.shown.find((b) => b.id === edit.donor);
            must(donor && donor.id !== base.id, 'the donor is another SHOWN base (a hidden base is never a donor)');
            must(ctx.topicOf(donor.id) === ctx.topicOf(base.id), 'the donor is on the same topic');
            cues = [...donor.cues];
            break;
        }
        case 'repeats': {
            must(Number.isInteger(edit.line) && typeof edit.cueText === 'string' && typeof edit.answerFind === 'string' && typeof edit.answerReplace === 'string', 'needs {line, cueText, answerFind, answerReplace}');
            must(base.answer.split(edit.answerFind).length === 2, 'answerFind occurs exactly once in the answer');
            answer = base.answer.replace(edit.answerFind, () => edit.answerReplace); must(answer !== base.answer, 'the answer changed');
            cues = lines.map((l, i) => (i === edit.line ? edit.cueText : l)); must(changed(lines, cues).length === 1, 'exactly one cue line is edited');
            break;
        }
        case 'halo': {
            must(typeof edit.answerFind === 'string' && typeof edit.answerReplace === 'string' && Number.isInteger(edit.contradictsLine), 'needs {answerFind, answerReplace, contradictsLine}');
            must(base.answer.split(edit.answerFind).length === 2, 'answerFind occurs exactly once in the answer');
            answer = base.answer.replace(edit.answerFind, () => edit.answerReplace); must(answer !== base.answer, 'the answer changed');
            cues = [...lines];                                                        // the cues are kept exactly as they are
            break;
        }
        default: throw new Error(`plant ${label}: unknown kind`);
    }
    must(cues.length >= 1 && cues.length <= CUE_MAX_LINES, 'a displayed block has 1-3 lines');
    must(cues.every((c) => c.trim() !== ''), 'no empty line');
    must(shapeFlags(cues).length === 0, `the plant respects the display shape (${shapeFlags(cues).join(',')})`);
    return { cues, answer };
}

/** Assigns every base a file 1..3 (seeded, balanced as far as the plan allows). Mutants go to the base's two other files, one each. */
export function assignFiles(shownIds, seed = `${SPLIT_SEED_BASE}-files`) {
    const order = shuffled(shownIds, seed), fileOf = {};
    order.forEach((id, i) => { fileOf[id] = (i % 3) + 1; });
    return fileOf;
}

/**
 * The 48 plants. `author` = { oneLine: {baseId: text}, plants: { baseId: [ {kind, ...edit}, {kind, ...edit} ] } }.
 * Checks: 16 bases, 4 one-line goods, exactly 2 mutants per base of different kinds, 4 of each mutant kind, missing only on >= 2-line (not one-line) bases, the off-question donor's base is
 * never in the same file as the plant, and a base and its mutants never share a file.
 */
export function buildPlants(author, { bases = eqBases(), split = null } = {}) {
    const sp = split ?? splitBases(bases.usable);
    const byId = Object.fromEntries(bases.usable.map((b) => [b.id, b]));
    const shown = sp.shown.map((id) => byId[id]);
    const topicOf = (id) => id.slice(0, 2);                                                  // S1 = the churn project, S2 = the RAG / agents project (the roster's two scenarios)
    const fileOf = assignFiles(sp.shown);
    const oneLineIds = Object.keys(author.oneLine ?? {});
    const errs = [];
    const must = (c, why) => { if (!c) errs.push(why); };
    must(oneLineIds.length === 4 && oneLineIds.every((i) => ONE_LINE_ELIGIBLE.includes(i) && sp.shown.includes(i)), 'exactly 4 one-line goods, each a shown, one-line-eligible base');
    must(sp.shown.every((id) => (author.plants?.[id] ?? []).length === 2 && new Set(author.plants[id].map((e) => e.kind)).size === 2), 'every shown base hosts exactly 2 mutants of different kinds');
    const count = (k) => sp.shown.flatMap((id) => author.plants?.[id] ?? []).filter((e) => e.kind === k).length;
    for (const k of MUTANT_KINDS) must(count(k) === 4, `4 mutants of kind ${k} (got ${count(k)})`);
    if (errs.length) throw new Error(`plant plan invalid: ${errs.join(' | ')}`);
    const plants = [];
    const offBases = [];
    for (const base of shown) {
        const baseCues = oneLineIds.includes(base.id) ? [author.oneLine[base.id]] : base.cues;
        const good = { baseId: base.id, kind: 'good', file: fileOf[base.id], form: oneLineIds.includes(base.id) ? 'one-line' : 'as-flown', cues: baseCues, answer: base.answer, question: base.question, pairKey: base.pairKey };
        plants.push(good);
        const others = [1, 2, 3].filter((f) => f !== fileOf[base.id]);
        const edits = author.plants[base.id];
        edits.forEach((e, i) => {
            const b2 = { ...base, cues: baseCues };
            const r = applyEdit(b2, e, e.kind, { shown: shown.map((s) => ({ ...s, cues: oneLineIds.includes(s.id) ? [author.oneLine[s.id]] : s.cues })), topicOf });
            plants.push({ baseId: base.id, kind: e.kind, file: others[i], form: good.form, cues: r.cues, answer: r.answer, question: base.question, pairKey: base.pairKey, edit: e, ...(e.kind === 'halo' ? { contradictsLine: e.contradictsLine } : {}) });
        });
        if (edits.some((e) => e.kind === 'off_question')) offBases.push(base.id);
    }
    // Placement of the off-question plants: each such base can swap its two mutants between its two other files. Try every orientation (<= 2^n). Hard rules: in the off plant's file no OTHER block
    // has the identical cue block (no block appears under two questions, REVIEW-KIT K3) and the donor's own good block is not there. Soft: fewest shared cue LINES (a donor base's other plants keep
    // some of its lines, so zero shared lines is impossible); the orientation with the fewest wins.
    const sameBlock = (p, q) => JSON.stringify(p.cues) === JSON.stringify(q.cues);
    const others_ = (off) => plants.filter((q) => q !== off && q.file === off.file && q.baseId !== off.baseId);
    const identical = (off) => others_(off).some((q) => sameBlock(off, q));
    const sharedLines = (off) => others_(off).reduce((n, q) => n + q.cues.filter((c) => off.cues.includes(c)).length, 0);
    const swap = (id) => { const ms = plants.filter((p) => p.baseId === id && p.kind !== 'good'); [ms[0].file, ms[1].file] = [ms[1].file, ms[0].file]; };
    let best = null;
    for (let mask = 0; mask < (1 << offBases.length); mask++) {
        offBases.forEach((id, k) => { if ((mask >> k) & 1) swap(id); });
        const offs = plants.filter((p) => p.kind === 'off_question');
        if (!offs.some((p) => identical(p) || fileOf[p.edit.donor] === p.file)) { const sc = offs.reduce((n, p) => n + sharedLines(p), 0); if (!best || sc < best.sc) best = { sc, mask }; }
        offBases.forEach((id, k) => { if ((mask >> k) & 1) swap(id); });
    }
    if (!best) throw new Error('no orientation of the off-question plants keeps every donor block out of the off plant\'s file; choose other donors');
    offBases.forEach((id, k) => { if ((best.mask >> k) & 1) swap(id); });
    const overlaps = identical;
    // guard rails
    if (plants.length !== 48) throw new Error(`built ${plants.length} plants, not 48`);
    for (const f of [1, 2, 3]) if (plants.filter((p) => p.file === f).length !== 16) throw new Error(`file ${f} holds ${plants.filter((p) => p.file === f).length} blocks, not 16`);
    for (const p of plants) if (p.kind !== 'good') { const g = plants.find((q) => q.baseId === p.baseId && q.kind === 'good'); if (g.file === p.file) throw new Error(`plant ${p.baseId}/${p.kind} shares a file with its base`); }
    for (const id of sp.shown) { const fs3 = plants.filter((p) => p.baseId === id).map((p) => p.file).sort().join(''); if (fs3 !== '123') throw new Error(`base ${id}: base + 2 mutants are not in the three files one each`); }
    for (const p of plants) if (p.kind === 'off_question' && overlaps(p)) throw new Error(`plant ${p.baseId}/off_question: its cue lines appear under another question in file ${p.file}`);
    for (const p of plants) if (p.kind === 'off_question' && fileOf[p.edit.donor] === p.file) throw new Error(`plant ${p.baseId}/off_question shares file ${p.file} with its donor's own base ${p.edit.donor}`);
    for (const p of plants) if (p.kind === 'missing' && p.form === 'one-line') throw new Error(`plant ${p.baseId}/missing sits on a one-line base`);
    return { plants, split: sp, fileOf };
}

/** The reviewer's packet: every plant with its expected label, flat text. Lives in LAB\plants\ (it holds text). */
export function reviewPacket({ plants, split }) {
    const L = [`# Plant review packet (SPEC 3.1.1): check EVERY expected label and EVERY base's cue block BEFORE any grader runs. A disputed plant is replaced, not argued.`, `split seed index ${split.seedIndex}; shown bases ${split.shown.join(' ')}; hidden reserve ${split.hidden.join(' ')}`, ''];
    for (const p of plants.slice().sort((a, b) => a.baseId.localeCompare(b.baseId) || a.kind.localeCompare(b.kind))) {
        L.push(`## ${p.baseId} / ${p.kind} (file ${p.file}${p.form === 'one-line' ? ', one-line form' : ''})`, `expected: ${EXPECT[p.kind].verdict}${EXPECT[p.kind].note ? ` (${EXPECT[p.kind].note})` : ''}`, `question: ${p.question}`, `cues: ${JSON.stringify(p.cues)}`, `answer: ${p.answer}`);
        if (p.edit) L.push(`edit: ${JSON.stringify(p.edit)}`);
        L.push('');
    }
    return L.join('\n');
}

if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('/plants.mjs')) {
    const bases = eqBases();
    console.log(`eq acceptable ${bases.acceptable.length}; excluded (display altered by trimCues, or < 2 lines) ${bases.excluded.length}: ${bases.excluded.join(' ')}; usable ${bases.usable.length}`);
    const sp = splitBases(bases.usable);
    console.log(`split seed index ${sp.seedIndex}: shown ${sp.shown.length} [${sp.shown.join(' ')}]; hidden reserve ${sp.hidden.length} [${sp.hidden.join(' ')}]`);
    if (process.argv.includes('--build')) {
        const author = readJson(path.join(dirs.plants, 'plants.author.json'));
        const built = buildPlants(author, { bases, split: sp });
        const counts = {}; for (const p of built.plants) counts[p.kind] = (counts[p.kind] ?? 0) + 1;
        writeJson(path.join(dirs.plants, 'plants.json'), { split: built.split, plants: built.plants, builtFrom: sha12(JSON.stringify(author)) });
        fs.writeFileSync(path.join(dirs.plants, 'REVIEW-PACKET.md'), reviewPacket(built));
        console.log(`built ${built.plants.length} plants; per kind ${JSON.stringify(counts)}; per file ${[1, 2, 3].map((f) => built.plants.filter((p) => p.file === f).length).join('/')}; one-line goods ${built.plants.filter((p) => p.kind === 'good' && p.form === 'one-line').length}`);
    }
}
