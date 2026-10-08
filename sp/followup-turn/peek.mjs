// Keys/lengths only — never prints prompt text.
import fs from 'fs';
const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/followup-context/';
for (const f of ['s50m-gated.json', 's50l-gated.json', 'parity-fixture.json', 's50l-parity-fixture.json']) {
  const j = JSON.parse(fs.readFileSync(SP + f, 'utf8'));
  const shape = (v, d = 0) => Array.isArray(v) ? `[${v.length}] of ${shape(v[0], d + 1)}` : v && typeof v === 'object' ? (d > 2 ? '{…}' : `{${Object.keys(v).map(k => k + ':' + (typeof v[k] === 'string' ? `str(${v[k].length})` : shape(v[k], d + 1))).join(', ')}}`) : typeof v;
  console.log(f, shape(j).slice(0, 1500));
}
