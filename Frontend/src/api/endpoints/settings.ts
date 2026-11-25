import { baseApi, type ApiMeta } from '../baseApi';
import type { Paged } from '../org-types';
import type { AppSettings, HolidayPage } from '../settings-types';

type Saved = { message: string; settings: AppSettings };

const put = (url: string) => ({
    query: (body: unknown) => ({ url, method: 'PUT', body }),
    invalidatesTags: ['Setting', 'Me'] as ['Setting', 'Me'],
});

export const settingsApi = baseApi.injectEndpoints({
    endpoints: (build) => ({
        getSettings: build.query<{ settings: AppSettings }, void>({
            query: () => '/manage/settings',
            providesTags: ['Setting'],
        }),
        saveBranding: build.mutation<
            Saved,
            { website_name: string; logo?: File | null; favicon?: File | null }
        >({
            query: ({ website_name, logo, favicon }) => {
                const form = new FormData();
                form.append('website_name', website_name);

                if (logo) {
                    form.append('website_logo', logo);
                }

                if (favicon) {
                    form.append('website_favicon', favicon);
                }

                return {
                    url: '/manage/settings/branding',
                    method: 'POST',
                    body: form,
                };
            },
            invalidatesTags: ['Setting', 'Me'],
        }),
        saveWeeklyHolidays: build.mutation<
            Saved,
            { weekly_holidays: number[] }
        >({
            ...put('/manage/settings/holiday-rules'),
        }),
        saveAiAutomation: build.mutation<
            Saved,
            { ai_task_creation_enabled: boolean }
        >({ ...put('/manage/settings/ai-automation') }),
        saveStaleAlerts: build.mutation<
            Saved,
            {
                stale_task_alert_enabled: boolean;
                stale_task_reminder_time: string;
                stale_task_digest_time: string;
            }
        >({ ...put('/manage/settings/stale-task-alerts') }),
        savePhaseLabel: build.mutation<
            Saved,
            { phase_label_singular: string; phase_label_plural: string }
        >({ ...put('/manage/settings/phase-label') }),
        saveDriveFolder: build.mutation<Saved, { name: string }>({
            ...put('/manage/settings/google-drive/folder-name'),
        }),
        /** The Google consent URL, sealed with who is connecting (no web session needed). */
        driveConnectUrl: build.mutation<{ url: string }, void>({
            query: () => '/manage/settings/google-drive/connect-url',
        }),
        disconnectDrive: build.mutation<Saved, void>({
            query: () => ({
                url: '/manage/settings/google-drive',
                method: 'DELETE',
            }),
            invalidatesTags: ['Setting'],
        }),
        getHolidays: build.query<HolidayPage, { page?: number }>({
            query: (params) => ({
                url: '/manage/settings/holidays',
                params: { ...params, per_page: 10 },
            }),
            transformResponse: (
                data: { holidays: HolidayPage['holidays'] },
                meta: ApiMeta | undefined,
            ) => ({ ...data, meta: meta?.envelope as Paged }),
            providesTags: ['Setting'],
        }),
        addHolidays: build.mutation<
            { message: string; added: number },
            {
                ranges: {
                    from_date: string;
                    to_date: string;
                    description?: string;
                }[];
            }
        >({
            query: (body) => ({
                url: '/manage/settings/holidays',
                method: 'POST',
                body,
            }),
            invalidatesTags: ['Setting'],
        }),
        deleteHoliday: build.mutation<{ message: string }, number>({
            query: (id) => ({
                url: `/manage/settings/holidays/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Setting'],
        }),
    }),
});

export const {
    useGetSettingsQuery,
    useSaveBrandingMutation,
    useSaveWeeklyHolidaysMutation,
    useSaveAiAutomationMutation,
    useSaveStaleAlertsMutation,
    useSavePhaseLabelMutation,
    useSaveDriveFolderMutation,
    useDisconnectDriveMutation,
    useDriveConnectUrlMutation,
    useGetHolidaysQuery,
    useAddHolidaysMutation,
    useDeleteHolidayMutation,
} = settingsApi;
