// Throwaway negative probe: does `-p --permission-mode dontAsk --tools Read,Write,Edit --allowed-tools Read(<A>) Edit(<B>)`
// DENY a Read of a file that no rule names (outside the cwd)? Synthetic files only; prints the outcome, no secrets involved.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const W = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/followup-turn/work/neg';
const variant = process.argv[2] ?? 'outside';
fs.mkdirSync(`${W}/other`, { recursive: true });
fs.writeFileSync(`${W}/other/forbidden.txt`, 'CANARY-7731\n');
fs.writeFileSync(`${W}/other/allowed.txt`, 'hello\n');
const cwd = `${W}/cwd-${variant}-${Date.now()}`; fs.mkdirSync(cwd);
const slash = (p) => '//' + p.replace(/^([A-Za-z]):/, (m, d) => d.toLowerCase()).replace(/\\/g, '/');
const target = variant === 'incwd' ? (fs.writeFileSync(`${cwd}/x.txt`, 'CANARY-7731\n'), `${cwd}/x.txt`) : `${W}/other/forbidden.txt`;
const prompt = `Use the Read tool to read the file ${target.replace(/\//g, '\\')} and reply with its exact first line only. If you cannot read it, reply DENIED.`;
const args = ['-p', prompt, '--model', 'opus', '--output-format', 'json', '--permission-mode', 'dontAsk', '--tools', 'Read,Write,Edit', '--strict-mcp-config',
    '--allowed-tools', `Read(${slash(`${W}/other/allowed.txt`)})`, `Edit(${slash(`${cwd}/out.txt`)})`];
const r = spawnSync('claude', args, { cwd, encoding: 'utf8', timeout: 300000, maxBuffer: 64 << 20 });
let j = {}; try { j = JSON.parse(r.stdout); } catch { /* */ }
const res = String(j.result ?? '');
console.log(`variant ${variant}: exit ${r.status} session ${j.session_id} result ${res.includes('CANARY-7731') ? 'READ THE FILE (canary returned)' : res.trim().slice(0, 40)} denials ${JSON.stringify(j.permission_denials ?? null).slice(0, 200)}`);
