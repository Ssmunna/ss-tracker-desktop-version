import {
    BarChart3,
    Briefcase,
    Building2,
    CalendarClock,
    ClipboardCheck,
    ClipboardList,
    FolderKanban,
    History,
    Inbox,
    LifeBuoy,
    LayoutDashboard,
    ListChecks,
    RefreshCw,
    MessageSquare,
    RotateCcw,
    Settings,
    ScrollText,
    ShieldCheck,
    Tags,
    Ticket,
    UserRound,
    Users,
    type LucideIcon,
} from 'lucide-react';

import type { Home, MeData } from '@/api/types';
import type { NavGroup } from '@/layouts/AppShell';

import { hasAnyPermission } from './permissions';

export const homePath: Record<Home, string> = {
    admin: '/admin',
    employee: '/employee',
    client: '/client',
};

interface NavBlueprintItem {
    label: string;
    to: string | ((me: MeData) => string);
    icon: LucideIcon;
    /** Visible when the user has ANY of these (same rule as the Vue sidebar). */
    permissions: string[];
    /** Employee screens need a linked developer profile. */
    requiresDeveloper?: boolean;
    /** Client portal screens need a linked client account. */
    requiresClient?: boolean;
    badge?: (me: MeData) => number;
    end?: boolean;
}

interface NavBlueprintGroup {
    label: string;
    items: NavBlueprintItem[];
}

/** Mirrors layouts/AdminLayout.vue (and ClientLayout) with the new route paths. */
const blueprint: NavBlueprintGroup[] = [
    {
        label: 'Navigation',
        items: [
            {
                label: 'Dashboard',
                to: (me) => (me.home ? homePath[me.home] : '/'),
                icon: LayoutDashboard,
                permissions: [
                    'dashboard.view',
                    'employee-dashboard.view',
                    'client-dashboard.view',
                ],
                end: true,
            },
            {
                label: 'Chat',
                to: '/chat',
                icon: MessageSquare,
                permissions: ['chat.access'],
                badge: (me) => me.unread_messages_count,
            },
        ],
    },
    {
        label: 'Work',
        items: [
            {
                label: 'Projects',
                to: '/admin/projects',
                icon: FolderKanban,
                permissions: ['projects.view'],
            },
            {
                label: 'My Projects',
                to: '/my-projects',
                icon: Briefcase,
                permissions: ['employee-projects.view'],
                requiresDeveloper: true,
            },
            {
                label: 'Projects',
                to: '/client/projects',
                icon: FolderKanban,
                permissions: ['client-projects.view'],
                requiresClient: true,
            },
            {
                label: 'General Tasks',
                to: '/admin/general-tasks',
                icon: ListChecks,
                permissions: ['general-tasks.view'],
            },
            {
                label: 'Ongoing Tasks',
                to: '/admin/ongoing-tasks',
                icon: RefreshCw,
                permissions: ['ongoing-tasks.view'],
            },
            {
                label: 'My General Tasks',
                to: '/my-general-tasks',
                icon: ClipboardCheck,
                permissions: ['employee-general-tasks.view'],
                requiresDeveloper: true,
            },
            {
                label: 'Requests',
                to: '/admin/requests',
                icon: Inbox,
                permissions: ['project-requests.view'],
                badge: (me) => me.pending_requests_count,
            },
            {
                label: 'Deadline Extensions',
                to: '/admin/deadline-extensions',
                icon: CalendarClock,
                permissions: ['project-deadline-extensions.view'],
                badge: (me) => me.pending_extensions_count,
            },
            {
                label: 'Reports',
                to: '/admin/reports',
                icon: ClipboardList,
                permissions: ['reports.view'],
            },
            {
                label: 'KPI Sheet',
                to: '/admin/kpi-sheet',
                icon: BarChart3,
                permissions: ['kpi-sheet.view'],
            },
        ],
    },
    {
        label: 'Ticketing',
        items: [
            {
                label: 'Ticketing',
                to: '/admin/ticketing',
                icon: LifeBuoy,
                permissions: ['ticketing.view'],
                end: true,
            },
            {
                label: 'Ticketing Clients',
                to: '/admin/ticketing/clients',
                icon: Users,
                permissions: ['ticketing.view'],
            },
            {
                label: 'Tickets',
                to: '/admin/ticketing/tickets',
                icon: Ticket,
                permissions: ['ticketing.view'],
            },
            {
                label: 'Ticketing Audit Log',
                to: '/admin/ticketing/audit-logs',
                icon: ScrollText,
                permissions: ['ticketing.audit.view'],
            },
        ],
    },
    {
        label: 'Organization',
        items: [
            {
                label: 'Employees',
                to: '/admin/employees',
                icon: Users,
                permissions: ['employees.view'],
            },
            {
                label: 'Departments',
                to: '/admin/departments',
                icon: Building2,
                permissions: ['departments.view'],
            },
            {
                label: 'Clients',
                to: '/admin/clients',
                icon: UserRound,
                permissions: ['clients.view'],
            },
            {
                label: 'Project Categories',
                to: '/admin/project-categories',
                icon: Tags,
                permissions: ['project-categories.view'],
            },
            {
                label: 'Roles & Permissions',
                to: '/admin/roles',
                icon: ShieldCheck,
                permissions: ['roles.view'],
            },
        ],
    },
    {
        label: 'System',
        items: [
            {
                label: 'Settings',
                to: '/admin/settings',
                icon: Settings,
                permissions: ['settings.view'],
            },
            {
                label: 'Restore',
                to: '/admin/restore',
                icon: RotateCcw,
                permissions: ['restore.view'],
            },
            {
                label: 'Activity Logs',
                to: '/admin/activity-logs',
                icon: History,
                permissions: ['activity-logs.view'],
            },
        ],
    },
];

/** The sidebar for this user: only items they may open, no empty groups. */
export function buildNav(me: MeData): NavGroup[] {
    const permissions = me.user.permissions;

    return blueprint
        .map((group) => ({
            label: group.label,
            items: group.items
                .filter(
                    (item) =>
                        hasAnyPermission(permissions, item.permissions) &&
                        (!item.requiresDeveloper || me.developer !== null) &&
                        (!item.requiresClient || me.client !== null),
                )
                .map((item) => ({
                    label: item.label,
                    to: typeof item.to === 'function' ? item.to(me) : item.to,
                    icon: item.icon,
                    badge: item.badge?.(me),
                    end: item.end,
                })),
        }))
        .filter((group) => group.items.length > 0);
}
