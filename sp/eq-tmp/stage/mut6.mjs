import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
const F = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/.claude/worktrees/eq-build/electron/IntelligenceEngine.ts';
const orig = fs.readFileSync(F, 'utf8');
const W = "                    if (settled) this.session.recordAskedQuestion(settled, turnId);\n";
const B0 = "                    const earlier = buildEarlierQuestion({";
const L = /                    console\.log\(`\[IntelligenceEngine\] earlier question: gate=\$\{earlier\.why[^\n]*\n/;
const mutants = {
  m1_write_before_build: s => { if(!s.includes(W)) throw 1; return s.replace(W, '').replace(B0, W + B0); },
  m2_log_before_write: s => { const m = s.match(L)[0]; let t = s.replace(m, ''); const a = "                    earlierQuestionBlock = earlier.block;\n"; if(!t.includes(a)) throw 2; return t.replace(W, m.replace('earlier.block.length','earlier.block.length') + W).replace(a, a); },
  m3_hoist_ledger: s => s.replace("                if (earlierQuestionEnabled()) {", "                const hoisted = this.session.getAskedQuestions();\n                if (earlierQuestionEnabled()) {"),
};
const test = 'electron/IntelligenceEngine.earlierQuestion.test.ts';
try {
  for (const [name, fn] of Object.entries(mutants)) {
    const m = fn(orig);
    if (m === orig) throw new Error(name + ' no-op');
    fs.writeFileSync(F, m);
    let out;
    try { out = execFileSync('powershell', ['-NoProfile','-File','C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/eq-tmp/stage/runt.ps1', test], {encoding:'utf8'}); } catch (e) { out = String(e.stdout || e); }
    console.log('=== ' + name); console.log(out.split('\n').filter(l => /×|Tests /.test(l)).map(l => l.slice(0, 200)).join('\n'));
  }
} finally { fs.writeFileSync(F, orig); }