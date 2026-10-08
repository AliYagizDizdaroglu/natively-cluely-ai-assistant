// make-reversed.mjs — a known-FAIL input for the decision CLI: the 2026-09-22 run with the two
// models' labels swapped, so the "candidate" carries the incumbent's measured latencies.
import fs from 'node:fs';
const D = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const rows = JSON.parse(fs.readFileSync(`${D}/paired-latency.json`, 'utf8'));
const flip = { '3.1-lite LOW': '3.5-lite HIGH', '3.5-lite HIGH': '3.1-lite LOW' };
fs.writeFileSync(`${D}/draft/reversed-2026-09-22.json`, JSON.stringify(rows.map((r) => ({ ...r, arm: flip[r.arm] })), null, 1));
console.log('wrote draft/reversed-2026-09-22.json');
