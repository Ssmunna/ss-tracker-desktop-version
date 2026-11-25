import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';

import { errorBody } from '@/api/baseApi';

/**
 * Puts the server's 422 `errors` on the matching form fields. Returns the
 * message to show at the top of the form when no field matched (e.g. a
 * 403 or an unknown field).
 */
export function applyServerErrors<T extends FieldValues>(
    error: unknown,
    setError: UseFormSetError<T>,
    fields: readonly Path<T>[],
): string | null {
    const body = errorBody(error);
    let matched = false;

    for (const [field, messages] of Object.entries(body.errors ?? {})) {
        if ((fields as readonly string[]).includes(field)) {
            setError(field as Path<T>, {
                type: 'server',
                message: messages[0],
            });
            matched = true;
        }
    }

    return matched ? null : (body.message ?? null);
}
