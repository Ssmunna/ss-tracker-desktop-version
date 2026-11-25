import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type {
    BaseQueryFn,
    FetchArgs,
    FetchBaseQueryError,
    FetchBaseQueryMeta,
} from '@reduxjs/toolkit/query/react';
import { toast } from 'sonner';

import { sessionEnded } from '@/features/auth/sessionActions';
import { passwordConfirmationRequested } from '@/features/ui/uiSlice';

import { phaseWords } from '@/lib/phaseWords';

import type { ApiErrorBody } from './types';

type Label = { singular: string; plural: string };

const baseUrl = import.meta.env.VITE_API_URL ?? '/api/v1';

export const TOKEN_STORAGE_KEY = 'dr.token';

/** Pagination and other `meta` of the `{ data, meta }` envelope, passed to transformResponse. */
export type ApiMeta = FetchBaseQueryMeta & { envelope?: unknown };

const rawBaseQuery = fetchBaseQuery({
    baseUrl,
    prepareHeaders: (headers, { getState }) => {
        const token = (getState() as { auth: { token: string | null } }).auth
            .token;

        headers.set('Accept', 'application/json');

        if (token) {
            headers.set('Authorization', `Bearer ${token}`);
        }

        return headers;
    },
});

export function errorBody(error: unknown): ApiErrorBody {
    const data =
        (error as FetchBaseQueryError | undefined) &&
        'data' in (error as object)
            ? (error as { data?: unknown }).data
            : undefined;

    return data && typeof data === 'object' ? (data as ApiErrorBody) : {};
}

/** First server message per field, for react-hook-form / Field. */
export function fieldErrors(error: unknown): Record<string, string> {
    const errors = errorBody(error).errors ?? {};

    return Object.fromEntries(
        Object.entries(errors).map(([field, messages]) => [field, messages[0]]),
    );
}

export function errorMessage(
    error: unknown,
    fallback = 'Something went wrong. Please try again.',
): string {
    return errorBody(error).message ?? fallback;
}

/**
 * Wraps fetchBaseQuery with the global rules of the API contract:
 * unwrap `{ data, meta }`, end the session on 401 / account_inactive, refresh
 * `/me` after a 403 (permissions may have changed), open the password prompt on
 * 423 password_confirmation_required, explain a locked phase (other 423) and 429.
 */
export const baseQueryWithHandling: BaseQueryFn<
    string | FetchArgs,
    unknown,
    FetchBaseQueryError,
    object,
    ApiMeta
> = async (args, api, extraOptions) => {
    const result = await rawBaseQuery(args, api, extraOptions);

    if (result.error) {
        const { status } = result.error;
        const body = errorBody(result.error);
        const hadToken =
            (api.getState() as { auth: { token: string | null } }).auth
                .token !== null;

        if (status === 401 && hadToken) {
            api.dispatch(sessionEnded('unauthenticated'));
        } else if (status === 403 && body.code === 'account_inactive') {
            api.dispatch(sessionEnded('inactive'));
        } else if (status === 403) {
            api.dispatch(baseApi.util.invalidateTags(['Me']));
            toast.error(
                body.message ?? 'You do not have permission to do that.',
            );
        } else if (
            status === 423 &&
            body.code === 'password_confirmation_required'
        ) {
            api.dispatch(passwordConfirmationRequested());
        } else if (status === 423) {
            const label = (
                api.getState() as {
                    auth: { me: { phase_label?: Label } | null };
                }
            ).auth.me?.phase_label;

            toast.error(
                body.message ??
                    phaseWords(
                        label,
                        'This phase is completed and can no longer be changed.',
                    ),
                { id: 'phase-locked' },
            );
        } else if (status === 429) {
            const retry = result.meta?.response?.headers.get('Retry-After');
            toast.error(
                retry
                    ? `Too many attempts. Try again in ${retry} seconds.`
                    : 'Too many attempts. Please wait a moment.',
                { id: 'rate-limited' },
            );
        } else if (status === 'FETCH_ERROR') {
            toast.error('Cannot reach the server. Check your connection.', {
                id: 'offline',
            });
        }

        return { error: result.error, meta: result.meta };
    }

    const body = result.data as { data?: unknown; meta?: unknown } | null;

    if (body && typeof body === 'object' && 'data' in body) {
        return {
            data: body.data,
            meta: { ...result.meta, envelope: body.meta } as ApiMeta,
        };
    }

    return { data: result.data, meta: result.meta as ApiMeta };
};

export const baseApi = createApi({
    reducerPath: 'api',
    baseQuery: baseQueryWithHandling,
    tagTypes: [
        'Me',
        'Project',
        'Task',
        'Phase',
        'Milestone',
        'Request',
        'Extension',
        'Report',
        'Kpi',
        'Employee',
        'Client',
        'Department',
        'Category',
        'Role',
        'GeneralTask',
        'OngoingTask',
        'Setting',
        'Prayer',
        'Restore',
        'ActivityLog',
        'Conversation',
        'ChatFolder',
        'Message',
        'Notification',
        'ClientProject',
        'TwoFactor',
        'Token',
        'TicketingClient',
        'TicketingTicket',
        'TicketingStats',
        'TicketingWebhook',
        'TicketingAudit',
    ],
    endpoints: () => ({}),
});
