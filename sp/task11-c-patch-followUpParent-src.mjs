import fs from 'node:fs';

const file = 'C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-cluely-ai-assistant\\electron\\llm\\followUpParent.ts';
const text = fs.readFileSync(file, 'utf8');

const oldStr = `export function followUpParentEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
    const raw = env[FOLLOWUP_PARENT_ENV]?.trim();
    if (!raw || raw === '0') return false;
    if (raw === '1') return true;
    throw new Error(\`\${FOLLOWUP_PARENT_ENV}="\${raw}" is not 1, 0 or unset\`);
}
`;

const newStr = `export function followUpParentEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
    const raw = env[FOLLOWUP_PARENT_ENV]?.trim();
    if (!raw || raw === '0') return false;
    if (raw === '1') return true;
    throw new Error(\`\${FOLLOWUP_PARENT_ENV}="\${raw}" is not 1, 0 or unset\`);
}

/**
 * The startup-time validate-and-describe step (h40c review M4), in describeVerbalHedgeAtStartup's
 * shape: the hedge gets validated once at app launch (verbalHedge.ts); this flag did not, so a
 * junk value threw inside every hands-free answer instead of refusing to start. Returns the line
 * to log (without the "[Main] " prefix — the caller adds it, the same way it does for the hedge
 * line); throws followUpParentEnabled's own message on a bad value, so the caller can catch it
 * and exit rather than starting with a config nobody chose.
 */
export function describeFollowUpParentAtStartup(env: NodeJS.ProcessEnv = process.env): string {
    return followUpParentEnabled(env) ? 'follow-up parent: on' : 'follow-up parent: off';
}
`;

const count = text.split(oldStr).length - 1;
if (count !== 1) {
    console.error(`FAIL: expected exactly 1 occurrence, found ${count}`);
    process.exit(1);
}
fs.writeFileSync(file, text.split(oldStr).join(newStr), 'utf8');
console.log('OK: followUpParent.ts patched with describeFollowUpParentAtStartup (GREEN)');
