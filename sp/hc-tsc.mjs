// hc-tsc.mjs — type-check two checkouts (tip and pre-side-task baseline) with both configs and
// compare the error SETS (file + TS code + message, line numbers dropped so shifted lines still
// match). Prints counts, then errors present at the tip but not at the baseline (= new), and the
// reverse (= fixed). Uses MAIN's typescript; runs tsc with an absolute -p, so no cwd matters.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';

const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const TSC = `${MAIN}/node_modules/typescript/bin/tsc`;
const trees = {
    tip: process.argv[2] ?? `${MAIN}/.claude/worktrees/health-head`,
    base: process.argv[3] ?? `${MAIN}/.claude/worktrees/health-base`,
};
const configs = { electron: 'electron/tsconfig.json', renderer: 'tsconfig.json' };

function errors(root, cfg) {
    const r = spawnSync(process.execPath, [TSC, '-p', `${root}/${cfg}`, '--noEmit', '--pretty', 'false'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    const lines = `${r.stdout}${r.stderr}`.split(/\r?\n/).filter((l) => /error TS\d+/.test(l));
    // "path(line,col): error TSxxxx: message" -> "relpath: TSxxxx: message". tsc prints paths
    // RELATIVE TO THE CWD (../../OneDrive/.../health-head/electron/...), so strip everything up to
    // the tree's own folder name, not the absolute root (the first version compared nothing).
    const tree = root.replace(/\\/g, '/').split('/').pop();
    const norm = lines.map((l) => l.replace(/\\/g, '/').replace(new RegExp(`^.*?/${tree}/`), '').replace(/\(\d+,\d+\)/, ''));
    return { status: r.status, raw: lines, set: norm };
}

for (const [name, cfg] of Object.entries(configs)) {
    const tip = errors(trees.tip, cfg);
    const base = errors(trees.base, cfg);
    const added = tip.set.filter((e) => !base.set.includes(e));
    const fixed = base.set.filter((e) => !tip.set.includes(e));
    console.log(`\n== ${name} (${cfg}): tip ${tip.set.length} error(s), baseline ${base.set.length}`);
    for (const e of tip.set) console.log(`  tip: ${e}`);
    console.log(`  NEW at tip: ${added.length}${added.length ? '\n    ' + added.join('\n    ') : ''}`);
    console.log(`  gone since baseline: ${fixed.length}${fixed.length ? '\n    ' + fixed.join('\n    ') : ''}`);
}
