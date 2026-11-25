import { baseApi } from '../baseApi';
import type { LoginResult, MeData } from '../types';

export const authApi = baseApi.injectEndpoints({
    endpoints: (build) => ({
        getMe: build.query<MeData, void>({
            query: () => '/me',
            providesTags: ['Me'],
        }),
        login: build.mutation<
            LoginResult,
            { email: string; password: string; device_name?: string }
        >({
            query: (body) => ({
                url: '/auth/login',
                method: 'POST',
                body: { device_name: 'web', ...body },
            }),
        }),
        twoFactorChallenge: build.mutation<
            Extract<LoginResult, { two_factor: false }>,
            { challenge_token: string; code?: string; recovery_code?: string }
        >({
            query: (body) => ({
                url: '/auth/two-factor-challenge',
                method: 'POST',
                body,
            }),
        }),
        logout: build.mutation<{ message: string }, void>({
            query: () => ({ url: '/auth/logout', method: 'POST' }),
        }),
        forgotPassword: build.mutation<{ message: string }, { email: string }>({
            query: (body) => ({
                url: '/auth/forgot-password',
                method: 'POST',
                // Ask for a link that opens this app (honoured only for allowed origins).
                body: { ...body, reset_url_base: window.location.origin },
            }),
        }),
        resetPassword: build.mutation<
            { message: string },
            {
                token: string;
                email: string;
                password: string;
                password_confirmation: string;
            }
        >({
            query: (body) => ({
                url: '/auth/reset-password',
                method: 'POST',
                body,
            }),
        }),
        resendVerification: build.mutation<
            { message: string; verified: boolean },
            void
        >({
            query: () => ({
                url: '/auth/email/verification-notification',
                method: 'POST',
                body: { verify_url_base: window.location.origin },
            }),
        }),
        /** Opens the signed link from the email (the signature is the credential). */
        verifyEmail: build.mutation<
            { message: string; verified: boolean },
            { url: string }
        >({
            query: ({ url }) => ({ url, method: 'GET' }),
            invalidatesTags: ['Me'],
        }),
        confirmPassword: build.mutation<
            { confirmed: boolean; expires_in: number },
            { password: string }
        >({
            query: (body) => ({
                url: '/me/confirm-password',
                method: 'POST',
                body,
            }),
        }),
    }),
});

export const {
    useGetMeQuery,
    useLoginMutation,
    useTwoFactorChallengeMutation,
    useLogoutMutation,
    useForgotPasswordMutation,
    useResetPasswordMutation,
    useResendVerificationMutation,
    useVerifyEmailMutation,
    useConfirmPasswordMutation,
} = authApi;
