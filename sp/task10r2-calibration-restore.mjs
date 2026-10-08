import fs from 'node:fs';

const path = "C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-cluely-ai-assistant\\electron\\test\\golden\\interview60.flight.mjs";
let text = fs.readFileSync(path, 'utf8');

const good = `export const FOCUSED_MODELS = ['gemini-3.8-flash', 'gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-3.5-flash'];`;
const broken = `export const FOCUSED_MODELS = ['gemini-3.8-flash', 'gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-3.5-flash', 'qwen/qwen3.8-27b'];`;

if (!text.includes(broken)) { console.error('BROKEN LINE NOT FOUND -- nothing to restore?'); process.exit(1); }
text = text.replace(broken, good);
fs.writeFileSync(path, text, 'utf8');
console.log('RESTORED: FOCUSED_MODELS back to the four Flash models only');
