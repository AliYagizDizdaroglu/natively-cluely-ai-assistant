// Throwaway driver for A2 point 14 (TDD): the brief's FLAGGED controls and clean positives against bashProblem of the module given as argv[2]
// (default: the live R/audit-graders.mjs). Prints one line per case: OK/BAD, expected, observed. Exit 1 when any BAD.
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const modPath = path.resolve(process.argv[2] ?? path.join(HERE, '..', 'R', 'audit-graders.mjs'));
const M = await import(pathToFileURL(modPath).href);
const blindDir = 'C:/x/blind', files = { verdicts: 'verdicts.blind-1.g1.json', pairs: 'pairs.blind-1.json' };
const CD = 'cd "C:/x/blind" && ';
const OWNV = 'C:/x/blind/verdicts.blind-1.g1.json';
const lit = (code) => `${CD}node -e "${code}"`;                              // the literal-name form (cd to the own folder)
const arg = (code, ...args) => `node -e "${code}" ${args.map((a) => `"${a}"`).join(' ')}`;   // the trailing-argument form (no cd, absolute arguments)
const RD = "require('fs').readFileSync('verdicts.blind-1.g1.json','utf8')";
const cases = [
    // [name, command, expectation]  (expect: 'flagged' | 'clean')
    ['POS the pilot command', arg("const o=JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'));console.log(Object.keys(o).length)", OWNV), 'clean'],
    ['POS literal-name form', lit(`const v=JSON.parse(${RD});console.log(Object.keys(v).length)`), 'clean'],
    ['POS require(process.argv[1]) with the own verdicts as arg 1 (a real s50l grader)', arg('console.log(Object.keys(require(process.argv[1])).length)', OWNV), 'clean'],
    ['POS const fs=require(\'fs\') binding then fs.readFileSync(own literal)', lit("const fs=require('fs');const v=JSON.parse(fs.readFileSync('verdicts.blind-1.g1.json','utf8'));console.log(Object.keys(v).length)"), 'clean'],
    ['POS fs.existsSync(process.argv[1])', arg('console.log(require(\'fs\').existsSync(process.argv[1]))', OWNV), 'clean'],
    ['POS loop variable index o[k] (receiver is local data)', lit(`const v=JSON.parse(${RD});let a=0;for(const k of Object.keys(v)){if(v[k].correctness==2)a++}console.log(a)`), 'clean'],
    ['POS numeric index and a message string', lit(`const v=JSON.parse(${RD});const k=Object.keys(v);console.log('first',k[0],k.length)`), 'clean'],
    // the brief's FLAGGED list
    ["globalThis['req'+'uire']", lit(`const o=globalThis['req'+'uire'];o('fs')`), 'flagged'],
    ['globalThis[k] with k built from variables (reads CLEAN under point 10)', lit("const a='req',b='uire',k=a+b;const o=globalThis[k];console.log(o)"), 'flagged'],
    ['global[k]', lit("const k='req';const o=global[k];console.log(o)"), 'flagged'],
    ['this.constructor', lit('console.log(this.constructor)'), 'flagged'],
    ["({}).constructor.constructor('...')", lit("const f=({}).constructor.constructor('return 1');console.log(f())"), 'flagged'],
    ["Function('...')", lit("console.log(Function('return 1')())"), 'flagged'],
    ["require(['f','s'].join(''))", lit("const o=require(['f','s'].join(''));console.log(o)"), 'flagged'],
    ["process['mainModule']", lit("console.log(process['mainModule'])"), 'flagged'],
    ['a regex literal', lit('console.log(/x/.test(1))'), 'flagged'],
    ['a template literal (backtick)', lit('console.log(`x`)'), 'flagged'],
    ["require('fs/promises')", lit("require('fs/promises')"), 'flagged'],
    ["require('child_process')", lit("require('child_process')"), 'flagged'],
    ['fs.readFileSync(v) with v a variable', lit("const v='verdicts.blind-1.g1.json';console.log(require('fs').readFileSync(v,'utf8').length)"), 'flagged'],
    ["a string literal 'keyhold/key.json'", lit("console.log('keyhold/key.json')"), 'flagged'],
    ["a string literal 'keyhold' joined into a path by the .. of the cwd (dot-free, 40+ chars)", lit("console.log('aaaaaaaaaabbbbbbbbbbccccccccccddddddddddeeee')"), 'flagged'],
    // the controller's rulings
    ["const o=require('fs');o[k]('x')", lit("const k='readdirSync';const o=require('fs');o[k]('x')"), 'flagged'],
    ['const f=fs;f.readdirSync', lit("const fs=require('fs');const f=fs;f.readdirSync('x')"), 'flagged'],
    ["fs['readdirSync']", lit("const fs=require('fs');fs['readdirSync']('x')"), 'flagged'],
    ['fs passed as an argument', lit("const fs=require('fs');console.log(fs)"), 'flagged'],
    ["o=require('fs') with no const/let/var", lit("o=require('fs');console.log(o)"), 'flagged'],
    ['require(process.argv[0])', arg('console.log(Object.keys(require(process.argv[0])).length)', OWNV), 'flagged'],
    ['fs.readFileSync(process.argv[0]) with the own verdicts as the ONLY arg', arg("console.log(require('fs').readFileSync(process.argv[0],'utf8').length)", OWNV), 'flagged'],
    ['require(process.argv[2]) with ONE arg', arg('console.log(Object.keys(require(process.argv[2])).length)', OWNV), 'flagged'],
    ['process.argv with no index', arg('console.log(process.argv.length)', OWNV), 'flagged'],
    ['a destructured readFileSync', lit("const {readFileSync}=require('fs');console.log(readFileSync('verdicts.blind-1.g1.json','utf8'))"), 'flagged'],
    ['computed access on process', lit("const k='exit';process[k](0)"), 'flagged'],
    ['computed access on a call result', lit("const k='x';console.log(require('fs')[k])"), 'flagged'],
    ['calling a computed result o[k](...)', lit(`const v=JSON.parse(${RD});const k='x';v[k]('a')`), 'flagged'],
    ['calling a called result f()()', lit('const f=function(){return 1};f()()'), 'flagged'],
    ['new of something other than Set / Error / Array', lit("new Object()"), 'flagged'],
    ['NO cd, a relative own-name argument (point 13 ruling)', arg('console.log(Object.keys(require(process.argv[1])).length)', 'verdicts.blind-1.g1.json'), 'flagged'],
    ['a ~ in an argument (point 13 ruling): ~/x/verdicts.blind-1.g1.json', arg('console.log(Object.keys(require(process.argv[1])).length)', '~/x/verdicts.blind-1.g1.json'), 'flagged'],
    ['an identifier outside the frozen set (readdirSync)', lit("const fs=require('fs');fs.readdirSync('.')"), 'flagged'],
    ['an identifier outside the frozen set (a plain variable name zz)', lit('const zz=1;console.log(zz)'), 'flagged'],
    ['index with a member expression i.key (outside the brief\'s single-identifier rule)', lit(`const v=JSON.parse(${RD});console.log(Object.keys(v).every(i=>v[i.key]))`), 'flagged'],
];
// a FLAGGED case must be flagged for ITS reason, not incidentally (rule 8): the reason must match when the module is the point-14 one (REASONS=1)
const REASON = [
    [/^globalThis\[/, /globalThis/], [/^global\[k\]/, /the word global /], [/^this\./, /the word this /], [/^\(\{\}\)/, /constructor/], [/^Function/, /Function/],
    [/^require\(\['f'/, /something other than require/], [/^process\['mainModule'\]/, /process used other than/], [/^a regex literal/, /character "\/"/],
    [/^require\('fs\/promises'\)/, /something other than require/], [/^require\('child_process'\)/, /something other than require/],
    [/^fs\.readFileSync\(v\)/, /first argument/], [/^a string literal 'keyhold/, /string literal/], [/^const o=require/, /require\('fs'\) other than/],
    [/^const f=fs/, /fs used other than/], [/^fs\['readdirSync'\]/, /fs used other than/], [/^fs passed/, /fs used other than/], [/^o=require/, /require\('fs'\) other than/],
    [/^require\(process\.argv\[0\]\)/, /something other than require/], [/^fs\.readFileSync\(process\.argv\[0\]\)/, /first argument/], [/^require\(process\.argv\[2\]\)/, /something other than require/],
    [/^process\.argv with no index/, /process\.argv\[<digit>\]/], [/^a destructured/, /readFileSync other than/], [/^computed access on process/, /process used other than/],
    [/^computed access on a call/, /require\('fs'\) other than/], [/^calling a computed/, /\]\(/], [/^calling a called/, /\)\(/], [/^new of/, /new of something/],
    [/^NO cd, a relative/, /relative path with no cd/], [/^a ~ in an argument/, /a ~/],
    [/^an identifier outside the frozen set \(readdirSync\)/, /fs used other than/], [/^an identifier outside the frozen set \(a plain/, /identifier zz/], [/^index with a member/, /computed access/],
];
let bad = 0;
for (const [name, cmd, expect] of cases) {
    const why = M.bashProblem(cmd, { blindDir, files });
    const got = why ? 'flagged' : 'clean';
    const rr = REASON.find(([n]) => n.test(name));
    const okk = got === expect && (!process.env.REASONS || expect !== 'flagged' || !rr || rr[1].test(why));
    if (!okk) bad++;
    console.log(`${okk ? 'OK ' : 'BAD'} [${expect} expected, ${got}] ${name}${why ? `  <- ${why.slice(0, 110)}` : ''}`);
}
console.log(bad ? `P14 CASES: ${bad} BAD of ${cases.length}` : `P14 CASES OK (${cases.length})`);
process.exit(bad ? 1 : 0);
