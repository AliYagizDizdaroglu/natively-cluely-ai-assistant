#!/usr/bin/env node
// knowledge-mode-read.mjs [--file <settings.json>]
//
// Rule 1(g) of PREREGISTER-h40d.md (revision 3, re-check N1): read the Context toggle's persisted state WITHOUT
// starting the app. The app persists it as `knowledgeMode` in `<userData>\settings.json` (SettingsManager.ts:28,
// written by ipcHandlers.ts:3030 on every toggle) and restores it at start (main.ts:687: ENABLED only when the key
// is true). settings.json holds non-secret boot toggles only (SettingsManager.ts:6); this script prints the file's
// path, size, mtime and the `knowledgeMode` key — never another key's value.
//
// Two views of %APPDATA% exist from a Claude session (memory claude-sandbox-appdata): the direct path is an MSIX
// shadow, the admin share `\\localhost\C$\...` is the real file the user's app and a scheduled task read. Both are
// printed; the ADMIN SHARE line decides. Exit 0 = ON (true) on the admin share; 1 = OFF or absent; 2 = unreadable.
// --file <path> reads one file only (calibration on stub files: true -> ON, false -> OFF, no key -> ABSENT).
import fs from 'node:fs';

const argv = process.argv.slice(2);
const fi = argv.indexOf('--file');
const USER = process.env.USERPROFILE?.replace(/\\/g, '/') ?? 'C:/Users/sotka';
const drive = USER.slice(0, 1);
const rest = USER.slice(3);
const paths = fi >= 0
    ? [['given file', argv[fi + 1]]]
    : [['direct path (a shadow from a Claude session)', `${USER}/AppData/Roaming/natively/settings.json`],
       ['ADMIN SHARE (the real file)', `//localhost/${drive}$/${rest}/AppData/Roaming/natively/settings.json`]];

const readOne = (p) => {
    const st = fs.statSync(p);
    const j = JSON.parse(fs.readFileSync(p, 'utf8'));
    if (typeof j !== 'object' || j === null) throw new Error('settings.json is not an object');
    const v = j.knowledgeMode;
    const state = v === true ? 'ON' : v === false ? 'OFF' : v === undefined ? 'ABSENT (the app restores nothing: OFF)' : `UNEXPECTED ${JSON.stringify(v)}`;
    return { st, state, keys: Object.keys(j).length };
};

let exit = 2;
for (const [label, p] of paths) {
    try {
        const { st, state, keys } = readOne(p);
        console.log(`${label}: ${p}\n  size ${st.size}, mtime ${st.mtime.toISOString()}, ${keys} keys; knowledgeMode = ${state}`);
        exit = state === 'ON' ? 0 : 1;
    } catch (e) {
        console.log(`${label}: ${p}\n  UNREADABLE: ${e.code ?? e.message}`);
        exit = 2;
    }
}
console.log(`knowledge mode (rule 1(g)): ${exit === 0 ? 'ON' : exit === 1 ? 'NOT ON' : 'UNREADABLE'}`);
process.exit(exit);
