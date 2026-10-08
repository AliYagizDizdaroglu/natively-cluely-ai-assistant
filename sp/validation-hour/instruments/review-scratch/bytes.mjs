import fs from 'node:fs'; import path from 'node:path';
const VH = path.resolve(process.argv[2]);
for (const f of ['launch-h40d.cmd','launch-h40d-dry.cmd','launch-h40d-prestart.cmd','h40d-merge.cmd','register-h40d.ps1','h40d-precheck.ps1','guard-h40d.mjs','guard-h40d-git.mjs','h40d-twins.mjs','h40d-rule3.mjs','h40d-hascuerule-check.mjs','h40d-grader-models.mjs']) {
  const b = fs.readFileSync(path.join(VH, f)); let crlf=0, lf=0, hi=0, cr=0;
  for (let i=0;i<b.length;i++){ if(b[i]===10){ if(i>0&&b[i-1]===13) crlf++; else lf++; } if(b[i]===13 && b[i+1]!==10) cr++; if(b[i]>126) hi++; }
  console.log(f.padEnd(28), 'bytes', b.length, 'CRLF', crlf, 'bareLF', lf, 'bareCR', cr, 'above126', hi, 'BOM', b[0]===0xEF, 'endsCRLF', b[b.length-2]===13&&b[b.length-1]===10);
}
