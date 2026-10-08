// Re-check r3, new facts (a) and (b). Read-only; prints ids, counts, lengths, finish reasons and token numbers only —
// never an answer, never a prompt.
// (a) The bench's thinking-token difference as rule 2c defines it (pooled medians over three reps, ids answered =
//     spoken non-empty and no transientError, finite thoughts and ttft; percentile index min(n-1, floor(n*p))).
//     The cue reps are the bench's files (tags cues-r1..r3, which h40d-thoughts-noise.mjs's '', -r2, -r3 naming cannot
//     read as one family); the control is s50m's captured-high r1..r3.
// (b) Every "no-text" record (no transientError, rawLen 0) in every answers file under MAIN's and WT's run folders and
//     WT's golden folder, by file, with its finish reason; and every empty-prose record with text (rawLen > 0), so the
//     two kinds can be told apart. The cue/no-cue status of each file is read from its records' `checks` keys
//     (cue checks are present only where the sent prompt carried the cue rule, answers.mjs:336-339).
import fs from 'node:fs';
import path from 'node:path';

const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const WT = `${MAIN}/.claude/worktrees/whole-turn`;
const G = 'electron/test/golden';
const S50M = `${MAIN}/${G}/interview60.runs/2026-09-22T08-22-50-s50m`;
const pct = (a, p) => { const z = [...a].sort((x, y) => x - y); return z.length ? z[Math.min(z.length - 1, Math.floor(z.length * p))] : null; };
const read = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const recs = (store) => Object.values(store).filter((v) => v && typeof v === 'object' && v.id);

// (a)
const fam = (files) => {
    const out = [];
    for (const f of files) {
        const vals = recs(read(f));
        const answered = vals.filter((v) => !v.transientError && v.spoken);
        const withT = answered.filter((v) => Number.isFinite(v.thoughts) && Number.isFinite(v.ttft));
        const noText = vals.filter((v) => !v.transientError && !v.spoken && (v.rawLen ?? (v.raw ?? '').length) === 0);
        const emptyWithText = vals.filter((v) => !v.transientError && !v.spoken && (v.rawLen ?? (v.raw ?? '').length) > 0);
        out.push({ file: path.basename(f), n: vals.length, answered: answered.length, cov: withT.length, th: withT.map((v) => v.thoughts), ttft: withT.map((v) => v.ttft),
            holes: vals.filter((v) => v.transientError).map((v) => v.id), noText: noText.map((v) => `${v.id}(${v.finish ?? 'no finish'}, thoughts ${v.thoughts ?? 'n/a'})`), emptyWithText: emptyWithText.map((v) => `${v.id}(rawLen ${v.rawLen})`) });
    }
    return out;
};
const cue = fam([1, 2, 3].map((r) => `${WT}/${G}/interview60.answers.gemini-3.5-flash-lite_cues-r${r}.json`));
const ctl = fam(['', '-r2', '-r3'].map((s) => `${S50M}/interview60.answers.gemini-3.5-flash-lite_captured-high${s}.json`));
for (const [name, side] of [['bench cue', cue], ['s50m control', ctl]]) {
    for (const r of side) console.log(`${name.padEnd(13)} ${r.file}: records ${r.n}, answered ${r.answered}, thoughts coverage ${r.cov}/${r.answered}, thoughts p50 ${pct(r.th, .5)} p90 ${pct(r.th, .9)}, ttft p50 ${pct(r.ttft, .5)}; holes [${r.holes.join(' ')}]; no-text [${r.noText.join(' ')}]; empty prose with text [${r.emptyWithText.join(' ')}]`);
}
const pc = cue.flatMap((r) => r.th), pk = ctl.flatMap((r) => r.th);
const covC = cue.reduce((a, r) => a + r.cov, 0) / cue.reduce((a, r) => a + r.answered, 0), covK = ctl.reduce((a, r) => a + r.cov, 0) / ctl.reduce((a, r) => a + r.answered, 0);
console.log(`2c on the bench: cue pooled median ${pct(pc, .5)} (n ${pc.length}) - control pooled median ${pct(pk, .5)} (n ${pk.length}) = ${pct(pc, .5) - pct(pk, .5)} tokens (threshold +150); p90 ${pct(pc, .9)} - ${pct(pk, .9)} = ${pct(pc, .9) - pct(pk, .9)}; coverage ${(covC * 100).toFixed(1)}% / ${(covK * 100).toFixed(1)}%`);
const tc = cue.flatMap((r) => r.ttft), tk = ctl.flatMap((r) => r.ttft);
console.log(`   (reported) ttft pooled median cue ${pct(tc, .5)} - control ${pct(tk, .5)} = ${pct(tc, .5) - pct(tk, .5)} ms (control ran 2026-09-22; not a known case)`);

// (b)
const files = [];
const walk = (d, depth = 0) => {
    if (!fs.existsSync(d) || depth > 2) return;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, e.name);
        if (e.isDirectory() && depth < 1) walk(p, depth + 1);
        else if (e.isFile() && /^interview60\.answers.*\.json$/.test(e.name) && !/stale/.test(e.name)) files.push(p);
    }
};
walk(`${MAIN}/${G}/interview60.runs`); walk(`${WT}/${G}/interview60.runs`);
for (const e of fs.readdirSync(`${WT}/${G}`)) if (/^interview60\.answers.*\.json$/.test(e)) files.push(`${WT}/${G}/${e}`);
let total = 0, totalNoText = 0, totalEmptyText = 0, cueTotal = 0, cueNoText = 0, nocueTotal = 0, nocueNoText = 0, unknownTotal = 0;
const finishCounts = {};
const lines = [];
for (const f of files) {
    let store; try { store = read(f); } catch { continue; }
    const vals = recs(store).filter((v) => !v.transientError);
    const isGemini = vals.some((v) => v.thoughts !== undefined) || /gemini/.test(path.basename(f));
    const cueKeys = vals.some((v) => v.checks && Object.keys(v.checks).some((k) => k.startsWith('cues_')));
    const hasChecks = vals.some((v) => v.checks);
    const kind = cueKeys ? 'cue' : hasChecks ? 'no-cue' : 'unknown';
    const noText = vals.filter((v) => !v.spoken && (v.rawLen ?? (typeof v.raw === 'string' ? v.raw.length : -1)) === 0);
    const emptyText = vals.filter((v) => !v.spoken && (v.rawLen ?? (typeof v.raw === 'string' ? v.raw.length : -1)) > 0);
    total += vals.length; totalNoText += noText.length; totalEmptyText += emptyText.length;
    if (kind === 'cue') { cueTotal += vals.length; cueNoText += noText.length; } else if (kind === 'no-cue') { nocueTotal += vals.length; nocueNoText += noText.length; } else unknownTotal += vals.length;
    for (const v of noText) finishCounts[v.finish ?? 'null'] = (finishCounts[v.finish ?? 'null'] ?? 0) + 1;
    if (noText.length) lines.push(`  no-text: ${path.relative(MAIN, f).replace(/\\/g, '/')} [${kind}${isGemini ? '' : ', not Gemini'}]: ${noText.map((v) => `${v.id}(${v.finish ?? 'null'})`).join(' ')}`);
}
console.log(`\nscan: ${files.length} answers files, ${total} records without transientError; no-text (rawLen 0) ${totalNoText}; empty prose with text ${totalEmptyText}`);
console.log(`  by prompt kind (from the records' checks keys): cue-rule prompts ${cueTotal} records, ${cueNoText} no-text; no-cue prompts ${nocueTotal} records, ${nocueNoText} no-text; no checks recorded ${unknownTotal}`);
console.log(`  finish reasons of no-text records: ${JSON.stringify(finishCounts)}`);
for (const l of lines) console.log(l);
