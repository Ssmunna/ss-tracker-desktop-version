/** Admin dashboard payload (AdminDashboardQuery + chart data + recent activity). */

export interface ChartData {
    today_by_project: { labels: string[]; reports: number[]; tasks: number[] };
    monthly_activity: { labels: string[]; reports: number[] };
}

export interface AdminDashboard {
    type: 'admin';
    stats: {
        total_reports: number;
        total_projects: number;
        in_progress_projects: number;
        cancelled_projects: number;
        successful_projects: number;
        payment_pending_projects: number;
        today_reports: number;
        month_reports: number;
        total_developers: number;
    };
    chartData: ChartData;
    recentUpdates: Array<{
        id: number;
        report_date: string;
        created_at: string;
        developer: { name: string; developer_code: string | null };
        project: { name: string | null; project_code: string };
        tasks_count: number;
    }>;
    todayProjectWork: Array<{
        project_id: number;
        project_name: string;
        project_code: string;
        reports_count: number;
        tasks_count: number;
        developers: string[];
        latest_report_at: string | null;
    }>;
    recentLogins: Array<{
        id: number;
        name: string | null;
        email: string | null;
        role: string | null;
        ip_address: string | null;
        user_agent: string | null;
        last_activity_at: string;
    }>;
    staleTaskDigest: {
        date: string;
        generated_at: string;
        rows: Array<{ name: string; open_tasks: number; projects: string[] }>;
    } | null;
    recent_activity: Array<{
        id: number;
        event_key: string;
        description: string;
        causer: string | null;
        created_at: string;
    }>;
}
