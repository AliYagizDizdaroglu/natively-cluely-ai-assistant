// Throwaway (2026-09-29, v4 authoring): in the seam recordings, what precedes and follows each utterance-end
// event, and does one sit between F1 and F2 of any v3 repair?
import fs from 'node:fs';
import { createRepair } from './rule-v3.mjs';
for (const f of fs.readdirSync(new URL('./seam-probe/', import.meta.url)).filter((x) => /^events-.*\.jsonl$/.test(x)).sort()) {
    const ev = fs.readFileSync(new URL(`./seam-probe/${f}`, import.meta.url), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
    const prev = {}, next = {};
    let between = 0, sinceF1 = null, ue = 0, sfTrueBeforeUE = 0;
    const r = createRepair();
    for (let i = 0; i < ev.length; i++) {
        const e = ev[i];
        if (e.kind === 'utterance-end') {
            ue++;
            const p = ev[i - 1], n = ev[i + 1];
            const key = (x) => (!x ? 'none' : x.kind !== 'transcript' ? x.kind : `${x.isFinal ? 'final' : 'interim'}${x.text ? '' : '(empty)'}${x.isFinal && x.speechFinal ? ' sf' : ''}`);
            prev[key(p)] = (prev[key(p)] ?? 0) + 1; next[key(n)] = (next[key(n)] ?? 0) + 1;
            if (sinceF1 !== null) sinceF1++;
            continue;
        }
        if (e.kind !== 'transcript' || !e.text) continue;
        const out = r.onTranscript(e.text, e.isFinal, e.at);
        if (e.isFinal) {
            if (out.restored && sinceF1) between++;
            sinceF1 = 0;
        }
    }
    console.log(`${f}: utterance-end ${ue}; preceded by ${JSON.stringify(prev)}; followed by ${JSON.stringify(next)}; utterance-ends between F1 and a repaired F2: ${between}`);
}
