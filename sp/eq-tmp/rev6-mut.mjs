// Throwaway (Task 6 review): mutants on the ISOLATED export eq-tmp/rev6 (never the worktree).
import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const R = join(HERE, 'rev6');
const MAIN = process.argv[2];
const F = join(R, 'electron', 'IntelligenceEngine.ts');
const orig = readFileSync(F, 'utf8');

const BUILD = `const earlier = buildEarlierQuestion({
                        question: settled, turnId, supersede: options.replaceAnswer === true,
                        ledger: this.session.getAskedQuestions(), promptLines: interviewerLinesBefore(preparedTranscript),
                    });`;
const WRITE = `if (settled) this.session.recordAskedQuestion(settled, turnId);`;
const ASSIGN = `earlierQuestionBlock = earlier.block;`;
const LOG = "console.log(`[IntelligenceEngine] earlier question: gate=${earlier.why || 'block'} cue=${earlier.cue} chars=${earlier.block.length} turn=${turnId ?? 'none'} ms=${Date.now() - t0}`);";

const one = (s, a, b) => { const i = s.indexOf(a); if (i < 0 || s.indexOf(a, i + 1) >= 0) throw new Error('anchor not unique: ' + a.slice(0, 50)); return s.replace(a, b); };
const mutants = {
  'M1 write-before-build': (s) => one(one(s, WRITE + '\n', ''), BUILD, WRITE.replace('turnId)', 'options.turnId ?? null)') + '\n                    ' + BUILD),
  'M2 log-before-write': (s) => one(one(s, LOG, ''), WRITE, ASSIGN.replace('earlier.block', 'earlier.block') + LOG + '\n                    ' + WRITE),
  'M3 ledger read hoisted': (s) => one(s, 'if (earlierQuestionEnabled()) {', 'const __l = this.session.getAskedQuestions(); void __l;\n                if (earlierQuestionEnabled()) {'),
  'M4 catch rethrows': (s) => one(s, "ms=0 error=${JSON.stringify((e as Error)?.message ?? String(e))}`);", "ms=0 error=${JSON.stringify((e as Error)?.message ?? String(e))}`); throw e;"),
  'M5 assign before write': (s) => one(one(s, ASSIGN, ''), WRITE, ASSIGN + ' ' + WRITE),
  'M6 block not passed': (s) => one(s, 'onCues, earlierQuestionBlock);', "onCues, '');"),
  'M7 diag carries text': (s) => one(s, "ms=${Date.now() - t0}`);", "ms=${Date.now() - t0} q=${settled}`);"),
  'M8 flag ignored': (s) => one(s, 'if (earlierQuestionEnabled()) {', 'if (true) {'),
  'M9 supersede dropped': (s) => one(s, 'supersede: options.replaceAnswer === true,', 'supersede: false,'),
  'M10 turnId || null': (s) => one(s, 'const turnId = options.turnId ?? null;', 'const turnId = options.turnId || null;'),
  'M11 write skipped on no-turn': (s) => one(s, WRITE, `if (settled && turnId != null) this.session.recordAskedQuestion(settled, turnId);`),
};

try {
  for (const [name, f] of Object.entries(mutants)) {
    writeFileSync(F, f(orig));
    const r = spawnSync(process.execPath, [join(MAIN, 'node_modules', 'vitest', 'vitest.mjs'), 'run', 'electron/IntelligenceEngine.earlierQuestion.test.ts', '--root', R], { cwd: HERE, encoding: 'utf8' });
    const out = (r.stdout || '') + (r.stderr || '');
    const summary = (out.match(/Tests\s+[^\n]*/) || ['?'])[0].replace(/\x1b\[[0-9;]*m/g, '');
    const failed = [...out.matchAll(/(?:×|FAIL)\s+[^\n]*?> ([^\n]+?)(?:\s\d+ms)?$/gm)].map((m) => m[1].replace(/\x1b\[[0-9;]*m/g, '').slice(0, 70));
    console.log(`${name}: ${summary}${failed.length ? '\n   - ' + [...new Set(failed)].join('\n   - ') : ''}`);
  }
} finally {
  writeFileSync(F, orig);
  console.log('restored:', readFileSync(F, 'utf8') === orig);
}
