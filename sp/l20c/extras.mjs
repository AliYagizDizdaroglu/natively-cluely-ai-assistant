// L20c, "Reported outside the rule" (PREREGISTER-l20c.md): the reads score.mjs does not print. Counts, ids and arm
// names only: never an answer's text.
//   node extras.mjs
import fs from 'node:fs';
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const HERE = `${SP}/l20c`;
const { key, packets, arms } = JSON.parse(fs.readFileSync(`${SP}/l20c-key/key.json`, 'utf8'));
const slots = [{}, {}], answers = {};
for (const p of Object.keys(packets)) {
    for (const it of JSON.parse(fs.readFileSync(`${HERE}/blind/packet-${p}.json`, 'utf8')).items) answers[it.key] = it.answer;
    for (const [i, g] of ['g1', 'g2'].entries()) Object.assign(slots[i], JSON.parse(fs.readFileSync(`${HERE}/blind/verdicts-${p}-${g}.json`, 'utf8')));
}
const acc = (x) => x.correctness === 2 && x.on_topic === 2 && x.delivery >= 1;
const keys = Object.keys(key);
const packetOf = (k) => Object.keys(packets).find((p) => packets[p].includes(k.split('#')[0]));
const words = (s) => (String(s).match(/\S+/g) ?? []).length;
const med = (a) => { const s = [...a].sort((x, y) => x - y); const n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : null; };

console.log('consensus-wrong (both graders scored correctness 0):');
const cw = keys.filter((k) => slots.every((s) => s[k].correctness === 0));
for (const k of cw) console.log(`  ${key[k]}  ${k.split('#')[0]}`);
if (!cw.length) console.log('  none');
console.log('correctness 0 from ONE grader only:');
for (const k of keys.filter((k) => slots.filter((s) => s[k].correctness === 0).length === 1)) console.log(`  ${key[k]}  ${k.split('#')[0]}`);

console.log('\nwords per graded answer, by arm (n, median, max; over 85 words; over 150):');
for (const a of arms) {
    const w = keys.filter((k) => key[k] === a).map((k) => words(answers[k]));
    console.log(`  ${a.padEnd(12)} n ${String(w.length).padStart(2)}  median ${String(med(w)).padStart(5)}  max ${String(Math.max(...w)).padStart(3)}  over 85: ${String(w.filter((x) => x > 85).length).padStart(2)}  over 150: ${w.filter((x) => x > 150).length}`);
}

console.log('\nwhy an answer is not acceptable, by arm (each grade counted; an answer has two grades):');
for (const a of arms) {
    const g = keys.filter((k) => key[k] === a).flatMap((k) => slots.map((s) => s[k]));
    const n = (f) => g.filter(f).length;
    console.log(`  ${a.padEnd(12)} grades ${String(g.length).padStart(3)}  acceptable ${String(n(acc)).padStart(3)}  correctness<2 ${String(n((x) => x.correctness < 2)).padStart(3)}  on_topic<2 ${String(n((x) => x.on_topic < 2)).padStart(3)}  delivery 0 ${String(n((x) => x.delivery === 0)).padStart(2)}  delivery 1 ${String(n((x) => x.delivery === 1)).padStart(3)}`);
}

console.log('\ngrader agreement on acceptable, per packet:');
for (const p of Object.keys(packets)) {
    const ks = keys.filter((k) => packetOf(k) === p);
    const dis = ks.filter((k) => acc(slots[0][k]) !== acc(slots[1][k]));
    console.log(`  ${p}: ${ks.length - dis.length}/${ks.length}${dis.length ? `  disagree: ${dis.map((k) => `${k.split('#')[0]} (${key[k]})`).join(', ')}` : ''}`);
}

// s50m in-app answers served by the stall fallback, attributed by play window (the timeline's startedMs is ~1.15 s
// early unless its clock is `playsync`).
const s50m = `${MAIN}/electron/test/golden/interview60.runs/2026-09-22T08-22-50-s50m`;
const tl = JSON.parse(fs.readFileSync(`${s50m}/interview60.timeline.json`, 'utf8'));
const off = tl.clock === 'playsync' ? 0 : 1150;
const items = (tl.items ?? []).filter((i) => i.playedAt != null).sort((x, y) => x.playedAt - y.playedAt);
const ids38 = new Set(Object.values(packets).flat());
console.log('\ns50m in-app answers served by the 3.1-lite stall fallback (attributed to the last item that had started playing):');
for (const line of fs.readFileSync(`${s50m}/natively_debug.log`, 'utf8').split('\n')) {
    if (!line.includes('stalled after') || !line.includes('falling back')) continue;
    const t = Date.parse(line.slice(0, 24));
    const it = [...items].reverse().find((i) => i.playedAt + off <= t);
    console.log(`  ${line.slice(0, 24)}  ${it ? it.id : '?'}${it && ids38.has(it.id) ? '' : '  (not one of the 38)'}`);
}

// The app's first token after the question ends, on the 38 items: score.mjs's method (l20b/e2e-35.mjs), here for
// s50m (the pre-registered comparator, which must reproduce score.mjs's p50 6.1 s / p90 14.3 s) and for br1 (today's
// build with the hedge; reported only, like its answers).
const { pathToFileURL } = await import('node:url');
const { computeRun } = await import(pathToFileURL(`${MAIN}/electron/test/golden/interview60.metrics.mjs`).href);
const pct = (a, p) => (a.length ? a[Math.min(a.length - 1, Math.floor(a.length * p))] : null);
const s1 = (x) => (x == null ? '—' : `${(x / 1000).toFixed(1)} s`);
console.log('\nthe app\'s first token after the question ends, on the 38 items (score.mjs\'s method):');
for (const [name, dir] of [['s50m in-app', s50m], ['br1 in-app', `${MAIN}/electron/test/golden/interview60.runs/2026-09-30T11-45-30-br1`]]) {
    const m = computeRun(dir);
    const t = JSON.parse(fs.readFileSync(`${dir}/interview60.timeline.json`, 'utf8'));
    const o = t.clock === 'playsync' ? 0 : 1150;
    const firstTokens = [...fs.readFileSync(`${dir}/verbal-diag.log`, 'utf8').matchAll(/^\[(\S+)\] first token (\d+)ms/gm)].map((x) => Date.parse(x[1]));
    const e2e = [...ids38].map((id) => { const it = m.items.find((i) => i.id === id); const ft = it?.answeredAt == null ? null : firstTokens.find((x) => x >= it.answeredAt && x <= it.answeredAt + 60000); return ft ? ft - (it.spokeEnd + o) : null; }).filter((x) => x != null).sort((a, b) => a - b);
    console.log(`  ${name.padEnd(12)} n ${e2e.length}  p50 ${s1(pct(e2e, 0.5))}  p90 ${s1(pct(e2e, 0.9))}  max ${s1(e2e[e2e.length - 1])}  (timeline clock: ${t.clock ?? 'unset'})`);
}
