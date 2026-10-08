// Throwaway: do the 8 real s50l design-2 grader Bash commands trip point 10's banned-token list?
import fs from 'fs'; import path from 'path';
const ids = ['addb84e6','a681f259','a5eb230f','ab34ebe9','a83e3007','ab605c21','aa08ae8c','aa85ea6f'];
const root = 'C:/Users/sotka/.claude/projects';
const banned = ['chdir','readdir','opendir','Dir','fs/promises','promises','dirname','resolve','join','relative','normalize','process.cwd','__dirname','glob','require.resolve','eval','Function(','fromCharCode','Buffer','atob','import('];
function walk(d, out) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p, out); else if (e.name.endsWith('.jsonl')) out.push(p); } return out; }
const files = walk(root, []);
for (const id of ids) {
  const f = files.find((p) => path.basename(p).startsWith('agent-' + id) || path.basename(p).startsWith(id));
  if (!f) { console.log(id, 'NOT FOUND'); continue; }
  for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
    if (!line.includes('"Bash"')) continue;
    let j; try { j = JSON.parse(line); } catch { continue; }
    const content = j.message && j.message.content; if (!Array.isArray(content)) continue;
    for (const c of content) if (c.type === 'tool_use' && c.name === 'Bash') {
      const cmd = c.input.command; const hits = banned.filter((t) => cmd.includes(t));
      const procs = [...cmd.matchAll(/process\.[a-zA-Z]+(\[\d\])?/g)].map((m) => m[0]);
      const fsCalls = [...cmd.matchAll(/(?:fs|require\('fs'\))\.(\w+)\(([^,)]*)/g)].map((m) => m[1] + '(' + m[2].trim());
      console.log(id, 'len', cmd.length, 'banned:', JSON.stringify(hits), 'process:', JSON.stringify(procs), 'fs:', JSON.stringify(fsCalls));
    }
  }
}
