// Throwaway: applies literal edit blocks (no escaping) to files under <root>. Every block's old text
// must occur exactly once in its file, or nothing at all is written.
//   node apply-blocks.mjs <root> <blocks-file>
// Block format (each marker on its own line):
//   @@@ FILE <path relative to root>
//   <<<
//   old text
//   ===
//   new text
//   >>>
import fs from 'node:fs';
import path from 'node:path';

const [root, blocksFile] = process.argv.slice(2);
if (!root || !blocksFile) { console.error('usage: apply-blocks.mjs <root> <blocks-file>'); process.exit(2); }
if (!fs.existsSync(root)) { console.error(`root does not resolve: ${root}`); process.exit(2); }
const src = fs.readFileSync(blocksFile, 'utf8').replace(/^﻿/, '').replace(/\r\n/g, '\n');
const re = /^@@@ FILE (.+)\n<<<\n([\s\S]*?)\n===\n([\s\S]*?)\n>>>$/gm;
const pending = new Map();
let n = 0;
for (const m of src.matchAll(re)) {
    const f = path.join(root, m[1].trim());
    const t = pending.get(f) ?? fs.readFileSync(f, 'utf8');
    const eol = t.includes('\r\n') ? '\r\n' : '\n';
    const o = m[2].replace(/\n/g, eol), nw = m[3].replace(/\n/g, eol);
    const count = t.split(o).length - 1;
    if (count !== 1) { console.error(`${m[1]}: expected exactly 1 match, found ${count}, for:\n${m[2].slice(0, 300)}`); process.exit(1); }
    pending.set(f, t.replace(o, () => nw));
    n++;
}
const declared = (src.match(/^@@@ FILE /gm) ?? []).length;
if (!n || n !== declared) { console.error(`parsed ${n} of ${declared} declared blocks — check the markers`); process.exit(1); }
for (const [f, t] of pending) fs.writeFileSync(f, t);
console.log(`${n} block(s) applied to ${pending.size} file(s): ${[...pending.keys()].map((f) => path.relative(root, f)).join(', ')}`);
