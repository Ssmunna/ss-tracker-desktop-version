import type { Priority } from './employee-types';

export interface AdminGeneralTask {
    id: number;
    title: string;
    description: string | null;
    priority: Priority | null;
    deadline: string | null;
    status: string;
    completed_at: string | null;
    is_overdue: boolean;
    is_locked: boolean;
    assignee: { id: number; name: string; developer_code: string } | null;
    assigned_by?: string | null;
    spent_minutes?: number | null;
}

export interface Person {
    id: number;
    name: string;
    developer_code: string;
}

export interface GeneralIndex {
    tasks: AdminGeneralTask[];
    developers: Person[];
    monthly_weight: number;
    filters: {
        month: string;
        developer_id: string | number | null;
        status: string | null;
    };
}

export interface GeneralSummaryRow {
    developer_id: number;
    developer_name: string;
    developer_code: string;
    assigned: number;
    completed: number;
    missed: number;
    late: number;
    is_closed: boolean;
    awarded_kpi_percentage: number | null;
}

export interface GeneralOverview {
    rows: GeneralSummaryRow[];
    monthly_weight: number;
    filters: { month: string; search: string };
}

export interface GeneralEmployee {
    employee: Person;
    tasks: AdminGeneralTask[];
    summary: GeneralSummaryRow | null;
    monthly_weight: number;
    month: string;
}

export interface GeneralTaskInput {
    title: string;
    description: string | null;
    assigned_developer_id: number;
    priority: Priority | null;
    deadline: string;
}
