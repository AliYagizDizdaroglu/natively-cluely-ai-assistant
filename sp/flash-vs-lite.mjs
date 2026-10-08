// Throwaway: per question, verdict + first-token latency for lite (in-app and bare arm) and
// every Flash arm, across the scenario50 flights. In-app TTFT = first verbal-diag "first token"
// line after the answer's dispatch time.
import fs from 'node:fs';
import path from 'node:path';
const base = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs/';
const runs = ['2026-09-12T08-22-49-s50c', '2026-09-13T08-22-36-s50d', '2026-09-14T08-22-28-s50e', '2026-09-15T08-22-29-s50f'];
const flash = ['gemini-3.5-flash', 'gemini-3.6-flash', 'gemini-3.7-flash', 'gemini-3.8-flash'];
const load = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
const V = (it) => it ? `${it.verdict[0].toUpperCase()}${it.correctness}${it.on_topic}${it.delivery}` : '  .  ';
const s = (ms) => ms == null ? '   -  ' : `${(ms / 1000).toFixed(1).padStart(5)}s`;
const agg = {}; // model -> {ok, n, ttfts[]}
const add = (m, it, ttft) => { const a = (agg[m] ??= { ok: 0, n: 0, t: [] }); if (it) { a.n++; if (it.verdict === 'acceptable') a.ok++; } if (ttft != null) a.t.push(ttft); };
for (const r of runs) {
    const dir = base + r;
    const inapp = load(path.join(dir, 'interview60.judge.json'));
    const diag = (() => { try { return fs.readFileSync(path.join(dir, 'verbal-diag.log'), 'utf8'); } catch { return ''; } })();
    const ft = [...diag.matchAll(/^\[(\d{4}-\d\d-\d\dT[\d:.]+Z)\] first token (\d+)ms/gm)].map((m) => ({ at: Date.parse(m[1]), ms: Number(m[2]) }));
    const inappTtft = (it) => { if (!it?.dispatchedAt) return null; const d = Date.parse(it.dispatchedAt); const hit = ft.find((f) => f.at >= d && f.at - d < 30000); return hit ? hit.ms : null; };
    const arms = {};
    for (const m of ['gemini-3.1-flash-lite', ...flash]) {
        const tag = m === 'gemini-3.1-flash-lite' ? '' : `.${m}`;
        arms[m] = { ans: load(path.join(dir, `interview60.answers${tag}.json`)), jud: load(path.join(dir, `interview60.judge${tag || '.gemini-3.1-flash-lite'}.json`)) };
    }
    const ids = [...new Set(flash.flatMap((m) => Object.keys(arms[m].ans ?? {})))].filter((k) => /^S[12]Q\d\d$/.test(k)).sort();
    if (!ids.length) continue;
    const bytes = /captured/.test((() => { try { return fs.readFileSync(path.join(base, `flight-${r.slice(-4)}.launcher.log`), 'utf8'); } catch { return ''; } })()) ? 'Flash on the APP\'S captured bytes' : 'Flash on BARE bytes';
    console.log(`\n=== ${r.slice(-4)}  (${bytes}; lite in-app = app bytes, lite arm = bare bytes)`);
    console.log('q       lite in-app     lite arm        ' + flash.map((m) => m.replace('gemini-', '').padEnd(16)).join(''));
    for (const id of ids) {
        const cells = [];
        const ia = inapp?.items?.[id]; const iaT = inappTtft(ia); cells.push(`${V(ia)} ${s(iaT)}`); add('lite in-app', ia, iaT);
        const la = arms['gemini-3.1-flash-lite']; const laJ = la.jud?.items?.[id], laT = la.ans?.[id]?.ttft; cells.push(`${V(laJ)} ${s(laT)}`); add('lite arm', laJ, laT);
        for (const m of flash) { const a = arms[m]; const j = a.jud?.items?.[id], t = a.ans?.[id]?.ttft; cells.push(`${V(j)} ${s(t)}`); add(m.replace('gemini-', ''), j, t); }
        console.log(id.padEnd(8) + cells.map((c) => c.padEnd(16)).join(''));
    }
}
console.log('\nPOOLED over the questions above (lite rows counted only where a Flash arm answered the same question)');
for (const [m, a] of Object.entries(agg)) { const t = a.t.sort((x, y) => x - y); const p = (q) => t.length ? s(t[Math.min(t.length - 1, Math.floor(q * t.length))]) : '   -  '; console.log(`${m.padEnd(14)} acceptable ${String(a.ok).padStart(2)}/${String(a.n).padEnd(2)}  TTFT p50 ${p(0.5)}  p90 ${p(0.9)}  max ${s(t.at(-1))}  (n=${t.length})`); }
