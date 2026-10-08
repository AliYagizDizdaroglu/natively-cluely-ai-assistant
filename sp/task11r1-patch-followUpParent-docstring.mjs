import fs from 'node:fs';

const file = 'C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-cluely-ai-assistant\\electron\\llm\\followUpParent.ts';
const text = fs.readFileSync(file, 'utf8');

const oldStr = `/**
 * The startup-time validate-and-describe step (h40c review M4), in describeVerbalHedgeAtStartup's
 * shape: the hedge gets validated once at app launch (verbalHedge.ts); this flag did not, so a
 * junk value threw inside every hands-free answer instead of refusing to start. Returns the line
 * to log (without the "[Main] " prefix — the caller adds it, the same way it does for the hedge
 * line); throws followUpParentEnabled's own message on a bad value, so the caller can catch it
 * and exit rather than starting with a config nobody chose.
 */`;

const newStr = `/**
 * The startup-time validate-and-describe step (h40c review M4): the hedge gets validated once at
 * app launch (verbalHedge.ts); this flag did not, so a junk value threw inside every hands-free
 * answer instead of refusing to start. Unlike describeVerbalHedgeAtStartup — which embeds
 * "[Main] " itself and is logged raw — this function returns the line WITHOUT that prefix; main.ts
 * adds "[Main] " at its own call site (h40c review fix round 1, Minor 2: the two differ on
 * purpose, don't unify their shape). Throws followUpParentEnabled's own message on a bad value, so
 * the caller can catch it and exit rather than starting with a config nobody chose.
 */`;

const count = text.split(oldStr).length - 1;
if (count !== 1) {
    console.error(`FAIL: expected exactly 1 occurrence, found ${count}`);
    process.exit(1);
}
fs.writeFileSync(file, text.split(oldStr).join(newStr), 'utf8');
console.log('OK: followUpParent.ts docstring corrected (fix round 1, Minor 2)');
