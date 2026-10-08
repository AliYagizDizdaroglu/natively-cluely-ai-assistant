import fs from 'node:fs';
const WT = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/.claude/worktrees/eq-build/electron/';
function edit(file, pairs) {
  let s = fs.readFileSync(WT + file, 'utf8');
  if (s.includes('\r')) throw new Error('CRLF in ' + file);
  for (const [a, b] of pairs) {
    const n = s.split(a).length - 1;
    if (n !== 1) throw new Error(file + ': anchor matched ' + n + ': ' + a.slice(0, 60));
    s = s.replace(a, () => b);
  }
  fs.writeFileSync(WT + file, s);
}
const BLOCK = `            // Turn-based follow-up context (spec 2026-10-03 §3.5). The block is built from the ledger
            // BEFORE this call's own write, then the write, then ONE diag line — all synchronous, with
            // no await between them, so overlapping calls keep call order and a write can never change
            // the bytes of the call that makes it. Flag off: this step returns before anything is read,
            // built, logged or written (today's path). Any failure in here is today's prompt: the
            // answer, the history and the UI are untouched (§3.6). The diag line carries counts only:
            // \`chars\` is the block BUILT here; WhatToAnswerLLM drops it on the coding framing, which is
            // decided by classifyIntent after this line on the non-override path, so a coding call can
            // read \`gate=block chars=N\` with nothing inserted (plan review m3; STATES.md says so).
            let earlierQuestionBlock = '';
            try {
                if (earlierQuestionEnabled()) {
                    const t0 = Date.now();
                    const turnId = options.turnId ?? null;
                    const earlier = buildEarlierQuestion({
                        question: settled, turnId, supersede: options.replaceAnswer === true,
                        ledger: this.session.getAskedQuestions(), promptLines: interviewerLinesBefore(preparedTranscript),
                    });
                    if (settled) this.session.recordAskedQuestion(settled, turnId);
                    earlierQuestionBlock = earlier.block;
                    console.log(\`[IntelligenceEngine] earlier question: gate=\${earlier.why || 'block'} cue=\${earlier.cue} chars=\${earlier.block.length} turn=\${turnId ?? 'none'} ms=\${Date.now() - t0}\`);
                }
            } catch (e) {
                earlierQuestionBlock = '';
                console.log(\`[IntelligenceEngine] earlier question: gate=error cue=none chars=0 turn=\${options.turnId ?? 'none'} ms=0 error=\${JSON.stringify((e as Error)?.message ?? String(e))}\`);
            }
`;
const pinned = "            if (settled) console.log(`[IntelligenceEngine] runWhatShouldISay: pinned question ${JSON.stringify(settled)}`);\n";
edit('IntelligenceEngine.ts', [
  ["import { withParentExchange } from './llm/followUpParent';\n", "import { withParentExchange } from './llm/followUpParent';\nimport { earlierQuestionEnabled, buildEarlierQuestion, interviewerLinesBefore } from './llm/earlierQuestion';\n"],
  ["            replaceAnswer?: boolean;\n        } = {}\n    ): Promise<string | null> {\n        const now = Date.now();", "            replaceAnswer?: boolean;\n            /** The machine turn's id on the auto turn path (main.ts turn dispatch/supersede); absent or null elsewhere. Spec 2026-10-03 §3.1. */\n            turnId?: number | null;\n        } = {}\n    ): Promise<string | null> {\n        const now = Date.now();"],
  [pinned, pinned + "\n" + BLOCK],
  ["options.liveTexts, onCues);", "options.liveTexts, onCues, earlierQuestionBlock);"],
]);
edit('IntelligenceManager.ts', [
  ["            replaceAnswer?: boolean;\n        } = {}\n    ): Promise<string | null> {\n        return this.engine.runWhatShouldISay(", "            replaceAnswer?: boolean;\n            turnId?: number | null;\n        } = {}\n    ): Promise<string | null> {\n        return this.engine.runWhatShouldISay("],
]);
console.log('ok');