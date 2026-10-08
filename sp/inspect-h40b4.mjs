import { readFileSync } from 'node:fs';

const RUN = 'C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-cluely-ai-assistant\\electron\\test\\golden\\interview60.runs\\2026-09-26T11-39-51-h40b';
const log = readFileSync(`${RUN}\\natively_debug.log`, 'utf8');

const rows = [];
for (const line of log.split('\n')) {
  const m = line.match(/^(\d{4}-\d{2}-\d{2}T[\d:.]+Z).*\[LLMHelper\] (\S+) usage: thinking=(\w+) thoughts=(\d+) out=(\d+) in=(\d+)/);
  if (!m) continue;
  rows.push({ at: Date.parse(m[1]), model: m[2], level: m[3], thoughts: Number(m[4]), out: Number(m[5]), in: Number(m[6]) });
}
const reqs = [];
for (const r of rows) {
  const prev = reqs[reqs.length - 1];
  if (prev && prev.model === r.model && prev.in === r.in && r.out >= prev.out) { prev.thoughts = r.thoughts; prev.out = r.out; }
  else reqs.push({ ...r });
}
const answers = reqs.filter((r) => r.in > 500);
const byModel = {};
for (const a of answers) byModel[a.model] = (byModel[a.model] || 0) + 1;
console.log('total collapsed requests (all in):', reqs.length);
console.log('total answers (in>500):', answers.length);
console.log('by model (answers only):', byModel);

const byModelAll = {};
for (const a of reqs) byModelAll[a.model] = (byModelAll[a.model] || 0) + 1;
console.log('by model (ALL collapsed requests, incl warmups/small):', byModelAll);
