// Throwaway spike: in the after5 hour (Groq REST, 6 s safety-net uploads) the
// whisper detector fired on HEAD fragments such as "What problem does
// infrastructure" — 4 words, opener word, no terminal punctuation — which
// looksFragmentary treats as whole (the opener rule), so they were answered at
// once and Live's whole sentence 350 ms later was dropped as a duplicate.
// Proposed refinement: a text of at most 6 words with NO terminal punctuation
// at all (no . ! ? …) is fragmentary even when it opens with a question word.
// Score it: over every run, which dispatched/whisper questions change class,
// and for the after5 heads, did the other ear bring the whole sentence inside
// the hold window? usage: node spike-head-fragments.mjs <run-dir> ...
import fs from 'node:fs';
import path from 'node:path';

const OPENERS = new Set(['what','why','how','when','where','which','who','whom','whose','can','could','would','should','do','does','did','is','are','was','were','will','have','has','tell','walk','describe','explain','give','compare','imagine','suppose','say','let']);
function current(text) { const t = String(text).trim(); const w = t.split(/\s+/).filter(Boolean); if (w.length < 4) return true; if (/^(and|so|but|or|then|because)\b/i.test(t)) return true; if (w.length > 6) return false; if (/[?？]["'”’)\]]*$/.test(t)) return false; const f = w[0].toLowerCase().replace(/^[^a-z]+/, '').replace(/[^a-z].*$/, ''); return !OPENERS.has(f); }
function proposed(text) { const t = String(text).trim(); const w = t.split(/\s+/).filter(Boolean); if (w.length < 4) return true; if (/^(and|so|but|or|then|because)\b/i.test(t)) return true; if (w.length > 6) return false; if (/[?？]["'”’)\]]*$/.test(t)) return false; if (!/[.!…]["'”’)\]]*$/.test(t)) return true; const f = w[0].toLowerCase().replace(/^[^a-z]+/, '').replace(/[^a-z].*$/, ''); return !OPENERS.has(f); }
const ts = (s) => Date.parse(s);
const words = (s) => String(s).toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').split(/\s+/).filter(Boolean);

for (const dir of process.argv.slice(2)) {
    const log = fs.readFileSync(path.join(dir, 'natively_debug.log'), 'utf8');
    const tlPath = path.join(dir, 'interview60.timeline.json');
    const items = fs.existsSync(tlPath) ? JSON.parse(fs.readFileSync(tlPath, 'utf8')).items.map((i) => ({ ...i, spokeEnd: i.playedAt + Math.round((i.clipSecs ?? 0) * 1000) })) : [];
    const itemAt = (at) => items.filter((i) => at >= i.playedAt - 2000 && at <= i.spokeEnd + 60000).sort((a, b) => b.playedAt - a.playedAt)[0];
    const liveQ = [...log.matchAll(/^(\S+) \[LOG\] \[Main\] Live question \(\w+, mode=\w+\): "([^"]*)"/gm)].map((m) => ({ at: ts(m[1]), text: m[2] }));
    const disp = [...log.matchAll(/^(\S+) \[LOG\] \[Main\] dispatch: (answer|chip|drop|hold) source=(live|whisper) anchor="((?:[^"\\]|\\.)*)" verdict=(\w+)(?:[^\n]*?question=("(?:[^"\\]|\\.)*"))?/gm)].map((m) => ({ at: ts(m[1]), action: m[2], source: m[3], anchor: JSON.parse('"' + m[4] + '"'), verdict: m[5], question: m[6] ? JSON.parse(m[6]) : null }));
    const chips = [...log.matchAll(/^(\S+) \[LOG\] \[QuestionDetector\] chip emitted: intent=\w+ confidence=[\d.]+ q="([^"]*)"/gm)].map((m) => ({ at: ts(m[1]), text: m[2] }));
    // candidate texts = whisper chip texts (full when < 60 chars) + Live questions
    const cands = [...chips.map((c) => ({ ...c, src: 'whisper' })), ...liveQ.map((l) => ({ ...l, src: 'live' }))].filter((c) => c.text.length < 60);
    const flips = cands.filter((c) => current(c.text) !== proposed(c.text));
    console.log(`\n=== ${path.basename(dir)}: candidate texts ${cands.length}; class changes under the proposal: ${flips.length}`);
    for (const f of flips) {
        const it = itemAt(f.at);
        const whole = it && words(f.text).length >= 4 && words(f.text).join(' ') === words(it.q).join(' ');
        const other = f.src === 'whisper' ? liveQ.find((l) => l.at > f.at && l.at - f.at <= 2600) : chips.find((c) => c.at > f.at && c.at - f.at <= 2600);
        console.log(`   ${new Date(f.at).toISOString().slice(11, 19)} ${(it?.id ?? '—').padEnd(4)} ${f.src.padEnd(7)} ${JSON.stringify(f.text)} → now ${proposed(f.text) ? 'FRAGMENTARY' : 'whole'}${whole ? '   <- a WHOLE script question (false hold)' : ''}${other ? '   other ear within hold: ' + JSON.stringify(other.text.slice(0, 50)) : ''}`);
    }
}
