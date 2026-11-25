/** Port of composables/useAuthorization.ts, plus the `a|b` syntax used by route middleware. */

/** True when the user has the permission, or any of `a|b` alternatives. */
export function hasPermission(
    permissions: readonly string[],
    expression: string,
): boolean {
    return expression
        .split('|')
        .some((permission) => permissions.includes(permission.trim()));
}

export function hasAnyPermission(
    permissions: readonly string[],
    list: readonly string[],
): boolean {
    return list.some((permission) => hasPermission(permissions, permission));
}

export function hasAllPermissions(
    permissions: readonly string[],
    list: readonly string[],
): boolean {
    return list.every((permission) => hasPermission(permissions, permission));
}
