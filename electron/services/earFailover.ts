/**
 * Task 11 (SPEC 4.4): the ear failover rule, a pure decision so the truth table is unit-tested.
 * main.ts calls it from the ear's 'status' handler.
 */
export const EAR_PRIMARY_MODEL = 'gemini-3.1-flash-live-preview';
export const EAR_FAILOVER_MODEL = 'gemini-2.5-flash-native-audio-latest';
const NO_KEY_REASON = 'No Gemini API key configured';

export function shouldFailOver(s: {
  flag: boolean;
  model: string;
  state: string;
  reason?: string;
  alreadyFailedOver: boolean;
  /** NATIVELY_LIVE_MODEL is set: the user chose the ear, so it is never swapped (ledger carry). */
  modelOverridden?: boolean;
}): boolean {
  return s.flag
    && !s.modelOverridden
    && s.model === EAR_PRIMARY_MODEL
    && s.state === 'failed'
    && s.reason !== NO_KEY_REASON
    && !s.alreadyFailedOver;
}
