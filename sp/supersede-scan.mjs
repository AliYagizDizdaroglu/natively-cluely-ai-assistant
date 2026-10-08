// Throwaway: how often does a SHORT answered question get followed, within a few
// seconds, by a LONGER dispatch (either ear) that is dropped as duplicate-answered and
// contains / overlaps the short one?  That is the class a "supersede" rule would cover
// (after6 H04, after5 W05/M11/W09/M21).  Read-only over run logs.
// usage: node supersede-scan.mjs <root> <runDir> [<runDir> ...]
import fs from 'node:fs';
import path from 'node:path';

const [root, ...runs] = process.argv.slice(2);
const DISPATCH = /^(\S+) \[LOG\] \[Main\] dispatch: (answer|chip|drop|hold) source=(live|whisper) anchor="((?:[^"\\]|\\.)*)" verdict=(\w+)(?: duplicateOf=(\w+) answered=(true|false))?(?: reason=(\w+))?(?: question=("(?:[^"\\]|\\.)*"))?/gm;
const words = (t) => (t.toLowerCase().match(/[a-z0-9']+/g) ?? []);
const STOP = new Set(['the', 'a', 'an', 'and', 'or', 'of', 'for', 'to', 'in', 'on', 'at', 'with', 'from', 'by', 'as', 'is', 'are', 'was', 'were', 'be', 'do', 'does', 'did', 'you', 'your', 'we', 'our', 'it', 'its', 'that', 'this', 'how', 'what', 'why', 'when', 'would', 'could', 'should', 'can', 'i', 'me', 'my', 'so', 'if', 'about', 'have', 'has', 'had', 'not', 'there', 'they', 'them', 'their', 'which', 'who', 'into', 'than', 'then', 'some', 'any', 'more', 'most', 'just', 'also', 'like', 'up', 'out', 'over', 'us', 'one', 'those', 'these', 'been', 'being', 'will', 'let', 'lets', 'say', 'tell', 'ok', 'okay', 'well', 'yeah', 'yes', 'no', 'oh', 'um', 'uh', 'he', 'she', 'his', 'her', 'him', 'now', 'here', 'get', 'got', 'go', 'going', 'know', 'think', 'thing', 'things', 'something', 'kind', 'sort', 'really', 'very', 'much', 'many', 'all', 'each', 'every', 'both', 'few', 'other', 'another', 'such', 'only', 'own', 'same', 'too', 'again', 'once', 'ever', 'never', 'always', 'still', 'even', 'back', 'off', 'down', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'under', 'while', 'where', 'because', 'but', 'yet', 'though', 'although', 'since', 'until', 'unless', 'whether', 'either', 'neither', 'nor', 'sure', 'right', 'great', 'good', 'thanks', 'thank']);
const content = (t) => new Set(words(t).filter((w) => !STOP.has(w) && w.length > 2));

for (const run of runs) {
    const dir = path.join(root, run);
    const dbg = fs.readFileSync(path.join(dir, 'natively_debug.log'), 'utf8');
    const disp = [...dbg.matchAll(DISPATCH)].map((m) => ({ at: Date.parse(m[1]), action: m[2], source: m[3], anchor: JSON.parse('"' + m[4] + '"'), verdict: m[5], dup: m[6], answered: m[7], reason: m[8], q: m[9] ? JSON.parse(m[9]) : null }));
    const tl = fs.existsSync(path.join(dir, 'interview60.timeline.json')) ? JSON.parse(fs.readFileSync(path.join(dir, 'interview60.timeline.json'), 'utf8')).items : [];
    const itemAt = (t) => { let best = null; for (const it of tl) { if (it.playedAt <= t + 2000 && (!best || it.playedAt > best.playedAt)) best = it; } return best?.id ?? '?'; };
    console.log(`\n=== ${run}: ${disp.length} dispatch lines`);
    const answers = disp.filter((d) => d.action === 'answer');
    let cases = 0;
    for (const a of answers) {
        const aq = a.q ?? a.anchor;
        const aw = words(aq).length;
        // followers: any later dispatch within 10 s that is dropped as duplicate-answered (or a second answer) and is longer
        const followers = disp.filter((d) => d.at > a.at && d.at - a.at <= 10000 && d !== a && (d.dup || d.action === 'answer') && words(d.q ?? d.anchor).length > aw * 1.5 && words(d.q ?? d.anchor).length >= aw + 3);
        for (const f of followers) {
            const fq = f.q ?? f.anchor;
            const ca = content(aq), cf = content(fq);
            const shared = [...ca].filter((w) => cf.has(w)).length;
            const contained = fq.toLowerCase().includes(aq.toLowerCase().replace(/[?.!]+$/, '').trim().slice(0, 40)) || (ca.size > 0 && shared / ca.size >= 0.6);
            cases++;
            console.log(`  ${itemAt(a.at)} +${((f.at - a.at) / 1000).toFixed(1)}s  answered[${a.source}] (${aw}w) ${JSON.stringify(aq.slice(0, 70))}  ->  ${f.action}${f.dup ? ' dup=' + f.dup + ' answered=' + f.answered : ''}[${f.source}] (${words(fq).length}w) ${JSON.stringify(fq.slice(0, 90))}  shared=${shared}/${ca.size} contained=${contained}`);
        }
    }
    console.log(`  candidate pairs: ${cases}`);
}
