/**
 * The mascot speaks while the app window can be seen, even if another window has the keyboard
 * (the person may be watching this one). Only when the tab is hidden does the desktop pop-up /
 * web push do the job instead, so nothing is announced twice.
 */
export function mascotSpeaksNow(enabled: boolean): boolean {
    return enabled && document.visibilityState === 'visible';
}

export const prefersReducedMotion = () =>
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
