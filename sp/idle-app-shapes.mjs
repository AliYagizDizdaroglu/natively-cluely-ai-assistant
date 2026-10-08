// idle-app-shapes.mjs — which KINDS of log lines did the app write after the s50m flight?
// Each line is cut to its tag plus at most four words, stopping at the first ':' (so a
// "Transcript: ..." line shows only "Transcript"), digits masked. Speech never prints.
import fs from 'node:fs';

const LOG = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/natively_debug.log';
const AFTER = process.argv[2] ?? '2026-09-22T08:22:51';
const ONLY = new Set((process.argv[3] ?? '[Main],[LiveRouter],[DeepgramStreaming],[LLMHelper],[SystemAudioCapture]').split(','));
const shapes = new Map();
for (const line of fs.readFileSync(LOG, 'utf8').split(/\r?\n/)) {
    const ts = line.slice(0, 24);
    if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(ts) || ts < AFTER) continue;
    const m = /^\S+ \[(LOG|WARN|ERROR|INFO|DEBUG)\] (\[[^\]]{1,60}\])\s*(.*)$/.exec(line);
    if (!m || !ONLY.has(m[2])) continue;
    const head = m[3].split(':')[0].split(/\s+/).slice(0, 4).join(' ').replace(/\d+/g, '#');
    const key = `${m[2]} ${m[1]} ${head}`;
    const s = shapes.get(key) ?? { n: 0, first: ts, last: ts };
    s.n++; s.last = ts;
    shapes.set(key, s);
}
for (const [k, s] of [...shapes].sort((a, b) => b[1].n - a[1].n)) console.log(`${String(s.n).padStart(6)}  ${s.first.slice(11, 19)}-${s.last.slice(11, 19)}  ${k}`);
