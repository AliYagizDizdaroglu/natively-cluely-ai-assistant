// Throwaway: revert the LIVE-ONLY spike from the working tree while keeping the
// two committed fixes (reconcile guard f8b0348, quota backoff b94382f).
//  - main.ts, IntelligenceManager.ts ← pre-spike copies (byte-exact)
//  - GeminiLiveRouter.ts ← remove only the observability hunks (backoff stays)
//  - delete liveCaptionSegmenter.ts (+ test)
import fs from 'node:fs';

const ROOT = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/';
const PRE = process.argv[2];
if (!PRE) throw new Error('usage: revert-live-only-spike.mjs <pre-spike dir>');

for (const f of ['main.ts', 'IntelligenceManager.ts']) {
  fs.copyFileSync(`${PRE}/${f}`, ROOT + f);
  console.log(`restored ${f}`);
}

const p = ROOT + 'audio/GeminiLiveRouter.ts';
let s = fs.readFileSync(p, 'utf8');
const nl = /\r\n/.test(s) ? '\r\n' : '\n';
const cut = (a, label) => {
  const A = a.replace(/\n/g, nl);
  const n = s.split(A).length - 1;
  if (n !== 1) throw new Error(`"${label}" matched ${n} times`);
  s = s.replace(A, '');
  console.log(`removed ${label}`);
};
cut(`  /** LIVE-ONLY spike observability: throttle for usageMetadata log lines. */
  private lastUsageLogAt = 0;
`, 'usage throttle field');
cut(`    // LIVE-ONLY spike observability (never the handle value itself).
    if (update) {
      console.log(\`[LiveRouter] sessionResumptionUpdate resumable=\${!!update.resumable} handle=\${update.newHandle ? 'new' : 'none'}\`);
    }
    const usage = msg?.usageMetadata;
    if (usage && Date.now() - this.lastUsageLogAt >= 30_000) {
      this.lastUsageLogAt = Date.now();
      console.log(\`[LiveRouter] usage \${JSON.stringify(usage).slice(0, 300)}\`);
    }
`, 'resumption + usage logs');
cut(`      console.log(\`[LiveRouter] goAway timeLeft=\${msg.goAway.timeLeft ?? '?'}\`);
`, 'goAway log');
cut(`    console.log(\`[LiveRouter] ws closed code=\${e?.code ?? '?'} reason=\${JSON.stringify(reason)}\`);
`, 'close code log');
cut(`    // LIVE-ONLY spike observability: what does the model do per turn?
    const sc = msg?.serverContent;
    if (sc) {
      const parts: any[] = sc.modelTurn?.parts ?? [];
      const summary = parts.map((p: any) => p.text ? \`text(\${String(p.text).slice(0, 80)})\` : p.inlineData ? \`audio(\${p.inlineData.data?.length ?? 0}b64)\` : p.functionCall ? 'functionCall' : Object.keys(p).join('+')).join(',');
      if (parts.length || sc.turnComplete || sc.interrupted || sc.generationComplete) {
        console.log(\`[LiveRouter] serverContent parts=[\${summary}] turnComplete=\${!!sc.turnComplete} interrupted=\${!!sc.interrupted} generationComplete=\${!!sc.generationComplete}\`);
      }
    }
    if (msg?.toolCall) console.log(\`[LiveRouter] toolCall names=\${(msg.toolCall.functionCalls ?? []).map((f: any) => f?.name).join(',')}\`);
`, 'turn logging');
if (/LIVE-ONLY/.test(s)) throw new Error('router still mentions LIVE-ONLY');
fs.writeFileSync(p, s);

for (const f of ['services/liveCaptionSegmenter.ts', 'services/liveCaptionSegmenter.test.ts']) {
  if (fs.existsSync(ROOT + f)) { fs.unlinkSync(ROOT + f); console.log(`deleted ${f}`); }
}
console.log('revert done');
