export interface PrayerTimeRow {
    id: number;
    name: string;
    /** Wall-clock `HH:mm` in the workspace timezone. */
    start_time: string;
    alert_minutes_before: number;
    /** `dayOfWeek` numbers (0 = Sunday); null = every day. */
    days: number[] | null;
    is_active: boolean;
    sort_order: number;
}

export interface PrayerTimeInput {
    name: string;
    start_time: string;
    alert_minutes_before: number;
    days: number[];
    is_active: boolean;
}

export type PrayerState = 'past' | 'next' | 'upcoming';

/** One prayer as `GET /prayer-times` describes it, computed on the server at `now`. */
export interface PrayerToday {
    id: number;
    name: string;
    start_time: string;
    alert_minutes_before: number;
    /** ISO 8601 with the workspace offset. */
    starts_at: string;
    alert_at: string | null;
    is_tomorrow: boolean;
    in_alert_window: boolean;
    seconds_until: number;
    state: PrayerState;
}

export interface PrayerOverview {
    now: string;
    timezone: string;
    prayers: PrayerToday[];
    next: PrayerToday | null;
}
