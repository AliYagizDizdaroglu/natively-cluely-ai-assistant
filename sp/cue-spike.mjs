/**
 * THROWAWAY (scratchpad). Cue-mode spike: can a prompter cue be derived from the
 * app's own spoken answer CLIENT-SIDE (no model call, no latency), well enough to
 * read off while speaking? Input: after8's 52 spoken answers (judge pairs).
 *
 * Cue shape (memory: project_cue_mode_next): a lead line = the answer's first
 * sentence cut at the first clause break, capped at 12 words; then up to 4 key
 * phrases = distinctive terms from the rest of the answer, in the order spoken.
 *
 *   node cue-spike.mjs [n]     # prints n sample cues (default 12) + length stats
 */
import fs from 'fs';

const RUN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs/2026-09-07T08-14-12-after8';
const pairs = JSON.parse(fs.readFileSync(`${RUN}/interview60.judge.pairs.json`, 'utf8'));
const items = Object.values(pairs.items).filter((p) => p.kind === 'spoken' && p.answer);

const STOP = new Set('the a an and or but so of to in on at for with by from as is are was were be been being it its this that these those i you we they he she my your our their which who what when where how would could should can will just also very really about into over than then there here more most some any each such only same other into like use used using make makes made get gets got one two three first second next new way ways thing things time times example part parts'.split(' '));
const sentences = (t) => t.replace(/\s+/g, ' ').match(/[^.!?]+[.!?]+["')\]]?|[^.!?]+$/g)?.map((s) => s.trim()).filter(Boolean) ?? [];
const words = (t) => t.match(/[A-Za-z0-9][A-Za-z0-9'\-\/+.]*/g) ?? [];

function leadLine(answer) {
    const first = sentences(answer)[0] ?? answer;
    // cut at the first clause break after the 4th word: comma, dash, "which", "so", "because"
    const w = words(first);
    let cut = w.length;
    const breakAt = first.search(/(,|—|–| - | which | so that | so | because | while | whereas )/);
    if (breakAt > 0) { const before = words(first.slice(0, breakAt)).length; if (before >= 4) cut = Math.min(cut, before); }
    return w.slice(0, Math.min(cut, 12)).join(' ');
}

function keyPhrases(answer, lead, max = 4) {
    const seen = new Set(words(lead).map((x) => x.toLowerCase()));
    const out = [];
    const rest = sentences(answer).slice(1).join(' ');
    // distinctive = capitalised/acronym/tool-like tokens, or long content words; keep spoken order
    for (const tok of words(rest)) {
        const k = tok.toLowerCase().replace(/[.,]$/, '');
        if (seen.has(k) || STOP.has(k) || k.length < 5) continue;
        const distinctive = /[A-Z]{2,}|[A-Z][a-z]+[A-Z]|[0-9]|[-\/]/.test(tok) || k.length >= 8;
        if (!distinctive) continue;
        seen.add(k); out.push(tok.replace(/[.,]$/, ''));
        if (out.length >= max) break;
    }
    return out;
}

const n = Number(process.argv[2] ?? 12);
const cues = items.map((p) => { const lead = leadLine(p.answer); return { id: p.id, verdict: p.verdict, q: p.question, lead, keys: keyPhrases(p.answer, lead), answerWords: words(p.answer).length }; });
for (const c of cues.slice(0, n)) {
    console.log(`\n${c.id} [${c.verdict}] ${c.q.slice(0, 90)}`);
    console.log(`   LEAD  ${c.lead}`);
    console.log(`   KEYS  ${c.keys.join(' · ') || '(none)'}`);
}
const leadLens = cues.map((c) => words(c.lead).length).sort((a, b) => a - b);
const keyCounts = cues.map((c) => c.keys.length);
console.log(`\n${cues.length} answers; lead words p50 ${leadLens[Math.floor(leadLens.length / 2)]} max ${leadLens.at(-1)}; keys: ${keyCounts.filter((k) => k >= 3).length} with >=3, ${keyCounts.filter((k) => k === 0).length} with 0`);
fs.writeFileSync(new URL('./cue-spike.out.json', import.meta.url), JSON.stringify(cues, null, 2));
