/** Shapes of `GET /projects/{id}` (DeveloperProjectDetailQuery) and its sub-resources. */
import type { Priority } from './employee-types';

export type TaskStatus = 'pending' | 'in_progress' | 'completed';
export type RequestStatus = 'pending' | 'approved' | 'rejected';

export interface PersonRef {
    id: number;
    name: string;
    developer_code: string;
}

export interface TaskAttachment {
    id: number;
    file_name: string;
    file_url: string;
    mime_type: string | null;
    file_size: number | null;
    is_image: boolean;
    created_at: string | null;
}

export interface TaskItem {
    id: number;
    project_phase_id: number | null;
    task_code: string | null;
    serial_no: number;
    title: string;
    description: string | null;
    estimated_hours: number | null;
    weight: number | null;
    deadline: string | null;
    priority: Priority | null;
    status: TaskStatus;
    milestone_id: number | null;
    milestone: { id: number; name: string } | null;
    created_by_developer_id: number | null;
    assigned_developer_id: number | null;
    created_by: PersonRef | null;
    assigned_developer: PersonRef | null;
    attachments: TaskAttachment[];
    my_completion_time_entry: string | null;
    my_completion_spent_minutes: number | null;
    my_completion_completed_at: string | null;
    can_edit_completion_time: boolean;
}

export interface ProjectRequestItem {
    id: number;
    project_phase_id: number | null;
    title: string;
    description: string | null;
    links: string[] | null;
    priority: Priority;
    status: RequestStatus;
    approved_date: string | null;
    reason: string | null;
    created_at: string | null;
    requested_by: PersonRef | null;
    reviewed_by: PersonRef | null;
    reviewed_at: string | null;
}

export interface DeadlineExtensionItem {
    id: number;
    project_phase_id: number | null;
    reason: string;
    current_deadline_snapshot: string | null;
    requested_deadline: string | null;
    status: RequestStatus;
    new_deadline: string | null;
    previous_weight: number | null;
    new_weight: number | null;
    review_note: string | null;
    created_at: string | null;
    requested_by: PersonRef | null;
    reviewed_by: PersonRef | null;
    reviewed_at: string | null;
}

export interface IssueItem {
    id: number;
    title: string;
    description: string | null;
    status: 'open' | 'in_progress' | 'resolved';
    created_at: string | null;
    client: { id: number; name: string } | null;
    reported_by: { id: number; name: string } | null;
}

export interface MilestoneItem {
    id: number;
    project_phase_id: number | null;
    name: string;
    weight: number;
    estimated_hours: number;
    tasks_hours_sum: number;
    order: number;
    tasks_count: number;
    completed_tasks_count: number;
    completion_percentage: number;
    weight_rebalance_status: 'idle' | 'processing';
}

export interface PhaseItem {
    id: number;
    name: string;
    sequence_no: number;
    status: string;
    is_locked: boolean;
    deadline: string | null;
    effective_weight: number | null;
}

export interface DriveDocument {
    id: string;
    name: string;
    mime_type: string;
    size: number;
    web_view_link: string;
    icon_link: string;
    created_at: string | null;
}

export interface TodayCompletedTask {
    task_id: number;
    task_code: string;
    title: string;
    time_entry: string;
    spent_minutes: number;
    completed_at: string | null;
}

/** A Google Drive or other link kept on a project. */
export interface ProjectLink {
    url: string;
    label: string | null;
}

export interface ProjectDetail {
    project: {
        links?: ProjectLink[] | null;
        id: number;
        name: string;
        project_code: string;
        status: string;
        deadline: string | null;
        effective_weight: number | null;
        type: 'Monthly' | 'Periodic' | null;
        category: { id: number; name: string; weight: number } | null;
        client: { id: number; name: string } | null;
        is_project_owner: boolean;
        owner: PersonRef | null;
        team_developers: Array<PersonRef & { assigned: boolean }>;
        pending_tasks_count: number;
        completed_tasks_count: number;
        tasks: TaskItem[];
        requests: ProjectRequestItem[];
        deadline_extensions: DeadlineExtensionItem[];
        issues: IssueItem[];
    };
    milestones: MilestoneItem[];
    milestones_total_weight: number;
    phases: PhaseItem[];
    selected_phase_id: number | null;
    selected_phase: {
        id: number;
        name: string;
        status: string;
        deadline: string | null;
        base_weight: number;
        effective_weight: number;
    } | null;
    prd_available: boolean;
    prd: { name: string | null; status: string } | null;
    /** Decides whether the Ongoing tab shows to this employee. */
    ongoing: { enabled: boolean; is_member: boolean; has_open_work: boolean };
    documents: DriveDocument[];
    documents_error: string | null;
    stats: {
        reports_count: number;
        reported_tasks_count: number;
        my_completed_tasks_count: number;
        my_completion_percentage: number;
        project_completion_percentage: number;
        today_work_hours: number;
        month_work_hours: number;
        remaining_month_hours: number;
        monthly_target_hours: number;
        previous_month_work_hours: number;
        today_completed_tasks_count: number;
        today_project_time_entry: string;
        today_project_hours: number;
        today_project_minutes: number;
        today_completed_tasks: TodayCompletedTask[];
    };
}

export interface TaskFormValues {
    title: string;
    description: string;
    milestone_id: number;
    estimated_hours: number;
    weight: number;
    deadline: string;
    priority: Priority | '';
    assigned_developer_id?: number | null;
}
