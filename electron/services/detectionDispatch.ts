import type { AdmitResult } from './ChipDeduper';

export type DispatchAction = 'answer' | 'chip' | 'drop';

/**
 * What to do with a detected interviewer question, given the Live mode and the
 * deduper's verdict. Pure, so every cell of mode × admitted × alreadyAnswered
 * is a test. Auto answers the first detection from EITHER pipeline and never
 * twice; before this, only the Live branch could answer, so a question the
 * STT detector surfaced first was never answered (22 of 52 on 2026-09-02).
 */
export function decideDispatch(mode: 'off' | 'suggest' | 'auto', verdict: AdmitResult): DispatchAction {
    if (mode === 'off') return 'drop';
    if (mode === 'suggest') return verdict.admitted ? 'chip' : 'drop';
    if (verdict.admitted) return 'answer';
    return verdict.alreadyAnswered ? 'drop' : 'answer';
}
