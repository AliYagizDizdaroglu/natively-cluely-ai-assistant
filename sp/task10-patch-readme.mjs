import fs from 'node:fs';

const path = "C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-cluely-ai-assistant\\electron\\test\\golden\\README.md";
let text = fs.readFileSync(path, 'utf8');
const hadCRLF = text.includes('\r\n');
text = text.replace(/\r\n/g, '\n');

const oldParen = "(3.1 Flash Lite, 3.5 Flash Lite, Gemma 4 31B, plus `qwen/qwen3.8-27b` and `openai/gpt-oss-120b` on Groq: an id with a `/` needs a real `GROQ_API_KEY` in `.env`, the placeholder exits 3)";
const newParen = "(3.1 Flash Lite and 3.5 Flash Lite \u2014 an id with a `/` runs on Groq and needs a real `GROQ_API_KEY` in `.env`, the placeholder exits 3; answers.mjs still supports a Groq id for a manual pass, though the flight itself no longer schedules one)";

const count = text.split(oldParen).length - 1;
if (count !== 1) { console.error(`OLD PARENTHETICAL found ${count} times, expected 1`); process.exit(1); }
text = text.replace(oldParen, newParen);

fs.writeFileSync(path, text, 'utf8');
console.log('OK hadCRLF=' + hadCRLF + ' newLength=' + text.length);
