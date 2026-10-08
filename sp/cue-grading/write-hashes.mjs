// Writes C\HASHES.txt per rev7-A4.5: recomputes every row's sha256, refuses any mismatch with the registered value,
// confirms the pairs file's mtime, writes UTF-8 without BOM with LF line ends. Prints shas/paths only.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const C = path.dirname(fileURLToPath(import.meta.url));
const SP = path.dirname(C);
const RUN = 'C:\\Users\\sotka\\OneDrive\\Masa\u00fcst\u00fc\\natively-cluely-ai-assistant\\electron\\test\\golden\\interview60.runs\\2026-10-06T01-12-56-eq';
const a4seal = fs.readFileSync(path.join(C, 'AMENDMENT-rev7-A4.md.sha256'), 'utf8').trim().split(/\s+/)[0];
const ROWS = [
  ['b1a412257cc8edc7087e6da22097db66717a53900785120415887781cf781f39', 'cue-grading\\PREREGISTER-cue-grading-rev7.md', 'REGISTRATION'],
  ['6992393e7d6dba219698c14d47aa5878d7a1b4ac58323b086a480cdef870b593', 'cue-grading\\AMENDMENT-rev7-A1.md', 'AMENDMENT'],
  ['bb2154cc1e986a57dd4f3043daaa7a3b8d821be77fff1fca3ebed6c39bc4bf98', 'cue-grading\\AMENDMENT-rev7-A2.md', 'AMENDMENT'],
  ['ddb49612f4f30823af9a6e95c2433d9c215dc7a0937de2e47772716a9f024573', 'cue-grading\\AMENDMENT-rev7-A3.md', 'AMENDMENT'],
  [a4seal, 'cue-grading\\AMENDMENT-rev7-A4.md', 'AMENDMENT'],
  ['03de625d611987d05b0f48385e0d54b26e5b92021653a2eff2a22a416fbe9e4f', 'cue-grading\\NOTE-flight-eq-export-2026-10-06.md', 'INPUT'],
  ['a1f9a2e0a185bbb7a93eef07e866325981b8ddc4cabe87b7ac0b4d1abbe876b6', 'flight-eq\\AMENDMENT-A5.md', 'INPUT'],
  ['92929cd322dd52e8cd4aa10d3da97f3ac42b37cdcd8c6d40d256a80f0af2e303', 'flight-eq\\AMENDMENT-A6.md', 'INPUT'],
  ['989ef47c97695a42574d35c2e463985510a5998185fb6b2f4e2ff4ba04774fd7', `${RUN}\\interview60.judge.pairs.json`, 'INPUT'],
  ['f69287735ddabe8c3c0c7dac832e4cda92f1001380538180f0841251170ebffa', `${RUN}\\interview60.timeline.json`, 'INPUT'],
];
const abs = (p) => (/^[A-Za-z]:\\/.test(p) ? p : path.join(SP, p));
for (const [want, p] of ROWS) {
  const got = createHash('sha256').update(fs.readFileSync(abs(p))).digest('hex');
  if (got !== want) { console.log(`REFUSED: ${p} hashes ${got.slice(0, 12)}, registered ${want.slice(0, 12)}`); process.exit(2); }
  console.log(`OK ${want.slice(0, 12)} ${path.basename(p)}`);
}
const mt = fs.statSync(abs(ROWS[8][1])).mtime;
const mtLocal = new Date(mt.getTime() + 3 * 3600000).toISOString().slice(0, 19).replace('T', ' ');
if (mtLocal.slice(0, 16) !== '2026-10-06 05:08') { console.log(`REFUSED: pairs mtime ${mtLocal}, expected 2026-10-06 05:08`); process.exit(2); }
const now = new Date(Date.now() + 3 * 3600000).toISOString().slice(0, 19).replace('T', ' ') + ' TST';
const text = `# C\\HASHES.txt   written ${now}, after A4's re-check (CONFIRMED)   pairs mtime ${mtLocal}   UTF-8, no BOM, LF\n` + ROWS.map((r) => r.join('  ')).join('\n') + '\n';
fs.writeFileSync(path.join(C, 'HASHES.txt'), Buffer.from(text, 'utf8'));
const b = fs.readFileSync(path.join(C, 'HASHES.txt'));
console.log(`WROTE HASHES.txt ${b.length} bytes, BOM ${b[0] === 0xef}, CR ${b.includes(13)}, sha256 ${createHash('sha256').update(b).digest('hex')}`);
