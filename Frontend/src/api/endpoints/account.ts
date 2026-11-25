import { baseApi } from '../baseApi';
import type {
    ClientIssue,
    ClientProjectDetail,
    ClientProjectRow,
    DeviceToken,
    TwoFactorState,
} from '../account-types';

type Message = { message: string };

export const accountApi = baseApi.injectEndpoints({
    endpoints: (build) => ({
        getClientProjects: build.query<{ projects: ClientProjectRow[] }, void>({
            query: () => '/client/projects',
            providesTags: ['ClientProject'],
        }),
        getClientProject: build.query<
            ClientProjectDetail,
            { id: number; phase?: string }
        >({
            query: ({ id, phase }) => ({
                url: `/client/projects/${id}`,
                params: { phase },
            }),
            providesTags: ['ClientProject'],
        }),
        reportIssue: build.mutation<
            ClientIssue,
            {
                projectId: number;
                title: string;
                description: string | null;
                project_phase_id: number;
            }
        >({
            query: ({ projectId, ...body }) => ({
                url: `/client/projects/${projectId}/issues`,
                method: 'POST',
                body,
            }),
            invalidatesTags: ['ClientProject'],
        }),

        /** Avatar goes as multipart; PHP cannot read a multipart PATCH, so it is spoofed on a POST. */
        updateProfile: build.mutation<
            unknown,
            { name: string; email: string; avatar?: File | null }
        >({
            query: ({ name, email, avatar }) => {
                if (!avatar) {
                    return {
                        url: '/me',
                        method: 'PATCH',
                        body: { name, email },
                    };
                }

                const form = new FormData();
                form.append('name', name);
                form.append('email', email);
                form.append('avatar', avatar);
                form.append('_method', 'PATCH');

                return { url: '/me', method: 'POST', body: form };
            },
            invalidatesTags: ['Me'],
        }),
        updatePassword: build.mutation<
            Message,
            {
                current_password: string;
                password: string;
                password_confirmation: string;
            }
        >({
            query: (body) => ({ url: '/me/password', method: 'PUT', body }),
        }),

        getTwoFactor: build.query<TwoFactorState, void>({
            query: () => '/me/two-factor',
            providesTags: ['TwoFactor'],
        }),
        enableTwoFactor: build.mutation<TwoFactorState, void>({
            query: () => ({ url: '/me/two-factor', method: 'POST' }),
            invalidatesTags: ['TwoFactor'],
        }),
        confirmTwoFactor: build.mutation<TwoFactorState, { code: string }>({
            query: (body) => ({
                url: '/me/two-factor/confirm',
                method: 'POST',
                body,
            }),
            invalidatesTags: ['TwoFactor'],
        }),
        disableTwoFactor: build.mutation<TwoFactorState, void>({
            query: () => ({ url: '/me/two-factor', method: 'DELETE' }),
            invalidatesTags: ['TwoFactor'],
        }),
        getRecoveryCodes: build.mutation<{ recovery_codes: string[] }, void>({
            query: () => '/me/two-factor/recovery-codes',
        }),
        regenerateRecoveryCodes: build.mutation<
            { recovery_codes: string[] },
            void
        >({
            query: () => ({
                url: '/me/two-factor/recovery-codes',
                method: 'POST',
            }),
        }),

        getTokens: build.query<DeviceToken[], void>({
            query: () => '/auth/tokens',
            providesTags: ['Token'],
        }),
        revokeToken: build.mutation<Message, number>({
            query: (id) => ({ url: `/auth/tokens/${id}`, method: 'DELETE' }),
            invalidatesTags: ['Token'],
        }),
        telegramLink: build.mutation<{ link_url: string }, void>({
            query: () => ({ url: '/me/telegram/link', method: 'POST' }),
        }),
    }),
});

export const {
    useGetClientProjectsQuery,
    useGetClientProjectQuery,
    useReportIssueMutation,
    useUpdateProfileMutation,
    useUpdatePasswordMutation,
    useGetTwoFactorQuery,
    useEnableTwoFactorMutation,
    useConfirmTwoFactorMutation,
    useDisableTwoFactorMutation,
    useGetRecoveryCodesMutation,
    useRegenerateRecoveryCodesMutation,
    useGetTokensQuery,
    useRevokeTokenMutation,
    useTelegramLinkMutation,
} = accountApi;
