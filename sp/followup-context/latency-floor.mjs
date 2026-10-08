// Throwaway (text only): noise floor for the replay's latency and length clauses, from the
// previous follow-up replay (2026-09-26, 10 ids x 3 reps x 2 arms on gemini-3.1-flash-lite LOW;
// arm B added ~600 chars of parent exchange to arm A's prompt). Reads MAIN read-only.
import fs from 'node:fs';
import path from 'node:path';
const DIR = 'C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-cluely-ai-assistant\\electron\\test\\golden\\passes\\2026-09-26-followup-replay';
const load = (arm, rep) => JSON.parse(fs.readFileSync(path.join(DIR, `interview60.answers.gemini-3.1-flash-lite_fparent-${arm}-r${rep}.json`), 'utf8'));
const files = {};
for (const arm of ['A', 'B']) for (const rep of [1, 2, 3]) files[`${arm}${rep}`] = load(arm, rep);
const ids = Object.keys(files.A1).filter((id) => files.A1[id]?.spoken);
const q = (arr, p) => { const s = [...arr].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(s.length * p))]; };
const med = (arr) => q(arr, 0.5);
console.log(`ids: ${ids.length} (${ids.join(' ')})`);
console.log('\nper arm/rep: ttft p50 / p90 (ms), words p50, total p50 (ms)');
for (const k of Object.keys(files)) {
    const rows = ids.map((id) => files[k][id]).filter((r) => r?.ttft != null);
    console.log(`${k}: n=${rows.length} ttft p50 ${med(rows.map((r) => r.ttft))} p90 ${q(rows.map((r) => r.ttft), 0.9)}  words p50 ${med(rows.map((r) => r.words))}  total p50 ${med(rows.map((r) => r.total))}  thoughts p50 ${med(rows.map((r) => r.thoughts ?? 0))}`);
}
console.log('\nwithin-arm rep-to-rep differences on IDENTICAL prompts (noise floor):');
for (const [x, y] of [['A1', 'A2'], ['A2', 'A3'], ['A1', 'A3'], ['B1', 'B2'], ['B2', 'B3'], ['B1', 'B3']]) {
    const d = ids.filter((id) => files[x][id]?.ttft != null && files[y][id]?.ttft != null).map((id) => files[y][id].ttft - files[x][id].ttft);
    const w = ids.filter((id) => files[x][id]?.words != null && files[y][id]?.words != null).map((id) => files[y][id].words - files[x][id].words);
    console.log(`${y}-${x}: ttft diff p50 ${med(d)} p90 ${q(d, 0.9)} |abs| p50 ${med(d.map(Math.abs))}   words diff p50 ${med(w)} |abs| p50 ${med(w.map(Math.abs))}`);
}
console.log('\nbetween-arm paired differences (B - A, same rep; B carried ~600 more chars):');
const allD = [], allW = [];
for (const rep of [1, 2, 3]) {
    const d = ids.filter((id) => files[`A${rep}`][id]?.ttft != null && files[`B${rep}`][id]?.ttft != null).map((id) => files[`B${rep}`][id].ttft - files[`A${rep}`][id].ttft);
    const w = ids.filter((id) => files[`A${rep}`][id]?.words != null && files[`B${rep}`][id]?.words != null).map((id) => files[`B${rep}`][id].words - files[`A${rep}`][id].words);
    allD.push(...d); allW.push(...w);
    console.log(`rep ${rep}: ttft diff p50 ${med(d)} p90 ${q(d, 0.9)}   words diff p50 ${med(w)}`);
}
console.log(`pooled: ttft diff p50 ${med(allD)} p90 ${q(allD, 0.9)} (n=${allD.length})   words diff p50 ${med(allW)} p90 ${q(allW, 0.9)}`);
console.log('\nprompt sizes (user chars) A vs B, from prompts.A/B.json if present:');
try {
    const A = JSON.parse(fs.readFileSync(path.join(DIR, '..', '..', '..', '..', '..', '..', 'nonexistent'), 'utf8'));
} catch { /* not needed */ }
