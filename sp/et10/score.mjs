// ET10: unblind the two graders' verdicts and apply the pre-registered rule verbatim.
// Refuses on any missing or malformed verdict.
//   node score.mjs            ET10  (PREREGISTER-et10.md):  blind/  + et10-key/key.json  -> RESULT.md
//   node score.mjs --batch2   ET10b (PREREGISTER-et10b.md): blind2/ + et10-key/key2.json -> RESULT2.md
import fs from 'node:fs';

const HERE = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/et10';
const APP_P50_MS = 7472; // pre-registered: s50k in-app e2e median on these 10 items
const B2 = process.argv.includes('--batch2');
const CFG = B2
    ? { key: `${HERE}-key/key2.json`, vdir: `${HERE}/blind2`, out: `${HERE}/RESULT2.md`, etArms: ['et-low', 'et-high', 'et-medium', 'live38'], decide: ['et-medium', 'live38'],
        title: '# ET10b result — Extended Thinking medium and gemini-3.8-live bare vs the app, 10 hardest scenario50 items', prereg: 'PREREGISTER-et10b.md' }
    : { key: `${HERE}-key/key.json`, vdir: `${HERE}/blind`, out: `${HERE}/RESULT.md`, etArms: ['et-low', 'et-high'], decide: ['et-low', 'et-high'],
        title: '# ET10 result — gemini-3.8-live-extended-thinking vs the app, 10 hardest scenario50 items', prereg: 'PREREGISTER-et10.md' };
const ET_FILES = { 'et-low': 'et10-low', 'et-high': 'et10-high', 'et-medium': 'et10-medium', live38: 'et10-live38' };
// ET10_VERDICTS_DIR points the scorer at a calibration set of verdicts (calib-score.mjs); RESULT.md goes beside them.
const VDIR = process.env.ET10_VERDICTS_DIR ?? CFG.vdir;
const OUT = process.env.ET10_VERDICTS_DIR ? `${VDIR}/RESULT.md` : CFG.out;
const { key } = JSON.parse(fs.readFileSync(CFG.key, 'utf8'));
const G = ['g1', 'g2'].map((g) => ({ g, v: JSON.parse(fs.readFileSync(`${VDIR}/verdicts-${g}.json`, 'utf8')) }));
const app = JSON.parse(fs.readFileSync(`${HERE}/app-baseline.json`, 'utf8'));
const et = Object.fromEntries(CFG.etArms.map((a) => [a, JSON.parse(fs.readFileSync(`${HERE}/runs/${ET_FILES[a]}.answers.json`, 'utf8'))]));

for (const { g, v } of G) {
    const missing = Object.keys(key).filter((k) => !v[k]);
    const extra = Object.keys(v).filter((k) => !key[k]);
    if (missing.length || extra.length) throw new Error(`${g}: missing ${missing.join(',') || '-'} extra ${extra.join(',') || '-'}`);
    for (const [k, x] of Object.entries(v)) for (const f of ['correctness', 'on_topic', 'delivery']) {
        if (![0, 1, 2].includes(x[f])) throw new Error(`${g} ${k}: ${f}=${x[f]}`);
    }
}
const ARMS = ['app-inapp', 'app-twin1', 'app-twin2', 'app-twin3', ...CFG.etArms];
const IDS = Object.keys(app.items);
const acc = (x) => x.correctness === 2 && x.on_topic === 2 && x.delivery >= 1;
const keyOf = (arm, id) => Object.keys(key).find((k) => key[k] === arm && k.startsWith(`${id}#`));
const cell = {}; const tally = {};
for (const arm of ARMS) {
    tally[arm] = { acc: [0, 0], wrong: [0, 0], delivery0: [0, 0] };
    for (const id of IDS) {
        const k = keyOf(arm, id);
        if (!k) throw new Error(`no key for ${arm} ${id}`);
        cell[`${arm}|${id}`] = G.map(({ v }, i) => {
            const x = v[k];
            if (acc(x)) tally[arm].acc[i]++;
            if (x.correctness === 0) tally[arm].wrong[i]++;
            if (x.delivery === 0) tally[arm].delivery0[i]++;
            return acc(x) ? 'A' : x.correctness === 0 ? 'X' : 'w';
        }).join('');
    }
    tally[arm].mean = (tally[arm].acc[0] + tally[arm].acc[1]) / 2;
}
const agree = Object.keys(key).filter((k) => acc(G[0].v[k]) === acc(G[1].v[k])).length;
const pct = (a, p) => (a.length ? a[Math.min(a.length - 1, Math.floor(a.length * p))] : null);
const bestApp = Math.max(...ARMS.filter((a) => a.startsWith('app')).map((a) => tally[a].mean));
const L = [];
L.push(CFG.title, '');
L.push(`Rule: ${CFG.prereg} (written before the runs). Graders: two independent claude-opus-5-5 agents, blind, frozen rubric. Grader agreement on acceptable: ${agree}/${Object.keys(key).length}.`, '');
L.push('| arm | acceptable g1 | g2 | mean | wrong (g1/g2) | delivery 0 (g1/g2) |', '|---|---|---|---|---|---|');
for (const arm of ARMS) { const t = tally[arm]; L.push(`| ${arm} | ${t.acc[0]} | ${t.acc[1]} | ${t.mean.toFixed(1)} | ${t.wrong.join('/')} | ${t.delivery0.join('/')} |`); }
L.push('', `Best app arm mean: ${bestApp.toFixed(1)} of 10.`, '');
L.push('## Timing (question end → first word of the real answer)', '');
const e2e = IDS.map((id) => app.items[id].e2eMs).filter((x) => x != null).sort((a, b) => a - b);
L.push(`- app (s50k in-app, 3.1-lite LOW): p50 ${(pct(e2e, .5) / 1000).toFixed(1)} s, p90 ${(pct(e2e, .9) / 1000).toFixed(1)} s (whole answer then streams in at text speed)`);
const verdicts = {};
for (const arm of CFG.etArms) {
    const A = et[arm];
    const tt = IDS.map((id) => A[id]?.ttftMs ?? Infinity).sort((a, b) => a - b);
    const lw = IDS.map((id) => A[id]?.lastWordMs).filter((x) => x != null).sort((a, b) => a - b);
    const hold = IDS.map((id) => A[id]?.holding?.[0]?.atMs).filter((x) => x != null).sort((a, b) => a - b);
    const th = IDS.map((id) => A[id]?.thoughts ?? 0).sort((a, b) => a - b);
    const wd = IDS.map((id) => A[id]?.words ?? 0).sort((a, b) => a - b);
    const errs = IDS.filter((id) => A[id]?.systemError || A[id]?.empty || !A[id]?.played);
    const s = (x) => (x === Infinity || x == null ? '—' : `${(x / 1000).toFixed(1)} s`);
    L.push(`- ${arm}: real answer p50 ${s(pct(tt, .5))}, p90 ${s(pct(tt, .9))}; holding line on ${hold.length}/10 at p50 ${s(pct(hold, .5))}; last word p50 ${s(pct(lw, .5))}, p90 ${s(pct(lw, .9))}; words p50 ${pct(wd, .5)}; thought tokens p50 ${pct(th, .5)}; system-error/empty: ${errs.length ? errs.join(', ') : 'none'}`);
    if (!CFG.decide.includes(arm)) continue;
    const c1 = tally[arm].mean >= bestApp;
    const c2 = tally[arm].wrong[0] === 0 && tally[arm].wrong[1] === 0 && errs.length === 0;
    const c3 = pct(tt, .5) <= APP_P50_MS;
    verdicts[arm] = { c1, c2, c3, pass: c1 && c2 && c3 };
}
L.push('', '## Decision (pre-registered, all three per arm)', '');
for (const [arm, v] of Object.entries(verdicts)) L.push(`- ${arm}: quality ${v.c1 ? 'PASS' : 'FAIL'} (${tally[arm].mean.toFixed(1)} vs best app ${bestApp.toFixed(1)}), safety ${v.c2 ? 'PASS' : 'FAIL'}, speed ${v.c3 ? 'PASS' : 'FAIL'} → ${v.pass ? 'PASS' : 'FAIL'}`);
if (B2) L.push('', `**Verdict (each arm on its own): ${Object.entries(verdicts).map(([a, v]) => `${a} ${v.pass ? 'WORTH AN IN-APP PROTOTYPE on its own pre-registered hour' : 'NOT VIABLE'}`).join('; ')}.**`, '');
else L.push('', `**Verdict: ${Object.values(verdicts).some((v) => v.pass) ? 'WORTH AN IN-APP PROTOTYPE on its own pre-registered hour' : 'NOT VIABLE — no app path; closed until a new model version'}.**`, '');
L.push('## Per question (g1 g2: A acceptable, w weak, X wrong)', '', `| id | ${ARMS.join(' | ')} | ${CFG.etArms.map((a) => `${a.replace('et-', 'ET-')} ttft`).join(' | ')} |`, `|---|${[...ARMS, ...CFG.etArms].map(() => '---').join('|')}|`);
const ttftCell = (arm, id) => (et[arm][id]?.ttftMs == null ? '—' : (et[arm][id].ttftMs / 1000).toFixed(1));
for (const id of IDS) L.push(`| ${id} | ${ARMS.map((a) => cell[`${a}|${id}`]).join(' | ')} | ${CFG.etArms.map((a) => ttftCell(a, id)).join(' | ')} |`);
L.push('', '## Grader reasons for the ET answers', '');
for (const arm of CFG.decide) for (const id of IDS) {
    const k = keyOf(arm, id);
    L.push(`- ${arm} ${id}: g1 "${G[0].v[k].reason}" · g2 "${G[1].v[k].reason}"`);
}
fs.writeFileSync(OUT, L.join('\n') + '\n');
console.log(L.join('\n'));
