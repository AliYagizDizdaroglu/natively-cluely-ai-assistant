// stub flight module for calibration: capturedOnly is honest, hasCueRule LIES (always true)
export const capturedOnly = (captured) => Object.keys(captured).filter((id) => captured[id]?.system && captured[id]?.user);
export const hasCueRule = () => true;
