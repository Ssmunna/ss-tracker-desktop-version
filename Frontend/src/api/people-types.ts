import type { Paged } from './org-types';

export interface EmployeeRow {
    id: number;
    developer_code: string;
    name: string;
    email: string;
    username: string | null;
    department: string | null;
    department_id: number | null;
    role_names: string[];
    is_active: boolean;
    target_points: number;
    completed_tasks_count: number;
    completed_tasks_month_count: number;
    kpi_month_total: number;
}

export interface EmployeeList {
    developers: EmployeeRow[];
    departments: { id: number; name: string; status: string }[];
    roles: { id: number; name: string }[];
    meta: Paged;
}

export interface EmployeeQuery {
    search?: string;
    status?: string;
    department_id?: string;
    page?: number;
    per_page?: number;
}

export interface EmployeeDetail {
    developer: {
        id: number;
        developer_code: string;
        name: string;
        email: string;
        department: string | null;
        is_active: boolean;
        completed_tasks_count: number;
        deadline_extensions_requested_count: number;
    };
    form: {
        department_id: number | null;
        target_points: number;
        role_names: string[];
    };
    projectBreakdown: {
        project_id: number;
        project_name: string;
        project_code: string;
        status: string | null;
        deadline: string | null;
        total_tasks: number;
        overall_completed_count: number;
        completion_percentage: number;
        developer_assigned_count: number;
        developer_completed_count: number;
        hours: number;
        track: string | null;
    }[];
    monthlyKpi: {
        year: number;
        month: number;
        total_kpi_achievement: number;
        personal_achievement_percentage: number;
    };
    hours: { today: number; month: number; total: number };
    reports_count: number;
    kpi_history: { year: number; month: number; total_kpi: number }[];
}

export interface EmployeeInput {
    name: string;
    developer_code: string;
    email: string;
    role_names: string[];
    department_id: number;
    is_active: boolean;
    target_points: number | null;
}

export interface PermissionGroup {
    group: string;
    permissions: { id: number; name: string }[];
}

export interface PermissionScreen {
    developer: {
        id: number;
        developer_code: string;
        name: string;
        email: string;
    };
    roleNames: string[];
    permissionGroups: PermissionGroup[];
    directPermissionIds: number[];
    rolePermissionNames: string[];
}

export interface RoleRow {
    id: number;
    name: string;
    system_role: boolean;
    users_count: number;
    permissions_count: number;
    permissions: { id: number; name: string; group_name: string | null }[];
}

export interface RoleList {
    roles: RoleRow[];
    permission_groups: PermissionGroup[];
    meta: Paged;
}

export interface RoleDetail {
    role: {
        id: number;
        name: string;
        system_role: boolean;
        permissions: { id: number; name: string; group_name: string | null }[];
    };
    permission_groups: PermissionGroup[];
}
