// Throwaway: splice work/p14-block.txt into a copy of audit-graders.mjs (argument: the file to edit in place).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const target = process.argv[2];
let s = fs.readFileSync(target, 'utf8');
const block = fs.readFileSync(path.join(HERE, 'p14-block.txt'), 'utf8');
const a = s.indexOf('// A2 point 1(c) + point 10 (23:02');
const b = s.indexOf('/**\n * null when `command` is an allowed validation Bash');
if (a < 0 || b < 0 || b < a) throw new Error('constants block not found');
s = s.slice(0, a) + block + '\n' + s.slice(b);
const c = s.indexOf("    for (const L of lits) if (/[\\/\\\\.~*?[\\]]/.test(L)");
const d = s.indexOf('    return null;\n}\n', c);
if (c < 0 || d < 0) throw new Error('body block not found');
s = s.slice(0, c) + "    const bad = codeProblem(code, { files, argvMax: trailing.length });\n    if (bad) return `point 14: ${bad}`;\n" + s.slice(d);
fs.writeFileSync(target, s);
console.log('spliced', target);
