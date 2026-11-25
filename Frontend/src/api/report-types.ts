import type { PageMeta } from './admin-project-types';

export interface ReportRow {
    id: number;
    report_date: string;
    created_at: string;
    developer: { name: string; developer_code: string };
    project: {
        project_code: string;
        name: string;
        tasks_count: number;
        departments: { id: number; name: string; status: string }[];
    } | null;
    other_projects_count: number;
    tasks_count: number;
    progress_percentage: number;
    project_hours: number;
    day_total_hours: number;
}

export interface ReportsResponse {
    reports: ReportRow[];
    summary: {
        today: { reports: number; hours: number };
        month: { reports: number; hours: number };
    };
    missing_today: { id: number; name: string; developer_code: string }[];
    filter_options: {
        developers: { id: number; developer_code: string; name: string }[];
        projects: { id: number; project_code: string; name: string }[];
        departments: { id: number; name: string; status: string }[];
    };
    meta: PageMeta;
}

export interface ReportsQuery {
    developer_code?: string;
    project_code?: string;
    department_id?: string;
    from_date?: string;
    to_date?: string;
    per_page?: number;
    page?: number;
}

export interface ReportDetail {
    id: number;
    report_date: string;
    created_at: string;
    updated_at?: string;
    developer: { name: string; developer_code: string };
    total_completed_hours: number;
    projects: {
        id: number;
        name: string;
        project_code: string;
        department: string | null;
        completion_percentage: number;
        completed_tasks_count: number;
        total_tasks_count: number;
        estimated_hours: number;
        completed_hours: number;
        tasks: {
            id: number;
            task_code: string;
            description: string;
            estimated_hours: number | null;
            completed_hours: number | null;
        }[];
    }[];
}
