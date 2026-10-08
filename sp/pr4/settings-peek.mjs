// Prints only permission-shaped keys of Claude settings files (no env values), and ancestor .claude folders of the grading dir.
import fs from 'node:fs';
import path from 'node:path';
const files = ['C:/Users/sotka/.claude/settings.json', 'C:/Users/sotka/.claude/settings.local.json', 'C:/ProgramData/ClaudeCode/managed-settings.json', 'C:/Program Files/ClaudeCode/managed-settings.json'];
for (const f of files) {
    if (!fs.existsSync(f)) { console.log(f, 'ABSENT'); continue; }
    let j; try { j = JSON.parse(fs.readFileSync(f, 'utf8')); } catch { console.log(f, 'UNPARSABLE'); continue; }
    const p = j.permissions ?? {};
    const pick = (a) => (a ?? []).filter((r) => /^(Read|Edit|Write|Glob|Grep|NotebookEdit)\b/.test(r));
    console.log(f, 'keys', Object.keys(j).join(','));
    console.log('  defaultMode', p.defaultMode, 'additionalDirectories', JSON.stringify(p.additionalDirectories ?? j.additionalDirectories ?? null));
    console.log('  allow file rules', JSON.stringify(pick(p.allow)), 'allow total', (p.allow ?? []).length);
    console.log('  deny file rules', JSON.stringify(pick(p.deny)), 'ask', (p.ask ?? []).length);
    console.log('  env NAMES', Object.keys(j.env ?? {}).join(','));
    console.log('  hooks events', Object.keys(j.hooks ?? {}).join(','), 'enabledPlugins', Object.keys(j.enabledPlugins ?? {}).length);
}
let d = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/followup-turn/grading';
while (true) {
    if (fs.existsSync(path.join(d, '.claude'))) console.log('ANCESTOR .claude:', d, fs.readdirSync(path.join(d, '.claude')).join(','));
    if (fs.existsSync(path.join(d, 'CLAUDE.md'))) console.log('ANCESTOR CLAUDE.md:', d);
    const up = path.dirname(d); if (up === d) break; d = up;
}
console.log('scan done');
