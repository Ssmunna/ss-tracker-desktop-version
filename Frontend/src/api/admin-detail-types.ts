/** `GET /manage/projects/{id}` (AdminProjectDetailQuery + ProjectController::show). */
import type { Priority } from './employee-types';
import type { AdminProjectRow } from './admin-project-types';
import type { DriveDocument, PersonRef, RequestStatus } from './project-types';

export type PhaseStatusValue = 'In Progress' | 'Successful' | string;

export interface AdminPhase {
    id: number;
    name: string;
    sequence_no: number;
    status: PhaseStatusValue;
    phase_weight: number;
    effective_weight: number | null;
    deadline: string | null;
    kpi_year: number | null;
    kpi_month: number | null;
    completion_percentage: number;
    is_locked: boolean;
    snapshots_count: number;
    owner: PersonRef | null;
}

export interface AdminTask {
    id: number;
    project_phase_id: number | null;
    task_code: string | null;
    title: string;
    status: 'pending' | 'in_progress' | 'completed';
    priority: Priority | null;
    estimated_hours: number | null;
    deadline: string | null;
    assigned_developer: PersonRef | null;
}

export interface AdminMilestone {
    id: number;
    project_phase_id: number | null;
    name: string;
    weight: number;
    deadline: string | null;
    estimated_hours: number;
    tasks_weight_sum: number;
    tasks_hours_sum: number;
    tasks_count: number;
    completed_tasks_count: number;
    completion_percentage: number;
    weight_rebalance_status: string;
}

export interface AdminRequest {
    id: number;
    title: string;
    description: string | null;
    links: string[];
    priority: Priority;
    status: RequestStatus;
    approved_date: string | null;
    reason: string | null;
    created_at: string | null;
    reviewed_at: string | null;
    requested_by: PersonRef | null;
    reviewed_by: PersonRef | null;
}

export interface AdminExtension {
    id: number;
    project_phase_id: number | null;
    reason: string;
    status: RequestStatus;
    current_deadline_snapshot: string | null;
    requested_deadline: string | null;
    new_deadline: string | null;
    new_weight: number | null;
    review_note: string | null;
    created_at: string | null;
    reviewed_at: string | null;
    requested_by: PersonRef | null;
    reviewed_by: PersonRef | null;
}

export interface AdminIssue {
    id: number;
    title: string;
    description: string | null;
    status: 'open' | 'in_progress' | 'resolved';
    created_at: string | null;
    client: { id: number; name: string } | null;
    reported_by: { id: number; name: string } | null;
}

export interface Credential {
    id: number;
    label: string;
    credential_type: 'login' | 'api_key' | 'database' | 'ssh' | 'other';
    url_or_host: string | null;
    username: string | null;
    environment: 'development' | 'staging' | 'production' | 'other' | null;
    expires_at: string | null;
    last_verified_at: string | null;
}

export interface AdminProjectDetail {
    project: AdminProjectRow;
    documents: DriveDocument[];
    documents_error: string | null;
    departments: Array<{ id: number; name: string; status: string }>;
    categories: Array<{
        id: number;
        name: string;
        weight: number;
        status: string;
    }>;
    tasks: AdminTask[];
    phases: AdminPhase[];
    phase_statuses: string[];
    selected_phase_id: number | null;
    active_phase_id: number | null;
    milestones: AdminMilestone[];
    milestones_total_weight: number;
    project_completion_percentage: number;
    project_requests: AdminRequest[];
    deadline_extensions: AdminExtension[];
    project_issues: AdminIssue[];
    available_developers: PersonRef[];
    project_developers: Array<
        PersonRef & {
            completed_tasks: number;
            contribution_percentage: number;
            deadline_extensions_count: number;
        }
    >;
    completion_events: Array<{
        project_task_id: number;
        action: string;
        event_at: string | null;
    }>;
    deadline_extensions_count: number;
    deadline_extensions_breakdown: {
        pending: number;
        approved: number;
        rejected: number;
    };
    credentials: Credential[];
    initial_credential_id: number | null;
    schedule: Record<string, unknown> | null;
    prd: {
        name: string | null;
        status: string;
        ai_status: string;
        ai_message: string | null;
        error: string | null;
        size: number | null;
        uploaded_at: string | null;
    } | null;
}

export interface CredentialBody {
    label: string;
    credential_type: Credential['credential_type'];
    url_or_host?: string | null;
    username?: string | null;
    secret?: string;
    notes?: string | null;
    environment?: Credential['environment'];
    expires_at?: string | null;
}
