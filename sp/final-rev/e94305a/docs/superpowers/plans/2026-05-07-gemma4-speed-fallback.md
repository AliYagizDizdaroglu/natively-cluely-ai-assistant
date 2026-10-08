# Gemma 4 Speed & Fallback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Gemma 4 respond within 2–3 seconds by disabling thinking mode, adding a TTFT watchdog with Flash → Ollama fallback, pre-warming the local safety net, and showing which model answered.

**Architecture:** All changes stay in three files — `LLMHelper.ts` owns the streaming logic and fallback chain, `ipcHandlers.ts` intercepts a model-source sentinel and emits an IPC event, `GlobalChatOverlay.tsx` renders the attribution label. A special sentinel token (`__model_source:X__`) flows through the stream and is stripped in the IPC layer before reaching the UI.

**Tech Stack:** TypeScript, Electron IPC, Google GenAI SDK (`@google/genai`), Ollama HTTP API (`/api/generate`), React + Tailwind CSS, Framer Motion.

---

## File Map

| File | Changes |
|---|---|
| `electron/LLMHelper.ts` | Add `filterThinkingTokens`, `streamWithGemmaGuarded`, `warmUpSafetyNet`; modify `streamWithGeminiModel` config; modify `streamChat` Gemini routing; modify `setModel` |
| `electron/preload.ts` | Add `onGeminiStreamSource` exposure |
| `src/types/electron.d.ts` | Add `onGeminiStreamSource` type |
| `electron/ipcHandlers.ts` | Intercept `__model_source:X__` sentinel, emit `gemini-stream-source` |
| `src/components/GlobalChatOverlay.tsx` | Add `model?` to `Message`, listen for source event, render label |

---

## Task 1: Disable Thinking + Cap Token Budget for Gemma

**Files:**
- Modify: `electron/LLMHelper.ts:2737-2744`

- [ ] **Step 1: Replace the generation config block in `streamWithGeminiModel`**

Find this block (around line 2737):
```typescript
    const streamResult = await activeClient.models.generateContentStream({
      model: model,
      contents: contents,
      config: {
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        temperature: 0.4,
      }
    });
```

Replace with:
```typescript
    const isGemma = model.startsWith("gemma-");
    const streamResult = await activeClient.models.generateContentStream({
      model: model,
      contents: contents,
      config: {
        maxOutputTokens: isGemma ? 2048 : MAX_OUTPUT_TOKENS,
        temperature: 0.4,
        ...(isGemma ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
      }
    });
```

- [ ] **Step 2: Verify the app still compiles**

```bash
npx tsc --noEmit
```
Expected: no errors on `LLMHelper.ts`. If the GenAI SDK version doesn't have `thinkingConfig` in its types yet, add `// @ts-ignore` on the line above `thinkingConfig`.

- [ ] **Step 3: Commit**

```bash
git add electron/LLMHelper.ts
git commit -m "perf: disable Gemma 4 thinking mode and cap output to 2048 tokens"
```

---

## Task 2: Add Thinking Token Stream Filter

**Files:**
- Modify: `electron/LLMHelper.ts`

- [ ] **Step 1: Add `filterThinkingTokens` private method**

Insert this method directly above `streamWithGeminiModel` (before line 2716):

```typescript
  private async * filterThinkingTokens(
    source: AsyncGenerator<string, void, unknown>
  ): AsyncGenerator<string, void, unknown> {
    let carry = '';
    for await (const chunk of source) {
      const combined = carry + chunk;
      // Remove complete <think>...</think> and <thinking>...</thinking> blocks
      const stripped = combined.replace(/<think(?:ing)?>[\s\S]*?<\/think(?:ing)?>/gi, '');
      // Hold up to 20 chars at end in case a tag spans chunk boundary
      const tail = stripped.slice(-20);
      const partialTag = tail.match(/<\/?think/i);
      if (partialTag) {
        const safeEnd = stripped.length - 20 + partialTag.index!;
        carry = stripped.slice(safeEnd);
        const safe = stripped.slice(0, safeEnd);
        if (safe) yield safe;
      } else {
        carry = '';
        if (stripped) yield stripped;
      }
    }
    if (carry) {
      const final = carry.replace(/<think(?:ing)?>[\s\S]*?<\/think(?:ing)?>/gi, '');
      if (final) yield final;
    }
  }
```

- [ ] **Step 2: Wrap the Gemma stream with the filter in `streamWithGeminiModel`**

Find the final loop in `streamWithGeminiModel` (around line 2746):
```typescript
    // @ts-ignore
    const stream = streamResult.stream || streamResult;

    for await (const chunk of stream) {
      let chunkText = "";
      if (typeof chunk.text === 'function') {
        chunkText = chunk.text();
      } else if (typeof chunk.text === 'string') {
        chunkText = chunk.text;
      } else if (chunk.candidates?.[0]?.content?.parts?.[0]?.text) {
        chunkText = chunk.candidates[0].content.parts[0].text;
      }
      if (chunkText) {
        yield chunkText;
      }
    }
```

Replace with:
```typescript
    // @ts-ignore
    const stream = streamResult.stream || streamResult;

    async function * rawChunks() {
      for await (const chunk of stream) {
        let chunkText = "";
        if (typeof chunk.text === 'function') {
          chunkText = chunk.text();
        } else if (typeof chunk.text === 'string') {
          chunkText = chunk.text;
        } else if (chunk.candidates?.[0]?.content?.parts?.[0]?.text) {
          chunkText = chunk.candidates[0].content.parts[0].text;
        }
        if (chunkText) yield chunkText;
      }
    }

    const tokenSource = isGemma ? this.filterThinkingTokens(rawChunks()) : rawChunks();
    yield* tokenSource;
```

Note: `isGemma` is already defined earlier in the function from Task 1.

- [ ] **Step 3: Verify compilation**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add electron/LLMHelper.ts
git commit -m "perf: add thinking token stream filter for Gemma 4 safety net"
```

---

## Task 3: Add `streamWithGemmaGuarded` — TTFT Watchdog + Three-Tier Fallback

**Files:**
- Modify: `electron/LLMHelper.ts`

- [ ] **Step 1: Add `streamWithGemmaGuarded` private method**

Insert directly above `streamWithGeminiModel`:

```typescript
  private async * streamWithGemmaGuarded(
    fullMsg: string,
    gemmaModelId: string,
    imagePaths?: string[],
    ttftTimeoutMs = 8000
  ): AsyncGenerator<string, void, unknown> {
    // --- Tier 1: Gemma 4 with TTFT watchdog ---
    const gemmaGen = this.streamWithGeminiModel(fullMsg, gemmaModelId, imagePaths);

    let firstResult: IteratorResult<string, void> | undefined;
    const timedOut = await Promise.race<boolean>([
      gemmaGen.next().then(r => { firstResult = r; return false; }),
      new Promise<boolean>(resolve => setTimeout(() => resolve(true), ttftTimeoutMs)),
    ]);

    if (!timedOut && firstResult) {
      yield `__model_source:Gemma 4__`;
      if (firstResult.value) yield firstResult.value;
      if (!firstResult.done) yield* gemmaGen;
      return;
    }

    // --- Tier 2: Gemini Flash ---
    console.warn(`[LLMHelper] ⏱ Gemma TTFT timeout after ${ttftTimeoutMs}ms, falling back to Gemini Flash`);
    try {
      let flashFirst = true;
      for await (const token of this.streamWithGeminiModel(fullMsg, GEMINI_FLASH_MODEL, imagePaths)) {
        if (flashFirst) { yield `__model_source:Gemini Flash__`; flashFirst = false; }
        yield token;
      }
      return;
    } catch (flashErr: any) {
      console.warn('[LLMHelper] Flash fallback failed:', flashErr.message);
    }

    // --- Tier 3: Ollama llama3.1:8b (local safety net) ---
    console.warn('[LLMHelper] Falling back to Ollama llama3.1:8b');
    const savedModel = this.ollamaModel;
    this.ollamaModel = 'llama3.1:8b';
    try {
      let ollamaFirst = true;
      for await (const token of this.streamWithOllama(fullMsg)) {
        if (ollamaFirst) { yield `__model_source:Ollama llama3.1:8b__`; ollamaFirst = false; }
        yield token;
      }
    } finally {
      this.ollamaModel = savedModel;
    }
  }
```

- [ ] **Step 2: Verify compilation**

```bash
npx tsc --noEmit
```
Expected: no errors. `GEMINI_FLASH_MODEL` is already defined at the top of the file.

- [ ] **Step 3: Commit**

```bash
git add electron/LLMHelper.ts
git commit -m "perf: add TTFT watchdog with Gemini Flash and Ollama fallback chain"
```

---

## Task 4: Wire `streamWithGemmaGuarded` into `streamChat`

**Files:**
- Modify: `electron/LLMHelper.ts:2387-2400`

- [ ] **Step 1: Replace the direct Gemma call in `streamChat`**

Find this block (around line 2387):
```typescript
    // 4. Gemini Routing & Fallback
    if (this.client) {
      // Direct model use if specified
      if (this.isGeminiModel(this.currentModelId)) {
        const fullMsg = `${finalSystemPrompt}\n\n${userContent}`;
        yield* this.streamWithGeminiModel(fullMsg, this.currentModelId, imagePaths);
        return;
      }

      // Race strategy (default)
      const raceMsg = `${finalSystemPrompt}\n\n${userContent}`;
      yield* this.streamWithGeminiParallelRace(raceMsg, imagePaths);
      return;
    }
```

Replace with:
```typescript
    // 4. Gemini Routing & Fallback
    if (this.client) {
      const fullMsg = `${finalSystemPrompt}\n\n${userContent}`;

      // Gemma 4+ — use guarded path with TTFT watchdog + fallback chain
      if (this.currentModelId.startsWith('gemma-')) {
        yield* this.streamWithGemmaGuarded(fullMsg, this.currentModelId, imagePaths);
        return;
      }

      // Other Gemini models — direct or race
      if (this.isGeminiModel(this.currentModelId)) {
        yield* this.streamWithGeminiModel(fullMsg, this.currentModelId, imagePaths);
        return;
      }

      // Race strategy (default when no specific Gemini model selected)
      yield* this.streamWithGeminiParallelRace(fullMsg, imagePaths);
      return;
    }
```

- [ ] **Step 2: Verify compilation**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add electron/LLMHelper.ts
git commit -m "perf: route Gemma 4 through TTFT-guarded fallback chain in streamChat"
```

---

## Task 5: Add `warmUpSafetyNet` + Call on Startup and Model Switch

**Files:**
- Modify: `electron/LLMHelper.ts`

- [ ] **Step 1: Add `warmUpSafetyNet` private method**

Insert directly after `checkOllamaAvailable` (after line 353):

```typescript
  private warmUpSafetyNet(): void {
    (async () => {
      try {
        const available = await this.checkOllamaAvailable();
        if (!available) return;
        const models = await this.getOllamaModels();
        if (!models.includes('llama3.1:8b')) {
          console.warn('[LLMHelper] llama3.1:8b not found in Ollama — safety net unavailable');
          return;
        }
        await fetch(`${this.ollamaUrl}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: 'llama3.1:8b', prompt: 'hi', stream: false }),
        });
        console.log('[LLMHelper] ✅ Safety net (llama3.1:8b) warmed up');
      } catch (e: any) {
        console.warn('[LLMHelper] Safety net warm-up skipped:', e.message);
      }
    })();
  }
```

- [ ] **Step 2: Call `warmUpSafetyNet` at the end of `setModel` when switching to Gemma**

Find the end of the `setModel` method (around line 286):
```typescript
    console.log(`[LLMHelper] Switched to Cloud Model: ${targetModelId}`);
  }
```

Replace with:
```typescript
    console.log(`[LLMHelper] Switched to Cloud Model: ${targetModelId}`);
    if (targetModelId.startsWith('gemma-')) {
      this.warmUpSafetyNet();
    }
  }
```

- [ ] **Step 3: Call `warmUpSafetyNet` at end of `setApiKey` / constructor if current model is Gemma**

Find the `setApiKey` method (or constructor) where `this.currentModelId` is set. Look for where `this.client` (GoogleGenAI) is initialized. Add at the bottom of that initialization block:

```typescript
    if (this.currentModelId?.startsWith('gemma-')) {
      this.warmUpSafetyNet();
    }
```

To find the exact location, search for `setApiKey` in `LLMHelper.ts` and add the call after the Gemini client is initialized (after `this.client = new GoogleGenAI(...)`).

- [ ] **Step 4: Verify compilation**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add electron/LLMHelper.ts
git commit -m "perf: pre-warm Ollama llama3.1:8b safety net when Gemma 4 is selected"
```

---

## Task 6: Wire `gemini-stream-source` IPC Event

**Files:**
- Modify: `electron/preload.ts`
- Modify: `src/types/electron.d.ts`
- Modify: `electron/ipcHandlers.ts`

- [ ] **Step 1: Add `onGeminiStreamSource` to `preload.ts`**

Find the block with `onGeminiStreamError` in `preload.ts` (around line 890):
```typescript
  onGeminiStreamError: (callback: (error: string) => void) => {
    const subscription = (_event: any, error: string) => callback(error)
    ipcRenderer.on("gemini-stream-error", subscription)
    return () => ipcRenderer.removeListener("gemini-stream-error", subscription)
  },
```

Add directly after it:
```typescript
  onGeminiStreamSource: (callback: (model: string) => void) => {
    const subscription = (_event: any, model: string) => callback(model)
    ipcRenderer.on("gemini-stream-source", subscription)
    return () => ipcRenderer.removeListener("gemini-stream-source", subscription)
  },
```

Also add the type in the preload interface block (near line 206):
```typescript
  onGeminiStreamSource: (callback: (model: string) => void) => () => void
```

- [ ] **Step 2: Add type to `src/types/electron.d.ts`**

Find (around line 217):
```typescript
  onGeminiStreamError: (callback: (error: string) => void) => () => void;
```

Add directly after:
```typescript
  onGeminiStreamSource: (callback: (model: string) => void) => () => void;
```

- [ ] **Step 3: Intercept the sentinel in `ipcHandlers.ts`**

Find the streaming loop in the `gemini-chat-stream` handler (around line 493):
```typescript
        for await (const token of stream) {
          // Bail if a newer stream has taken over (user triggered a new request)
          if (_chatStreamId !== myStreamId) {
            console.log(`[IPC] gemini-chat-stream ${myStreamId} superseded by ${_chatStreamId}, stopping.`);
            return null;
          }
          event.sender.send("gemini-stream-token", token);
          try { PhoneMirrorService.getInstance().publishToken(String(myStreamId), token); } catch (_) { /* noop */ }
          fullResponse += token;
        }
```

Replace with:
```typescript
        for await (const token of stream) {
          // Bail if a newer stream has taken over
          if (_chatStreamId !== myStreamId) {
            console.log(`[IPC] gemini-chat-stream ${myStreamId} superseded by ${_chatStreamId}, stopping.`);
            return null;
          }
          // Intercept model source sentinel — emit attribution event, don't pass to UI
          if (token.startsWith('__model_source:') && token.endsWith('__')) {
            const label = token.slice('__model_source:'.length, -2);
            event.sender.send("gemini-stream-source", label);
            continue;
          }
          event.sender.send("gemini-stream-token", token);
          try { PhoneMirrorService.getInstance().publishToken(String(myStreamId), token); } catch (_) { /* noop */ }
          fullResponse += token;
        }
```

- [ ] **Step 4: Verify compilation**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add electron/preload.ts src/types/electron.d.ts electron/ipcHandlers.ts
git commit -m "feat: add gemini-stream-source IPC event for model attribution"
```

---

## Task 7: Add Model Attribution Label to Chat UI

**Files:**
- Modify: `src/components/GlobalChatOverlay.tsx`

- [ ] **Step 1: Add `model?` to the `Message` interface**

Find (line 11):
```typescript
interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    isStreaming?: boolean;
}
```

Replace with:
```typescript
interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    isStreaming?: boolean;
    model?: string;
}
```

- [ ] **Step 2: Update `AssistantMessage` to accept and render the `model` prop**

Find (line 65):
```typescript
const AssistantMessage: React.FC<{ content: string; isStreaming?: boolean }> = ({ content, isStreaming }) => {
```

Replace with:
```typescript
const AssistantMessage: React.FC<{ content: string; isStreaming?: boolean; model?: string }> = ({ content, isStreaming, model }) => {
```

Then find the copy button block (around line 95):
```typescript
            {!isStreaming && content && (
                <button
                    onClick={handleCopy}
                    className="flex items-center gap-2 mt-3 text-[13px] text-text-tertiary hover:text-text-secondary transition-colors"
                >
                    {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                    {copied ? 'Copied' : 'Copy message'}
                </button>
            )}
```

Replace with:
```typescript
            {!isStreaming && content && (
                <div className="flex items-center gap-4 mt-3">
                    <button
                        onClick={handleCopy}
                        className="flex items-center gap-2 text-[13px] text-text-tertiary hover:text-text-secondary transition-colors"
                    >
                        {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                        {copied ? 'Copied' : 'Copy message'}
                    </button>
                    {model && (
                        <span className="text-[11px] text-text-tertiary opacity-50">
                            answered by {model}
                        </span>
                    )}
                </div>
            )}
```

- [ ] **Step 3: Pass `model` prop when rendering `AssistantMessage`**

Find (around line 358):
```typescript
                                    : <AssistantMessage key={msg.id} content={msg.content} isStreaming={msg.isStreaming} />
```

Replace with:
```typescript
                                    : <AssistantMessage key={msg.id} content={msg.content} isStreaming={msg.isStreaming} model={msg.model} />
```

- [ ] **Step 4: Register `onGeminiStreamSource` listener in the submit handler**

Find the section where `onGeminiStreamToken` is registered (around line 253):
```typescript
                const oldTokenCleanup = window.electronAPI?.onGeminiStreamToken((token: string) => {
```

Add directly before that line:
```typescript
                const assistantMsgId = assistantMessageId;
                const oldSourceCleanup = window.electronAPI?.onGeminiStreamSource((modelLabel: string) => {
                    setMessages(prev => prev.map(msg =>
                        msg.id === assistantMsgId ? { ...msg, model: modelLabel } : msg
                    ));
                });
```

Then find where cleanups are called (look for `oldTokenCleanup?.()` or similar cleanup invocations) and add:
```typescript
                oldSourceCleanup?.();
```

- [ ] **Step 5: Verify compilation**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/GlobalChatOverlay.tsx
git commit -m "feat: show model attribution label under each chat response"
```

---

## Self-Review Against Spec

| Spec requirement | Covered by |
|---|---|
| `thinkingBudget: 0` for Gemma | Task 1 |
| `maxOutputTokens: 2048` for Gemma | Task 1 |
| Thinking token stream filter | Task 2 |
| TTFT watchdog (8s) | Task 3 |
| Flash fallback | Task 3 |
| Ollama llama3.1:8b last resort | Task 3 |
| `streamWithGemmaGuarded` wired into `streamChat` | Task 4 |
| `warmUpSafetyNet` fires on startup + model switch | Task 5 |
| `gemini-stream-source` IPC event | Task 6 |
| `model?` on `Message` + source listener | Task 7 |
| Attribution label renders after streaming | Task 7 |
| Non-Gemma paths unchanged | Tasks 1–5 only touch Gemma codepath |
