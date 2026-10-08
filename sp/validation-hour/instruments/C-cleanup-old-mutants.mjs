// Scratch (brief C): removes the OLD mutant folders of run-mutants-C.mjs from instruments\mutants\ (they carried long names; PowerShell 5.1
// cannot reach them past MAX_PATH, and some held calibration output with deliberately leaked text). A folder is "mine" only if it is a
// SUBFOLDER that holds all three brief-C instrument copies; builder B's top-level M*.mjs / M*.cal.txt files are never touched.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), 'mutants');
const need = ['h40d-rule3.mjs', 'h40d-hascuerule-check.mjs', 'h40d-grader-models.mjs'];
let removed = 0, kept = 0;
for (const e of fs.readdirSync(root, { withFileTypes: true })) {
    if (!e.isDirectory()) { kept++; continue; }
    const d = path.join(root, e.name);
    const names = fs.readdirSync(d);
    if (need.every((n) => names.includes(n))) { fs.rmSync(d, { recursive: true, force: true }); removed++; }
    else kept++;
}
console.log(`removed ${removed} brief-C mutant folders; left ${kept} other entries (builder B's) untouched`);
