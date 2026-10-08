// Replaces the two appendix code blocks of the h40d result draft with the saved outputs, verbatim:
// A = h40d-hedge-stats.out.txt (its run path line and the trailing exit marker dropped), B = the per-item rows of
// h40d-rule3.winners.out.txt. Refuses unless exactly two fenced blocks follow the appendix headings.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const VH = path.join(path.dirname(HERE), 'validation-hour');
const F = path.join(HERE, '2026-10-02-h40d-result.md');
let doc = fs.readFileSync(F, 'utf8');
const a = fs.readFileSync(path.join(VH, 'h40d-hedge-stats.out.txt'), 'utf8').split('\n')
    .filter((l, i) => i > 0 && l.trim() !== '' && !/^\[exit /.test(l)).join('\n');
const wl = fs.readFileSync(path.join(VH, 'h40d-rule3.winners.out.txt'), 'utf8').split('\n');
const from = wl.findIndex((l) => l.startsWith('per item:'));
if (from < 0) throw new Error('no per-item header');
const b = wl.slice(from + 1).filter((l) => /^  R\d\d\w*\s/.test(l)).map((l) => l.slice(2)).join('\n');
if (b.split('\n').length !== 45) throw new Error(`expected 45 per-item rows, got ${b.split('\n').length}`);
const swap = (heading, body) => {
    const h = doc.indexOf(heading); if (h < 0) throw new Error(`no heading ${heading}`);
    const s = doc.indexOf('```\n', h), e = doc.indexOf('\n```', s + 4);
    if (s < 0 || e < 0) throw new Error(`no fenced block after ${heading}`);
    doc = doc.slice(0, s + 4) + body + doc.slice(e);
};
swap('## Appendix A', a);
swap('## Appendix B', b);
fs.writeFileSync(F, doc);
console.log(`appendix A lines ${a.split('\n').length}, appendix B rows ${b.split('\n').length}; CR bytes in the note: ${(doc.match(/\r/g) ?? []).length}`);
