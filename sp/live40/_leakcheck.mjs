// scans live40 files for the API key and for question/answer text in events/console files; prints counts only
import fs from 'node:fs';
const MAIN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const SP = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/live40';
const key = fs.readFileSync(`${MAIN}/.env`, 'utf8').match(/^GEMINI_API_KEY=(.+)$/m)?.[1].trim().replace(/^["']|["']$/g, '');
const files = []; const walk = (d) => { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = `${d}/${f.name}`; if (f.isDirectory()) { if (f.name !== 'clips') walk(p); } else if (/\.(json|txt|md|mjs)$/.test(f.name)) files.push(p); } };
walk(SP);
let keyHits = 0; for (const f of files) if (fs.readFileSync(f, 'utf8').includes(key)) { keyHits++; console.log('KEY IN', f.replace(SP, '')); }
console.log('files scanned', files.length, 'key hits', keyHits);
const answers = JSON.parse(fs.readFileSync(`${SP}/runs/live40-smoke.answers.json`, 'utf8')).answers;
const ev = fs.readFileSync(`${SP}/runs/live40-smoke.json`, 'utf8'), con = fs.readFileSync(`${SP}/runs/smoke.console.txt`, 'utf8');
for (const [id, a] of Object.entries(answers)) {
    const probe = a.text.trim().split(/\s+/).slice(0, 4).join(' '), heard = a.heard.trim().split(/\s+/).slice(0, 3).join(' ');
    console.log(id, 'answer words', a.words, 'chars', a.text.length, 'heard chars', a.heard.length, 'answer text in events file', probe ? ev.includes(probe) : 'n/a', 'in console', probe ? con.includes(probe) : 'n/a', 'heard in events', heard ? ev.includes(heard) : 'n/a');
}
