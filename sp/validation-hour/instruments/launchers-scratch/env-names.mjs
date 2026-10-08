// Scratch (launcher builder D): which NATIVELY_* names the app and the harness READ, against the nine names the h40d launcher
// sets or clears. Reads source files only (.ts .tsx .mjs .js .cjs under electron and src of the worktree, never a .env file,
// never node_modules or a build folder); prints names, counts and file names, never a value.
//   node env-names.mjs
import fs from 'node:fs';
import path from 'node:path';

const WT = 'C:\\Users\\sotka\\OneDrive\\Masa\u00fcst\u00fc\\natively-cluely-ai-assistant\\.claude\\worktrees\\whole-turn';
const SKIP = new Set(['node_modules', 'dist', 'dist-electron', '.git', 'runs']);
const EXT = new Set(['.ts', '.tsx', '.mjs', '.js', '.cjs']);
const seen = new Map(); // name -> Set of relative files
let filesRead = 0;
const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        if (e.name.startsWith('.env')) continue;
        const p = path.join(d, e.name);
        if (e.isSymbolicLink()) continue;
        if (e.isDirectory()) { if (!SKIP.has(e.name) && !e.name.startsWith('interview60.runs')) walk(p); continue; }
        if (!EXT.has(path.extname(e.name))) continue;
        filesRead++;
        const text = fs.readFileSync(p, 'utf8');
        for (const m of text.matchAll(/\bNATIVELY_[A-Z0-9_]+\b/g)) {
            if (!seen.has(m[0])) seen.set(m[0], new Set());
            seen.get(m[0]).add(path.relative(WT, p).replace(/\\/g, '/'));
        }
    }
};
for (const sub of ['electron', 'src']) walk(path.join(WT, sub));
const launcher = new Set(['NATIVELY_STT_PROVIDER', 'NATIVELY_ROSTER', 'NATIVELY_SCENARIOS', 'NATIVELY_GEMINI_THINKING_LEVEL', 'NATIVELY_VERBAL_PRIMARY_MODEL', 'NATIVELY_VERBAL_HEDGE', 'NATIVELY_VERBAL_HEDGE_TRIGGER_MS', 'NATIVELY_FOLLOWUP_PARENT', 'NATIVELY_FLIGHT_COMMIT']);
console.log(`source files read: ${filesRead}; distinct NATIVELY_ names: ${seen.size}`);
const prod = (set) => [...set].filter((f) => !/\/test\/|\.test\.|\.spec\./.test(f));
for (const [name, files] of [...seen].sort((a, b) => a[0].localeCompare(b[0]))) {
    const nonTest = prod(files);
    console.log(`${launcher.has(name) ? 'IN LAUNCHER ' : 'NOT in launcher'}  ${name}  files=${files.size} non-test=${nonTest.length}${nonTest.length ? '  e.g. ' + nonTest.slice(0, 2).join(', ') : ''}`);
}
