// Throwaway analysis: where did the after5 hour's answer quality go?
// Reads only judge files and the run log. For every spoken answer of the hour:
//   verdict, scores, the word budget line that followed its dispatch (words, cut),
//   the same question's verdict in the answer-only gemini-3.1-flash-lite arm
//   (same model, correct question, no pipeline), and its verdict in the after4 hour.
// Then splits the losses: pipeline (arm acceptable, hour not), cut (cut=yes among
// the non-acceptable), model (weak in the arm too).
// usage: node quality-loss.mjs <repo-root>
import fs from 'node:fs';
import path from 'node:path';

const root = process.argv[2] ?? '.';
const R4 = path.join(root, 'electron/test/golden/interview60.runs/2026-09-04T08-09-38-after4');
const R5 = path.join(root, 'electron/test/golden/interview60.runs/2026-09-04T22-43-34-after5');
const load = (p) => (fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')).items : null);
const j4 = load(path.join(R4, 'interview60.judge.json'));
const j5 = load(path.join(R5, 'interview60.judge.json'));
const a5 = load(path.join(R5, 'interview60.judge.gemini-3.1-flash-lite.json'));
const a4 = load(path.join(R4, 'interview60.judge.gemini-3.1-flash-lite.json'));
const spoken = (j) => Object.entries(j).filter(([, v]) => v.kind === 'spoken');
const counts = (j) => {
    const s = spoken(j).map(([, v]) => v);
    const c = (k) => s.filter((v) => v.verdict === k).length;
    return `n ${s.length}  acceptable ${c('acceptable')}  weak ${c('weak')}  wrong ${c('wrong')}`;
};
console.log('after4 hour     :', counts(j4));
console.log('after5 hour     :', counts(j5));
console.log('after4 3.1 arm  :', a4 ? counts(a4) : 'none');
console.log('after5 3.1 arm  :', counts(a5));

const dbg = fs.readFileSync(path.join(R5, 'natively_debug.log'), 'utf8');
const dispatchRe = /^(\S+) \[LOG\] \[Main\] dispatch: answer source=(live|whisper) anchor="/gm;
const disp = [...dbg.matchAll(dispatchRe)].map((m) => ({ at: Date.parse(m[1]), source: m[2] }));
const budgetRe = /^(\S+) \[LOG\] \[Answer\] budget: words=(\d+) cut=(yes|no) allowance=(yes|no)/gm;
const budget = [...dbg.matchAll(budgetRe)].map((m) => ({ at: Date.parse(m[1]), words: +m[2], cut: m[3] === 'yes' }));
const abortRe = /^(\S+) \[LOG\] \[IntelligenceEngine\] _what_to_say stream aborted by new generation/gm;
const aborts = [...dbg.matchAll(abortRe)].map((m) => Date.parse(m[1]));

const rows = [];
for (const [key, v] of spoken(j5)) {
    const at = Date.parse(v.dispatchedAt ?? '');
    const d = Number.isFinite(at) ? disp.find((x) => Math.abs(x.at - at) < 1500) : null;
    // the budget line belongs to this dispatch only if no other dispatch or abort came first
    let b = null;
    if (d) {
        const nextDispatch = disp.find((x) => x.at > d.at + 50);
        const end = Math.min(nextDispatch ? nextDispatch.at : Infinity, d.at + 60000);
        b = budget.find((x) => x.at > d.at && x.at < end) ?? null;
    }
    const base = key.replace(/#\d+$/, '');
    rows.push({ key, hour: v.verdict, c: v.correctness, t: v.on_topic, dl: v.delivery, words: b ? b.words : null, cut: b ? (b.cut ? 'yes' : 'no') : '?', arm: a5[base]?.verdict ?? '-', armC: a5[base]?.correctness, after4: j4[base]?.verdict ?? '-', reason: v.reason ?? '' });
}
const nonAcc = rows.filter((r) => r.hour !== 'acceptable');
console.log('\n--- after5 hour: every non-acceptable spoken answer');
console.log('key    hour       c t d  words cut  | 3.1 arm     | after4      | judge reason');
for (const r of nonAcc) console.log(`${r.key.padEnd(6)} ${r.hour.padEnd(10)} ${r.c} ${r.t} ${r.dl}  ${String(r.words ?? '-').padEnd(5)} ${r.cut.padEnd(4)} | ${r.arm.padEnd(11)} | ${r.after4.padEnd(11)} | ${r.reason.slice(0, 80)}`);

const paired = rows.filter((r) => r.cut !== '?');
const cutYes = paired.filter((r) => r.cut === 'yes'), cutNo = paired.filter((r) => r.cut === 'no');
const acc = (rs) => rs.filter((r) => r.hour === 'acceptable').length;
console.log(`\ncut=yes: ${cutYes.length} answers, ${acc(cutYes)} acceptable (${cutYes.length ? Math.round((100 * acc(cutYes)) / cutYes.length) : 0}%)   cut=no: ${cutNo.length} answers, ${acc(cutNo)} acceptable (${cutNo.length ? Math.round((100 * acc(cutNo)) / cutNo.length) : 0}%)   unpaired: ${rows.length - paired.length}`);
console.log('words of the weak/wrong cut=yes answers:', nonAcc.filter((r) => r.cut === 'yes').map((r) => `${r.key}:${r.words}`).join(' '));
console.log('\nsplit of the losses:');
console.log('  pipeline (arm acceptable, hour not):', nonAcc.filter((r) => r.arm === 'acceptable').map((r) => r.key).join(', ') || 'none');
console.log('  model/prompt (weak in the arm too)  :', nonAcc.filter((r) => r.arm !== 'acceptable' && r.arm !== '-').map((r) => `${r.key}(arm ${r.arm})`).join(', ') || 'none');
console.log('  after4 acceptable, after5 not      :', nonAcc.filter((r) => r.after4 === 'acceptable').map((r) => r.key).join(', ') || 'none');
console.log('  after4 also not acceptable          :', nonAcc.filter((r) => r.after4 !== 'acceptable' && r.after4 !== '-').map((r) => `${r.key}(after4 ${r.after4})`).join(', ') || 'none');
// and the reverse: which after4 losses did after5 recover?
const rec = spoken(j4).filter(([k, v]) => v.verdict !== 'acceptable' && j5[k]?.verdict === 'acceptable').map(([k]) => k);
console.log('  after4 not acceptable, after5 acceptable (recovered):', rec.join(', ') || 'none');
console.log(`\nstream aborts by a newer generation in the hour: ${aborts.length}`);
