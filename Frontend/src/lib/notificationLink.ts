/**
 * Where a notification (or a web push click) goes. The API names a target by type and id only,
 * so the page is chosen by what the signed-in person can open.
 */
export function notificationPath(
    home: 'admin' | 'employee' | 'client' | null,
    target: { type: string; id: number | string } | null,
): string {
    const root =
        home === 'admin'
            ? '/admin'
            : home === 'client'
              ? '/client'
              : '/employee';

    if (!target) {
        return root;
    }

    switch (target.type) {
        case 'conversation':
            return `/chat/${target.id}`;
        case 'project':
            return home === 'admin'
                ? `/admin/projects/${target.id}`
                : home === 'client'
                  ? `/client/projects/${target.id}`
                  : `/my-projects/${target.id}`;
        case 'task':
            return home === 'employee' ? '/my-projects' : root;
        case 'phase':
            return home === 'admin'
                ? '/admin/projects'
                : home === 'employee'
                  ? '/my-projects'
                  : root;
        // The prayer popup lives in the header of every page and opens itself on this flag.
        case 'prayer':
            return `${root}?prayer=1`;
        default:
            return root;
    }
}
