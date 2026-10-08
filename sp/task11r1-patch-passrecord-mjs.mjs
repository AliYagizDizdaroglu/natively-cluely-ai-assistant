import fs from 'node:fs';

const file = 'C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-cluely-ai-assistant\\electron\\test\\golden\\interview60.pass-record.mjs';
const text = fs.readFileSync(file, 'utf8');

// Minor 1: export the regex as its own small helper, and use it from collectPass.
const oldGraderOf = `export function graderOf(judge) {
    return judge?.graderModel ?? (judge?.effort ? judge.model ?? null : null);
}
`;
const newGraderOf = `export function graderOf(judge) {
    return judge?.graderModel ?? (judge?.effort ? judge.model ?? null : null);
}

/**
 * The hedge's startup line (verbalHedge.ts's describeVerbalHedgeAtStartup, logged in main.ts),
 * read from the run's debug log text: 'on trigger=<n>ms' | 'off' | null when the line is absent
 * (every run before da28f25, h40c review M6). Exported so a test can prove the regex against the
 * real describe function's output, not only a hand-typed fixture (h40c review fix round 1, Minor 1).
 */
export function verbalHedgeFromLog(dbg) {
    return lastMatch(dbg, /\\[Main\\] verbal hedge: (on trigger=\\d+ms|off)/g)?.[1] ?? null;
}
`;

const oldMeta = `        answerModel: lastMatch(dbg, /Default Model set to: (\\S+)/g)?.[1] ?? null,
        // The hedge's startup line (verbalHedge.ts's describeVerbalHedgeAtStartup, logged in
        // main.ts): 'on trigger=<n>ms' | 'off' | null when the line is absent (every run before
        // da28f25, h40c review M6).
        verbalHedge: lastMatch(dbg, /\\[Main\\] verbal hedge: (on trigger=\\d+ms|off)/g)?.[1] ?? null,
        commit: done.commit ?? null,`;
const newMeta = `        answerModel: lastMatch(dbg, /Default Model set to: (\\S+)/g)?.[1] ?? null,
        verbalHedge: verbalHedgeFromLog(dbg),
        commit: done.commit ?? null,`;

// Minor 3: the hedge label applies only when the hedge could actually have engaged.
const oldAnswerLabel = `    const answerLabel = t.verbalHedge?.startsWith('on') ? 'hedge (gemini-3.5-flash-lite front, gemini-3.1-flash-lite back)' : (t.answerModel ?? 'unknown');`;
const newAnswerLabel = `    // The hedge only engages when the primary is one of the two lites (LLMHelper.ts:3395) — a
    // different primary (NATIVELY_VERBAL_PRIMARY_MODEL, or Gemma) keeps its own name even with the
    // flag on; the summary bullet below still names the flag either way (h40c review fix round 1, Minor 3).
    const hedgeEngaged = t.verbalHedge?.startsWith('on') && (t.answerModel === 'gemini-3.1-flash-lite' || t.answerModel === 'gemini-3.5-flash-lite');
    const answerLabel = hedgeEngaged ? 'hedge (gemini-3.5-flash-lite front, gemini-3.1-flash-lite back)' : (t.answerModel ?? 'unknown');`;

let out = text;
for (const [oldStr, newStr, label] of [[oldGraderOf, newGraderOf, 'graderOf (add verbalHedgeFromLog)'], [oldMeta, newMeta, 'meta.verbalHedge'], [oldAnswerLabel, newAnswerLabel, 'answerLabel']]) {
    const count = out.split(oldStr).length - 1;
    if (count !== 1) {
        console.error(`FAIL: expected exactly 1 occurrence of the ${label}, found ${count}`);
        process.exit(1);
    }
    out = out.split(oldStr).join(newStr);
}
fs.writeFileSync(file, out, 'utf8');
console.log('OK: interview60.pass-record.mjs patched (fix round 1: Minor 1 + Minor 3, GREEN)');
