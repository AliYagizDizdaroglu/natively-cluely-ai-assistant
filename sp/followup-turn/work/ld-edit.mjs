import fs from 'node:fs';
const f = 'R/legs-decide.mjs';
let s = fs.readFileSync(f, 'utf8');
const rep = (a, b) => { if (!s.includes(a)) throw new Error('missing: ' + a.slice(0, 60)); s = s.replace(a, () => b); };
rep("const num = (x) =>", `/** A grader's verdict file against the keys it must grade (the merge's reader, shared with launch-grader's pilot): null when every key has a valid
 *  score and nothing else is graded, else the first reason. */
export function verdictFileProblem(vv, keys) {
    if (!vv || typeof vv !== 'object' || Array.isArray(vv)) return 'not a JSON object';
    const extra = Object.keys(vv).filter((k) => !keys[k]);
    if (extra.length) return \`grades keys that are not in the key file: \${extra.join(', ')}\`;
    for (const k of Object.keys(keys)) if (!SCORE(vv[k])) return \`no valid verdict for \${k}\`;
    return null;
}
const num = (x) =>`);
rep("                const extra = Object.keys(vv).filter((k) => !keys[k]);\n                if (extra.length) { console.error(`${path.basename(vf)} grades keys that are not in ${kf}: ${extra.join(', ')}`); process.exit(2); }\n                for (const [k, meta] of Object.entries(keys)) {\n                    if (!SCORE(vv[k])) { console.error(`${path.basename(vf)}: no valid verdict for ${k}`); process.exit(2); }\n",
"                const vp = verdictFileProblem(vv, keys);\n                if (vp) { console.error(`${path.basename(vf)}: ${vp} (${kf})`); process.exit(2); }\n                for (const [k, meta] of Object.entries(keys)) {\n");
rep("export function checkGraders({ gs, files, nFiles, pinned, departureNote }) {\n    const problems = [];",
"export function checkGraders({ gs, files, nFiles, pinned, departureNote, launches }) {\n    const problems = [];");
rep("    const one = (kind, tag) =>", `    // A2 points 5 + 11: every slot's agent is the session of a launcher line {exit 0, slugJsonl 1, memoryDir absent|empty} for THAT slot, attempt and cwd; a
    // replaced agent has its own line; a cwd is used by one attempt only.
    const sid = (a) => (typeof a === 'string' ? a.replace(/^session:/, '') : '');
    if (!Array.isArray(launches)) problems.push('launches.jsonl is missing or unreadable: every slot\\'s agent must be the session of a launcher line with exit 0');
    else {
        const cwds = new Map();
        for (const l of launches) cwds.set(l.cwd, (cwds.get(l.cwd) ?? 0) + 1);
        for (const [c, n] of cwds) if (n > 1) problems.push(\`launches.jsonl: the cwd \${String(c).slice(-40)} was used by \${n} attempts (a cwd is never reused)\`);
    }
    const one = (kind, tag) =>`);
rep("        // replacements: the `.replaced` lines must exist", `        if (Array.isArray(launches)) {
            const mine = launches.filter((l) => l.slot === tag);
            const line = mine.find((l) => l.session_id && l.session_id === sid(g.agent));
            if (!line) problems.push(at(\`agent \${sid(g.agent).slice(0, 18)} has no launches.jsonl line for this slot\`));
            else {
                if (line.exit !== 0) problems.push(at(\`launcher exit \${line.exit}, not 0\`));
                if (line.slugJsonl !== 1) problems.push(at(\`slugJsonl \${line.slugJsonl}, not 1 (the slug folder must hold exactly this attempt's one .jsonl)\`));
                if (line.memoryDir !== 'absent' && line.memoryDir !== 'empty') problems.push(at(\`memoryDir \${line.memoryDir}, not absent|empty\`));
                if (!Number.isInteger(g.attempt) || g.attempt !== line.attempt) problems.push(at(\`attempt \${g.attempt} in graders.json, \${line.attempt} in launches.jsonl\`));
                if (typeof g.cwd !== 'string' || g.cwd !== line.cwd) problems.push(at('cwd in graders.json differs from launches.jsonl'));
                if (line.cwd && !String(line.cwd).replace(/\\\\/g, '/').endsWith(\`/\${tag}-a\${line.attempt}\`)) problems.push(at(\`cwd \${String(line.cwd).slice(-40)} is not <slot>-a<attempt>\`));
                if (line.model !== g.model) problems.push(at(\`model \${g.model} in graders.json, \${line.model} in launches.jsonl\`));
            }
            for (const r of g.replaced ?? []) {
                const rl2 = mine.find((l) => l.session_id && l.session_id === sid(r));
                if (!rl2) problems.push(at(\`replaced agent \${sid(r).slice(0, 18)} has no launches.jsonl line of its own\`));
                else if (line && !(rl2.attempt < line.attempt)) problems.push(at('the replaced attempt is not earlier than the replacement'));
            }
        }
        // replacements: the \`.replaced\` lines must exist`);
fs.writeFileSync(f, s);
console.log('ok');
