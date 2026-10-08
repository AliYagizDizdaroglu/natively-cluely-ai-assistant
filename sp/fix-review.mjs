// THROWAWAY: the code-review fixes.
//  C1 — a capture invalidates extendOf (screenReference.ts + main.ts)
//  I2 — the speech buffer is trimmed by age, not by a count sized for the old 15s window
import fs from 'node:fs';

const R = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/';
const edit = (rel, pairs) => {
    const p = R + rel;
    let s = fs.readFileSync(p, 'utf8');
    const eol = s.includes('\r\n') ? '\r\n' : '\n';
    for (const [from, to] of pairs) {
        const a = from.join(eol), b = to.join(eol);
        if (s.includes(b)) { continue; }
        if (!s.includes(a)) throw new Error(rel + ' — anchor missing: ' + a.slice(0, 70));
        s = s.split(a).join(b);
    }
    fs.writeFileSync(p, s);
    console.log('patched ' + rel);
};

// ── C1: the rule, next to the capture decision it belongs with ──────────────
edit('services/screenReference.ts', [[
    ['export function mentionsScreen(question: string): boolean {',
     '    return SCREEN.test(question);',
     '}'],
    ['export function mentionsScreen(question: string): boolean {',
     '    return SCREEN.test(question);',
     '}',
     '',
     '/**',
     ' * The extendOf an extend answer should build on, given whether THIS answer captured the',
     ' * screen. extensionShape tells the model it has already answered the first part, to add only',
     ' * the delta in under 30 words, and not to reintroduce that answer. That premise holds only',
     ' * while this answer knows nothing the earlier one did not — and a capture is exactly such',
     ' * knowledge: after9 C03\'s head ("Walk me through it and mention the time") carried no screen',
     ' * reference, so it was answered blind, about drift and retraining, for a circular-queue',
     ' * problem on screen. Building on it would anchor the first sighted answer to a wrong one and',
     ' * cap it at 30 words.',
     ' *',
     ' * Dropping extendOf costs length when the earlier answer DID see the screen (after8 measured',
     ' * 104-114 words without the extension shape against 27 with it). That is the right trade:',
     ' * across three graded flights no weak verdict was ever caused by length alone, and a blind',
     ' * answer to a question about the screen is wrong outright.',
     ' */',
     'export function extendOfAfterCapture(extendOf: string | undefined, captured: boolean): string | undefined {',
     '    return captured ? undefined : extendOf;',
     '}'],
]]);

edit('main.ts', [
    [['import { mentionsScreen } from "./services/screenReference"'],
     ['import { mentionsScreen, extendOfAfterCapture } from "./services/screenReference"']],
    [['    await this.intelligenceManager.runWhatShouldISay(d.question, 1.0, imagePaths, { intentOverride: intent, bypassCooldown: true, ...(extendOf === undefined ? {} : { extendOf }) });'],
     ['    // A capture is knowledge the earlier answer never had, so it is not a foundation to',
      '    // build on — see extendOfAfterCapture.',
      '    const buildOn = extendOfAfterCapture(extendOf, imagePaths !== undefined);',
      '    await this.intelligenceManager.runWhatShouldISay(d.question, 1.0, imagePaths, { intentOverride: intent, bypassCooldown: true, ...(buildOn === undefined ? {} : { extendOf: buildOn }) });']],
]);

// ── I2: age-based trimming, tied to the largest window the reconciler can ask for ──
edit('services/questionReconcile.ts', [
    [['const MIN_WINDOW_MS = 15_000;', 'const MAX_WINDOW_MS = 60_000;'],
     ['const MIN_WINDOW_MS = 15_000;', 'export const RECONCILE_MAX_WINDOW_MS = 60_000;']],
    [['    return Math.min(MAX_WINDOW_MS, Math.max(MIN_WINDOW_MS, Math.round(spoken + LAG_MS)));'],
     ['    return Math.min(RECONCILE_MAX_WINDOW_MS, Math.max(MIN_WINDOW_MS, Math.round(spoken + LAG_MS)));']],
]);

edit('IntelligenceManager.ts', [
    [["import { DETECTOR_CALIBRATION_CASES, judgeDetection } from './services/detectorCalibration';"],
     ["import { DETECTOR_CALIBRATION_CASES, judgeDetection } from './services/detectorCalibration';",
      "import { RECONCILE_MAX_WINDOW_MS } from './services/questionReconcile';"]],
    [['            this.recentInterviewerSpeech.push({ text: segment.text, at: segment.timestamp, final: segment.final });',
      '            if (this.recentInterviewerSpeech.length > 40) this.recentInterviewerSpeech.shift();'],
     ['            this.recentInterviewerSpeech.push({ text: segment.text, at: segment.timestamp, final: segment.final });',
      '            // Trimmed by AGE, not by a count. The old 40-entry cap was sized for the fixed 15s',
      '            // window; reconcileWindowMs now asks for up to RECONCILE_MAX_WINDOW_MS, and the',
      '            // busiest 60s of the 2026-09-08 hour held 53 lines. Past a count cap the buffer',
      '            // returns a TRUNCATED utterance, the joined-window score drops, and the reconciler',
      '            // silently falls back to replacing the question with a transcript tail — the exact',
      '            // failure it was just fixed for, with nothing to see. Age cannot truncate what the',
      '            // window is entitled to ask for.',
      '            const cutoff = segment.timestamp - RECONCILE_MAX_WINDOW_MS;',
      '            while (this.recentInterviewerSpeech.length && this.recentInterviewerSpeech[0].at < cutoff) this.recentInterviewerSpeech.shift();']],
]);
