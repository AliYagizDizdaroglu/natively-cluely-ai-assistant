import fs from 'node:fs';

const path = "C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-cluely-ai-assistant\\electron\\test\\golden\\interview60.flight.mjs";
let text = fs.readFileSync(path, 'utf8');

const good = `export const FOCUSED_MODELS = ['gemini-3.8-flash', 'gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-3.5-flash'];`;
const broken = `export const FOCUSED_MODELS = ['gemini-3.8-flash', 'gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-3.5-flash', 'qwen/qwen3.8-27b'];`;

if (!text.includes(good)) { console.error('GOOD LINE NOT FOUND -- already toggled?'); process.exit(1); }
text = text.replace(good, broken);
fs.writeFileSync(path, text, 'utf8');
console.log('BROKEN: qwen added to FOCUSED_MODELS');
