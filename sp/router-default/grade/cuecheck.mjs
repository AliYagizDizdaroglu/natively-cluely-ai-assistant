// Throwaway: cue activity in r1 (ids, counts, short non-content heads only).
import fs from 'fs';
const R = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs/2026-10-07T00-22-47-router-default-r1/';
const p = JSON.parse(fs.readFileSync(R + 'interview60.judge.pairs.json', 'utf8')).items;
console.log('in-app answers with a CUES/__X marker:', p.filter((x) => /CUES|__[A-Z]/.test(x.answer || '')).map((x) => x.id).join(',') || 'none');
fs.readFileSync(R + 'verbal-diag.log', 'utf8').split('\n').forEach((l, i) => { if (/CUES__|cues__/.test(l)) console.log('diag line', i + 1, 'len', l.length, 'tag', (l.match(/\[[A-Za-z ]+\][^:]{0,30}/) || [''])[0]); });
const k = {};
for (const l of fs.readFileSync(R + 'natively_debug.log', 'utf8').split('\n').filter((l) => /cue/i.test(l))) { const m = l.match(/\[[A-Za-z]+\][ a-zA-Z]{0,30}/); const t = m ? m[0] : '?'; k[t] = (k[t] || 0) + 1; }
console.log(Object.entries(k).sort((a, b) => b[1] - a[1]).slice(0, 10));
for (const a of ['interview60.answers.router-shadow.json']) { const x = JSON.parse(fs.readFileSync(R + a, 'utf8')); const arr = Array.isArray(x) ? x : (x.answers || x.items || Object.values(x)); console.log(a, 'n', arr.length, 'keys', Object.keys(arr[0] || {}).join(',')); }
