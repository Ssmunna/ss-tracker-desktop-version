import type { PrayerOverview, PrayerToday } from '@/api/prayer-types';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** `16:30` -> `4:30 PM`. */
export function formatClock(time: string): string {
    const [hours, minutes] = time.split(':').map(Number);

    if (Number.isNaN(hours) || Number.isNaN(minutes)) {
        return time;
    }

    return `${hours % 12 === 0 ? 12 : hours % 12}:${String(minutes).padStart(2, '0')} ${hours < 12 ? 'AM' : 'PM'}`;
}

/** `[5]` -> `Fri`; null or empty -> `Every day`. */
export function formatDays(days: number[] | null): string {
    return days && days.length > 0
        ? days.map((day) => WEEKDAYS[day] ?? '?').join(', ')
        : 'Every day';
}

/** `16:30` minus 10 minutes -> `16:20` (wraps past midnight). */
export function alertClock(time: string, minutesBefore: number): string | null {
    if (minutesBefore <= 0) {
        return null;
    }

    const [hours, minutes] = time.split(':').map(Number);
    const total = (hours * 60 + minutes - minutesBefore + 1440) % 1440;

    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

export const ALERT_OPTIONS = [0, 5, 10, 15, 20, 30].map((minutes) => ({
    value: String(minutes),
    label: minutes === 0 ? 'No early alert' : `${minutes} min before`,
}));

/** `YYYY-MM-DD` of an instant in the given timezone. */
export function dayKey(ms: number, timezone: string): string {
    return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(ms);
}

/** `4320` -> `1 h 12 m`; under ten minutes the seconds show too. */
export function formatCountdown(seconds: number): string {
    const total = Math.max(0, Math.floor(seconds));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);

    if (hours > 0) {
        return `${hours} h ${minutes} m`;
    }

    if (minutes >= 10) {
        return `${minutes} m`;
    }

    return minutes > 0
        ? `${minutes} m ${String(total % 60).padStart(2, '0')} s`
        : `${total} s`;
}

export interface ResolvedPrayers {
    prayers: PrayerToday[];
    next: PrayerToday | null;
    /** Seconds until `next` starts. */
    secondsUntil: number;
    /** `next` is inside its alert window right now. */
    inAlertWindow: boolean;
    /** The server's answer no longer matches the clock (a prayer passed or the day changed): ask again. */
    stale: boolean;
}

/**
 * Re-derives past / next / upcoming from the server's list and a server-aligned clock, so the
 * highlight moves on its own between fetches.
 */
export function resolvePrayers(
    overview: PrayerOverview,
    nowMs: number,
): ResolvedPrayers {
    const startsAt = (prayer: PrayerToday) => Date.parse(prayer.starts_at);
    const today = dayKey(nowMs, overview.timezone);
    const nextToday = overview.prayers.find(
        (prayer) => startsAt(prayer) > nowMs,
    );
    const prayers = overview.prayers.map((prayer) => ({
        ...prayer,
        state:
            prayer === nextToday
                ? ('next' as const)
                : startsAt(prayer) > nowMs
                  ? ('upcoming' as const)
                  : ('past' as const),
    }));
    const upcoming =
        nextToday ??
        (overview.next && startsAt(overview.next) > nowMs
            ? overview.next
            : null);
    const next = upcoming
        ? {
              ...upcoming,
              state: 'next' as const,
              is_tomorrow: upcoming.starts_at.slice(0, 10) !== today,
          }
        : null;
    const alertAt = next?.alert_at ? Date.parse(next.alert_at) : null;

    return {
        prayers,
        next,
        secondsUntil: next ? Math.max(0, (startsAt(next) - nowMs) / 1000) : 0,
        inAlertWindow: next !== null && alertAt !== null && nowMs >= alertAt,
        stale:
            dayKey(Date.parse(overview.now), overview.timezone) !== today ||
            (overview.next !== null && startsAt(overview.next) <= nowMs),
    };
}
