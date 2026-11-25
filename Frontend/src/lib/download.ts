import { store } from '@/app/store';

const baseUrl = import.meta.env.VITE_API_URL ?? '/api/v1';

function filenameFrom(disposition: string | null, fallback: string): string {
    const match = disposition?.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);

    return match ? decodeURIComponent(match[1]) : fallback;
}

/**
 * Downloads a file from the API. Plain links cannot send the bearer token, so
 * the file is fetched with it and saved from a blob.
 */
export async function downloadFile(
    path: string,
    fallbackName = 'download',
): Promise<void> {
    const token = store.getState().auth.token;
    const response = await fetch(`${baseUrl}${path}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: '*/*' },
    });

    if (!response.ok) {
        throw new Error(
            response.status === 404
                ? 'The file is not available.'
                : 'The download failed.',
        );
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filenameFrom(
        response.headers.get('Content-Disposition'),
        fallbackName,
    );
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

/** Starts a browser download of `url` without leaving the page or opening a tab. */
export function saveUrl(url: string, name: string): void {
    const link = document.createElement('a');

    link.href = url;
    link.download = name;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
}
