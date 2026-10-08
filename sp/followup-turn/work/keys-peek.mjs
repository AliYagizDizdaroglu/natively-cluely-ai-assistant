import fs from 'node:fs';
const j = JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const walk=(o,p,d)=>{ if(d>3) return; if(Array.isArray(o)){console.log(p,'array',o.length); if(o.length) walk(o[0],p+'[0]',d+1);} else if(o&&typeof o==='object'){ for(const k of Object.keys(o).slice(0,25)){ const v=o[k]; console.log(p+'.'+k, typeof v, typeof v==='string'?v.length:''); if(typeof v==='object') walk(v,p+'.'+k,d+1);} } };
walk(j,'$',0);
