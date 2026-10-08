// Throwaway mutation runner for the final review: applies one string mutation at a time to the
// scratch copy of e94305a, runs the named test files, records the counts, restores the file.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const E = path.join(HERE, 'e94305a');
const CWD = path.join(HERE, 'vcwd');
const VITEST = path.join(E, 'node_modules', 'vitest', 'vitest.mjs');

const MUTANTS = [
    { id: 'M1-revert', file: 'electron/LLMHelper.ts', tests: ['electron/LLMHelper.verbalHedge.test.ts'],
      from: `const other = loser.settled?.kind === 'error' ? 'failed' : loser.settled?.kind === 'empty' ? 'empty' : 'aborted';\n    if (loser.settled?.kind !== 'error' && loser.settled?.kind !== 'empty') loser.stop.abort();`,
      to: `const other = loser.settled ? (loser.settled.kind === 'error' ? 'failed' : 'empty') : 'aborted';\n    if (!loser.settled) loser.stop.abort();` },
    { id: 'throw-back-first', file: 'electron/LLMHelper.ts', tests: ['electron/LLMHelper.verbalHedge.test.ts'],
      from: `      if (f.kind === 'error') throw f.err;\n      if (b.kind === 'error') throw b.err;`,
      to: `      if (b.kind === 'error') throw b.err;\n      if (f.kind === 'error') throw f.err;` },
    { id: 'deliver-no-close', file: 'electron/LLMHelper.ts', tests: ['electron/LLMHelper.verbalHedge.test.ts'],
      from: `        if (!delivered) leg.gen.return(undefined);`, to: `        void delivered;` },
    { id: 'hedge-any-primary', file: 'electron/LLMHelper.ts', tests: ['electron/LLMHelper.verbalHedge.test.ts'],
      from: `if (verbalHedgeEnabled() && (primaryModel === GEMINI_FLASH_MODEL || primaryModel === GEMINI_FLASH_FALLBACK_MODEL)) {`,
      to: `if (verbalHedgeEnabled()) {` },
    { id: 'trigger-back-only', file: 'electron/LLMHelper.ts', tests: ['electron/LLMHelper.verbalHedge.test.ts'],
      from: `const legs: Leg[] = reason === 'trigger' ? [front, back] : [back];`, to: `const legs: Leg[] = [back];` },
    { id: 'both-empty-throws', file: 'electron/LLMHelper.ts', tests: ['electron/LLMHelper.verbalHedge.test.ts', 'electron/llm/WhatToAnswerLLM.answeringModel.test.ts'],
      from: `      return;   // both empty: nothing to say, as today`, to: `      throw new Error('both legs empty');` },
    { id: 'front-empty-no-back', file: 'electron/LLMHelper.ts', tests: ['electron/LLMHelper.verbalHedge.test.ts', 'electron/llm/WhatToAnswerLLM.answeringModel.test.ts'],
      from: `    const reason = frontFirst === 'trigger' ? 'trigger' : frontFirst.kind === 'error' ? 'front-error' : 'front-empty';`,
      to: `    if (frontFirst !== 'trigger' && frontFirst.kind === 'empty') return;\n    const reason = frontFirst === 'trigger' ? 'trigger' : frontFirst.kind === 'error' ? 'front-error' : 'front-empty';` },
    { id: 'no-clearTimeout', file: 'electron/LLMHelper.ts', tests: ['electron/LLMHelper.verbalHedge.test.ts'],
      from: `    const frontFirst = await Promise.race([front.first, trigger]);\n    clearTimeout(timer);`,
      to: `    const frontFirst = await Promise.race([front.first, trigger]);` },
    { id: 'hedge-label-as-fallback', file: 'electron/llm/WhatToAnswerLLM.ts', tests: ['electron/llm/WhatToAnswerLLM.answeringModel.test.ts'],
      from: `announce = h ? chunk : \`__model_source:\${m[1]} (fallback)__\`;`, to: `announce = \`__model_source:\${m[1]} (fallback)__\`;` },
    { id: 'no-hedge-branch-in-watch', file: 'electron/llm/WhatToAnswerLLM.ts', tests: ['electron/llm/WhatToAnswerLLM.answeringModel.test.ts'],
      from: `const h = HEDGE_WINNER.exec(chunk);`, to: `const h = null as RegExpExecArray | null;` },
    { id: 'session-ignores-question', file: 'electron/SessionTracker.ts', tests: ['electron/SessionTracker.test.ts', 'electron/IntelligenceEngine.followUpParent.test.ts'],
      from: `questionContext: questionContext?.trim() || this.getLastInterviewerTurn() || 'unknown'`, to: `questionContext: this.getLastInterviewerTurn() || 'unknown'` },
    { id: 'engine-drops-settled', file: 'electron/IntelligenceEngine.ts', tests: ['electron/IntelligenceEngine.followUpParent.test.ts'],
      from: `this.session.addAssistantMessage(fullAnswer, settled ?? undefined);`, to: `this.session.addAssistantMessage(fullAnswer);` },
    { id: 'engine-no-restore', file: 'electron/IntelligenceEngine.ts', tests: ['electron/IntelligenceEngine.followUpParent.test.ts'],
      from: `})), this.session.getAssistantResponseHistory());`, to: `})), []);` },
    { id: 'parent-no-dup-check', file: 'electron/llm/followUpParent.ts', tests: ['electron/llm/followUpParent.test.ts', 'electron/IntelligenceEngine.followUpParent.test.ts'],
      from: `    if (turns.some((t) => t.role === 'assistant' && t.text === last.text)) return turns;\n`, to: `` },
    { id: 'parent-always-on', file: 'electron/llm/followUpParent.ts', tests: ['electron/llm/followUpParent.test.ts', 'electron/IntelligenceEngine.followUpParent.test.ts'],
      from: `    if (!followUpParentEnabled(env)) return turns;`, to: `    followUpParentEnabled(env);` },
    { id: 'judge-no-paraphrase-guard', file: 'electron/test/golden/interview60.judge.mjs', tests: ['electron/test/golden/interview60.judge.test.ts'],
      from: `d.question && d.verdict === 'paraphrase' ? overlap(d.question, it.q) : 0`, to: `d.question ? overlap(d.question, it.q) : 0` },
    { id: 'judge-no-question', file: 'electron/test/golden/interview60.judge.mjs', tests: ['electron/test/golden/interview60.judge.test.ts'],
      from: `d.question && d.verdict === 'paraphrase' ? overlap(d.question, it.q) : 0`, to: `0` },
    { id: 'metrics-no-paraphrase-guard', file: 'electron/test/golden/interview60.metrics.mjs', tests: ['electron/test/golden/interview60.metrics.test.ts'],
      from: `d.question && d.verdict === 'paraphrase' ? overlap(d.question, it.q) : 0, d.question && d.verdict === 'paraphrase' ? overlap(it.q, d.question) : 0`,
      to: `d.question ? overlap(d.question, it.q) : 0, d.question ? overlap(it.q, d.question) : 0` },
    { id: 'metrics-no-question', file: 'electron/test/golden/interview60.metrics.mjs', tests: ['electron/test/golden/interview60.metrics.test.ts'],
      from: `d.question && d.verdict === 'paraphrase' ? overlap(d.question, it.q) : 0, d.question && d.verdict === 'paraphrase' ? overlap(it.q, d.question) : 0`,
      to: `0, 0` },
    { id: 'startup-reads-trigger-when-off', file: 'electron/llm/verbalHedge.ts', tests: ['electron/llm/verbalHedge.test.ts'],
      from: `    if (!verbalHedgeEnabled(env)) return '[Main] verbal hedge: off';\n    const triggerMs = verbalHedgeTriggerMs(env);`,
      to: `    const triggerMs = verbalHedgeTriggerMs(env);\n    if (!verbalHedgeEnabled(env)) return '[Main] verbal hedge: off';` },
];

const only = process.argv.slice(2);
const results = [];
for (const m of MUTANTS.filter((x) => !only.length || only.includes(x.id))) {
    const abs = path.join(E, m.file);
    const orig = fs.readFileSync(abs, 'utf8');
    const n = orig.split(m.from).length - 1;
    if (n !== 1) { results.push(`${m.id}: MUTATION DID NOT APPLY (matches=${n})`); continue; }
    fs.writeFileSync(abs, orig.replace(m.from, m.to));
    try {
        const r = spawnSync(process.execPath, [VITEST, 'run', '--root', E, '--config', path.join(E, 'vitest.config.ts'), ...m.tests], { cwd: CWD, encoding: 'utf8', env: Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('NATIVELY_'))) });
        const out = (r.stdout ?? '') + (r.stderr ?? '');
        const tests = out.match(/Tests\s+([^\n]+)/)?.[1]?.trim() ?? '(no Tests line)';
        const failed = [...out.matchAll(/^\s*×\s+([^\n]+)/gm)].map((x) => x[1].trim().slice(0, 150));
        results.push(`${m.id}: exit=${r.status} Tests ${tests}${failed.length ? '\n    failed: ' + failed.join('\n    failed: ') : ''}`);
    } finally {
        fs.writeFileSync(abs, orig);
    }
}
console.log(results.join('\n'));
