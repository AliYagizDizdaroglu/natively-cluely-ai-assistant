// r2 THROWAWAY: per-item traces through replay-r2.mjs, saved as out-trace-<fixture>-<item>.txt. Question text only.
// usage: node traces.mjs [--jitter MS] [fixture:item:mode ...]  (no args = the spec's named items)
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { FX, HERE } from './fx.mjs';
const rest = process.argv.slice(2);
const argv = (n, d) => (rest.includes(n) ? rest[rest.indexOf(n) + 1] : d);
const jitter = argv('--jitter', '50');
const wanted = rest.filter((a) => a.includes(':'));
const DEFAULT = [
  'cuesmoke2:S1Q07F:calib', 'cuesmoke2:S1Q07F:fix', 'cuesmoke2:S1Q07F:fixunk', 'cuesmoke2:S1Q08F:calib', 'cuesmoke2:S1Q08F:fix', 'cuesmoke2:S1Q08F:fixunk',
  'br1:S1Q08:fix', 'br1:S2Q01:fix', 'cuesmoke:S1Q08:fix', 'cuesmoke:S1Q08F:calib', 's50d:S2Q05F:fix', 's50d:S2Q09:fix', 's50i:S2Q09:fix', 's50i:S2Q09:fixunk', 's50i:S2Q07F:fix', 's50j:S1Q10F:fix', 's50j:S1Q07F:fix', 's50j:S1Q08F:fix', 's50j:S2Q09:calib', 's50j:S1Q07F:calib', 's50g:S2Q01F:fix', 's50e:S2Q01F:fix', 'br1:S2Q04F:fix',
];
const byName = Object.fromEntries(FX.map(([n, fx, log]) => [n, { fx, log }]));
const groups = {};
for (const spec of (wanted.length ? wanted : DEFAULT)) {
  const [name, id, mode] = spec.split(':');
  const f = byName[name]; if (!f) { console.log(`no fixture ${name}`); continue; }
  let out;
  try { out = execFileSync(process.execPath, ['--experimental-strip-types', '--no-warnings', path.join(HERE, 'replay-r2.mjs'), f.fx, f.log, mode, '--jitter', jitter, '--trace', id], { encoding: 'utf8', maxBuffer: 64 << 20 }); }
  catch (e) { out = `EXIT ${e.status}\n${e.stdout ?? ''}\n${e.stderr ?? ''}`; }
  const key = `${name}-${id}`;
  groups[key] = (groups[key] ?? '') + `===== ${name} ${id} [${mode}]\n${out}\n`;
}
for (const [key, text] of Object.entries(groups)) { fs.writeFileSync(path.join(HERE, `out-trace-${key}.txt`), text); console.log(`out-trace-${key}.txt: ${text.split('\n').length} lines`); }
