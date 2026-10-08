// RECHECK THROWAWAY: copies r2/, review-scratch/ and the diagnosis folder into recheck-r2-scratch/run/ so that
// run-r2.mjs can be re-run WITHOUT touching DS/r2 (the brief: read-only except RECHECK-r2.md and this folder).
// Layout keeps every relative import valid unchanged:
//   run/dispatcher        <- scratchpad/dispatcher            (r2 and RS import ../../dispatcher/src/*.ts)
//   run/x/r2              <- dispatcher-spec/r2
//   run/x/review-scratch  <- dispatcher-spec/review-scratch  (run-review.mjs resolves ../review-scratch)
// Also writes md5 manifests of the originals (before.json) so a later check proves nothing changed.
// usage: node setup.mjs copy | node setup.mjs manifest <out.json>
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const SPEC = path.resolve(HERE, '..');
const SCRATCH = path.resolve(SPEC, '..');
const SRC = { dispatcher: path.join(SCRATCH, 'dispatcher'), r2: path.join(SPEC, 'r2'), rs: path.join(SPEC, 'review-scratch') };
function walk(dir) { const out = []; for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, e.name); if (e.isDirectory()) out.push(...walk(p)); else out.push(p); } return out; }
function copyTree(from, to) { for (const f of walk(from)) { const rel = path.relative(from, f); const dst = path.join(to, rel); fs.mkdirSync(path.dirname(dst), { recursive: true }); fs.copyFileSync(f, dst); } }
const md5 = (f) => crypto.createHash('md5').update(fs.readFileSync(f)).digest('hex');
const mode = process.argv[2];
if (mode === 'copy') {
  copyTree(SRC.dispatcher, path.join(HERE, 'run', 'dispatcher'));
  copyTree(SRC.r2, path.join(HERE, 'run', 'x', 'r2'));
  copyTree(SRC.rs, path.join(HERE, 'run', 'x', 'review-scratch'));
  for (const k of ['dispatcher', 'x/r2', 'x/review-scratch']) console.log(k, walk(path.join(HERE, 'run', k)).length, 'files');
} else if (mode === 'manifest') {
  const m = {};
  for (const [k, d] of Object.entries(SRC)) for (const f of walk(d)) m[`${k}/${path.relative(d, f).replace(/\\/g, '/')}`] = md5(f);
  for (const f of ['2026-10-01-turn-memory-design.md', '2026-10-01-turn-memory-design.r2.md', 'CHANGES-r2.md', 'REVIEW.md', 'recheck-r2-brief.md']) m[`spec/${f}`] = md5(path.join(SPEC, f));
  fs.writeFileSync(path.join(HERE, process.argv[3]), JSON.stringify(m, null, 1));
  console.log(Object.keys(m).length, 'files hashed ->', process.argv[3]);
} else if (mode === 'compare') {
  const a = JSON.parse(fs.readFileSync(path.join(HERE, process.argv[3]), 'utf8'));
  const b = JSON.parse(fs.readFileSync(path.join(HERE, process.argv[4]), 'utf8'));
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  let diff = 0;
  for (const k of keys) if (a[k] !== b[k]) { diff++; console.log('DIFF', k, a[k] ?? '-', b[k] ?? '-'); }
  console.log(`${keys.size} files compared, ${diff} differ`);
} else { console.error('usage: copy | manifest <out> | compare <a> <b>'); process.exit(2); }
