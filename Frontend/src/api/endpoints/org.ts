import { baseApi, type ApiMeta } from '../baseApi';
import type {
    ActivityData,
    ActivityQuery,
    CategoryRow,
    ClientInput,
    ClientRow,
    DepartmentRow,
    Paged,
    RestoreData,
} from '../org-types';

type Message = { message: string };

const withMeta = <T>(data: T, meta: ApiMeta | undefined) => ({
    ...data,
    meta: meta?.envelope as Paged,
});

export const orgApi = baseApi.injectEndpoints({
    endpoints: (build) => ({
        getDepartments: build.query<
            { departments: DepartmentRow[]; meta: Paged },
            { page?: number }
        >({
            query: (params) => ({
                url: '/manage/departments',
                params: { ...params, per_page: 20 },
            }),
            transformResponse: (
                data: { departments: DepartmentRow[] },
                meta: ApiMeta | undefined,
            ) => withMeta(data, meta),
            providesTags: ['Department'],
        }),
        saveDepartment: build.mutation<
            Message,
            { id?: number; name: string; status: string }
        >({
            query: ({ id, ...body }) => ({
                url: id ? `/manage/departments/${id}` : '/manage/departments',
                method: id ? 'PUT' : 'POST',
                body,
            }),
            invalidatesTags: ['Department'],
        }),
        deleteDepartment: build.mutation<Message, number>({
            query: (id) => ({
                url: `/manage/departments/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Department'],
        }),

        getCategories: build.query<
            { categories: CategoryRow[]; meta: Paged },
            { page?: number }
        >({
            query: (params) => ({
                url: '/manage/project-categories',
                params: { ...params, per_page: 20 },
            }),
            transformResponse: (
                data: { categories: CategoryRow[] },
                meta: ApiMeta | undefined,
            ) => withMeta(data, meta),
            providesTags: ['Category'],
        }),
        saveCategory: build.mutation<
            Message,
            { id?: number; name: string; weight: number; status: string }
        >({
            query: ({ id, ...body }) => ({
                url: id
                    ? `/manage/project-categories/${id}`
                    : '/manage/project-categories',
                method: id ? 'PUT' : 'POST',
                body,
            }),
            invalidatesTags: ['Category'],
        }),
        deleteCategory: build.mutation<Message, number>({
            query: (id) => ({
                url: `/manage/project-categories/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Category'],
        }),

        getClients: build.query<
            { clients: ClientRow[]; meta: Paged },
            { status?: string; search?: string; page?: number }
        >({
            query: (params) => ({
                url: '/manage/clients',
                params: { ...params, per_page: 20 },
            }),
            transformResponse: (
                data: { clients: ClientRow[] },
                meta: ApiMeta | undefined,
            ) => withMeta(data, meta),
            providesTags: ['Client'],
        }),
        saveClient: build.mutation<Message, { id?: number } & ClientInput>({
            query: ({ id, ...body }) => ({
                url: id ? `/manage/clients/${id}` : '/manage/clients',
                method: id ? 'PUT' : 'POST',
                body,
            }),
            invalidatesTags: ['Client'],
        }),
        deleteClient: build.mutation<Message, number>({
            query: (id) => ({
                url: `/manage/clients/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Client'],
        }),
        clientResetLink: build.mutation<
            Message & { invite_link: string },
            number
        >({
            query: (id) => ({
                url: `/manage/clients/${id}/reset-password-link`,
                method: 'POST',
            }),
        }),
        clientEmailResetLink: build.mutation<Message, number>({
            query: (id) => ({
                url: `/manage/clients/${id}/email-reset-password-link`,
                method: 'POST',
            }),
        }),

        getRestore: build.query<
            RestoreData,
            { tab: string; projects_page?: number; tasks_page?: number }
        >({
            query: (params) => ({ url: '/manage/restore', params }),
            providesTags: ['Restore'],
        }),
        restoreItem: build.mutation<
            Message,
            { kind: 'projects' | 'tasks'; id: number; force?: boolean }
        >({
            query: ({ kind, id, force }) => ({
                url: force
                    ? `/manage/restore/${kind}/${id}`
                    : `/manage/restore/${kind}/${id}/restore`,
                method: force ? 'DELETE' : 'PATCH',
            }),
            invalidatesTags: ['Restore', 'Project', 'Task'],
        }),

        getActivityLogs: build.query<ActivityData, ActivityQuery>({
            query: (params) => ({ url: '/manage/activity-logs', params }),
            transformResponse: (
                data: Omit<ActivityData, 'meta'>,
                meta: ApiMeta | undefined,
            ) => withMeta(data, meta),
            providesTags: ['ActivityLog'],
        }),
    }),
});

export const {
    useGetDepartmentsQuery,
    useSaveDepartmentMutation,
    useDeleteDepartmentMutation,
    useGetCategoriesQuery,
    useSaveCategoryMutation,
    useDeleteCategoryMutation,
    useGetClientsQuery,
    useSaveClientMutation,
    useDeleteClientMutation,
    useClientResetLinkMutation,
    useClientEmailResetLinkMutation,
    useGetRestoreQuery,
    useRestoreItemMutation,
    useGetActivityLogsQuery,
} = orgApi;
