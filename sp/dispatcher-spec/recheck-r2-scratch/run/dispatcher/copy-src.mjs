// Read-only on the repo: copy the six pure TS modules the replay needs into DS/src, rewriting relative
// import specifiers to carry `.ts` so Node's type stripping can load them. Nothing in the repo is touched.
import fs from 'node:fs';
import path from 'node:path';
const [srcDir, outDir] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
for (const f of ['interviewerTurn.ts', 'ChipDeduper.ts', 'jaccardSimilarity.ts', 'questionReconcile.ts', 'questionShape.ts', 'containment.ts']) {
  const s = fs.readFileSync(path.join(srcDir, f), 'utf8').replace(/from '(\.\/[A-Za-z]+)'/g, "from '$1.ts'");
  fs.writeFileSync(path.join(outDir, f), s);
  console.log(`copied ${f} (${s.length} chars)`);
}
