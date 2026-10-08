// Throwaway, read-only: the Live mode the app itself logged in its most recent sessions. The mode is
// saved in credentials.enc, which is never read; the app's own "[Main] Live question (<src>, mode=<m>)"
// lines are the evidence instead. Scans the rotated root log and the newest run folders' copies.
import fs from 'node:fs';
import path from 'node:path';

const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const RUNS = `${MAIN}/electron/test/golden/interview60.runs`;
const runLogs = fs.readdirSync(RUNS, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name.startsWith('2026-09-2'))
    .map((d) => path.join(RUNS, d.name, 'natively_debug.log'))
    .filter((f) => fs.existsSync(f))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)
    .slice(0, 4);
for (const f of [`${MAIN}/natively_debug.log`, `${MAIN}/natively_debug.log.1`, ...runLogs]) {
    if (!fs.existsSync(f)) { console.log(`absent: ${f}`); continue; }
    const text = fs.readFileSync(f, 'utf8');
    const start = text.match(/=== Natively session started (\S+) ===/)?.[1] ?? '(no session header)';
    const modes = {};
    for (const m of text.matchAll(/\[Main\] Live question \((\w+), mode=(\w+)\)/g)) modes[m[2]] = (modes[m[2]] ?? 0) + 1;
    const hedge = [...text.matchAll(/\[Main\] verbal hedge: (on trigger=\d+ms|off)/g)].pop()?.[1] ?? '-';
    console.log(`${path.relative(MAIN, f).replace(/\\/g, '/')}\n  session ${start}  Live modes ${JSON.stringify(modes)}  hedge ${hedge}`);
}
