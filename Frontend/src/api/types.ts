/** Hand-written from MeController::payload (the OpenAPI doc types `data` loosely). */

export type Home = 'admin' | 'employee' | 'client';

export interface AuthUser {
    id: number;
    name: string;
    email: string;
    avatar: string | null;
    avatar_url: string | null;
    email_verified_at: string | null;
    roles: string[];
    permissions: string[];
    [key: string]: unknown;
}

export interface ManualReportState {
    date: string;
    developer_code: string;
    is_submitted_today: boolean;
    submitted_text: string | null;
    submitted_at: string | null;
    updated_at: string | null;
    is_edited: boolean;
}

export interface RealtimeConfig {
    key: string | null;
    host: string | null;
    port: number;
    scheme: string;
    auth_endpoint: string;
}

export interface MeData {
    user: AuthUser;
    developer: {
        id: number;
        developer_code: string;
        name: string;
        email: string;
        username: string | null;
    } | null;
    client: { id: number; name: string; status: string } | null;
    app_settings: {
        website_name: string;
        logo_url: string | null;
        favicon_url: string | null;
    };
    phase_label: { singular: string; plural: string };
    manual_report: ManualReportState | null;
    pending_requests_count: number;
    pending_extensions_count: number;
    unread_messages_count: number;
    unread_notifications_count: number;
    chat_user_channel: string;
    realtime: RealtimeConfig;
    telegram: {
        configured: boolean;
        has_employee: boolean;
        connected: boolean;
        username: string | null;
        link_url: string | null;
    };
    password_policy: {
        min_length: number;
        mixed_case: boolean;
        numbers: boolean;
        symbols: boolean;
        uncompromised: boolean;
    };
    app_version: string;
    home: Home | null;
}

export type LoginResult =
    | { two_factor: false; token: string; token_type: 'Bearer' }
    | { two_factor: true; challenge_token: string; expires_in: number };

/** `{ message, errors, code }` error envelope. */
export interface ApiErrorBody {
    message?: string;
    errors?: Record<string, string[]>;
    code?: string;
}
