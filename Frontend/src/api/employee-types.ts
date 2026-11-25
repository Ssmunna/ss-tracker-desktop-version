/** Shapes of the employee-scope reads (EmployeeReadController and its queries). */

export type Priority = 'urgent' | 'high' | 'normal' | 'low';

export type ProjectStatus =
    | 'In Progress'
    | 'Cancelled'
    | 'Failed'
    | 'Successful'
    | 'Paused/Hold'
    | 'In Review'
    | 'Payment Pending';

export interface HourStats {
    today_hours: number;
    month_hours: number;
    target_hours: number;
    remaining_hours: number;
    progress_percentage: number;
    previous_month_hours: number;
}

export interface WorkedProject {
    project_id: number;
    project_name: string;
    project_code: string;
    phase_id: number | null;
    phase_name: string | null;
    deadline: string | null;
    completion_percentage: number;
    hours: number;
    latest_updated_at: string | null;
    completed_tasks_count: number;
    completed_tasks: Array<{ id: number; task_code: string; title: string }>;
}

export interface KpiCard {
    key: string;
    title: string;
    target_label: string;
    achieved_label: string;
    score: number;
    max_score: number;
    progress_percent: number;
}

export interface EmployeeDashboard {
    type: 'employee';
    hourStats: HourStats;
    workedProjects: WorkedProject[];
    historyFilters: { selected_date: string };
    kpiCards: KpiCard[];
    general_tasks: { due_today: number; overdue: number };
    recent_conversations: Array<{
        id: number;
        type: string;
        name: string | null;
        last_message: {
            body: string;
            sender_name: string | null;
            at: string;
        } | null;
        last_message_at: string | null;
        unread_count: number;
    }>;
}

export interface MyProject {
    id: number;
    name: string;
    project_code: string;
    status: ProjectStatus;
    deadline?: string | null;
    client: { id: number; name: string } | null;
    pending_tasks_count: number;
    completed_tasks_count: number;
    my_completed_tasks_count: number;
    my_completion_percentage: number;
    project_completion_percentage: number;
    reports_count: number;
    reported_tasks_count: number;
    latest_report_at: string | null;
    is_project_owner: boolean;
    assigned_developer_ids: number[];
    /** The project has ongoing tasks switched on. */
    ongoing_enabled: boolean;
}

export interface TeamDeveloper {
    id: number;
    name: string;
    developer_code: string;
}

export interface MyProjectsResponse {
    projects: MyProject[];
    team_developers: TeamDeveloper[];
}

export interface GeneralTask {
    id: number;
    title: string;
    description: string | null;
    priority: Priority | null;
    deadline: string | null;
    status: string;
    completed_at: string | null;
    is_overdue: boolean;
    is_locked: boolean;
    assigned_by: string | null;
    spent_minutes: number | null;
}

export interface GeneralTasksResponse {
    tasks: GeneralTask[];
    month: string;
    today: string;
    monthly_weight: number;
    summary: {
        assigned: number;
        completed: number;
        missed: number;
        late: number;
        is_closed: boolean;
        awarded_kpi_percentage: number | null;
    } | null;
}

export type TaskStatusChange =
    | { status: 'completed'; time_entry: string }
    | { status: 'pending' | 'in_progress' };
