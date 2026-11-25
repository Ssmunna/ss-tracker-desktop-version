import type { ReactNode } from 'react';

import { usePermissions } from '@/hooks/usePermissions';

/** Renders children only when the user has the permission (`a|b` = either). */
export function Can({
    permission,
    children,
    fallback = null,
}: {
    permission: string;
    children: ReactNode;
    fallback?: ReactNode;
}) {
    const { can } = usePermissions();

    return <>{can(permission) ? children : fallback}</>;
}
