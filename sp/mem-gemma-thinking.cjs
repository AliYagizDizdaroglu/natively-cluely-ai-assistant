// Throwaway: append the Gemma 4 thinking-probe findings to the thinking-flights memory and its index line.
const fs = require('fs');
const dir = 'C:/Users/sotka/.claude/projects/C--Users-sotka-OneDrive-Masa-st--natively-cluely-ai-assistant/memory/';
const f = dir + 'project_thinking_flights.md';
fs.appendFileSync(f, [
    '',
    '**Gemma 4 thinking probes (2026-09-17 00:30, captured app bytes S1Q02/S1Q06, REST v1alpha, n=1 per cell):**',
    'the API accepts thinkingLevel MINIMAL and HIGH only — LOW and MEDIUM return 400 "Thinking level is not',
    'supported for this model". No thinkingConfig = thinking ON (31B 626–721 thoughts, 26B 2.9k–3.4k). The APP',
    'pins Gemma to MINIMAL (LLMHelper gemmaConfig) and ignores NATIVELY_GEMINI_THINKING_LEVEL for Gemma; the',
    'OFFLINE Gemma arms (answers.mjs) send no config, i.e. they ran WITH thinking — which is why after9 saw',
    '"Gemma 31B collapsed (19 s TTFT)". Quality: every thinking answer (default/HIGH, both sizes) derived 57 %/30 %',
    'on S1Q02 and kept the support-call filter on S1Q06; at MINIMAL both sizes still get S1Q02 right (lite never',
    'does at MINIMAL) but S1Q06 breaks (31B answered "I\'d use", 2 words; 26B 149 words with a SQL fence and no',
    'event-type filter). TTFT free tier tonight: thinking 44–111 s, 31B MINIMAL 24–31 s, 26B MINIMAL 1.7–8 s →',
    'thinking Gemma is offline-only; 31B HIGH once returned thoughts with no text.',
    '',
].join('\n'));
const i = dir + 'MEMORY.md';
let s = fs.readFileSync(i, 'utf8');
const before = s;
s = s.replace('10 s budget under a thinking level)', '10 s budget under a thinking level); Gemma 4: API accepts only MINIMAL/HIGH (LOW/MEDIUM 400), default = thinking on, app pins MINIMAL, offline Gemma arms thought by default, thinking Gemma TTFT 44–111 s');
fs.writeFileSync(i, s);
console.log(before === s ? 'index line NOT changed' : 'index line updated');
