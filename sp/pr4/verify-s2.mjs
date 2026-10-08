// Read-only: verifies section2-filled.md against the files on disk and repeats fill-section2's 12.4 diff check (copied normalizer). Writes nothing.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
const FT = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/followup-turn';
const { verifySection2, parseSection2 } = await import(pathToFileURL(path.join(FT, 'R/scripts/common.mjs')).href);
const sha = (b) => createHash('sha256').update(b).digest('hex');
const filled = path.join(FT, 'section2-filled.md');
const v = verifySection2(filled);
const p = parseSection2(fs.readFileSync(filled, 'utf8'));
console.log(`section2-filled.md sha256 ${sha(fs.readFileSync(filled))}; ${p.files.size} hashed files, ${p.blocks.size} blocks -> ${v.ok ? 'VERIFIES' : 'DOES NOT VERIFY: ' + v.problems.join(' | ')}`);
for (const want of ['R/audit-graders.mjs', 'R/launch-grader.mjs', 'R/scripts/grader-session-calibrate.mjs', 'R/scripts/legs-decide-calibrate.mjs', 'R/legs-decide.mjs']) {
    const e = p.files.get(want);
    const disk = sha(fs.readFileSync(path.join(FT, want)));
    console.log(`${want}: section2 ${e ? e.sha.slice(0, 16) : 'MISSING'} disk ${disk.slice(0, 16)} ${e && e.sha === disk ? 'EQUAL' : 'DIFFER'}`);
}
const src = fs.readFileSync(path.join(FT, 'PREREGISTER-turn-followup.md'), 'utf8');
console.log(`PREREGISTER sha256 ${sha(Buffer.from(src, 'utf8'))}`);
const NOTE_BEGIN = '<!-- I3-NOTE-BEGIN -->', NOTE_END = '<!-- I3-NOTE-END -->';
function normalizeForDiff(t) {
    t = t.split(NOTE_BEGIN).map((part, i) => (i === 0 ? part : part.slice(part.indexOf(NOTE_END) + NOTE_END.length))).join('');
    const out = []; let inS2 = false;
    for (const l of t.split('\n')) {
        if (l.startsWith('## ')) inS2 = l.startsWith('## 2.');
        if (inS2 && l.startsWith('|')) {
            if (/^\| s50[mlk]:/.test(l) || l.startsWith('| Gated block |') || /^\|---\|---\|---\|$/.test(l)) continue;
            const c = l.split('|');
            if (c[1].startsWith(' `MAIN/electron/test/golden/interview60.judge.mjs`') || c[1].startsWith(' `SP/validation-hour/h40d-grader-dispatch.txt`')) continue;
            out.push(`|${c[1]}|`); continue;
        }
        if (inS2 && l.startsWith('**Gated block hashes')) continue;
        if (l.trim()) out.push(l);
    }
    return out;
}
const a = normalizeForDiff(src), b = normalizeForDiff(fs.readFileSync(filled, 'utf8'));
const bad = a.length !== b.length ? Math.min(a.length, b.length) : a.findIndex((l, i) => l !== b[i]);
console.log(bad >= 0 && (a.length !== b.length || a[bad] !== b[bad]) ? `DIFF CHECK FAILED at ${bad + 1}` : `DIFF CHECK OK (${a.length} normalized lines identical)`);
// calibrate the diff check: one changed non-section-2 line must FAIL
const mut = fs.readFileSync(filled, 'utf8').replace('\n## 4.', '\n## 4. X');
const b2 = normalizeForDiff(mut);
const bad2 = a.length !== b2.length ? Math.min(a.length, b2.length) : a.findIndex((l, i) => l !== b2[i]);
console.log(`diff-check negative control (section 4 heading edited): ${bad2 >= 0 ? 'FAILS as it should' : 'PASSES (BROKEN)'}`);
