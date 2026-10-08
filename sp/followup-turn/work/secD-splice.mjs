import fs from 'node:fs';
const f = 'R/scripts/grader-session-calibrate.mjs';
let s = fs.readFileSync(f, 'utf8');
let tail = fs.readFileSync('work/secD-tail.txt', 'utf8');
const rep = (t, a, b) => { if (!t.includes(a)) throw new Error('missing: ' + a.slice(0, 70)); return t.replace(a, () => b); };
tail = rep(tail, " && /--allowed-tools Read\\(\\/\\/c/.test(x.out) === /^[A-Za-z]:/.test(gdir)", ' && /--allowed-tools/.test(x.out)');
tail = rep(tail, "(() => { const a = calls()[0].args; return a[0] === '-p' && a[2] === '--model' && a[3] === 'opus' && a[a.indexOf('--permission-mode') + 1] === 'dontAsk' && a.includes('--strict-mcp-config') && a[a.indexOf('--allowed-tools') - 1] === winDir(pdir).replace(/\\//g, path.sep) || a[a.indexOf('--allowed-tools') - 1] === pdir; })()",
    "(() => { const a = calls()[0].args; return a[0] === '-p' && a[2] === '--model' && a[3] === 'opus' && a[a.indexOf('--output-format') + 1] === 'json' && a[a.indexOf('--permission-mode') + 1] === 'dontAsk' && a[a.indexOf('--tools') + 1] === 'Read,Write,Edit,Bash' && a.includes('--strict-mcp-config') && path.resolve(a[a.indexOf('--add-dir') + 1]) === path.resolve(pdir); })()");
const a = s.indexOf('    // the CLI against a stand-in for the claude binary');
const b = s.indexOf('//@@END-SECTION-D@@\n');
if (a < 0 || b < 0) throw new Error('anchors');
s = s.slice(0, a) + tail + s.slice(b + '//@@END-SECTION-D@@\n'.length);
// helper tests for the new pure helpers, after the claudeArgs permission-rules check
s = rep(s, "    // at most 2 graders at once\n", `    const pa = LG.probeArgs({ prompt: 'p', inFile: 'C:/g/probe-input.txt', outFile: 'C:/g/c-a1/out.txt', addDir: 'C:/g' });
    check('probeArgs: the same flags as a grader (dontAsk, tools Read/Write/Edit/Bash, strict MCP), rules = Read the input, Edit the out file, Bash x2', pa.rules.length === 4 && pa.rules[0] === 'Read(//c/g/probe-input.txt)' && pa.rules[1] === 'Edit(//c/g/c-a1/out.txt)' && pa.args.slice(0, 2).join() === '-p,p' && pa.args.includes('dontAsk') && pa.args[pa.args.indexOf('--tools') + 1] === 'Read,Write,Edit,Bash' && JSON.stringify(pa.args.slice(0, pa.args.indexOf('--add-dir'))) === JSON.stringify(LG.claudeArgs({ prompt: 'p', blindDir: bdir, slot: 'blind-3.g1' }).args.slice(0, pa.args.indexOf('--add-dir'))));
    const sd = path.join(tmp, 'sf'); const cwdS = path.join(tmp, 'cwdS'); const slugS = path.join(sd, LG.projectSlug(cwdS)); fs.mkdirSync(slugS, { recursive: true });
    fs.writeFileSync(path.join(slugS, 'sess1.jsonl'), '{}\\n');
    check('slugFacts: the attempt\\'s own slug folder holding exactly its one .jsonl and no memory\\\\ -> slugJsonl 1, memoryDir absent', JSON.stringify(LG.slugFacts(cwdS, 'sess1', path.join(slugS, 'sess1.jsonl'))) === JSON.stringify({ slugJsonl: 1, memoryDir: 'absent' }));
    fs.writeFileSync(path.join(slugS, 'other.jsonl'), '{}\\n'); fs.mkdirSync(path.join(slugS, 'memory'));
    check('... a second .jsonl -> slugJsonl 2; an empty memory\\\\ -> empty', JSON.stringify(LG.slugFacts(cwdS, 'sess1', path.join(slugS, 'sess1.jsonl'))) === JSON.stringify({ slugJsonl: 2, memoryDir: 'empty' }));
    fs.writeFileSync(path.join(slugS, 'memory', 'n.md'), 'x');
    check('... a non-empty memory\\\\ -> non-empty; a transcript in ANOTHER cwd\\'s slug folder -> slugJsonl 0; no transcript -> 0 / unknown', LG.slugFacts(cwdS, 'sess1', path.join(slugS, 'sess1.jsonl')).memoryDir === 'non-empty' && LG.slugFacts(path.join(tmp, 'elsewhere'), 'sess1', path.join(slugS, 'sess1.jsonl')).slugJsonl === 0 && JSON.stringify(LG.slugFacts(cwdS, 'x', null)) === JSON.stringify({ slugJsonl: 0, memoryDir: 'unknown' }));
    check('slugJsonls: lists the top-level .jsonl of the EXACT folder only (a sibling cwd sharing the 200-char prefix is not matched)', LG.slugJsonls(cwdS, sd).length === 2 && LG.slugJsonls(cwdS + '-a2', sd).length === 0);
    // at most 2 graders at once
`);
fs.writeFileSync(f, s);
let L = fs.readFileSync('R/launch-grader.mjs', 'utf8');
L = rep(L, "        const lines = [`$ node launch-grader.mjs ${argv.join(' ')}`];", "        fs.mkdirSync(OUT_DIR, { recursive: true });\n        const lines = [`$ node launch-grader.mjs ${argv.join(' ')}`];");
fs.writeFileSync('R/launch-grader.mjs', L);
console.log('ok');
