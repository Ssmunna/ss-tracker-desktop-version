export interface ClientProjectRow {
    id: number;
    project_code: string;
    name: string;
    status: string | null;
    deadline: string | null;
    completion_percentage: number;
    current_phase: { seq: number; total: number } | null;
    completed_at: string | null;
}

export interface ClientPhase {
    id: number;
    name: string;
    sequence_no: number;
    status: string;
    is_locked: boolean;
}

export interface ClientIssue {
    id: number;
    title: string;
    description: string | null;
    status: 'open' | 'in_progress' | 'resolved';
    created_at: string | null;
}

export interface ClientPhaseDetail {
    id: number;
    name: string;
    start_date: string | null;
    deadline: string | null;
    completion_percentage: number;
    tasks_count: number;
    track: string | null;
    todays_work: { developer_name: string | null; tasks: string[] }[];
    developers: { id: number; name: string }[];
    issues: ClientIssue[];
    schedule?: {
        expected_percentage?: number | null;
        [key: string]: unknown;
    } | null;
}

export interface ClientProjectDetail {
    project: {
        id: number;
        project_code: string;
        name: string;
        status: string | null;
    };
    phases: ClientPhase[];
    selected_phase_id: number | null;
    phase_detail: ClientPhaseDetail | null;
}

export interface TwoFactorState {
    enabled: boolean;
    pending_confirmation: boolean;
    confirmed_at: string | null;
    setup: { secret: string; otpauth_url: string; qr_svg: string } | null;
}

export interface DeviceToken {
    id: number;
    name: string;
    last_used_at: string | null;
    created_at: string | null;
    is_current: boolean;
}
