/** Reads a theme token (e.g. "ember-500") as a CSS colour, for canvas charts. */
export function themeColor(token: string, fallback = 'currentColor'): string {
    if (typeof document === 'undefined') {
        return fallback;
    }

    const value = getComputedStyle(document.documentElement)
        .getPropertyValue(`--color-${token}`)
        .trim();

    return value === '' ? fallback : value;
}
