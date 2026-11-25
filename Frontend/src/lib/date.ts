/** Port of composables/useDateTime.ts. */
const dateFormatter = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
});
const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
});

function parseDateOnly(value: string): Date {
    const normalized = value.trim();

    // A bare date is read at noon so time zones cannot shift the day.
    return /^\d{4}-\d{2}-\d{2}$/.test(normalized)
        ? new Date(`${normalized}T12:00:00`)
        : new Date(normalized);
}

const isValid = (date: Date) => !Number.isNaN(date.getTime());

export function formatDate(value?: string | null): string {
    if (!value) {
        return '-';
    }

    const date = parseDateOnly(value);

    return isValid(date) ? dateFormatter.format(date) : '-';
}

export function formatDateTime(value?: string | null): string {
    if (!value) {
        return '-';
    }

    const date = new Date(value);

    return isValid(date) ? dateTimeFormatter.format(date) : '-';
}
