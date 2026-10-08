// Idle-aware warmth heartbeat: patch LLMHelper.ts (working-tree anchors) and append
// the test block to LLMHelper.reliability.test.ts. Every anchor must match exactly
// once (or, where noted, at least once) or nothing is written.
// usage: node apply-heartbeat.mjs <repo-root> <test-snippet-path>
import fs from 'node:fs';
import path from 'node:path';

const [root, snippetPath] = process.argv.slice(2);
const P = path.join(root, 'electron/LLMHelper.ts');
const T = path.join(root, 'electron/LLMHelper.reliability.test.ts');
let s = fs.readFileSync(P, 'utf8');
const nl = /\r\n/.test(s) ? '\r\n' : '\n';
const L = (x) => x.replace(/\n/g, nl);
const once = (a, b, label) => { const A = L(a); const n = s.split(A).length - 1; if (n !== 1) throw new Error(`${label}: matched ${n}`); s = s.replace(A, () => L(b)); console.log(`ok ${label}`); };
const all = (a, b, label, min = 1) => { const A = L(a); const n = s.split(A).length - 1; if (n < min) throw new Error(`${label}: matched ${n}`); s = s.split(A).join(L(b)); console.log(`ok ${label} ×${n}`); };

// 1. State + helpers next to the heartbeat timer.
once(`  private warmthHeartbeatTimer: NodeJS.Timeout | null = null;`,
`  private warmthHeartbeatTimer: NodeJS.Timeout | null = null;
  /**
   * Last API use per model id — answers and successful warmups. The heartbeat
   * pings only models that have sat idle for a whole interval: during an
   * interview the answers keep the slots warm, so pings cost no requests.
   * Measured 2026-09-03: the unconditional 60 s heartbeat spent 64 requests an
   * hour per model — the entire free-tier day (500/model) in eight hours.
   */
  private lastModelUseAt = new Map<string, number>();
  private noteModelUse(model: string): void {
    this.lastModelUseAt.set(model, Date.now());
  }
  /** True when \`model\` has not been used for at least \`withinMs\`. */
  public isModelIdle(model: string, withinMs: number): boolean {
    return Date.now() - (this.lastModelUseAt.get(model) ?? 0) >= withinMs;
  }`, 'idle state');

// 2. Every answer stream notes its model.
once(`  private async * streamWithGeminiModel(fullMessage: string, model: string, imagePaths?: string[], systemInstruction?: string): AsyncGenerator<string, void, unknown> {
`,
`  private async * streamWithGeminiModel(fullMessage: string, model: string, imagePaths?: string[], systemInstruction?: string): AsyncGenerator<string, void, unknown> {
    this.noteModelUse(model);
`, 'stream notes use');

// 3. Successful warmups count as use (flash loop, gemma text, gemma vision).
all("      console.log(`[LLMHelper] ${model} warmed up in ${Date.now() - t0}ms`);",
    "      this.noteModelUse(model);\n      console.log(`[LLMHelper] ${model} warmed up in ${Date.now() - t0}ms`);", 'warmups note use', 2);
once("      console.log(`[LLMHelper] ${model} vision warmed up in ${Date.now() - t0}ms`);",
     "      this.noteModelUse(model);\n      console.log(`[LLMHelper] ${model} vision warmed up in ${Date.now() - t0}ms`);", 'vision warmup notes use');

// 4. The heartbeat: 5 min, idle-aware per lane; the meeting-start ping stays unconditional.
once(`  public startWarmthHeartbeat(intervalMs = 60_000): void {
    this.stopWarmthHeartbeat();
    const ping = () => {
      // Three cheap 1-token pings: Gemma text (self-guards on selected model),
      // Gemma VISION (gemma-4-31b-it — the model the screenshot path forces), and
      // Flash (verbal fallback). warmupGemma is kept alongside the vision ping so
      // the model stays resident even if the tiny-image vision ping is ever rejected.
      void this.warmupGemma().catch(() => { /* non-fatal */ });
      void this.warmupGemmaVision().catch(() => { /* non-fatal */ });
      void this.warmupGeminiFlash().catch(() => { /* non-fatal */ });
    };
    ping(); // immediate — this IS the meeting-start warmup
`,
`  public startWarmthHeartbeat(intervalMs = 300_000): void {
    this.stopWarmthHeartbeat();
    const ping = (force = false) => {
      // Three cheap 1-token pings: Gemma text (self-guards on selected model),
      // Gemma VISION (gemma-4-31b-it — the model the screenshot path forces), and
      // Flash (verbal fallback). warmupGemma is kept alongside the vision ping so
      // the model stays resident even if the tiny-image vision ping is ever rejected.
      // Each lane pings only when idle for a whole interval — an answer that
      // just streamed through a model is a better warmup than a ping.
      const idle = (model: string | null | undefined) => force || !model || this.isModelIdle(model, intervalMs);
      // Gemma text: warmupGemma is a no-op unless a Gemma model is selected, so
      // idleness only matters when one is.
      const gemmaText = this.currentModelId?.startsWith('gemma-') ? this.currentModelId : null;
      if (!gemmaText || idle(gemmaText)) void this.warmupGemma().catch(() => { /* non-fatal */ });
      if (idle('gemma-4-31b-it')) void this.warmupGemmaVision().catch(() => { /* non-fatal */ });
      const flash = [GEMINI_FLASH_MODEL, GEMINI_FLASH_FALLBACK_MODEL].filter((m) => idle(m));
      if (flash.length) void this.warmupGeminiFlash(flash).catch(() => { /* non-fatal */ });
    };
    ping(true); // immediate — this IS the meeting-start warmup
`, 'heartbeat');

// 5. The flash warmup takes the list of models to ping (default: both), so the
//    heartbeat can skip the one an answer just used.
once(`  public async warmupGeminiFlash(): Promise<void> {
    if (!this.client) return;
`,
`  public async warmupGeminiFlash(models: string[] = [GEMINI_FLASH_MODEL, GEMINI_FLASH_FALLBACK_MODEL]): Promise<void> {
    if (!this.client) return;
`, 'flash warmup signature');
once(`    for (const model of [GEMINI_FLASH_MODEL, GEMINI_FLASH_FALLBACK_MODEL]) {
      const t0 = Date.now();
      console.log(\`[LLMHelper] Warming up \${model} (verbal cold-start prevention)...\`);`,
`    for (const model of models) {
      const t0 = Date.now();
      console.log(\`[LLMHelper] Warming up \${model} (verbal cold-start prevention)...\`);`, 'flash warmup loop');

fs.writeFileSync(P, s);

// Tests: append the idle-aware block.
let t = fs.readFileSync(T, 'utf8');
const tnl = /\r\n/.test(t) ? '\r\n' : '\n';
const block = fs.readFileSync(snippetPath, 'utf8').replace(/\r\n/g, '\n').replace(/\n/g, tnl);
fs.writeFileSync(T, t.replace(/\r?\n$/, '') + tnl + block);
console.log('tests appended');
