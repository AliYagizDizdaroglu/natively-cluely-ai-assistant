// Aggregates followup-map.json by the candidate failure classes. Rates: in-app acceptable (A) and the captured twins'
// acceptance on the same prompt. Ids and counts only.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const rows = JSON.parse(fs.readFileSync(path.join(HERE, 'followup-map.json'), 'utf8'));
const answered = rows.filter((r) => r.grade !== '-');
const rate = (rs) => `${rs.filter((r) => r.grade === 'A').length}/${rs.length} in-app A` + (rs.some((r) => r.twinsN) ? `; twins ${rs.reduce((n, r) => n + r.twinsA, 0)}/${rs.reduce((n, r) => n + r.twinsN, 0)}` : '');
const line = (label, rs) => console.log(`${label.padEnd(58)} n ${String(rs.length).padStart(3)}  ${rate(rs)}`);
console.log(`follow-up rows ${rows.length}; answered ${answered.length}; unanswered ${rows.length - answered.length}: ${rows.filter((r) => r.grade === '-').map((r) => `${r.run}:${r.id}`).join(' ')}\n`);
console.log('BY PARENT PRESENCE in the prompt transcript (parent cover >= 0.5 = present):');
line('  parent present', answered.filter((r) => r.parentCoverInTranscript >= 0.5));
line('  parent absent', answered.filter((r) => r.parentCoverInTranscript < 0.5));
console.log('\nBY GAP (parent dispatch -> follow-up dispatch):');
for (const [lo, hi] of [[0, 90], [90, 120], [120, 150], [150, 180], [180, 1e9]]) line(`  ${lo}-${hi === 1e9 ? '' : hi} s`, answered.filter((r) => r.gap !== null && r.gap >= lo && r.gap < hi));
line('  gap unknown', answered.filter((r) => r.gap === null));
console.log('\nPARENT ABSENT, split by gap (is absence = eviction?):');
for (const [lo, hi] of [[0, 120], [120, 1e9]]) line(`  absent, gap ${lo}-${hi === 1e9 ? '' : hi} s`, answered.filter((r) => r.parentCoverInTranscript < 0.5 && r.gap !== null && r.gap >= lo && r.gap < hi));
console.log('\nEAR: the dispatched (pinned) line carries the parent (parent cover in the pinned line >= 0.5 = merged):');
line('  merged', answered.filter((r) => r.parentCoverInPinned >= 0.5));
line('  not merged', answered.filter((r) => r.parentCoverInPinned < 0.5));
console.log('  merged rows: ' + answered.filter((r) => r.parentCoverInPinned >= 0.5).map((r) => `${r.run}:${r.id}(${r.grade})`).join(' '));
console.log('\nEAR: the dispatched text covers < 0.6 of the roster follow-up (partial or paraphrased):');
line('  partial', answered.filter((r) => r.heardFollowCover < 0.6));
console.log('  rows: ' + answered.filter((r) => r.heardFollowCover < 0.6).map((r) => `${r.run}:${r.id}(${r.grade},${r.source},${r.heardFollowCover})`).join(' '));
console.log('\nBY SOURCE:');
for (const s of [...new Set(answered.map((r) => r.source))]) line(`  ${s}`, answered.filter((r) => r.source === s));
console.log('\nOFF-TOPIC (t <= 1) answers, with the parent present vs absent:');
line('  off-topic, parent present', answered.filter((r) => r.t !== null && r.t <= 1 && r.parentCoverInTranscript >= 0.5));
line('  off-topic, parent absent', answered.filter((r) => r.t !== null && r.t <= 1 && r.parentCoverInTranscript < 0.5));
console.log('\nPER ROSTER FOLLOW-UP (across hours): in-app A / answered, twins A / n, parent absent in how many hours');
const ids = [...new Set(rows.map((r) => `${r.run.startsWith('h40') ? 'H' : 'S'}|${r.id}`))].sort();
for (const k of ids) {
    const [fam, id] = k.split('|');
    const rs = rows.filter((r) => r.id === id && (fam === 'H') === r.run.startsWith('h40'));
    const ans = rs.filter((r) => r.grade !== '-');
    const tA = rs.reduce((n, r) => n + r.twinsA, 0), tN = rs.reduce((n, r) => n + r.twinsN, 0);
    const absent = ans.filter((r) => r.parentCoverInTranscript < 0.5).length;
    const gaps = rs.map((r) => (r.gap === null ? '?' : r.gap.toFixed(0))).join(',');
    console.log(`  ${id.padEnd(7)} hours ${rs.length}  in-app ${ans.filter((r) => r.grade === 'A').length}/${ans.length}  twins ${tA}/${tN}  parent absent ${absent}/${ans.length}  gaps ${gaps}`);
}
