// THROWAWAY: merge the IMPERATIVE opening sentence into the body of each main question.
//
// Measured A/B (same voice, same words, only the shape differs): S2Q02 54% -> 96%,
// S1Q04 2 fires at 65% -> 1 fire at 95%, S2Q01 95% -> 100%. All three failures had an
// imperative head — a topic label ("Defend the improvements reported on your CV.")
// whose TAIL carries the actual content, so firing on the head loses the question.
//
// The 6 question-headed items are left alone deliberately: "Why did you choose XGBoost?"
// IS the ask, and firing on it early costs nothing.
import fs from 'node:fs';

const F = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/scenario50.questions.mjs';
let s = fs.readFileSync(F, 'utf8');

// Only main questions: follow-ups are single sentences and were heard fine.
const qLine = /^(\s*q: ")((?:[^"\\]|\\.)*)(",)$/gm;
let merged = 0, questionHead = 0, noHead = 0, skippedFollowup = 0;
const changes = [];

s = s.replace(qLine, (line, pre, text, post, offset, whole) => {
    // The item's level sits a few lines above its q.
    const head = whole.slice(Math.max(0, offset - 400), offset);
    const isFollowup = /level: 'followup'/.test(head.slice(head.lastIndexOf('{')));
    if (isFollowup) { skippedFollowup++; return line; }

    const m = text.match(/^(.{10,90}?)([.?])\s+(\S)(.*)$/s);
    if (!m) { noHead++; return line; }
    const [, h, mark, first, rest] = m;
    if (mark === '?') { questionHead++; return line; }
    const out = `${h}: ${first.toLowerCase()}${rest}`;
    merged++;
    changes.push([text.slice(0, 58), out.slice(0, 58)]);
    return pre + out + post;
});

fs.writeFileSync(F, s);
console.log(`merged ${merged} imperative heads`);
console.log(`left alone: ${questionHead} question heads, ${noHead} single-sentence mains, ${skippedFollowup} follow-ups`);
for (const [a, b] of changes.slice(0, 5)) console.log(`  ${JSON.stringify(a)}\n  -> ${JSON.stringify(b)}`);
