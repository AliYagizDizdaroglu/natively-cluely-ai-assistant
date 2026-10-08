// Re-check r3: finish reasons of the lite models' records, by prompt kind, over every answers file (numbers only).
// Prompt kind from the record's checks keys: cue checks exist only where the sent prompt carried the cue rule
// (answers.mjs:336-339).
import fs from 'node:fs';
import path from 'node:path';
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const WT = `${MAIN}/.claude/worktrees/whole-turn`;
const G = 'electron/test/golden';
const files = [];
const walk = (d, depth = 0) => {
    if (!fs.existsSync(d)) return;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, e.name);
        if (e.isDirectory() && depth < 1) walk(p, depth + 1);
        else if (e.isFile() && /^interview60\.answers.*\.json$/.test(e.name) && !/stale/.test(e.name)) files.push(p);
    }
};
walk(`${MAIN}/${G}/interview60.runs`); walk(`${WT}/${G}/interview60.runs`);
for (const e of fs.readdirSync(`${WT}/${G}`)) if (/^interview60\.answers.*\.json$/.test(e)) files.push(`${WT}/${G}/${e}`);
const tab = {};
for (const f of files) {
    let s; try { s = JSON.parse(fs.readFileSync(f, 'utf8')); } catch { continue; }
    for (const v of Object.values(s)) {
        if (!v || typeof v !== 'object' || !v.id || v.transientError) continue;
        const model = String(v.model ?? '?').split('_')[0];
        if (!/gemini-3\.[15]-flash-lite$/.test(model)) continue;
        const kind = v.checks && Object.keys(v.checks).some((k) => k.startsWith('cues_')) ? 'cue' : 'no-cue';
        const k = `${model} ${kind}`;
        tab[k] ??= { n: 0, finish: {}, noText: 0 };
        tab[k].n++; tab[k].finish[v.finish ?? 'null'] = (tab[k].finish[v.finish ?? 'null'] ?? 0) + 1;
        if (!v.spoken && (v.rawLen ?? -1) === 0) tab[k].noText++;
    }
}
console.log(`files ${files.length}`);
for (const [k, t] of Object.entries(tab)) console.log(`${k.padEnd(32)} records ${String(t.n).padStart(5)}  no-text ${t.noText}  finish ${JSON.stringify(t.finish)}`);
