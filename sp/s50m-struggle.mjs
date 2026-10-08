// Throwaway: per-question acceptable counts on s50m's six captured reference reps
// (3.1-lite LOW x3, 3.5-lite HIGH x3) plus the live hour, using the judge's own verdict rule
// (interview60.judge.mjs verdictOf). Prints the table and the struggle ids (<= 3 of 6).
import fs from 'node:fs';

const RUN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs/2026-09-22T08-22-50-s50m';
const verdictOf = ({ correctness, on_topic, delivery }) =>
    correctness === 0 || on_topic === 0 ? 'wrong' : correctness === 2 && on_topic === 2 && delivery >= 1 ? 'acceptable' : 'weak';
const load = (f) => JSON.parse(fs.readFileSync(`${RUN}/${f}`, 'utf8'));
const ARMS = {
    '3.1L': ['gemini-3.1-flash-lite_captured-low', 'gemini-3.1-flash-lite_captured-low-r2', 'gemini-3.1-flash-lite_captured-low-r3'],
    '3.5H': ['gemini-3.5-flash-lite_captured-high', 'gemini-3.5-flash-lite_captured-high-r2', 'gemini-3.5-flash-lite_captured-high-r3'],
};
const V = Object.fromEntries(Object.entries(ARMS).map(([k, files]) => [k, files.map((f) => load(`interview60.judge.verdicts.${f}.json`))]));
const inApp = load('interview60.judge.verdicts.json');
const ids = Object.keys(V['3.1L'][0]);
const rows = [];
for (const id of ids) {
    const acc = (arm) => V[arm].filter((v) => v[id] && verdictOf(v[id]) === 'acceptable').length;
    const a31 = acc('3.1L'), a35 = acc('3.5H');
    // The live hour keys a doubled question as id#2; the question counts when its best answer is acceptable.
    const live = Object.entries(inApp).filter(([k]) => k === id || k.startsWith(`${id}#`)).map(([, v]) => verdictOf(v));
    rows.push({ id, a31, a35, total: a31 + a35, live: live.includes('acceptable') ? 'acc' : live.length ? live[0] : '-' });
}
rows.sort((a, b) => a.total - b.total || a.id.localeCompare(b.id));
console.log('id       3.1L  3.5H  of6  live');
for (const r of rows) console.log(`${r.id.padEnd(8)} ${r.a31}/3   ${r.a35}/3   ${String(r.total).padStart(2)}   ${r.live}`);
const struggle = rows.filter((r) => r.total <= 3).map((r) => r.id);
const sum = (k) => rows.reduce((s, r) => s + r[k], 0);
console.log(`\nitems ${rows.length}   3.1L acceptable ${sum('a31')}/${rows.length * 3}   3.5H acceptable ${sum('a35')}/${rows.length * 3}`);
console.log(`struggle (<= 3 of 6): ${struggle.length}  ${struggle.join(',')}`);
