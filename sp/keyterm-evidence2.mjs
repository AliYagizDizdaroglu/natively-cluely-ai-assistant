// Real Deepgram losses: split hyphens on BOTH sides so "dead-letter" vs "dead letter" is not
// counted, drop numerals/percent (smart_format rewrites those), and show the heard context.
import { readFileSync, existsSync, readdirSync } from 'node:fs';

const RUNS = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs';
const norm = (s) => s.toLowerCase().replace(/[-_/]/g, ' ').replace(/[^a-z0-9\s']/g, ' ').split(/\s+/).filter(Boolean);

const STOP = new Set(('a an the and or but if then of to in on for with as at by from is are was were be been being ' +
    'you your we our us i me my it its this that these those what how why when where which who whom do does did done ' +
    'can could would should will shall may might must have has had not no nor yes so than there their them they ' +
    'he she his her also into out up down over under about after before between each any all some one two three four five ' +
    'more most other such only just very much many like get got make made use used using way ways take taking give given ' +
    'tell walk through say saying talk want need see look go come know think first second third then next now here ' +
    'percent per cent number numbers time times case cases work works working set sets').split(/\s+/));

const miss = new Map();
let compared = 0;
for (const dir of readdirSync(RUNS).filter((d) => /^\d{4}-\d{2}-\d{2}T/.test(d))) {
    const tl = `${RUNS}/${dir}/interview60.timeline.json`, pr = `${RUNS}/${dir}/interview60.prompts.json`;
    if (!existsSync(tl) || !existsSync(pr)) continue;
    const timeline = JSON.parse(readFileSync(tl, 'utf8'));
    const prompts = JSON.parse(readFileSync(pr, 'utf8'));
    for (const item of timeline.items ?? []) {
        const cap = prompts[item.id];
        if (!cap?.user || !item.q) continue;
        compared++;
        const heard = norm(cap.user), heardSet = new Set(heard);
        const script = norm(item.q);
        for (let i = 0; i < script.length; i++) {
            const w = script[i];
            if (STOP.has(w) || w.length < 3 || /^\d+$/.test(w)) continue;
            if (heardSet.has(w)) continue;
            // locate the neighbours so we can show what Deepgram put there instead
            const before = script.slice(Math.max(0, i - 2), i).filter((x) => heardSet.has(x)).pop();
            let ctx = '';
            if (before) {
                const j = heard.lastIndexOf(before);
                if (j >= 0) ctx = heard.slice(j, j + 4).join(' ');
            }
            if (!miss.has(w)) miss.set(w, { n: 0, runs: new Set(), ids: new Set(), ctx: new Map() });
            const m = miss.get(w);
            m.n++; m.runs.add(dir.slice(0, 10)); m.ids.add(item.id);
            if (ctx) m.ctx.set(ctx, (m.ctx.get(ctx) ?? 0) + 1);
        }
    }
}
const rows = [...miss.entries()].filter(([, m]) => m.runs.size >= 2).sort((a, b) => b[1].n - a[1].n);
console.log(`compared ${compared} scripted-vs-heard pairs; ${rows.length} words lost in 2+ flights\n`);
for (const [w, m] of rows.slice(0, 30)) {
    const top = [...m.ctx.entries()].sort((a, b) => b[1] - a[1])[0];
    console.log(`${w.padEnd(18)} lost ${String(m.n).padStart(3)}x in ${m.runs.size} flights  ${[...m.ids].slice(0, 3).join(',').padEnd(22)} heard: ${top ? '"' + top[0] + '"' : '—'}`);
}
