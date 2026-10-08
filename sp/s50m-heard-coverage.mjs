// s50m-heard-coverage.mjs — does what the app HEARD cover what was ASKED, and does a short
// hearing predict a weak answer? Coverage = fraction of the asked question's content words
// present in the heard text. Run over mains and follow-ups separately.
import fs from 'node:fs';

const S = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp';
const D = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs/2026-09-22T08-22-50-s50m';
const inapp = JSON.parse(fs.readFileSync(`${S}/s50m-verdicts-inapp.json`, 'utf8'));
const judge = JSON.parse(fs.readFileSync(`${D}/interview60.judge.json`, 'utf8')).items ?? {};
const cls = (v) => (v.correctness === 0 || v.on_topic === 0) ? 'wrong'
    : (v.correctness === 2 && v.on_topic === 2 && v.delivery >= 1) ? 'acceptable' : 'weak';

const STOP = new Set('the a an of to in for and or is are be was were it that this with on at by as from you your i we they would how what when where which why do does did can could should'.split(' '));
const words = (s) => String(s).toLowerCase().match(/[a-z0-9]+/g) ?? [];
const content = (s) => words(s).filter((w) => !STOP.has(w) && w.length > 2);
const coverage = (asked, heard) => {
    const a = content(asked), h = new Set(content(heard));
    return a.length ? a.filter((w) => h.has(w)).length / a.length : 1;
};

const rows = Object.keys(inapp).sort().map((k) => {
    const it = judge[k] ?? {};
    return {
        k, fup: /F$/.test(k), v: cls(inapp[k]),
        cov: coverage(it.question ?? '', it.heard ?? ''),
        askedW: words(it.question ?? '').length,
        heardW: words(it.heard ?? '').length,
    };
});

const show = (label, sel) => {
    const g = rows.filter(sel);
    const ok = g.filter((r) => r.v === 'acceptable'), bad = g.filter((r) => r.v !== 'acceptable');
    const avg = (a) => a.length ? (a.reduce((s, r) => s + r.cov, 0) / a.length) : NaN;
    console.log(`\n${label}  n=${g.length}  acceptable ${ok.length}`);
    console.log(`  mean heard-coverage   acceptable ${(avg(ok) * 100).toFixed(1)}%   weak ${(avg(bad) * 100).toFixed(1)}%`);
    console.log(`  fully heard (100%)    acceptable ${ok.filter((r) => r.cov >= 0.999).length}/${ok.length}   weak ${bad.filter((r) => r.cov >= 0.999).length}/${bad.length}`);
    console.log(`  under 80% heard       acceptable ${ok.filter((r) => r.cov < 0.8).length}/${ok.length}   weak ${bad.filter((r) => r.cov < 0.8).length}/${bad.length}`);
};
show('MAINS', (r) => !r.fup);
show('FOLLOW-UPS', (r) => r.fup);

console.log('\nFOLLOW-UPS, worst heard-coverage first');
console.log('id         verdict     cov    asked/heard words');
for (const r of rows.filter((x) => x.fup).sort((a, b) => a.cov - b.cov)) {
    console.log(`  ${r.k.padEnd(9)} ${r.v.padEnd(11)} ${(r.cov * 100).toFixed(0).padStart(3)}%   ${r.askedW}/${r.heardW}`);
}
