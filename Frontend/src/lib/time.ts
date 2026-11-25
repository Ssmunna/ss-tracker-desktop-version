/** "H.MM" the API expects for a time entry: 1h 05m is "1.05". */
export function toTimeEntry(hours: number, minutes: number): string {
    return `${hours}.${String(minutes).padStart(2, '0')}`;
}

export function formatMinutes(minutes: number | null | undefined): string {
    if (minutes === null || minutes === undefined) {
        return '-';
    }

    const h = Math.floor(minutes / 60);
    const m = minutes % 60;

    return h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`;
}
