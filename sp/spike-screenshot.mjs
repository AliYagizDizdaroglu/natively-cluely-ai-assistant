// THROWAWAY SPIKE: can the app's vision path read a REAL shared coding editor?
//
// The user will press the screenshot key on a CoderPad-style screen. Everything the
// project has measured about vision used the golden suite's clean SVG problem cards —
// a different image entirely. This renders realistic editor screens at real display
// sizes and runs the app's OWN prompts (IMAGE_ANALYSIS_PROMPT + extractProblemFromImages)
// against the model the live provider chain actually selects: Gemini 3.1-flash-lite,
// because the OpenAI and Claude keys in .env are placeholders and those tiers are skipped.
//
// CALIBRATION: the decoy renders a DIFFERENT problem AND different code. The check is
// keyed on the problem NAME, because generic words ("interval") appear in both arms —
// the first version used generic words, could not separate the arms, and refused itself.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire('C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/package.json');
const { chromium } = require('playwright');
import { editorHtml, EXPECT, DECOY_EXPECT } from './editor-page.mjs';

const SCRATCH = path.dirname(new URL(import.meta.url).pathname.replace(/^\//, ''));
const SHOTS = path.join(SCRATCH, 'editor-shots');
fs.mkdirSync(SHOTS, { recursive: true });

const KEY = fs.readFileSync('C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/.env', 'utf8')
    .match(/^GEMINI_API_KEY=(.+)$/m)[1].trim();
const MODEL = process.env.SPIKE_MODEL || 'gemini-3.1-flash-lite';

// Verbatim from electron/LLMHelper.ts (IMAGE_ANALYSIS_PROMPT, extractProblemFromImages).
const SYSTEM = 'Analyze concisely. Be direct. No markdown formatting. Return plain text only.';
const USER = `You are a wingman. Please analyze these images and extract the following information in JSON format:\n{
  "problem_statement": "A clear statement of the problem or situation depicted in the images.",
  "context": "Relevant background or context from the images.",
  "suggested_responses": ["First possible answer or action", "Second possible answer or action", "..."],
  "reasoning": "Explanation of why these suggestions are appropriate."
}\nImportant: Return ONLY the JSON object, without any markdown formatting or code blocks.`;

const VARIANTS = [
    { name: 'A-dark-1080p', vp: { width: 1920, height: 1080 }, opts: { theme: 'dark', fontPx: 15 } },
    { name: 'B-dark-1440-small', vp: { width: 2560, height: 1440 }, opts: { theme: 'dark', fontPx: 12 } },
    { name: 'C-light-1080p', vp: { width: 1920, height: 1080 }, opts: { theme: 'light', fontPx: 15 } },
    { name: 'D-scrolled-notitle', vp: { width: 1920, height: 1080 }, opts: { theme: 'dark', fontPx: 15, scrolled: true } },
    { name: 'E-testpane', vp: { width: 1920, height: 1080 }, opts: { theme: 'dark', fontPx: 14, testPane: true } },
    { name: 'F-empty-editor', vp: { width: 1920, height: 1080 }, opts: { theme: 'dark', fontPx: 15, empty: true } },
    { name: 'Z-decoy', vp: { width: 1920, height: 1080 }, opts: { theme: 'dark', fontPx: 15, decoy: true } },
];

const browser = await chromium.launch({ channel: 'chrome' });  // installed Chrome — no 130MB download
for (const v of VARIANTS) {
    const page = await browser.newPage({ viewport: v.vp, deviceScaleFactor: 1 });
    await page.setContent(editorHtml(v.opts));
    v.file = path.join(SHOTS, `${v.name}.png`);
    await page.screenshot({ path: v.file });
    await page.close();
}
await browser.close();
console.log(`model: ${MODEL}\nrendered ${VARIANTS.length} editor screenshots\n`);

async function ask(file) {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': KEY },
        body: JSON.stringify({
            contents: [{
                role: 'user',
                parts: [
                    { text: `${SYSTEM}\n\n${USER}` },
                    { inlineData: { mimeType: 'image/png', data: fs.readFileSync(file).toString('base64') } },
                ],
            }],
            generationConfig: { maxOutputTokens: 1200, temperature: 0.4 },
        }),
    });
    const j = await r.json();
    if (!r.ok) return { err: JSON.stringify(j).slice(0, 160) };
    return { text: j.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ?? '', finish: j.candidates?.[0]?.finishReason };
}

console.log('variant             names it  misnames  read the code pane  valid JSON');
const rows = [];
for (const v of VARIANTS) {
    const { text, err } = await ask(v.file);
    if (err) { console.log(`${v.name.padEnd(19)} API ERROR ${err}`); continue; }
    const want = v.opts.decoy ? DECOY_EXPECT : EXPECT;
    const named = want.name.test(text);
    const misnamed = want.notName.test(text);
    // Did it read the EDITOR pane too, not just the problem statement? That half-typed
    // solution is the thing a candidate most needs commented on.
    const sawCode = /sort|sweep|stack|lambda|class|method|function|append/i.test(text);
    let json = true; try { JSON.parse(text.replace(/^```json/, '').replace(/```$/, '').trim()); } catch { json = false; }
    rows.push({ v, text, named, misnamed, sawCode, json });
    console.log(`${v.name.padEnd(19)} ${(named ? 'YES' : 'no ').padEnd(9)} ${(misnamed ? 'YES' : 'no ').padEnd(9)} ${(sawCode ? 'yes' : 'NO ').padEnd(19)} ${json ? 'yes' : 'NO'}`);
}

const decoy = rows.find((r) => r.v.opts.decoy);
const real = rows.filter((r) => !r.v.opts.decoy);
console.log('\nCALIBRATION');
console.log(`  decoy names its own problem (Valid Parentheses): ${decoy?.named}`);
console.log(`  decoy misnames it as Merge Intervals:            ${decoy?.misnamed}`);
const ok = decoy && decoy.named && !decoy.misnamed;
console.log(`  => the check ${ok ? 'DISCRIMINATES' : 'DOES NOT discriminate — nothing above is evidence'}`);
if (ok) console.log(`\nRESULT  ${real.filter((r) => r.named && !r.misnamed).length}/${real.length} realistic editor screens read correctly, ${real.filter((r) => r.sawCode).length}/${real.length} also read the code pane, ${real.filter((r) => r.json).length}/${real.length} returned parseable JSON`);

fs.writeFileSync(path.join(SCRATCH, 'spike-screenshot-out.json'), JSON.stringify(rows.map((r) => ({ name: r.v.name, named: r.named, misnamed: r.misnamed, sawCode: r.sawCode, json: r.json, text: r.text })), null, 1));
