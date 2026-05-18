import { IEmbeddingProvider } from './IEmbeddingProvider';

export class OllamaEmbeddingProvider implements IEmbeddingProvider {
  readonly name = 'ollama';
  readonly dimensions = 768; // nomic-embed-text outputs 768

  constructor(
    private baseUrl = 'http://localhost:11434',
    private model = 'nomic-embed-text'
  ) {}

  async isAvailable(): Promise<boolean> {
    try {
      // Check if Ollama is running AND the model is pulled
      const res = await fetch(`${this.baseUrl}/api/tags`);
      if (!res.ok) return false;
      const data = await res.json();
      return data.models?.some((m: any) => m.name.startsWith(this.model)) ?? false;
    } catch { return false; }
  }

  async embed(text: string): Promise<number[]> {
    // nomic-embed-text is asymmetric — documents get a prefix
    const prefixed = `search_document: ${text}`;
    // Phase 1 latency instrumentation: short id lets us pair start/done lines
    // and correlate with [OllamaDetectionClient] detect issued wall-clock
    // to prove Ollama-daemon contention.
    const id = Date.now().toString(36).slice(-4);
    const t0 = Date.now();
    console.log(`[OllamaEmbed-timing] embed start id=${id} kind=document textLen=${text.length} wall=${t0}`);
    const res = await fetch(`${this.baseUrl}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: this.model, prompt: prefixed })
    });
    if (!res.ok) {
      console.warn(`[OllamaEmbed-timing] embed FAILED id=${id} +${Date.now() - t0}ms status=${res.status}`);
      throw new Error(`Ollama embedding failed: ${res.statusText}`);
    }
    const data = await res.json();
    console.log(`[OllamaEmbed-timing] embed done id=${id} +${Date.now() - t0}ms dims=${data.embedding?.length ?? 0}`);
    return data.embedding;
  }

  async embedQuery(text: string): Promise<number[]> {
    // nomic-embed-text is asymmetric — queries get a different prefix
    const prefixed = `search_query: ${text}`;
    const id = Date.now().toString(36).slice(-4);
    const t0 = Date.now();
    console.log(`[OllamaEmbed-timing] embed start id=${id} kind=query textLen=${text.length} wall=${t0}`);
    const res = await fetch(`${this.baseUrl}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: this.model, prompt: prefixed })
    });
    if (!res.ok) {
      console.warn(`[OllamaEmbed-timing] embed FAILED id=${id} +${Date.now() - t0}ms status=${res.status}`);
      throw new Error(`Ollama query embedding failed: ${res.statusText}`);
    }
    const data = await res.json();
    console.log(`[OllamaEmbed-timing] embed done id=${id} +${Date.now() - t0}ms dims=${data.embedding?.length ?? 0}`);
    return data.embedding;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map(t => this.embed(t)));
  }
}
