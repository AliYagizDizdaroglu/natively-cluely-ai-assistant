/**
 * Golden-set harness: screenshot rendering, sandboxed execution, model calls.
 *
 * Deliberately dependency-light. `sharp` is resolved out of the app's own
 * node_modules via createRequire so this can live anywhere in the tree.
 */
import { createRequire } from 'module';
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const PROJECT = path.resolve(HERE, '..', '..', '..');

const require = createRequire(path.join(PROJECT, 'package.json'));
const sharp = require('sharp');

export const prompts = () => require(path.join(PROJECT, 'dist-electron/electron/llm/prompts.js'));
export const verbalFilter = () => require(path.join(PROJECT, 'dist-electron/electron/llm/verbalStreamFilter.js'));

// ── screenshots ────────────────────────────────────────────────────────────
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Render one "screenshot" of a problem page. */
export async function renderShot(outDir, name, { title, lines, mono = false, width = 1100 }) {
  fs.mkdirSync(outDir, { recursive: true });
  const lh = 34, top = title ? 110 : 60;
  const h = Math.max(320, top + lines.length * lh + 50);
  const font = mono
    ? "Consolas, 'DejaVu Sans Mono', monospace"
    : "Segoe UI, DejaVu Sans, Arial, sans-serif";
  const body = lines.map((l, i) => {
    const bold = l.startsWith('**');
    const text = esc(bold ? l.replace(/\*\*/g, '') : l);
    return `<text x="60" y="${top + i * lh}" font-family="${font}" font-size="${mono ? 23 : 24}" font-weight="${bold ? 700 : 400}" fill="#16181d">${text}</text>`;
  }).join('\n');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${h}">
    <rect width="100%" height="100%" fill="#ffffff"/><rect width="100%" height="8" fill="#2f6feb"/>
    ${title ? `<text x="60" y="66" font-family="Segoe UI, DejaVu Sans, Arial, sans-serif" font-size="34" font-weight="700" fill="#0b0c0f">${esc(title)}</text>` : ''}
    ${body}</svg>`;
  const file = path.join(outDir, `${name}.png`);
  await sharp(Buffer.from(svg)).png().toFile(file);
  return file;
}

// ── python execution ───────────────────────────────────────────────────────
function pythonCmd() {
  for (const c of ['python', 'py', 'python3']) {
    try { execFileSync(c, ['-c', 'print(1)'], { stdio: 'pipe' }); return c; } catch { }
  }
  throw new Error('no python interpreter found — the golden set needs one to check correctness');
}
const PY = pythonCmd();

/** Run `code` + `tests` in a fresh interpreter. Returns { pass, err }. */
export function runPython(code, tests, label = 'x') {
  const tmp = path.join(HERE, '.tmp');
  fs.mkdirSync(tmp, { recursive: true });
  const f = path.join(tmp, `${label}_${Math.random().toString(36).slice(2, 8)}.py`);
  fs.writeFileSync(f, `${code}\n\n${tests}\nprint("__OK__")\n`, 'utf8');
  try {
    const out = execFileSync(PY, [f], { stdio: 'pipe', timeout: 30000 }).toString();
    return { pass: out.includes('__OK__'), err: null };
  } catch (e) {
    const err = (e.stderr?.toString() || e.message || '').trim().split('\n').slice(-3).join(' | ');
    return { pass: false, err };
  } finally {
    try { fs.unlinkSync(f); } catch { }
  }
}

/** Pull python out of ```fences```, or return raw text when there are none. */
export function extractPython(text) {
  if (!text) return '';
  const fences = [...text.matchAll(/```(?:python|py)?\s*\n([\s\S]*?)```/g)].map((m) => m[1]);
  return fences.length ? fences.join('\n\n') : text;
}

// ── model calls ────────────────────────────────────────────────────────────
const KEY = process.env.GEMINI_API_KEY;
const apiVersion = (model) => (model.startsWith('gemma') ? 'v1beta' : 'v1alpha');

/**
 * One Gemini turn. `contents` is the FULL conversation so far, so follow-up
 * turns ("now make it pythonic") have something to refer to.
 *
 * systemInstruction is sent for EVERY model including Gemma — LLMHelper does
 * the same (streamWithGeminiModel sets gemmaConfig.systemInstruction). Skipping
 * it for Gemma silently runs the whole suite with no system prompt.
 */
export async function callTurn({
  model, systemPrompt, contents,
  temperature = 0.3, maxOutputTokens = 4096, thinkingLevel,
}) {
  if (!KEY) throw new Error('GEMINI_API_KEY not set');
  const body = { contents, generationConfig: { temperature, maxOutputTokens } };
  if (thinkingLevel) body.generationConfig.thinkingConfig = { thinkingLevel };
  if (systemPrompt) body.systemInstruction = { parts: [{ text: systemPrompt }] };

  const url = `https://generativelanguage.googleapis.com/${apiVersion(model)}/models/${model}:generateContent`;
  let lastErr;
  const t0 = Date.now();
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': KEY },
        body: JSON.stringify(body),
      });
      if (res.status === 429 || res.status >= 500) {
        lastErr = `HTTP ${res.status}`;
        await sleep(8000 * (attempt + 1));
        continue;
      }
      const j = await res.json();
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${JSON.stringify(j).slice(0, 240)}`);
      const cand = j.candidates?.[0];
      const text = (cand?.content?.parts || []).map((p) => p.text || '').join('');
      return {
        text, ms: Date.now() - t0, finish: cand?.finishReason,
        contents: [...contents, { role: 'model', parts: [{ text }] }],
      };
    } catch (e) {
      lastErr = e.message;
      await sleep(4000 * (attempt + 1));
    }
  }
  // Transient infrastructure failure — the caller must NOT score this as a
  // model failure. Gemma free-tier 500s are common and mean nothing about quality.
  const err = new Error(`transient: ${lastErr}`);
  err.transient = true;
  throw err;
}

/** First user turn carrying screenshots, images before text (as LLMHelper does). */
export function userTurn(imagePaths, text) {
  const parts = (imagePaths || []).map((p) => ({
    inlineData: { mimeType: 'image/png', data: fs.readFileSync(p).toString('base64') },
  }));
  parts.push({ text });
  return { role: 'user', parts };
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const words = (s) => (s && s.trim() ? s.trim().split(/\s+/).length : 0);
