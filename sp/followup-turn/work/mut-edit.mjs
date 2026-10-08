import fs from 'node:fs';
const f = 'R/scripts/mutate-decide.mjs';
let s = fs.readFileSync(f, 'utf8');
const anchor = "    // additivity\n";
if (s.split(anchor).length !== 2) throw new Error('anchor');
const add = [
    ['launches.jsonl absence tolerated', "if (!Array.isArray(launches)) problems.push('launches.jsonl is missing", "if (false) problems.push('launches.jsonl is missing"],
    ['an agent without a launches line tolerated', 'if (!line) problems.push(at(`agent ', 'if (false) problems.push(at(`agent '],
    ['launcher exit not checked', 'if (line.exit !== 0) problems.push(', 'if (false) problems.push('],
    ['slugJsonl not checked', 'if (line.slugJsonl !== 1) problems.push(', 'if (false) problems.push('],
    ['memoryDir not checked', "if (line.memoryDir !== 'absent' && line.memoryDir !== 'empty') problems.push(", 'if (false) problems.push('],
    ['attempt not compared to the launches line', 'if (!Number.isInteger(g.attempt) || g.attempt !== line.attempt) problems.push(', 'if (false) problems.push('],
    ['cwd not compared to the launches line', "if (typeof g.cwd !== 'string' || g.cwd !== line.cwd) problems.push(", 'if (false) problems.push('],
    ['a shared cwd (not <slot>-a<attempt>) tolerated', "if (line.cwd && !String(line.cwd).replace(", 'if (false && !String(line.cwd).replace('],
    ['launches model not compared', 'if (line.model !== g.model) problems.push(', 'if (false) problems.push('],
    ['a cwd used twice tolerated', 'for (const [c, n] of cwds) if (n > 1) problems.push(', 'for (const [c, n] of []) if (n > 1) problems.push('],
    ['a replaced agent needs no launches line', 'if (!rl2) problems.push(', 'if (false) problems.push('],
    ['a replaced attempt may be later than its replacement', "else if (line && !(rl2.attempt < line.attempt)) problems.push(", 'else if (false) problems.push('],
].map(([n, a, b]) => `    [${JSON.stringify(n)}, ${JSON.stringify(a)}, ${JSON.stringify(b)}],\n`).join('');
s = s.replace(anchor, () => add + anchor);
fs.writeFileSync(f, s);
console.log('ok');
