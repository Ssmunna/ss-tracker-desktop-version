/** The all-projects list and project rows (AdminProjectPresenter, ProjectController::index). */
import type { ProjectStatus } from './employee-types';
import type { ProjectLink } from './project-types';

export type ProjectType = 'Monthly' | 'Periodic';
export type DriveFolderStatus = 'ready' | 'missing' | 'not_connected';

export interface ProjectGroupRef {
    id: number;
    name: string;
    slug: string;
    color: string;
}

export interface AdminProjectRow {
    id: number;
    project_code: string;
    name: string;
    status: ProjectStatus;
    type: ProjectType | null;
    created_at: string | null;
    completed_at: string | null;
    points: number | null;
    estimated_hours: number | null;
    total_worked_hours: number;
    deadline: string | null;
    departments: Array<{ id: number; name: string; status: string }>;
    department_ids: number[];
    client: { id: number; name: string } | null;
    client_id: number | null;
    category: { id: number; name: string; weight: number } | null;
    category_id: number | null;
    group: ProjectGroupRef | null;
    project_group_id: number | null;
    effective_weight: number | null;
    assigned_developers: Array<{
        id: number;
        name: string;
        developer_code: string;
    }>;
    owner: { id: number; name: string; developer_code: string } | null;
    owner_developer_id: number | null;
    current_phase: { id: number; name: string; status: string } | null;
    tasks_count: number;
    completed_tasks_count: number;
    milestones_count: number;
    milestones_weight_sum: number;
    project_completion_percentage: number;
    prd_original_name: string | null;
    prd_status: 'none' | 'processing' | 'ready' | 'failed' | string;
    prd_ai_status:
        | 'idle'
        | 'uploading'
        | 'analyzing'
        | 'creating_tasks'
        | 'completed'
        | 'failed'
        | string;
    prd_ai_message: string | null;
    prd_error: string | null;
    google_drive_url: string | null;
    links: ProjectLink[];
    has_drive_folder: boolean;
    drive_folder_status: DriveFolderStatus;
}

export interface ProjectFormOptions {
    developers: Array<{
        id: number;
        name: string;
        email: string;
        developer_code: string;
        is_active: boolean;
    }>;
    departments: Array<{ id: number; name: string; status: string }>;
    clients: Array<{ id: number; name: string; status: string }>;
    categories: Array<{
        id: number;
        name: string;
        weight: number;
        status: string;
    }>;
    groups: Array<ProjectGroupRef & { status: string }>;
    ai_task_creation_enabled: boolean;
    next_project_code: string;
}

export interface AdminProjectFilters {
    search: string;
    status: string;
    group_id: string | null;
    department_id: number | null;
    assignment: string;
    per_page: number;
}

export interface AdminProjectsResponse {
    projects: AdminProjectRow[];
    status_counts: Record<string, number>;
    drive_connected: boolean;
    filters: AdminProjectFilters;
    can_change_department_filter: boolean;
    locked_department_id: number | null;
    form_options: ProjectFormOptions;
}

export interface PageMeta {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
}

export interface AdminProjectQuery {
    search?: string;
    status?: string;
    department_id?: string;
    group_id?: string;
    assignment?: string;
    per_page?: number;
    page?: number;
}
