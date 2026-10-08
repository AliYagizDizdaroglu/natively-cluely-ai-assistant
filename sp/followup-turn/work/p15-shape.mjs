import fs from 'node:fs';
const P='C:/Users/sotka/.claude/projects/';
const files={
 neg:P+'C--Users-sotka-AppData-Local-Temp-claude-C--Users-sotka-OneDrive-Masa-st--natively-cluely-ai-assistant--claude-worktrees-nifty-lederberg-49681a-9c5886c7-cdbd-48af-b8bc-e9275012ec64-scratchpad-followup-d47zi5/f8d13b32-2a08-4f05-aeaf-80f1a8df1e16.jsonl',
 spike:P+'C--Users-sotka-AppData-Local-Temp-claude-C--Users-sotka-OneDrive-Masa-st--natively-cluely-ai-assistant--claude-worktrees-nifty-lederberg-49681a-9c5886c7-cdbd-48af-b8bc-e9275012ec64-scratchpad-followup-epcadv/8a49290e-d30e-4087-ac9a-933257bb1d98.jsonl'};
for (const [k,f] of Object.entries(files)) {
  console.log('==',k);
  for (const l of fs.readFileSync(f,'utf8').split('\n')) { if(!l.trim())continue; const j=JSON.parse(l);
    const c=j.message?.content;
    if (j.type==='assistant'&&Array.isArray(c)) for(const x of c) if(x.type==='tool_use') console.log('tool_use',x.name,Object.keys(x.input).join(','), String(x.input.file_path??'').slice(-60));
    if (j.type==='user'&&Array.isArray(c)) for(const x of c) if(x.type==='tool_result') console.log('tool_result is_error=',x.is_error, 'toplevelKeys',Object.keys(j).join(','), 'len', JSON.stringify(x.content).length, k==='neg'&&x.is_error? JSON.stringify(x.content).slice(0,160).replace(/[A-Za-z]:[^"]*/g,'<path>'):'');
    if (j.type!=='assistant'&&j.type!=='user') console.log('type',j.type, Object.keys(j).join(','));
  }
}
