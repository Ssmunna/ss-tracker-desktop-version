import type { Paged } from './org-types';

export interface AppSettings {
    website_name: string;
    logo_url: string | null;
    favicon_url: string | null;
    weekly_holidays: number[];
    ai_task_creation_enabled: boolean;
    stale_task_alert_enabled: boolean;
    stale_task_reminder_time: string;
    stale_task_digest_time: string;
    phase_label_singular: string;
    phase_label_plural: string;
    google_drive_connected: boolean;
    google_drive_email: string | null;
    google_drive_parent_folder_name: string;
}

export interface HolidayRow {
    id: number;
    holiday_date: string;
    name: string | null;
}

export interface HolidayPage {
    holidays: HolidayRow[];
    meta: Paged;
}
