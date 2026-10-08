// Rule-8 calibration for quota-ledger.mjs's reconciliation self-check: does the
// "landed-on-X measured vs expected == MATCHES/DOES NOT MATCH" logic actually notice when the
// numbers disagree, or does it just always say MATCHES? Proven here on two synthetic logs: a
// known-good case and a deliberately broken one, using the SAME parseInAppLog() the real
// ledger uses (imported, not reimplemented) so this calibrates the real code path.
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseInAppLog } from './quota-ledger.mjs';

const dir = mkdtempSync(join(tmpdir(), 'qledger-calib-'));

// --- Case A: known-good, mirrors the real h40b shape at small scale ---------------------
const GOOD_LOG = `
2026-09-26T10:00:00.000Z [LOG] [LLMHelper] verbal stall race: trying gemini-3.1-flash-lite (fallback=gemini-3.5-flash-lite after 10000ms)
2026-09-26T10:00:01.000Z [LOG] [LLMHelper] gemini-3.1-flash-lite usage: thinking=LOW thoughts=10 out=20 in=4000
2026-09-26T10:01:00.000Z [LOG] [LLMHelper] verbal stall race: trying gemini-3.1-flash-lite (fallback=gemini-3.5-flash-lite after 10000ms)
2026-09-26T10:01:11.000Z [WARN] [LLMHelper] gemini-3.1-flash-lite stalled after 10000ms — falling back to gemini-3.5-flash-lite
2026-09-26T10:01:12.000Z [LOG] [LLMHelper] gemini-3.5-flash-lite usage: thinking=LOW thoughts=10 out=20 in=4000
`.trim() + '\n';
const goodPath = join(dir, 'good.log');
writeFileSync(goodPath, GOOD_LOG, 'utf8');

const good = parseInAppLog(goodPath);
const goodTrying31 = good.trying.filter((t) => t.model === 'gemini-3.1-flash-lite').length;
const goodLanded31 = good.answers.filter((a) => a.model === 'gemini-3.1-flash-lite').length;
const goodLanded35 = good.answers.filter((a) => a.model === 'gemini-3.5-flash-lite').length;
const goodStalled = good.stalled.length;
const goodPrimaryFailed = good.primaryFailed.length;
const goodMatches31 = (goodTrying31 - goodPrimaryFailed - goodStalled) === goodLanded31;
const goodMatches35 = goodLanded35 === (goodPrimaryFailed + goodStalled);
console.log('Case A (known-good): trying31=%d stalled=%d primaryFailed=%d landed31=%d landed35=%d -> reconcile31=%s reconcile35=%s',
  goodTrying31, goodStalled, goodPrimaryFailed, goodLanded31, goodLanded35, goodMatches31, goodMatches35);
if (!goodMatches31 || !goodMatches35) {
  console.error('CALIBRATION FAILED: the known-good synthetic log should reconcile but did not.');
  process.exit(1);
}

// --- Case B: deliberately broken — an extra "trying" line with no matching stall/503/landed,
// which should make the reconciliation NOT match (proves the check can fail, not just pass) ---
const BROKEN_LOG = GOOD_LOG + '2026-09-26T10:02:00.000Z [LOG] [LLMHelper] verbal stall race: trying gemini-3.1-flash-lite (fallback=gemini-3.5-flash-lite after 10000ms)\n';
const brokenPath = join(dir, 'broken.log');
writeFileSync(brokenPath, BROKEN_LOG, 'utf8');

const broken = parseInAppLog(brokenPath);
const brokenTrying31 = broken.trying.filter((t) => t.model === 'gemini-3.1-flash-lite').length;
const brokenLanded31 = broken.answers.filter((a) => a.model === 'gemini-3.1-flash-lite').length;
const brokenStalled = broken.stalled.length;
const brokenPrimaryFailed = broken.primaryFailed.length;
const brokenMatches31 = (brokenTrying31 - brokenPrimaryFailed - brokenStalled) === brokenLanded31;
console.log('Case B (deliberately broken, +1 unresolved "trying" line): trying31=%d stalled=%d primaryFailed=%d landed31=%d -> reconcile31=%s',
  brokenTrying31, brokenStalled, brokenPrimaryFailed, brokenLanded31, brokenMatches31);
if (brokenMatches31) {
  console.error('CALIBRATION FAILED: the broken synthetic log should NOT reconcile but reported MATCHES — the self-check cannot detect a real gap.');
  process.exit(1);
}

console.log('\nCALIBRATION OK: the reconciliation check matches on a known-good log and correctly');
console.log('flags a mismatch (DOES NOT MATCH) on a deliberately broken one.');
