// THROWAWAY: two edits in main.ts (CRLF-aware).
//  1. reconcile window sized to the Live claim instead of a fixed 15s
//  2. the extend branch answers through answerDetection, so it captures the screen too
import fs from 'node:fs';

const p = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/main.ts';
let s = fs.readFileSync(p, 'utf8');
const eol = s.includes('\r\n') ? '\r\n' : '\n';
const L = (...lines) => lines.join(eol);
const sub = (a, b) => {
    if (!s.includes(a)) throw new Error('anchor missing: ' + a.slice(0, 80));
    s = s.split(a).join(b);
};

sub(
    "import { reconcileLiveQuestion } from './services/questionReconcile'",
    "import { reconcileLiveQuestion, reconcileWindowMs } from './services/questionReconcile'",
);

sub(
    'const r = reconcileLiveQuestion(question, this.intelligenceManager.getRecentInterviewerSpeech(15_000));',
    'const r = reconcileLiveQuestion(question, this.intelligenceManager.getRecentInterviewerSpeech(reconcileWindowMs(question)));',
);

sub(
    L('        void this.intelligenceManager',
      '          .runWhatShouldISay(d.question, 1.0, undefined, { intentOverride: d.intent, bypassCooldown: true, extendOf: verdict.duplicateOfQuestion })',
      "          .catch((err: any) => console.error('[Main] extend-answer failed:', err?.message ?? err));"),
    L('        void this.answerDetection(d, verdict.duplicateOfQuestion)',
      "          .catch((err: any) => console.error('[Main] extend-answer failed:', err?.message ?? err));"),
);

sub(
    L('   * failed capture answers from the transcript as before, and says so in the log.',
      '   */',
      '  private async answerDetection(d: DetectionInput): Promise<void> {'),
    L('   * failed capture answers from the transcript as before, and says so in the log.',
      '   *',
      "   * Both hands-free paths come through here: decideDispatch's 'answer' and the extend",
      '   * branch. The extend branch used to call runWhatShouldISay directly and so never',
      '   * captured — after9 (2026-09-08) lost cue C03 that way: its full text arrived as an',
      '   * extend and was answered blind, about drift and retraining instead of the ring buffer',
      '   * on screen. extendOf is the answered text this one adds to; absent on the plain path.',
      '   */',
      '  private async answerDetection(d: DetectionInput, extendOf?: string): Promise<void> {'),
);

sub(
    L("    // Only decideDispatch's 'answer' (Live auto) reaches here.",
      '    if (mentionsScreen(d.question)) {'),
    '    if (mentionsScreen(d.question)) {',
);

sub(
    '    await this.intelligenceManager.runWhatShouldISay(d.question, 1.0, imagePaths, { intentOverride: intent, bypassCooldown: true });',
    '    await this.intelligenceManager.runWhatShouldISay(d.question, 1.0, imagePaths, { intentOverride: intent, bypassCooldown: true, ...(extendOf === undefined ? {} : { extendOf }) });',
);

fs.writeFileSync(p, s);
console.log('main.ts patched');
