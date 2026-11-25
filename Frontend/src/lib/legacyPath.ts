/**
 * Where an old web-app address (emails, bookmarks, links in earlier notifications) lives in this
 * app. Returns null when the address is not one of the old ones.
 */
const RULES: Array<[RegExp, (m: RegExpExecArray) => string]> = [
    [/^\/dashboard\/?$/, () => '/'],
    [/^\/developer-dashboard\/?$/, () => '/employee'],
    [/^\/client-dashboard\/?$/, () => '/client'],
    [/^\/client-portal\/inactive\/?$/, () => '/inactive'],
    [/^\/client-projects\/?$/, () => '/client/projects'],
    [/^\/client-projects\/(\d+)\/?$/, (m) => `/client/projects/${m[1]}`],

    // Admin: projects
    [/^\/dashboard\/projects\/?$/, () => '/admin/projects'],
    [/^\/dashboard\/projects\/create\/?$/, () => '/admin/projects'],
    [
        /^\/dashboard\/projects\/(\d+)\/(tasks)\/bulk-upload\/?$/,
        (m) => `/admin/projects/${m[1]}/tasks/bulk-upload`,
    ],
    [
        /^\/dashboard\/projects\/(\d+)\/(tasks|milestones|requests|credentials|phases)(\/.*)?$/,
        (m) => `/admin/projects/${m[1]}?tab=${m[2]}`,
    ],
    [
        /^\/dashboard\/projects\/(\d+)\/deadline-extensions\/?$/,
        (m) => `/admin/projects/${m[1]}?tab=extensions`,
    ],
    [/^\/dashboard\/projects\/(\d+)(\/.*)?$/, (m) => `/admin/projects/${m[1]}`],

    // Admin: people and setup
    [/^\/dashboard\/developers\/?$/, () => '/admin/employees'],
    [/^\/dashboard\/developers\/create\/?$/, () => '/admin/employees/new'],
    [
        /^\/dashboard\/developers\/(\d+)\/permissions\/?$/,
        (m) => `/admin/employees/${m[1]}/permissions`,
    ],
    [
        /^\/dashboard\/developers\/(\d+)\/edit\/?$/,
        (m) => `/admin/employees/${m[1]}/edit`,
    ],
    [/^\/dashboard\/developers\/(\d+)\/?$/, (m) => `/admin/employees/${m[1]}`],
    [/^\/dashboard\/clients(\/.*)?$/, () => '/admin/clients'],
    [/^\/dashboard\/departments(\/.*)?$/, () => '/admin/departments'],
    [
        /^\/dashboard\/project-categories(\/.*)?$/,
        () => '/admin/project-categories',
    ],
    [/^\/dashboard\/roles\/create\/?$/, () => '/admin/roles/new'],
    [
        /^\/dashboard\/roles\/(\d+)\/edit\/?$/,
        (m) => `/admin/roles/${m[1]}/edit`,
    ],
    [/^\/dashboard\/roles\/?$/, () => '/admin/roles'],

    // Admin: work, reports, KPI and system
    [/^\/dashboard\/reports\/(\d+)\/?$/, (m) => `/admin/reports/${m[1]}`],
    [/^\/dashboard\/reports\/?$/, () => '/admin/reports'],
    [/^\/dashboard\/requests\/?$/, () => '/admin/requests'],
    [
        /^\/dashboard\/deadline-extensions\/?$/,
        () => '/admin/deadline-extensions',
    ],
    [/^\/dashboard\/kpi-sheet\/?$/, () => '/admin/kpi-sheet'],
    [/^\/dashboard\/phase-kpi-history\/?$/, () => '/admin/phase-kpi-history'],
    [
        /^\/dashboard\/general-tasks\/employees\/(\d+)\/?$/,
        (m) => `/admin/general-tasks/employees/${m[1]}`,
    ],
    [
        /^\/dashboard\/general-tasks\/overview\/?$/,
        () => '/admin/general-tasks/overview',
    ],
    [/^\/dashboard\/general-tasks\/?$/, () => '/admin/general-tasks'],
    [/^\/dashboard\/activity-logs\/?$/, () => '/admin/activity-logs'],
    [/^\/dashboard\/restore\/?$/, () => '/admin/restore'],
    [/^\/dashboard\/settings(\/.*)?$/, () => '/admin/settings'],

    // Employee
    [/^\/projects\/?$/, () => '/my-projects'],
    [
        /^\/projects\/(\d+)\/tasks\/bulk-upload\/?$/,
        (m) => `/my-projects/${m[1]}/bulk-upload`,
    ],
    [/^\/projects\/(\d+)\/ongoing\/?$/, (m) => `/my-projects/${m[1]}/ongoing`],
    [/^\/projects\/(\d+)(\/.*)?$/, (m) => `/my-projects/${m[1]}`],
    [/^\/general-tasks\/?$/, () => '/my-general-tasks'],

    // Account
    [/^\/settings\/?$/, () => '/account/profile'],
    [/^\/settings\/profile\/?$/, () => '/account/profile'],
    [/^\/settings\/security\/?$/, () => '/account/security'],
];

export function legacyPath(pathname: string): string | null {
    for (const [pattern, to] of RULES) {
        const match = pattern.exec(pathname);

        if (match) {
            return to(match);
        }
    }

    return null;
}
