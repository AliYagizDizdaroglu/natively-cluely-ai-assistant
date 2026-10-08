// Throwaway (2026-09-30): which utterance did the cue smoke's "lost utterances 1" count, and what came next?
// Same definition as interview60.metrics.mjs:152-175 (empty final after a partial with words, not resolved
// by a non-empty final within 5 s), printed with the item playing and the finals after it.
import fs from 'node:fs';
const RUN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/.claude/worktrees/whole-turn/electron/test/golden/interview60.runs/2026-09-30T02-38-22-cuesmoke';
const dbg = fs.readFileSync(`${RUN}/natively_debug.log`, 'utf8');
const tl = JSON.parse(fs.readFileSync(`${RUN}/interview60.timeline.json`, 'utf8'));
const ts = (s) => Date.parse(s);
const finals = [...dbg.matchAll(/^(\S+) \[LOG\] \[DeepgramStreaming\] Transcript event — isFinal=true, text="([^"]*)"/gm)].map((m) => ({ at: ts(m[1]), text: m[2] }));
const partials = [...dbg.matchAll(/^(\S+) \[LOG\] \[DeepgramStreaming\] Transcript event — isFinal=false, text="([^"]+)"/gm)].map((m) => ({ at: ts(m[1]), text: m[2] }));
const emptyAfterPartial = finals.filter((f) => !f.text).map((f) => {
    const lastPartial = partials.filter((p) => p.at < f.at && f.at - p.at < 12000).pop();
    const lastFinal = finals.filter((g) => g.at < f.at && g.text).pop();
    return lastPartial && (!lastFinal || lastPartial.at > lastFinal.at) ? { at: f.at, text: lastPartial.text } : null;
}).filter(Boolean);
const normWords = (s) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter((w) => w.length > 2);
const resolvedBy = (lost) => {
    const words = normWords(lost.text);
    const probe = words.slice(0, 3).join(' ');
    const later = finals.filter((g) => g.text && g.at > lost.at && g.at - lost.at <= 5000);
    return later.find((g) => probe && normWords(g.text).join(' ').includes(probe))
        ?? later.find((g) => { const t = normWords(g.text).join(' '); return words.filter((w) => t.includes(w)).length >= Math.min(3, words.length); })
        ?? null;
};
const items = tl.items ?? [];
for (const lost of emptyAfterPartial.filter((l) => !resolvedBy(l))) {
    const item = items.find((i) => lost.at >= i.playedAt - 500 && lost.at <= i.playedAt + (i.clipSecs ?? 0) * 1000 + 8000);
    console.log(`LOST @${new Date(lost.at).toISOString().slice(11, 23)} partial "${lost.text}"`);
    console.log(`   item: ${item ? `${item.id}: ${item.q}` : '(none playing)'}`);
    for (const g of finals.filter((x) => x.at > lost.at && x.at - lost.at <= 15000 && x.text)) console.log(`   final +${g.at - lost.at} ms: "${g.text}"`);
    const d = [...dbg.matchAll(/^(\S+) \[LOG\] \[Main\] dispatch: answer .*question="(.*)"$/gm)].map((m) => ({ at: ts(m[1]), q: m[2] })).find((x) => x.at > lost.at);
    console.log(`   next dispatch +${d ? d.at - lost.at : '-'} ms: ${d ? d.q.slice(0, 220) : '(none)'}`);
}
