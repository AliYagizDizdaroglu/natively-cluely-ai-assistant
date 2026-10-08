import fs from 'node:fs';
const p = process.argv[2];
let s = fs.readFileSync(p, 'utf8');
const rep = (a, b) => { if (!s.includes(a)) throw new Error('anchor missing: ' + a.slice(0, 50)); s = s.replace(a, () => b); };
rep(`FIX-ROUND-A2-REPORT\\.md)$/);`, `FIX-ROUND-A2-REPORT\\.md|AMENDMENT-A2\\.md|A2-[A-Za-z0-9-]+\\.md)$/);\nadd(F, '', /^(gate-report-turn|stamp-turn|fill-section2|earlierQuestion\\.ref\\.test)\\.out\\.txt$/);`);
rep(`add(R, 'R', /\\.out\\.txt$/);`, `add(R, 'R', /(\\.out\\.txt|^(front|back)\\.console\\.txt|^grader-probe\\d*\\.out\\.json)$/);`);
rep(`add(R + '/scripts', 'R/scripts', /\\.mjs$/);`, `add(R + '/scripts', 'R/scripts', /(\\.mjs|\\.out\\.txt)$/);`);
// staging with CR normalisation
rep(`const refused = [], crFiles = [];`, `const refused = [], crFiles = [];\nconst norm = (buf) => Buffer.from(buf.toString('latin1').replace(/\\r\\n?/g, '\\n'), 'latin1'); // CRLF and lone CR -> LF, byte-preserving otherwise`);
rep(`let total = 0;
const rows = [];
for (const [src, dst] of files) {
    fs.mkdirSync(path.dirname(path.join(OUT, dst)), { recursive: true });
    fs.copyFileSync(src, path.join(OUT, dst));
    const b = fs.statSync(src).size; total += b;
    rows.push(\`\${sha(src)}  \${String(b).padStart(8)} bytes  \${dst}\`);
}`, `let total = 0;
const rows = [], normRows = [];
for (const [src, dst] of files) {
    const out = path.join(OUT, dst);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    const orig = fs.readFileSync(src);
    if (crFiles.includes(dst)) {
        fs.writeFileSync(out, norm(orig));
        normRows.push(\`\${sha(src)}  \${String(orig.length).padStart(8)} bytes  \${dst}  (original, untouched in the working folder)  ->  staged \${sha(out)}  \${String(fs.statSync(out).size).padStart(8)} bytes\`);
    } else fs.copyFileSync(src, out);
    const b = fs.statSync(out).size; total += b;
    rows.push(\`\${sha(out)}  \${String(b).padStart(8)} bytes  \${dst}\`);
}
if (fs.readdirSync(OUT, { recursive: true }).some((f) => { const q = path.join(OUT, f); return fs.statSync(q).isFile() && fs.readFileSync(q).includes(13); })) { console.log('a staged file still has a CR byte'); process.exit(3); }`);
rep(`    '## Not committed, recorded by hash`, `    '## CR-normalised copies: the staged copy of each file below has CRLF and lone CR turned into LF so the MAIN commit helper (which refuses CR blobs) accepts it; the original stays untouched in the working folder',\n    ...(normRows.length ? normRows : ['(none)']),\n    '',\n    '## Not committed, recorded by hash`);
rep(`console.log(\`CR-bearing files (copy-to-main will refuse them; nothing normalised): \${crFiles.length}\`);
crFiles.forEach((c) => console.log('  CR ' + c));`, `console.log(\`CR-bearing sources, staged as CR-normalised copies: \${crFiles.length}\`);
normRows.forEach((c) => console.log('  ' + c.replace(/\\(original.*?\\)\\s+/, '')));`);
rep(`// Prints names, counts`, `// A source with CR bytes is staged as a CR-normalised copy (CRLF and lone CR -> LF; the original is untouched) and both hashes go in MANIFEST.txt.\n// Prints names, counts`);
rep(`CR bytes are reported, never normalised.`, `CR files are reported.`);
fs.writeFileSync(p, s);
