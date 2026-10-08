import fs from 'node:fs';
import { cutAtWordBudget } from './vsf.mjs';

const f = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs/2026-09-04T08-09-38-after4/natively_debug.log';
const log = fs.readFileSync(f, 'utf8');
const re = new RegExp('^(\\S+) \\[LOG\\] \\[Answer\\] full: (".*")$', 'gm');
const answers = [...log.matchAll(re)].map((m) => JSON.parse(m[2]));
const wc = (s) => (s.match(/\S+/g) ?? []).length;

async function* chunks(text, size) { for (let i = 0; i < text.length; i += size) yield text.slice(i, i + size); }

// CALIBRATION against the committed unit test's case.
{
    const sentence = (n, i) => Array.from({ length: n }, (_, k) => `w${i}x${k}`).join(' ') + '.';
    let out = '', done = [];
    for await (const c of cutAtWordBudget(chunks([1,2,3,4,5,6].map((i) => sentence(20, i)).join(' '), 7), { limit: 80, floor: 40, onDone: (r) => done.push(r) })) out += c;
    console.log('CAL 6x20 →', wc(out), JSON.stringify(done), '(expect 80 / cut true / allowance false)');
}

const before = answers.map(wc).sort((a, b) => a - b);
const rows = [];
for (const a of answers) {
    let out = '', done = [];
    for await (const c of cutAtWordBudget(chunks(a, 11), { limit: 80, floor: 40, onDone: (r) => done.push(r) })) out += c;
    rows.push({ before: wc(a), after: done[0]?.words ?? wc(out), cut: !!done[0]?.cut, allowance: !!done[0]?.allowance, tail: out.slice(-70) });
}
const after = rows.map((r) => r.after).sort((a, b) => a - b);
const p50 = (arr) => arr[Math.floor(arr.length * 0.5)];
console.log(`\nanswers=${answers.length}`);
console.log(`before: p50=${p50(before)} max=${before[before.length - 1]} over80=${before.filter((w) => w > 80).length}`);
console.log(`after : p50=${p50(after)} max=${after[after.length - 1]} over80=${after.filter((w) => w > 80).length}  cut=${rows.filter((r) => r.cut).length} allowance=${rows.filter((r) => r.allowance).length} under40=${after.filter((w) => w < 40).length}`);
console.log('\nanswers still OVER 80 after the budget (all would log allowance=yes → gate passes):');
for (const r of rows.filter((x) => x.after > 80).sort((a, b) => b.after - a.after)) console.log(`   ${r.before} → ${r.after} words  cut=${r.cut}  tail=${JSON.stringify(r.tail)}`);
console.log('\ncut endings that do not look like a sentence end (mid-sentence cut risk):');
for (const r of rows.filter((x) => x.cut)) {
    const t = r.tail.trimEnd();
    if (!/[.!?]["'\u201d\u2019)\]]*$/.test(t)) console.log(`   ${r.before} → ${r.after}  tail=${JSON.stringify(r.tail)}`);
}
console.log('\nendings on an abbreviation-style cut (…e.g. / …i.e. / single-letter):');
for (const r of rows) {
    const t = r.tail.trimEnd();
    if (/\b([a-z]|e\.g|i\.e|vs|etc|dr|mr|no)\.$/i.test(t)) console.log(`   ${r.before} → ${r.after} cut=${r.cut} tail=${JSON.stringify(r.tail)}`);
}
