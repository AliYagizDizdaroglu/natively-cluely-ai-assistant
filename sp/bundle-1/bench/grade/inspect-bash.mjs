// Throwaway: find the blind-3.g2 round-2 grader transcript and show its Bash tool_use input and the matching result (commands only; no answer text expected).
import fs from 'fs';
const root = 'C:/Users/sotka/.claude/projects/';
const dirs = fs.readdirSync(root).filter((d) => /blind-3-g2-r2-a1/.test(d));
console.log('dirs', dirs);
for (const d of dirs) for (const f of fs.readdirSync(root + d).filter((x) => x.endsWith('.jsonl'))) {
  const ids = new Set();
  for (const l of fs.readFileSync(root + d + '/' + f, 'utf8').split('\n').filter(Boolean)) {
    const j = JSON.parse(l); const c = j.message?.content; if (!Array.isArray(c)) continue;
    for (const x of c) {
      if (x.type === 'tool_use' && x.name === 'Bash') { ids.add(x.id); console.log('BASH USE', JSON.stringify(x.input).slice(0, 300)); }
      if (x.type === 'tool_result' && ids.has(x.tool_use_id)) { const s = typeof x.content === 'string' ? x.content : JSON.stringify(x.content); console.log('RESULT is_error', x.is_error, s.slice(0, 300)); }
    }
  }
}
