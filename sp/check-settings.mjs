// Throwaway: confirm ~/.claude/settings.json still parses, carries the new SessionStart hook and kept
// the existing Stop hook (a malformed settings file silently disables every setting in it).
import fs from 'node:fs';
const s = JSON.parse(fs.readFileSync('C:/Users/sotka/.claude/settings.json', 'utf8'));
console.log('JSON OK');
console.log('SessionStart command:', s.hooks.SessionStart[0].hooks[0].command);
console.log('Stop hook kept:', Boolean(s.hooks.Stop?.[0]?.hooks?.[0]?.command));
console.log('other keys kept:', Object.keys(s).join(', '));
