import type { RouteObject } from 'react-router';

import {
    GuestOnly,
    HomeRedirect,
    RequireAuth,
} from '@/features/auth/RouteGuards';
import { InactivePage } from '@/features/auth/InactivePage';
import { LoginPage } from '@/features/auth/LoginPage';
import {
    ForgotPasswordPage,
    ResetPasswordPage,
} from '@/features/auth/RecoveryPages';
import { TwoFactorPage } from '@/features/auth/TwoFactorPage';
import { VerifyEmailPage } from '@/features/auth/VerifyEmailPage';
import { AppLayout, type RouteHandle } from '@/layouts/AppLayout';
import { LegacyOrNotFound, RouteError } from '@/pages/StatusPages';

/**
 * A screen that is built in a later phase. Its route, title and permission are
 * already final (see docs/web-react/screen-map.md); the phase that builds it
 * swaps `element` for a lazy `Component`.
 */
/** A built screen, loaded on demand so each phase adds to its own chunk. */
function lazyScreen(
    path: string,
    title: string,
    permission: string | undefined,
    lazy: NonNullable<RouteObject['lazy']>,
): RouteObject {
    const handle: RouteHandle = { title, permission };

    return { path, handle, lazy };
}

/** Routes behind login and inside the app shell. */
export const appScreens: RouteObject[] = [
    // Employee (phase 4)
    lazyScreen(
        'employee',
        'Dashboard',
        'employee-dashboard.view',
        async () => ({
            Component: (
                await import('@/features/employee/EmployeeDashboardPage')
            ).EmployeeDashboardPage,
        }),
    ),
    lazyScreen(
        'my-projects',
        'My Projects',
        'employee-projects.view',
        async () => ({
            Component: (await import('@/features/employee/MyProjectsPage'))
                .MyProjectsPage,
        }),
    ),
    lazyScreen(
        'my-projects/:projectId',
        'Project',
        'employee-projects.view',
        async () => ({
            Component: (
                await import('@/features/employee/workspace/ProjectWorkspacePage')
            ).ProjectWorkspacePage,
        }),
    ),
    lazyScreen(
        'my-projects/:projectId/ongoing',
        'Ongoing tasks',
        'employee-projects.view',
        async () => ({
            Component: (
                await import('@/features/employee/workspace/OngoingPage')
            ).OngoingPage,
        }),
    ),
    lazyScreen(
        'my-projects/:projectId/bulk-upload',
        'Bulk upload',
        'employee-projects.tasks.create',
        async () => ({
            Component: (await import('@/features/employee/BulkUploadPage'))
                .BulkUploadPage,
        }),
    ),
    lazyScreen(
        'my-general-tasks',
        'My General Tasks',
        'employee-general-tasks.view',
        async () => ({
            Component: (await import('@/features/employee/MyGeneralTasksPage'))
                .MyGeneralTasksPage,
        }),
    ),

    lazyScreen(
        'admin/ongoing-tasks',
        'Ongoing Tasks',
        'ongoing-tasks.view',
        async () => ({
            Component: (
                await import('@/features/admin/ongoing/OngoingTasksPage')
            ).OngoingTasksPage,
        }),
    ),

    // Admin: Ticketing module
    lazyScreen('admin/ticketing', 'Ticketing', 'ticketing.view', async () => ({
        Component: (await import('@/features/admin/ticketing/OverviewPage'))
            .TicketingOverviewPage,
    })),
    lazyScreen(
        'admin/ticketing/clients',
        'Ticketing clients',
        'ticketing.view',
        async () => ({
            Component: (await import('@/features/admin/ticketing/ClientsPage'))
                .TicketingClientsPage,
        }),
    ),
    lazyScreen(
        'admin/ticketing/clients/:clientId',
        'Ticketing client',
        'ticketing.view',
        async () => ({
            Component: (
                await import('@/features/admin/ticketing/ClientDetailPage')
            ).TicketingClientDetailPage,
        }),
    ),
    lazyScreen(
        'admin/ticketing/tickets',
        'Tickets',
        'ticketing.view',
        async () => ({
            Component: (await import('@/features/admin/ticketing/TicketsPage'))
                .TicketingTicketsPage,
        }),
    ),
    lazyScreen(
        'admin/ticketing/tickets/:ticketId',
        'Ticket',
        'ticketing.view',
        async () => ({
            Component: (
                await import('@/features/admin/ticketing/TicketDetailPage')
            ).TicketingTicketDetailPage,
        }),
    ),
    lazyScreen(
        'admin/ticketing/audit-logs',
        'Ticketing audit log',
        'ticketing.audit.view',
        async () => ({
            Component: (
                await import('@/features/admin/ticketing/AuditLogsPage')
            ).TicketingAuditLogsPage,
        }),
    ),

    // Admin: projects (phase 5)
    lazyScreen('admin', 'Dashboard', 'dashboard.view', async () => ({
        Component: (await import('@/features/admin/AdminDashboardPage'))
            .AdminDashboardPage,
    })),
    lazyScreen('admin/projects', 'Projects', 'projects.view', async () => ({
        Component: (await import('@/features/admin/projects/ProjectsListPage'))
            .ProjectsListPage,
    })),
    lazyScreen(
        'admin/projects/:projectId',
        'Project',
        'projects.view',
        async () => ({
            Component: (
                await import('@/features/admin/projects/detail/AdminProjectPage')
            ).AdminProjectPage,
        }),
    ),
    lazyScreen(
        'admin/projects/:projectId/tasks/bulk-upload',
        'Bulk upload',
        'project-tasks.create',
        async () => ({
            Component: (await import('@/features/employee/BulkUploadPage'))
                .AdminBulkUploadPage,
        }),
    ),

    // Admin: approvals and KPI (phase 6)
    lazyScreen(
        'admin/requests',
        'Requests',
        'project-requests.view',
        async () => ({
            Component: (
                await import('@/features/admin/approvals/RequestsInboxPage')
            ).RequestsInboxPage,
        }),
    ),
    lazyScreen(
        'admin/deadline-extensions',
        'Deadline Extensions',
        'project-deadline-extensions.view',
        async () => ({
            Component: (
                await import('@/features/admin/approvals/ExtensionsInboxPage')
            ).ExtensionsInboxPage,
        }),
    ),
    lazyScreen('admin/reports', 'Reports', 'reports.view', async () => ({
        Component: (await import('@/features/admin/reports/ReportsPage'))
            .ReportsPage,
    })),
    lazyScreen(
        'admin/reports/:reportId',
        'Report',
        'reports.view',
        async () => ({
            Component: (
                await import('@/features/admin/reports/ReportDetailPage')
            ).ReportDetailPage,
        }),
    ),
    lazyScreen('admin/kpi-sheet', 'KPI Sheet', 'kpi-sheet.view', async () => ({
        Component: (await import('@/features/admin/kpi/KpiSheetPage'))
            .KpiSheetPage,
    })),
    lazyScreen(
        'admin/phase-kpi-history',
        'Phase KPI History',
        'project-phases.kpi.view',
        async () => ({
            Component: (
                await import('@/features/admin/kpi/PhaseKpiHistoryPage')
            ).PhaseKpiHistoryPage,
        }),
    ),

    // Admin: organisation and system (phase 7)
    lazyScreen('admin/employees', 'Employees', 'employees.view', async () => ({
        Component: (await import('@/features/admin/people/EmployeesListPage'))
            .EmployeesListPage,
    })),
    lazyScreen(
        'admin/employees/new',
        'New employee',
        'employees.create',
        async () => ({
            Component: (
                await import('@/features/admin/people/EmployeeFormPage')
            ).EmployeeFormPage,
        }),
    ),
    lazyScreen(
        'admin/employees/:employeeId',
        'Employee',
        'employees.view',
        async () => ({
            Component: (
                await import('@/features/admin/people/EmployeeDetailPage')
            ).EmployeeDetailPage,
        }),
    ),
    lazyScreen(
        'admin/employees/:employeeId/edit',
        'Edit employee',
        'employees.update',
        async () => ({
            Component: (
                await import('@/features/admin/people/EmployeeFormPage')
            ).EmployeeFormPage,
        }),
    ),
    lazyScreen(
        'admin/employees/:employeeId/permissions',
        'Special permissions',
        'employees.special-permissions.update',
        async () => ({
            Component: (
                await import('@/features/admin/people/EmployeePermissionsPage')
            ).EmployeePermissionsPage,
        }),
    ),
    lazyScreen(
        'admin/departments',
        'Departments',
        'departments.view',
        async () => ({
            Component: (await import('@/features/admin/org/LookupPage'))
                .DepartmentsPage,
        }),
    ),
    lazyScreen('admin/clients', 'Clients', 'clients.view', async () => ({
        Component: (await import('@/features/admin/org/ClientsPage'))
            .ClientsPage,
    })),
    lazyScreen(
        'admin/project-categories',
        'Project Categories',
        'project-categories.view',
        async () => ({
            Component: (await import('@/features/admin/org/LookupPage'))
                .CategoriesPage,
        }),
    ),
    lazyScreen(
        'admin/project-groups',
        'Project Groups',
        'project-groups.view',
        async () => ({
            Component: (await import('@/features/admin/org/ProjectGroupsPage'))
                .ProjectGroupsPage,
        }),
    ),
    lazyScreen(
        'admin/roles',
        'Roles & Permissions',
        'roles.view',
        async () => ({
            Component: (await import('@/features/admin/people/RolesPages'))
                .RolesListPage,
        }),
    ),
    lazyScreen('admin/roles/new', 'New role', 'roles.create', async () => ({
        Component: (await import('@/features/admin/people/RolesPages'))
            .RoleFormPage,
    })),
    lazyScreen(
        'admin/roles/:roleId/edit',
        'Edit role',
        'roles.update',
        async () => ({
            Component: (await import('@/features/admin/people/RolesPages'))
                .RoleFormPage,
        }),
    ),
    lazyScreen(
        'admin/general-tasks',
        'General Tasks',
        'general-tasks.view',
        async () => ({
            Component: (
                await import('@/features/admin/general/GeneralTasksPage')
            ).GeneralTasksPage,
        }),
    ),
    lazyScreen(
        'admin/general-tasks/overview',
        'Overview',
        'general-tasks.view',
        async () => ({
            Component: (
                await import('@/features/admin/general/GeneralOverviewPages')
            ).GeneralOverviewPage,
        }),
    ),
    lazyScreen(
        'admin/general-tasks/employees/:employeeId',
        'Employee tasks',
        'general-tasks.view',
        async () => ({
            Component: (
                await import('@/features/admin/general/GeneralOverviewPages')
            ).GeneralEmployeePage,
        }),
    ),
    lazyScreen('admin/settings', 'Settings', 'settings.view', async () => ({
        Component: (await import('@/features/admin/settings/SettingsPage'))
            .SettingsPage,
    })),
    lazyScreen('admin/restore', 'Restore', 'restore.view', async () => ({
        Component: (await import('@/features/admin/org/RestorePage'))
            .RestorePage,
    })),
    lazyScreen(
        'admin/activity-logs',
        'Activity Logs',
        'activity-logs.view',
        async () => ({
            Component: (await import('@/features/admin/org/ActivityLogsPage'))
                .ActivityLogsPage,
        }),
    ),

    // Chat and notifications (phase 8)
    lazyScreen('chat', 'Chat', 'chat.access', async () => ({
        Component: (await import('@/features/chat/ChatPage')).ChatPage,
    })),
    lazyScreen(
        'chat/:conversationId',
        'Conversation',
        'chat.access',
        async () => ({
            Component: (await import('@/features/chat/ChatPage')).ChatPage,
        }),
    ),
    lazyScreen('notifications', 'Notifications', undefined, async () => ({
        Component: (await import('@/features/notifications/NotificationsPage'))
            .NotificationsPage,
    })),
    lazyScreen('open/:type/:id', 'Opening', undefined, async () => ({
        Component: (await import('@/features/notifications/OpenTarget'))
            .OpenTarget,
    })),

    // Client portal and account (phase 9)
    lazyScreen('client', 'Dashboard', 'client-dashboard.view', async () => ({
        Component: (await import('@/features/client/ClientProjectsPage'))
            .ClientProjectsPage,
    })),
    lazyScreen(
        'client/projects',
        'Projects',
        'client-projects.view',
        async () => ({
            Component: (await import('@/features/client/ClientProjectsPage'))
                .ClientProjectsPage,
        }),
    ),
    lazyScreen(
        'client/projects/:projectId',
        'Project',
        'client-projects.view',
        async () => ({
            Component: (await import('@/features/client/ClientProjectPage'))
                .ClientProjectPage,
        }),
    ),
    lazyScreen('account/profile', 'Profile', undefined, async () => ({
        Component: (await import('@/features/account/ProfilePage')).ProfilePage,
    })),
    lazyScreen('account/security', 'Security', undefined, async () => ({
        Component: (await import('@/features/account/SecurityPage'))
            .SecurityPage,
    })),
];

export const appRoutes: RouteObject[] = [
    {
        // Public: sign in and recovery
        element: <GuestOnly />,
        errorElement: <RouteError />,
        children: [
            { path: '/login', element: <LoginPage /> },
            { path: '/two-factor', element: <TwoFactorPage /> },
            { path: '/forgot-password', element: <ForgotPasswordPage /> },
            { path: '/reset-password/:token', element: <ResetPasswordPage /> },
        ],
    },
    {
        // Reachable signed in or out: the emailed link verifies without a session
        path: '/verify-email',
        element: <VerifyEmailPage />,
        errorElement: <RouteError />,
    },
    {
        path: '/inactive',
        element: <InactivePage />,
        errorElement: <RouteError />,
    },
    {
        element: <RequireAuth />,
        errorElement: <RouteError />,
        children: [
            {
                element: <AppLayout />,
                children: [
                    { index: true, element: <HomeRedirect /> },
                    ...appScreens,
                ],
            },
        ],
    },
    { path: '*', element: <LegacyOrNotFound /> },
];
