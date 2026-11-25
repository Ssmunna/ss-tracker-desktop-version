const apiOrigin = () =>
    new URL(import.meta.env.VITE_API_URL ?? '/api/v1', window.location.origin)
        .origin;

/** The link must point at our own API, never at another site. */
export function isTrustedVerifyUrl(value: string): boolean {
    try {
        const url = new URL(value);

        return (
            url.origin === apiOrigin() &&
            /\/auth\/email\/verify\/\d+\/[a-f0-9]+$/.test(url.pathname)
        );
    } catch {
        return false;
    }
}
