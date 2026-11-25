export type ActiveStatus = 'active' | 'inactive';

export interface DepartmentRow {
    id: number;
    name: string;
    status: ActiveStatus;
    members_count: number;
    projects_count: number;
}

export interface CategoryRow {
    id: number;
    name: string;
    weight: number;
    status: ActiveStatus;
    projects_count: number;
}

export interface ClientRow {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    country: string | null;
    address: string | null;
    company_name: string | null;
    status: ActiveStatus;
    projects_count: number;
}

export interface ClientInput {
    name: string;
    email: string;
    phone: string | null;
    country: string | null;
    address: string | null;
    company_name: string | null;
    status: ActiveStatus;
}

export interface Paged {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
}

interface PersonRef {
    id: number;
    name: string;
    developer_code: string;
}

export interface TrashedProject {
    id: number;
    name: string;
    project_code: string;
    status: string | null;
    deleted_at: string | null;
    owner: PersonRef | null;
    total_tasks_count: number;
    trashed_tasks_count: number;
    prd_original_name: string | null;
    phases_count: number;
    deleted_by: string | null;
}

export interface TrashedTask {
    id: number;
    task_code: string | null;
    title: string;
    status: string;
    deleted_at: string | null;
    attachments_count: number;
    project: {
        id: number;
        name: string;
        project_code: string;
        deleted_at: string | null;
    } | null;
    assigned_developer: PersonRef | null;
    created_by: PersonRef | null;
}

export interface RestoreData {
    active_tab: string;
    projects_count: number;
    tasks_count: number;
    projects: {
        data: TrashedProject[];
        links: { url: string | null; label: string; active: boolean }[];
    };
    tasks: {
        data: TrashedTask[];
        links: { url: string | null; label: string; active: boolean }[];
    };
}

export interface ActivityLog {
    id: number;
    log_name: string;
    event: string;
    event_key: string;
    description: string | null;
    subject_type: string | null;
    subject_id: number | null;
    subject_name: string | null;
    project_name: string | null;
    causer: { id: number; name: string; email: string } | null;
    properties: {
        old?: Record<string, unknown>;
        new?: Record<string, unknown>;
    } | null;
    ip_address: string | null;
    user_agent: string | null;
    created_at: string | null;
}

export interface ActivityData {
    logs: ActivityLog[];
    filter_options: {
        users: { id: number; name: string; email: string }[];
        departments: { id: number; name: string }[];
        log_names: string[];
        events: string[];
    };
    meta: Paged;
}

export interface ActivityQuery {
    from_date?: string;
    to_date?: string;
    user_id?: string;
    department_id?: string;
    log_name?: string;
    event?: string;
    page?: number;
    per_page?: number;
}
