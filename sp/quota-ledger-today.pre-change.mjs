// Read-only quota ledger for TODAY's lite-model quota day (reset 10:00 local = 07:00Z), for h40c's
// rule "fly on a quota day with no replay or smoke run scheduled on it, or check the day's quota
// ledger first" (tomorrow's 05:00 cue smoke shares this quota day). Never calls a model API.
// Sources: (1) every natively_debug.log an app on this machine writes (MAIN and the whole-turn
// worktree), counting lines stamped at/after the reset that name a lite model: an UPPER bound on
// requests, since one request logs several lines; (2) every file written since the reset under the
// golden folders, their run folders and the scratchpad (depth 2) whose name suggests a pass that calls
// a model, so an unlogged replay or probe cannot hide.
import fs from 'node:fs';
import path from 'node:path';

const DAY_START = Date.parse(process.argv[2] ?? '2026-09-29T07:00:00.000Z');
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const WT = `${MAIN}/.claude/worktrees/whole-turn`;
const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const LITE = /gemini-3\.[15]-flash-lite/g;

console.log(`quota day starts ${new Date(DAY_START).toISOString()} (10:00 local); generated ${new Date().toISOString()}`);
console.log('\n1. app logs, lines at/after the reset naming a lite model');
for (const log of [`${MAIN}/natively_debug.log`, `${WT}/natively_debug.log`]) {
    if (!fs.existsSync(log)) { console.log(`  ${log}: absent`); continue; }
    const lines = fs.readFileSync(log, 'utf8').split('\n');
    const stamped = lines.map((l) => [Date.parse(l.match(/^(\d{4}-\d{2}-\d{2}T[\d:.]+Z)/)?.[1] ?? ''), l]).filter(([t]) => !Number.isNaN(t));
    const last = stamped.at(-1)?.[0];
    const today = stamped.filter(([t]) => t >= DAY_START);
    const counts = {};
    for (const [, l] of today) for (const m of l.matchAll(LITE)) counts[m[0]] = (counts[m[0]] ?? 0) + 1;
    console.log(`  ${path.relative(MAIN, log) || log}: last line ${last ? new Date(last).toISOString() : 'none'}; ${today.length} lines since the reset; lite mentions ${JSON.stringify(counts)}`);
}

console.log('\n2. files written since the reset that could hold model calls');
const PASSY = /answers|chains|health|probe|replay|smoke|bench|arm|flight|verdict|judge|prompts|diag/i;
const roots = [`${MAIN}/electron/test/golden`, `${MAIN}/electron/test/golden/interview60.runs`, `${WT}/electron/test/golden`, `${WT}/electron/test/golden/interview60.runs`, SP];
const seen = new Set();
let hits = 0;
const walk = (dir, depth) => {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) { if (depth > 0) walk(full, depth - 1); continue; }
        if (seen.has(full)) continue;
        seen.add(full);
        const st = fs.statSync(full);
        const short = full.replace(/\\/g, '/').replace(SP, 'SP').replace(WT, 'WT').replace(MAIN, 'MAIN');
        if (st.mtimeMs >= DAY_START && PASSY.test(e.name)) { hits++; console.log(`  ${new Date(st.mtimeMs).toISOString()}  ${st.size.toString().padStart(9)}  ${short}`); }
    }
};
for (const r of roots) walk(r, 2);
console.log(`  ${hits} file(s)`);
