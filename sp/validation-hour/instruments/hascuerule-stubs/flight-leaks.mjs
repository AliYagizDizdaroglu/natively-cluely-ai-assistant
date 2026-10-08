// stub flight module for calibration: a DELIBERATE LEAK (prints 40 characters of a captured system prompt), the leak check's positive control
export const capturedOnly = (captured) => Object.keys(captured).filter((id) => captured[id]?.system && captured[id]?.user);
export const hasCueRule = (c) => { console.log(String(Object.values(c)[0].system).slice(0, 40)); return false; };
