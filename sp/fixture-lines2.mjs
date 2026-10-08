// THROWAWAY: pull the real transcript lines behind L03 (genuine) and after8's 07:36:26
// (false corroboration) so the unit tests use field text, not invented text.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const read = (run) => fs.readFileSync(path.join(ROOT, 'electron/test/golden/interview60.runs', run, 'natively_debug.log'), 'utf8').split('\n');
const lines = (log) => {
    const out = [];
    for (const l of log) {
        const m = l.match(/^(\S+) \[LOG\] \[DeepgramStreaming\] Transcript event — isFinal=(true|false), text="((?:[^"\\]|\\.)*)"$/);
        if (!m) continue;
        let t; try { t = JSON.parse('"' + m[3] + '"'); } catch { t = m[3]; }
        if (t.trim()) out.push({ text: t, at: Date.parse(m[1]), final: m[2] === 'true' });
    }
    return out;
};

const show = (run, fromIso, toIso, label) => {
    const from = Date.parse(fromIso), to = Date.parse(toIso);
    const ls = lines(read(run)).filter((l) => l.at >= from && l.at <= to);
    console.log(`\n=== ${label}  (${ls.length} lines)`);
    // Only the FINALS plus the last interim: enough to reconstruct, short enough for a test.
    const finals = ls.filter((l) => l.final);
    for (const l of finals) console.log(`    sp(${JSON.stringify(l.text)}, ${l.at - to}),`);
};

show('2026-09-08T08-44-56-after9', '2026-09-08T08:28:00Z', '2026-09-08T08:28:36Z', 'L03 — the real question, finals only');
show('2026-09-07T08-14-12-after8', '2026-09-07T07:36:11Z', '2026-09-07T07:36:26Z', 'after8 07:36:26 — the window behind the invented claim');
