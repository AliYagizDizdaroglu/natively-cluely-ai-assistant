// stall-rates.mjs — stalls per s50 flight, with the hour's PRIMARY model and its answer
// count, so the rate is comparable. Caveat the table must carry: the first-token race only
// reached the technical route in f0c6c2d (2026-09-16 evening), so a flight before that
// COULD NOT log a technical-route stall and its zero means "not measured", not "none".
import fs from 'node:fs';
import path from 'node:path';

const RUNS = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs';
const RACE_SHIPPED = Date.parse('2026-09-16T18:00:00Z');

console.log('flight    date         primary               answers  stalls   measurable?');
for (const run of fs.readdirSync(RUNS).filter((d) => /-s50[a-z]$/.test(d)).sort()) {
    const dir = path.join(RUNS, run);
    const dbg = path.join(dir, 'natively_debug.log');
    const rep = path.join(dir, 'interview60.report.md');
    if (!fs.existsSync(dbg)) continue;
    let from = 0, to = Infinity;
    if (fs.existsSync(rep)) {
        const r = fs.readFileSync(rep, 'utf8');
        const a = r.match(/started (\S+)/), b = r.match(/ended\s+(\S+)/);
        if (a) from = Date.parse(a[1]);
        if (b) to = Date.parse(b[1]);
    }
    const lines = fs.readFileSync(dbg, 'utf8').split(/\r?\n/).filter((l) => {
        const m = l.match(/^(\S+) \[/); if (!m) return false;
        const t = Date.parse(m[1]); return t >= from && t <= to;
    });
    const stalls = lines.filter((l) => /stalled after/.test(l)).length;
    const answers = lines.filter((l) => /\[Answer\] full:/.test(l)).length;
    // primary = the model named on the most "verbal stall race: trying X" lines
    const tally = {};
    for (const l of lines) {
        const m = l.match(/verbal stall race: trying (\S+)/);
        if (m) tally[m[1]] = (tally[m[1]] ?? 0) + 1;
    }
    let primary = Object.entries(tally).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '(no race logged)';
    const measurable = from >= RACE_SHIPPED;
    console.log(`${run.slice(-4).padEnd(9)} ${new Date(from).toISOString().slice(0, 10)}   ${primary.padEnd(21)} ${String(answers).padStart(7)}  ${String(stalls).padStart(6)}   ${measurable ? 'yes' : 'NO — race not on the technical route yet'}`);
}
