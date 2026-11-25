import { useMemo } from 'react';

import { useAppSelector } from '@/app/hooks';
import { selectPermissions } from '@/features/auth/authSlice';
import {
    hasAllPermissions,
    hasAnyPermission,
    hasPermission,
} from '@/lib/permissions';

export function usePermissions() {
    const permissions = useAppSelector(selectPermissions);

    return useMemo(
        () => ({
            permissions,
            can: (expression: string) => hasPermission(permissions, expression),
            canAny: (list: readonly string[]) =>
                hasAnyPermission(permissions, list),
            canAll: (list: readonly string[]) =>
                hasAllPermissions(permissions, list),
        }),
        [permissions],
    );
}
