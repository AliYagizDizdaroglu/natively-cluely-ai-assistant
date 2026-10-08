import fs from 'node:fs';

const file = 'C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-cluely-ai-assistant\\electron\\test\\golden\\interview60.pass-record.mjs';
const text = fs.readFileSync(file, 'utf8');

// 1. collectPass: read the startup line into meta.verbalHedge.
const oldMeta = `        answerModel: lastMatch(dbg, /Default Model set to: (\\S+)/g)?.[1] ?? null,
        commit: done.commit ?? null,`;
const newMeta = `        answerModel: lastMatch(dbg, /Default Model set to: (\\S+)/g)?.[1] ?? null,
        // The hedge's startup line (verbalHedge.ts's describeVerbalHedgeAtStartup, logged in
        // main.ts): 'on trigger=<n>ms' | 'off' | null when the line is absent (every run before
        // da28f25, h40c review M6).
        verbalHedge: lastMatch(dbg, /\\[Main\\] verbal hedge: (on trigger=\\d+ms|off)/g)?.[1] ?? null,
        commit: done.commit ?? null,`;

// 2. renderPassRecord: the answers row names both lites under the hedge, not 3.1-lite alone.
const oldAnswersLine = `    out.push(\`| answers | \${t.answerModel ?? 'unknown'} (in-app)\${s.arms.length ? \` · arms: \${s.arms.map((a) => a.model).join(', ')}\` : ''} |\`);`;
const newAnswersLine = `    const answerLabel = t.verbalHedge?.startsWith('on') ? 'hedge (gemini-3.5-flash-lite front, gemini-3.1-flash-lite back)' : (t.answerModel ?? 'unknown');
    out.push(\`| answers | \${answerLabel} (in-app)\${s.arms.length ? \` · arms: \${s.arms.map((a) => a.model).join(', ')}\` : ''} |\`);`;

// 3. renderPassRecord: one extra summary line, only when the startup line was present.
const oldArmsLoop = `    for (const a of s.arms) out.push(\`- Arm \${a.model} (\${a.n} mains): \${a.graded ? counts(a) : 'not graded'} · TTFT p50 \${secs(a.ttftP50)} p90 \${secs(a.ttftP90)}\${a.graded ? \` · grader \${a.graderModel ?? 'unrecorded'}\` : ''}\`);
    out.push('');`;
const newArmsLoop = `    for (const a of s.arms) out.push(\`- Arm \${a.model} (\${a.n} mains): \${a.graded ? counts(a) : 'not graded'} · TTFT p50 \${secs(a.ttftP50)} p90 \${secs(a.ttftP90)}\${a.graded ? \` · grader \${a.graderModel ?? 'unrecorded'}\` : ''}\`);
    if (t.verbalHedge != null) out.push(t.verbalHedge.startsWith('on') ? \`- Verbal hedge: \${t.verbalHedge} (3.5-flash-lite front, 3.1-flash-lite back; answers name their model in the won-by lines)\` : \`- Verbal hedge: \${t.verbalHedge}\`);
    out.push('');`;

let out = text;
for (const [oldStr, newStr, label] of [[oldMeta, newMeta, 'meta.verbalHedge'], [oldAnswersLine, newAnswersLine, 'answers line'], [oldArmsLoop, newArmsLoop, 'arms loop + summary line']]) {
    const count = out.split(oldStr).length - 1;
    if (count !== 1) {
        console.error(`FAIL: expected exactly 1 occurrence of the ${label}, found ${count}`);
        process.exit(1);
    }
    out = out.split(oldStr).join(newStr);
}
fs.writeFileSync(file, out, 'utf8');
console.log('OK: interview60.pass-record.mjs patched with verbal-hedge meta + rendering (GREEN)');
