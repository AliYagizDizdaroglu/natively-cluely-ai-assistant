// Re-pick FOCUSED_ONLY: the mains that still discriminate, from s50j's own arms.
// A focused arm exists to separate models, so the right five are the ones arms DISAGREE on.
import { readFileSync, existsSync } from 'node:fs';

const S = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const verdictOf = (v) => (v.correctness === 0 || v.on_topic === 0) ? 'wrong'
    : (v.correctness === 2 && v.on_topic === 2 && v.delivery >= 1) ? 'acceptable' : 'weak';

// App-bytes arms answer the captured prompt, which is what a focused arm replays.
const APP = ['inapp', 'captured-low', 'captured-low-r2', 'captured-low-r3', 'captured-minimal', 'captured-high','captured-high-r2','captured-high-r3'];
// Bare arms answer the scripted text — different input, but more samples per question.
const BARE = ['low', 'high', 'bare31', 'bare35', 'qwen', 'gptoss'];

const load = (t) => existsSync(`${S}/s50k-verdicts-${t}.json`) ? JSON.parse(readFileSync(`${S}/s50k-verdicts-${t}.json`, 'utf8')) : null;
const isMain = (k) => !/F$/.test(k);

const ids = new Set();
for (const t of [...APP, ...BARE]) { const V = load(t); if (V) for (const k of Object.keys(V)) if (isMain(k)) ids.add(k); }

const rows = [];
for (const id of [...ids].sort()) {
    const tally = (arms) => {
        let n = 0, ok = 0, wrong = 0;
        for (const t of arms) { const V = load(t); if (V?.[id]) { n++; const v = verdictOf(V[id]); if (v === 'acceptable') ok++; if (v === 'wrong') wrong++; } }
        return { n, ok, wrong };
    };
    const a = tally(APP), b = tally(BARE), all = { n: a.n + b.n, ok: a.ok + b.ok, wrong: a.wrong + b.wrong };
    rows.push({ id, a, b, all, rate: all.n ? all.ok / all.n : 1 });
}

console.log('every main, by how often arms got it acceptable (s50j)\n');
console.log('id      app-bytes   bare        all      rate   wrong');
for (const r of rows.sort((x, y) => x.rate - y.rate)) {
    console.log(`${r.id.padEnd(7)} ${String(r.a.ok + '/' + r.a.n).padEnd(11)} ${String(r.b.ok + '/' + r.b.n).padEnd(11)} ${String(r.all.ok + '/' + r.all.n).padEnd(8)} ${(r.rate * 100).toFixed(0).padStart(4)}%  ${r.all.wrong || ''}`);
}

// S1Q01 is excluded: the hour does not always capture it (missing in s50f and s50j), and a
// focused arm is pointed at FOCUSED_ONLY directly — an uncaptured id kills the whole arm.
const OLD = ['S1Q02', 'S2Q07', 'S2Q10', 'S2Q09', 'S1Q06'];
// Rank on APP bytes: a focused arm replays the captured prompt, so a question that is only
// hard on the bare scripted text (S1Q06: 6/6 captured, 2/6 bare) would be an easy question
// for it. All-arms rate breaks ties.
const appRate = (r) => (r.a.n ? r.a.ok / r.a.n : 1);
const pick = rows.filter((r) => r.id !== 'S1Q01')
    .sort((x, y) => appRate(x) - appRate(y) || x.rate - y.rate || x.id.localeCompare(y.id)).slice(0, 5);
console.log('\nranked on APP bytes (what a focused arm replays), ties broken by all-arms:');
for (const r of rows.filter((x) => x.id !== 'S1Q01').sort((x, y) => appRate(x) - appRate(y) || x.rate - y.rate).slice(0, 9))
    console.log(`   ${r.id}  app ${r.a.ok}/${r.a.n} (${(appRate(r) * 100).toFixed(0)}%)   all ${(r.rate * 100).toFixed(0)}%`);
console.log('\nOLD FOCUSED_ONLY:', OLD.join(','));
console.log('   their rates now:', OLD.map((id) => { const r = rows.find((x) => x.id === id); return `${id} ${(r.rate * 100).toFixed(0)}%`; }).join('  '));
console.log('\nNEW FOCUSED_ONLY:', pick.map((r) => r.id).join(','));
console.log('   their rates    :', pick.map((r) => `${r.id} ${(r.rate * 100).toFixed(0)}%`).join('  '));
console.log('\nkept from old   :', OLD.filter((id) => pick.some((p) => p.id === id)).join(',') || '(none)');
