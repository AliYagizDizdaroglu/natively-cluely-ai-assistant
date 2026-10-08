// Throwaway: applies the LIVE-ONLY spike edits to main.ts, IntelligenceManager.ts
// and GeminiLiveRouter.ts. Every anchor must match exactly once or nothing is written.
// The files are CRLF: normalized to LF in memory, written back as CRLF.
import fs from 'node:fs';

const ROOT = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/';
const CRLF = /\r\n/g;
const LF = /\n/g;
const edits = [];
const file = (rel) => ({ rel, src: fs.readFileSync(ROOT + rel, 'utf8').replace(CRLF, '\n') });

function replaceOnce(f, anchor, replacement, label) {
  const n = f.src.split(anchor).length - 1;
  if (n !== 1) throw new Error(`${f.rel}: anchor for "${label}" matched ${n} times`);
  f.src = f.src.replace(anchor, () => replacement);
  edits.push(`${f.rel}: ${label}`);
}

// ─── main.ts ────────────────────────────────────────────────────────────────
const main = file('main.ts');

replaceOnce(main,
  "import { createLiveHold } from './services/liveHold'",
  "import { createLiveHold } from './services/liveHold'\nimport { createCaptionSegmenter } from './services/liveCaptionSegmenter'",
  'import segmenter');

replaceOnce(main,
  'let _logFile: string | null = null;',
  `// LIVE-ONLY spike (throwaway, dev-only): NATIVELY_LIVE_ONLY=1 turns the
// interviewer STT off and makes the Live router's input transcription the
// interviewer transcript (createSTTProvider / startLiveRouter). Never in a
// packaged build.
const LIVE_ONLY_SPIKE = !app.isPackaged && process.env.NATIVELY_LIVE_ONLY === '1';

let _logFile: string | null = null;`,
  'LIVE_ONLY_SPIKE const');

replaceOnce(main,
  '  private liveRouter: GeminiLiveRouter | null = null;',
  '  private liveRouter: GeminiLiveRouter | null = null;\n  private liveCaptionTimer: NodeJS.Timeout | null = null;',
  'caption timer field');

replaceOnce(main,
  "    // 'none' means the user has explicitly disabled STT (no provider selected).",
  `    // LIVE-ONLY spike: the interviewer channel is heard by the Live router
    // alone; its captions become the transcript (see startLiveRouter).
    if (speaker === 'interviewer' && LIVE_ONLY_SPIKE) {
      console.log(\`[Main] LIVE-ONLY spike: interviewer STT disabled (NATIVELY_LIVE_ONLY=1) — captions come from the Live router\`);
      return null;
    }

    // 'none' means the user has explicitly disabled STT (no provider selected).`,
  'interviewer STT off');

// Extract the transcript handler body into a shared method so Live captions
// take exactly the same path as STT segments.
{
  const head = "    // Wire Transcript Events\n    stt.on('transcript', (segment: { text: string, isFinal: boolean, confidence: number, speechEndedAt?: number }) => {\n";
  const start = main.src.indexOf(head);
  if (start < 0) throw new Error('main.ts: transcript handler head not found');
  if (main.src.indexOf(head, start + 1) >= 0) throw new Error('main.ts: transcript handler head not unique');
  const bodyStart = start + head.length;
  const closer = '\n    });\n';
  const end = main.src.indexOf(closer, bodyStart);
  if (end < 0) throw new Error('main.ts: transcript handler closer not found');
  const body = main.src.slice(bodyStart, end);
  if (!body.includes('this.intelligenceManager.handleTranscript({') || !body.includes('this.liveHold.onInterviewerFinal();')) {
    throw new Error('main.ts: transcript handler body does not look right');
  }
  const after = main.src.slice(end + closer.length);
  // The handler is followed by more of createSTTProvider (failure counter, return stt).
  if (!/^\n    \S/.test(after)) throw new Error('main.ts: unexpected text after the handler: ' + JSON.stringify(after.slice(0, 40)));
  console.log('after handler: ' + JSON.stringify(after.slice(0, 60)));
  const oneLiner = "    // Wire Transcript Events\n    stt.on('transcript', (segment: { text: string, isFinal: boolean, confidence: number, speechEndedAt?: number }) => this.ingestTranscript(speaker, segment));\n";
  const method = `  /**
   * Shared intake for interviewer/user transcript segments: STT 'transcript'
   * events and, in the LIVE-ONLY spike, the Live router's captions.
   */
  private ingestTranscript(speaker: 'interviewer' | 'user', segment: { text: string, isFinal: boolean, confidence: number, speechEndedAt?: number }): void {
${body.replace(/^      /gm, '    ')}
  }

`;
  main.src = main.src.slice(0, start) + oneLiner + main.src.slice(end + closer.length);
  const anchor = "  private createSTTProvider(speaker: 'interviewer' | 'user'): STTProvider | null {";
  if (main.src.split(anchor).length !== 2) throw new Error('main.ts: createSTTProvider anchor not unique');
  main.src = main.src.replace(anchor, () => method + anchor);
  edits.push('main.ts: ingestTranscript extracted');
}

replaceOnce(main,
  '    this.liveRouter = router;\n    void router.start();',
  `    if (LIVE_ONLY_SPIKE) {
      // LIVE-ONLY spike: the router's input transcription IS the interviewer
      // transcript. Fragments are joined and cut into finals by silence; both
      // interims and finals take the same intake as STT segments.
      const seg = createCaptionSegmenter({ silenceMs: 700 });
      router.on('caption', (c: { text: string }) => {
        if (!this.isMeetingActive) return;
        console.log(\`[LiveCaption] fragment \${JSON.stringify(c.text)}\`);
        const interim = seg.push(c.text, Date.now());
        if (interim) this.ingestTranscript('interviewer', { text: interim, isFinal: false, confidence: 1 });
      });
      this.liveCaptionTimer = setInterval(() => {
        const fin = seg.tick(Date.now());
        if (!fin) return;
        console.log(\`[LiveCaption] final: \${JSON.stringify(fin)}\`);
        if (this.isMeetingActive) this.ingestTranscript('interviewer', { text: fin, isFinal: true, confidence: 1 });
      }, 100);
      this.liveCaptionTimer.unref?.();
      console.log('[Main] LIVE-ONLY spike: Live captions wired as the interviewer transcript');
    }
    this.liveRouter = router;
    void router.start();`,
  'caption wiring');

replaceOnce(main,
  '  private stopLiveRouter(): void {\n    if (!this.liveRouter) return;',
  '  private stopLiveRouter(): void {\n    if (this.liveCaptionTimer) { clearInterval(this.liveCaptionTimer); this.liveCaptionTimer = null; }\n    if (!this.liveRouter) return;',
  'stop clears caption timer');

// ─── IntelligenceManager.ts ─────────────────────────────────────────────────
const im = file('IntelligenceManager.ts');
replaceOnce(im,
  "        this.engine.on('transcript-segment-final', segment => {\n            this.questionDetector.onTranscriptFinal(segment);\n        });",
  `        this.engine.on('transcript-segment-final', segment => {
            // LIVE-ONLY spike (NATIVELY_LIVE_ONLY=1, dev-only): the transcript is
            // Live's own captions and the Live router is the only detector — the
            // Groq-backed QuestionDetector must not run on them.
            if (process.env.NATIVELY_LIVE_ONLY === '1' && !require('electron').app.isPackaged) return;
            this.questionDetector.onTranscriptFinal(segment);
        });
        if (process.env.NATIVELY_LIVE_ONLY === '1' && !require('electron').app.isPackaged) {
            console.log('[IntelligenceManager] LIVE-ONLY spike: QuestionDetector is not fed (NATIVELY_LIVE_ONLY=1)');
        }`,
  'detector not fed in live-only');

// ─── GeminiLiveRouter.ts (observability only) ───────────────────────────────
const lr = file('audio/GeminiLiveRouter.ts');
replaceOnce(lr,
  '  private reconnectTimer: NodeJS.Timeout | null = null;',
  '  private reconnectTimer: NodeJS.Timeout | null = null;\n  /** LIVE-ONLY spike observability: throttle for usageMetadata log lines. */\n  private lastUsageLogAt = 0;',
  'usage throttle field');
replaceOnce(lr,
  `    if (update?.resumable && update?.newHandle) {
      this.resumptionHandle = update.newHandle;
    }`,
  `    if (update?.resumable && update?.newHandle) {
      this.resumptionHandle = update.newHandle;
    }
    // LIVE-ONLY spike observability (never the handle value itself).
    if (update) {
      console.log(\`[LiveRouter] sessionResumptionUpdate resumable=\${!!update.resumable} handle=\${update.newHandle ? 'new' : 'none'}\`);
    }
    const usage = msg?.usageMetadata;
    if (usage && Date.now() - this.lastUsageLogAt >= 30_000) {
      this.lastUsageLogAt = Date.now();
      console.log(\`[LiveRouter] usage prompt=\${usage.promptTokenCount ?? '?'} response=\${usage.responseTokenCount ?? '?'} total=\${usage.totalTokenCount ?? '?'}\`);
    }`,
  'resumption + usage logs');
replaceOnce(lr,
  '    if (msg?.goAway) {\n      const session = this.session;',
  "    if (msg?.goAway) {\n      console.log(`[LiveRouter] goAway timeLeft=${msg.goAway.timeLeft ?? '?'}`);\n      const session = this.session;",
  'goAway timeLeft log');
replaceOnce(lr,
  "    const reason = e?.reason ? String(e.reason) : 'connection closed';",
  "    const reason = e?.reason ? String(e.reason) : 'connection closed';\n    console.log(`[LiveRouter] ws closed code=${e?.code ?? '?'} reason=${JSON.stringify(reason)}`);",
  'close code log');

for (const f of [main, im, lr]) fs.writeFileSync(ROOT + f.rel, f.src.replace(LF, '\r\n'));
console.log('applied:\n  ' + edits.join('\n  '));
