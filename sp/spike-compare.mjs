// SPIKE (throwaway): compare the graded arms of the weak-answer spike.
//   hour   = after7 flight hour (first answer per question), verdict classes only
//   bare   = after7 3.1-flash-lite answer-only arm (verdicts from the run dir, words from the spike copy)
//   framing / history / notes / knowledge / knowledge-verbal = spike-run arms (whichever are graded)
// usage: node spike-compare.mjs <after7 run dir> <spike-run dir>
import fs from 'node:fs';
import path from 'node:path';

const [runDir, spikeDir] = process.argv.slice(2);
const J = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const cls = (r) => !r ? '-' : (r.correctness === 0 || r.on_topic === 0) ? 'X' : (r.correctness === 2 && r.on_topic === 2 && r.delivery >= 1) ? 'ok' : 'w';
const pct = (arr, p) => { const s = [...arr].sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.floor(s.length * p))] : NaN; };

const arms = [];
// hour: keys that are plain question ids (doubles carry a suffix)
const hourV = J(path.join(runDir, 'interview60.judge.verdicts.json'));
arms.push({ name: 'hour', verdicts: Object.fromEntries(Object.entries(hourV).filter(([k]) => /^[WMH]\d\d$/.test(k))), words: null });
// bare: verdicts from the run dir, words from the spike copy
const bareA = J(path.join(spikeDir, 'interview60.answers.3.1-bare.json'));
arms.push({ name: 'bare', verdicts: J(path.join(runDir, 'interview60.judge.verdicts.gemini-3.1-flash-lite.json')), words: Object.fromEntries(Object.entries(bareA).map(([k, v]) => [k, v.words])) });
for (const cond of ['framing', 'history', 'notes', 'knowledge', 'knowledge-verbal', 'knowledge-budget']) {
    const vp = path.join(spikeDir, 'interview60.judge.verdicts.3.1-' + cond + '.json');
    const ap = path.join(spikeDir, 'interview60.answers.3.1-' + cond + '.json');
    if (!fs.existsSync(vp)) { console.log('(no verdicts yet for ' + cond + (fs.existsSync(ap) ? ' — answers exist, ungraded' : '') + ')'); continue; }
    const a = J(ap);
    arms.push({ name: cond, verdicts: J(vp), words: Object.fromEntries(Object.entries(a).map(([k, v]) => [k, v.words])) });
}

const ids = Object.keys(bareA);
console.log('\nARM SUMMARY (' + ids.length + ' questions)');
console.log('arm              n   ok   w   X  c2t2   d2  dAvg   cAvg  words p50/p90/max  over80');
for (const arm of arms) {
    const vs = ids.map((id) => arm.verdicts[id]).filter(Boolean);
    const c = { ok: 0, w: 0, X: 0 }; for (const v of vs) c[cls(v)]++;
    const c2t2 = vs.filter((v) => v.correctness === 2 && v.on_topic === 2).length;
    const d2 = vs.filter((v) => v.delivery === 2).length;
    const dAvg = vs.reduce((s, v) => s + v.delivery, 0) / vs.length;
    const cAvg = vs.reduce((s, v) => s + v.correctness, 0) / vs.length;
    const ws = arm.words ? ids.map((id) => arm.words[id]).filter((w) => typeof w === 'number') : [];
    const wtxt = ws.length ? String(pct(ws, 0.5)).padStart(3) + '/' + String(pct(ws, 0.9)).padStart(3) + '/' + String(Math.max(...ws)).padStart(3) + '   ' + String(ws.filter((w) => w > 80).length).padStart(4) : '        n/a';
    console.log(arm.name.padEnd(16) + String(vs.length).padStart(2) + String(c.ok).padStart(5) + String(c.w).padStart(4) + String(c.X).padStart(4) + String(c2t2).padStart(6) + String(d2).padStart(5) + dAvg.toFixed(2).padStart(6) + cAvg.toFixed(2).padStart(7) + '  ' + wtxt);
}

// per-item matrix: every item non-acceptable in any arm
const weakSet = ['M14', 'M21', 'H07', 'H09', 'H02', 'M08'];
const rows = ids.filter((id) => weakSet.includes(id) || arms.some((arm) => arm.verdicts[id] && cls(arm.verdicts[id]) !== 'ok'));
console.log('\nPER-ITEM (class c/t/d; * = the after7 weak set)   ' + arms.map((a) => a.name.padEnd(17)).join(''));
for (const id of rows) {
    const cells = arms.map((arm) => {
        const v = arm.verdicts[id]; if (!v) return '-'.padEnd(17);
        const w = arm.words && typeof arm.words[id] === 'number' ? ' ' + String(arm.words[id]).padStart(3) + 'w' : '';
        return (cls(v).padEnd(2) + ' ' + v.correctness + '/' + v.on_topic + '/' + v.delivery + w).padEnd(17);
    });
    console.log((weakSet.includes(id) ? '*' : ' ') + id + '  ' + cells.join(''));
}
console.log('\nweak-set acceptable count per arm: ' + arms.map((a) => a.name + '=' + weakSet.filter((id) => a.verdicts[id] && cls(a.verdicts[id]) === 'ok').length + '/' + weakSet.filter((id) => a.verdicts[id]).length).join('  '));
// non-acceptable reasons per arm for the weak set
for (const arm of arms) {
    const bad = rows.filter((id) => arm.verdicts[id] && cls(arm.verdicts[id]) !== 'ok');
    if (!bad.length) continue;
    console.log('\n' + arm.name + ' non-acceptable:');
    for (const id of bad) console.log('  ' + id + ' ' + cls(arm.verdicts[id]) + ' ' + arm.verdicts[id].reason);
}
