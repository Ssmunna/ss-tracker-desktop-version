export interface KpiPeriod {
    year: number;
    month: number;
}

export interface KpiSheetRow {
    developer_id: number;
    developer_name: string;
    developer_code: string;
    department: string;
    total_kpi_achievement: number;
    personal_achievement_percentage: number;
    reduced_weight_count: number;
    phases_count: number;
    adjustments_total: number;
}

export interface KpiLeaderRow {
    developer_id: number;
    developer_name: string;
    developer_code: string;
    raw_output_total: number;
    personal_achievement_percentage: number;
    total_kpi_achievement: number;
}

export interface KpiSheet {
    period: KpiPeriod;
    developers: KpiSheetRow[];
    leaderboard: KpiLeaderRow[];
    departments: { id: number; name: string }[];
    all_developers: { id: number; name: string; developer_code: string }[];
}

export interface KpiSheetQuery {
    year?: number;
    month?: number;
    department_id?: string;
    developer_id?: string;
}

export interface KpiBreakdownRow {
    phase_id: number;
    phase_name: string | null;
    project_id: number | null;
    project_name: string | null;
    project_code: string | null;
    phase_weight: number;
    effective_weight: number;
    phase_completion_percentage: number;
    developer_contribution_percentage: number;
    awarded_kpi_percentage: number;
    extension_type: 'Regular' | 'Failed' | null;
    weight_adjusted: boolean;
    row_type: 'earned' | 'failed';
}

export interface KpiAdjustment {
    id: number;
    snapshot_id: number;
    phase_id: number | null;
    adjustment_percentage: number;
    reason: string;
    approved_by: string | null;
    approved_at: string | null;
}

export interface KpiBreakdown {
    snapshots: KpiBreakdownRow[];
    adjustments: KpiAdjustment[];
}

export interface KpiSnapshot {
    id: number;
    phase_id: number;
    developer: string | null;
    developer_code: string | null;
    project_code: string | null;
    phase: string | null;
    version_no: number;
    is_current: boolean;
    change_reason: string | null;
    phase_completion_percentage_snapshot: number;
    developer_contribution_percentage_snapshot: number;
    effective_weight_snapshot: number;
    awarded_kpi_percentage: number;
    calculated_at: string | null;
}

export interface KpiHistory {
    period: KpiPeriod;
    snapshots: KpiSnapshot[];
}

export interface KpiTimelineEvent {
    type: 'snapshot' | 'adjustment' | 'extension';
    at: string | null;
    developer?: string | null;
    version_no?: number;
    is_current?: boolean;
    change_reason?: string | null;
    awarded_kpi_percentage?: number;
    adjustment_percentage?: number;
    reason?: string;
    status?: string;
    extension_type?: string | null;
    previous_weight?: number | null;
    new_weight?: number | null;
    review_note?: string | null;
}
