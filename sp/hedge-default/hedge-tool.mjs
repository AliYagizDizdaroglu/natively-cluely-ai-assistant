// Throwaway (scratchpad only): stage MAIN files, report their bytes, and detect drift in MAIN between
// staging and copy-back. No git. Usage:
//   node hedge-tool.mjs info   <MAIN-relative path>...   size, CR count, BOM, last byte, sha256, mtime
//   node hedge-tool.mjs stage  <MAIN-relative path>...   copy MAIN's file to stage/<same path> AND orig/<same path>, record its sha256
//   node hedge-tool.mjs rebase <MAIN-relative path>...   staged file == MAIN's file: make that the recorded base and the pristine orig/ copy
//   node hedge-tool.mjs check  <MAIN-relative path>...   MAIN's file still equals the recorded base? (DRIFT if not)
//   node hedge-tool.mjs diff   <MAIN-relative path>...   MAIN's file vs the staged copy: identical or how many bytes differ
//   node hedge-tool.mjs udiff  <MAIN-relative path>...   unified diff, orig/ (the recorded base) vs the staged copy
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const STAGE = path.join(HERE, 'stage');
const ORIG = path.join(HERE, 'orig');
const BASES = path.join(HERE, 'stage-bases.json');
const [cmd, ...rels] = process.argv.slice(2);
const sha = (b) => createHash('sha256').update(b).digest('hex');
const bases = fs.existsSync(BASES) ? JSON.parse(fs.readFileSync(BASES, 'utf8')) : {};
const facts = (b) => `${b.length} bytes, CR=${b.filter((x) => x === 13).length}, BOM=${b[0] === 0xef && b[1] === 0xbb && b[2] === 0xbf}, lastbyte=0x${b[b.length - 1].toString(16)}`;
const saveBases = () => fs.writeFileSync(BASES, JSON.stringify(bases, null, 2) + '\n');

/** Unified diff of two texts, 3 lines of context; the common prefix and suffix are trimmed before the LCS. */
export function unifiedDiff(aText, bText, aName, bName, ctx = 3) {
    // Both texts end with a newline (checked by `info`: lastbyte 0xa), so the empty element after it is not a line.
    const lines = (t) => { const x = t.split('\n'); if (x[x.length - 1] === '') x.pop(); return x; };
    const a = lines(aText), b = lines(bText);
    let p = 0;
    while (p < a.length && p < b.length && a[p] === b[p]) p++;
    let s = 0;
    while (s < a.length - p && s < b.length - p && a[a.length - 1 - s] === b[b.length - 1 - s]) s++;
    const A = a.slice(p, a.length - s), B = b.slice(p, b.length - s);
    const n = A.length, m = B.length;
    const L = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = A[i] === B[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    const ops = [];
    for (let k = 0; k < p; k++) ops.push({ t: ' ', l: a[k] });
    let i = 0, j = 0;
    while (i < n || j < m) {
        if (i < n && j < m && A[i] === B[j]) { ops.push({ t: ' ', l: A[i] }); i++; j++; }
        else if (i < n && (j >= m || L[i + 1][j] >= L[i][j + 1])) { ops.push({ t: '-', l: A[i] }); i++; }   // deletions first, as diff -u prints a replaced line
        else { ops.push({ t: '+', l: B[j] }); j++; }
    }
    for (let k = a.length - s; k < a.length; k++) ops.push({ t: ' ', l: a[k] });
    // Running line numbers (1-based) at the start of each op.
    let al = 1, bl = 1;
    for (const o of ops) { o.al = al; o.bl = bl; if (o.t !== '+') al++; if (o.t !== '-') bl++; }
    const changed = ops.map((o, k) => (o.t !== ' ' ? k : -1)).filter((k) => k >= 0);
    if (!changed.length) return `${aName} and ${bName} are identical\n`;
    const groups = [];
    for (const k of changed) {
        const g = groups[groups.length - 1];
        if (g && k - g.last - 1 <= 2 * ctx) g.last = k; else groups.push({ first: k, last: k });   // as GNU diff: up to 2*ctx unchanged lines between two changes share a hunk
    }
    let out = `--- ${aName}\n+++ ${bName}\n`;
    for (const g of groups) {
        const from = Math.max(0, g.first - ctx), to = Math.min(ops.length - 1, g.last + ctx);
        const slice = ops.slice(from, to + 1);
        const aCount = slice.filter((o) => o.t !== '+').length, bCount = slice.filter((o) => o.t !== '-').length;
        out += `@@ -${slice[0].al},${aCount} +${slice[0].bl},${bCount} @@\n`;
        for (const o of slice) out += `${o.t}${o.l}\n`;
    }
    return out;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    if (!cmd || !rels.length) { console.log('usage: hedge-tool.mjs info|stage|rebase|check|diff|udiff <MAIN-relative path>...'); process.exit(2); }
    let bad = 0;
    for (const rel of rels) {
        const src = path.join(MAIN, rel);
        const dst = path.join(STAGE, rel);
        const org = path.join(ORIG, rel);
        const b = fs.readFileSync(src);
        if (cmd === 'info') {
            console.log(`${rel}: ${facts(b)}, mtime ${fs.statSync(src).mtime.toISOString()}, sha256 ${sha(b)}`);
        } else if (cmd === 'stage') {
            fs.mkdirSync(path.dirname(dst), { recursive: true });
            fs.mkdirSync(path.dirname(org), { recursive: true });
            if (fs.existsSync(dst) || fs.existsSync(org)) { console.log(`REFUSED: ${rel} is already staged; delete stage/${rel} and orig/${rel} to restage`); bad++; continue; }
            fs.copyFileSync(src, dst);
            fs.copyFileSync(src, org);
            bases[rel] = sha(b);
            saveBases();
            console.log(`${rel}: staged (+ pristine orig/), ${facts(b)}, base sha256 ${sha(b)}`);
        } else if (cmd === 'rebase') {
            const s = fs.readFileSync(dst);
            if (sha(s) !== sha(b)) { console.log(`REFUSED: ${rel}: the staged copy is not identical to MAIN's file`); bad++; continue; }
            fs.mkdirSync(path.dirname(org), { recursive: true });
            fs.copyFileSync(src, org);
            bases[rel] = sha(b);
            saveBases();
            console.log(`${rel}: rebased, ${facts(b)}, base sha256 ${sha(b)}`);
        } else if (cmd === 'check') {
            if (!bases[rel]) { console.log(`${rel}: NO RECORDED BASE`); bad++; continue; }
            const same = bases[rel] === sha(b);
            console.log(`${rel}: MAIN ${same ? 'still equals the base (no drift)' : 'HAS DRIFTED from the base'} (${sha(b).slice(0, 16)} vs base ${bases[rel].slice(0, 16)})`);
            if (!same) bad++;
        } else if (cmd === 'diff') {
            const s = fs.readFileSync(dst);
            const same = sha(s) === sha(b);
            console.log(`${rel}: staged ${sha(s).slice(0, 16)} (${s.length} B) vs MAIN ${sha(b).slice(0, 16)} (${b.length} B) -> ${same ? 'IDENTICAL' : 'DIFFERENT'}`);
        } else if (cmd === 'info-orig' || cmd === 'info-staged') {
            // node reads the >260-character stage paths that Windows PowerShell 5.1 (Get-Item, Get-FileHash) cannot
            const f = fs.readFileSync(cmd === 'info-orig' ? org : dst);
            console.log(`${rel} [${cmd === 'info-orig' ? 'orig (pristine, before)' : 'staged (after)'}]: ${facts(f)}, sha256 ${sha(f)}`);
        } else if (cmd === 'udiff') {
            process.stdout.write(unifiedDiff(fs.readFileSync(org, 'utf8'), fs.readFileSync(dst, 'utf8'), `a/${rel} (before)`, `b/${rel} (after)`));
        } else { console.log(`unknown command ${cmd}`); process.exit(2); }
    }
    process.exit(bad ? 1 : 0);
}
