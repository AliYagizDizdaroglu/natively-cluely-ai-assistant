/**
 * Which window receives the intelligence events (hands-free answers, detected-question chips,
 * recap, clarify, follow-ups, refined answers).
 *
 * Why: main.ts routed them to WindowHelper.getMainWindow(), which follows currentWindowMode.
 * That mode names the launcher whenever the launcher was the last window switched to — an
 * autostarted meeting never switches it, the launcher's ready-to-show handler switches back to
 * it even while a meeting runs, and the overlay's logo click does too. During a meeting the
 * answers then went to the hidden launcher, which renders none of them, while the overlay showed
 * only the broadcast question bubbles. Reproduced 2026-09-06 with the detector chain test: two
 * hands-free answers streamed by the main process, neither in the overlay DOM 40 s later; the
 * same answer rendered in the overlay within 2 s once the mode was 'overlay'.
 *
 * The overlay is the meeting UI, so while a meeting is active it is the target regardless of the
 * mode; outside a meeting the mode's window stays the target.
 */
export function pickIntelligenceSurface<W extends { isDestroyed(): boolean }>(
    meetingActive: boolean,
    overlay: W | null,
    modeWindow: W | null,
): W | null {
    if (meetingActive && overlay && !overlay.isDestroyed()) return overlay;
    return modeWindow;
}
