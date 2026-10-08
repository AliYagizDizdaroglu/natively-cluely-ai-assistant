// L20c condition 5: the scheduled 3.8 Live health gate (task Natively-probe-live38) — 5/5 answered with no
// abnormal close at 04:30, 10:00 and 20:00 local (01:30Z, 07:00Z, 17:00Z) on 29 Sep, 30 Sep and 1 Oct. Reads the
// probe's own result files (l20/health/<UTC start>.json); a slot's file must start within 15 min after the slot.
// "Answered" = health-probe.mjs:136 exactly (first word, >= 25 words, no system-error apology); abnormal = its flag.
// A slot in the future is PENDING; a past slot with no file is FAIL (the task did not run).
//   node gate.mjs            (prints per slot and the overall PASS / FAIL / PENDING; exit 0 / 1 / 2)
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const DIR = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/l20/health';
const SLOTS = ['2026-09-29', '2026-09-30', '2026-10-01'].flatMap((d) => ['01:30', '07:00', '17:00'].map((t) => Date.parse(`${d}T${t}:00Z`)));
const words = (s) => s.trim().split(/\s+/).filter(Boolean).length;

export function gateStatus(nowMs = Date.now(), dir = DIR) {
    const files = fs.readdirSync(dir).filter((f) => /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z\.json$/.test(f))
        .map((f) => ({ f, at: Date.parse(f.replace(/T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z/, 'T$1:$2:$3.$4Z').replace('.json', '')) }));
    const slots = SLOTS.map((slot) => {
        const hit = files.find((x) => x.at >= slot && x.at <= slot + 15 * 60e3);
        const label = new Date(slot + 3 * 3600e3).toISOString().slice(0, 16).replace('T', ' ');
        if (!hit) return { label, state: slot + 20 * 60e3 > nowMs ? 'PENDING' : 'FAIL', why: slot > nowMs ? 'not yet' : 'no result file' };
        const J = JSON.parse(fs.readFileSync(`${dir}/${hit.f}`, 'utf8'));
        const n = J.results.length;
        const answered = J.results.filter((r) => r.firstWordMs != null && words(r.text) >= 25 && !/system error/i.test(r.text)).length;
        const abnormal = J.results.filter((r) => r.abnormal).length;
        return { label, state: answered === 5 && n === 5 && abnormal === 0 ? 'PASS' : 'FAIL', why: `${answered}/${n} answered, ${abnormal} abnormal (${hit.f})` };
    });
    const status = slots.some((s) => s.state === 'FAIL') ? 'FAIL' : slots.some((s) => s.state === 'PENDING') ? 'PENDING' : 'PASS';
    return { status, slots };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
    const g = gateStatus();
    for (const s of g.slots) console.log(`${s.label} local  ${s.state.padEnd(7)} ${s.why}`);
    console.log(`health gate: ${g.status}`);
    process.exit(g.status === 'PASS' ? 0 : g.status === 'FAIL' ? 1 : 2);
}
