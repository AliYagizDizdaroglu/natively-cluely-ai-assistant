// THROWAWAY: wait for all 12 re-baseline verdict files, merge each with the frozen
// instrument (stamping graderPrompt), then print the comparable series.
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

const PROJ = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const R = path.join(PROJ, 'electron/test/golden/interview60.runs');
const RUNS = [['after7', '2026-09-06T08-14-21-after7'], ['after8', '2026-09-07T08-14-12-after8'], ['after9', '2026-09-08T08-44-56-after9']];
const ARMS = [['hour', ''], ['3.1', '.gemini-3.1-flash-lite'], ['3.5', '.gemini-3.5-flash-lite'], ['gemma', '.gemma-4-31b-it']];
const ANSWERS = { '.gemini-3.1-flash-lite': 'interview60.answers.json', '.gemini-3.5-flash-lite': 'interview60.answers.gemini-3.5-flash-lite.json', '.gemma-4-31b-it': 'interview60.answers.gemma-4-31b-it.json' };

const want = [];
for (const [, dir] of RUNS) for (const [, tag] of ARMS) want.push(path.join(R, dir, `interview60.judge.verdicts${tag}.json`));

// A verdicts file only counts when it was written AFTER the frozen prompt: the old
// pre-freeze verdicts still sit at these paths, and an earlier run of this script merged
// them by mistake.
const REF = fs.statSync(path.join(PROJ, 'electron/test/golden/interview60.grader-prompt.md')).mtimeMs;
const ok = (f) => { try { if (fs.statSync(f).mtimeMs <= REF) return false; const j = JSON.parse(fs.readFileSync(f, 'utf8')); return Object.keys(j).length > 10; } catch { return false; } };
const t0 = Date.now();
while (want.some((f) => !ok(f))) {
    if (Date.now() - t0 > 60 * 60 * 1000) { console.log('TIMEOUT waiting for:', want.filter((f) => !ok(f)).map((f) => path.basename(f)).join(' ')); process.exit(1); }
    await new Promise((r) => setTimeout(r, 15000));
}
console.log(`all 12 verdict files present after ${Math.round((Date.now() - t0) / 60000)} min; merging\n`);

for (const [, dir] of RUNS) {
    for (const [, tag] of ARMS) {
        const args = [path.join(PROJ, 'electron/test/golden/interview60.judge.mjs'), path.join(R, dir)];
        if (tag) args.push('--answers', path.join(R, dir, ANSWERS[tag]));
        args.push('--verdicts', path.join(R, dir, `interview60.judge.verdicts${tag}.json`));
        try { execFileSync(process.execPath, args, { cwd: PROJ, stdio: 'pipe' }); }
        catch (e) { console.log(`merge FAILED ${dir}${tag}: ${String(e.stderr ?? e).slice(0, 200)}`); }
    }
}

const { summarizeJudge } = await import('file:///' + path.join(PROJ, 'electron/test/golden/interview60.metrics.mjs').replace(/\\/g, '/'));
const cell = (dir, tag) => {
    const p = path.join(R, dir, `interview60.judge${tag}.json`);
    if (!fs.existsSync(p)) return { txt: '—', stamp: null };
    const j = JSON.parse(fs.readFileSync(p, 'utf8'));
    const s = summarizeJudge(j);
    return { txt: `${s.acceptable}/${s.n} w${s.weak} x${s.wrong}`, stamp: j.graderPrompt };
};
console.log('COMPARABLE SERIES — base 52 questions, one frozen instrument\n');
console.log('        ' + RUNS.map(([n]) => n.padEnd(16)).join(''));
const stamps = new Set();
for (const [name, tag] of ARMS) {
    const cells = RUNS.map(([, d]) => { const c = cell(d, tag); if (c.stamp) stamps.add(c.stamp); return c.txt.padEnd(16); });
    console.log(name.padEnd(8) + cells.join(''));
}
console.log('\ninstrument stamp(s) seen: ' + [...stamps].join(', ') + (stamps.size === 1 ? '   (all comparable)' : '   *** MISMATCH — not comparable ***'));
console.log('\nfor reference, what was recorded at the time (different, unfrozen wordings):');
for (const [name, tag] of ARMS) {
    const cells = RUNS.map(([, d]) => {
        const p = path.join(R, d, 'prefreeze', `interview60.judge${tag}.json`);
        if (!fs.existsSync(p)) return '—'.padEnd(16);
        const j = JSON.parse(fs.readFileSync(p, 'utf8'));
        const e = Object.entries(j.items).filter(([k, v]) => v.kind === 'spoken' && v.level !== 'long' && v.level !== 'followup' && !k.includes('#'));
        return `${e.filter(([, v]) => v.verdict === 'acceptable').length}/${e.length}`.padEnd(16);
    });
    console.log(name.padEnd(8) + cells.join(''));
}
