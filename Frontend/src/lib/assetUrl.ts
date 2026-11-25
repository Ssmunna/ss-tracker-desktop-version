const apiOrigin = (() => {
    try {
        return new URL(import.meta.env.VITE_API_URL ?? '/api/v1').origin;
    } catch {
        return '';
    }
})();

/**
 * Files uploaded to the API (logo, favicon, avatars) come back as `/uploads/...`, which
 * lives on the API host. Resolve them there when this app is served from another origin.
 */
export function assetUrl(url?: string | null): string | null {
    if (!url) {
        return null;
    }

    if (/^(https?:|data:|blob:|\/\/)/.test(url)) {
        return url;
    }

    // Some fields (chat `avatar_path`) omit the leading slash: still a path on the API host.
    return `${apiOrigin}${url.startsWith('/') ? '' : '/'}${url}`;
}
