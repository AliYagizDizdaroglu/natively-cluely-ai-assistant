// calibrate-asterisk.mjs — run the NEW single-star rule over every real answer the
// harness has on disk and show, in context, exactly what it would change. A regex
// that strips a delimiter can also eat a multiplication sign; the only way to know
// is to point it at text the models actually produced.
import fs from 'node:fs';
import path from 'node:path';

const RUNS = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs';
const NEW = (s) => s.replace(/\*\*/g, '').replace(/\*(?=\S)|(?<=\S)\*/g, '');
const OLD = (s) => s.replace(/\*\*/g, '');

const texts = [];
for (const run of fs.readdirSync(RUNS).filter((d) => /^2026-/.test(d))) {
    const dir = path.join(RUNS, run);
    if (!fs.statSync(dir).isDirectory()) continue;
    for (const f of fs.readdirSync(dir).filter((f) => /^interview60\.judge\..*\.json$|^interview60\.judge\.json$/.test(f) && !f.includes('pairs') && !f.includes('verdicts'))) {
        try {
            const items = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')).items ?? {};
            for (const [id, v] of Object.entries(items)) if (v.answer) texts.push({ run, arm: f, id, t: String(v.answer) });
        } catch { /* skip unreadable */ }
    }
}
console.log(`answers scanned: ${texts.length} across ${new Set(texts.map((x) => x.run)).size} runs\n`);

const withStar = texts.filter((x) => x.t.includes('*'));
console.log(`answers containing a star: ${withStar.length}\n`);

let changed = 0, suspicious = 0;
for (const x of withStar) {
    const before = OLD(x.t), after = NEW(x.t);
    if (before === after) continue;
    changed++;
    // show each star with 34 characters of context on both sides
    for (const m of [...before.matchAll(/\*/g)]) {
        const lo = Math.max(0, m.index - 34), hi = Math.min(before.length, m.index + 35);
        const ctx = before.slice(lo, hi).replace(/\n/g, ' ');
        const digits = /\d\s*\*\s*\d/.test(before.slice(Math.max(0, m.index - 3), m.index + 4));
        if (digits) suspicious++;
        console.log(`${digits ? 'SUSPECT ' : '        '}${x.run.slice(-4)} ${x.id.padEnd(8)} …${ctx}…`);
    }
}
console.log(`\nanswers the new rule changes: ${changed}`);
console.log(`stars that look like arithmetic (digit star digit): ${suspicious}`);
console.log(suspicious ? '\n^ REVIEW THESE — the rule would eat a multiplication sign.' : '\nNo arithmetic star anywhere in the corpus: the rule only ever removed emphasis.');
