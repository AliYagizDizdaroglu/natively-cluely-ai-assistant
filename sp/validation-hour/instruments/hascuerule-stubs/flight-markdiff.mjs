// stub flight module for calibration: honest hasCueRule, but its CUE_RULE_MARK is not r4's [CUES FIRST]
export const CUE_RULE_MARK = '[CUE FIRST]';
export const capturedOnly = (captured) => Object.keys(captured).filter((id) => captured[id]?.system && captured[id]?.user);
export const hasCueRule = (c) => { const ids = capturedOnly(c); return ids.length > 0 && ids.every((id) => String(c[id].system ?? '').includes('[CUES FIRST]')); };
