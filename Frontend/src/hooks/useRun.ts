import { toast } from 'sonner';

import { errorMessage } from '@/api/baseApi';

/**
 * Runs a mutation promise: shows the server's success message, or its error, as a toast.
 * Resolves true on success so callers can close dialogs. Field errors (422) are the
 * caller's job; use `mutate().unwrap()` directly when a form needs them.
 */
export function useRun() {
    return async function run(
        action: { unwrap: () => Promise<unknown> },
        success?: string,
    ): Promise<boolean> {
        try {
            const result = await action.unwrap();
            const message =
                success ??
                (result as { message?: string } | undefined)?.message;

            if (message) {
                toast.success(message);
            }

            return true;
        } catch (error) {
            toast.error(errorMessage(error));

            return false;
        }
    };
}
