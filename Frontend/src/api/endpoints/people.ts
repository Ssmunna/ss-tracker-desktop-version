import { baseApi, type ApiMeta } from '../baseApi';
import type { Paged } from '../org-types';
import type {
    EmployeeDetail,
    EmployeeInput,
    EmployeeList,
    EmployeeQuery,
    PermissionScreen,
    RoleDetail,
    RoleList,
} from '../people-types';

type Message = { message: string };

export const peopleApi = baseApi.injectEndpoints({
    endpoints: (build) => ({
        getEmployees: build.query<EmployeeList, EmployeeQuery>({
            query: (params) => ({ url: '/manage/developers', params }),
            transformResponse: (
                data: Omit<EmployeeList, 'meta'>,
                meta: ApiMeta | undefined,
            ) => ({ ...data, meta: meta?.envelope as Paged }),
            providesTags: ['Employee'],
        }),
        getEmployee: build.query<
            EmployeeDetail,
            { id: number; month?: number; year?: number }
        >({
            query: ({ id, ...params }) => ({
                url: `/manage/developers/${id}`,
                params,
            }),
            providesTags: ['Employee'],
        }),
        saveEmployee: build.mutation<
            Message & { invite_link?: string | null },
            { id?: number } & EmployeeInput
        >({
            query: ({ id, ...body }) => ({
                url: id ? `/manage/developers/${id}` : '/manage/developers',
                method: id ? 'PUT' : 'POST',
                body,
            }),
            invalidatesTags: ['Employee', 'Me'],
        }),
        deleteEmployee: build.mutation<Message, number>({
            query: (id) => ({
                url: `/manage/developers/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Employee'],
        }),
        employeeResetLink: build.mutation<
            Message & { invite_link: string },
            number
        >({
            query: (id) => ({
                url: `/manage/developers/${id}/reset-password-link`,
                method: 'POST',
            }),
        }),
        employeeEmailResetLink: build.mutation<Message, number>({
            query: (id) => ({
                url: `/manage/developers/${id}/email-reset-password-link`,
                method: 'POST',
            }),
        }),
        getEmployeePermissions: build.query<PermissionScreen, number>({
            query: (id) => `/manage/developers/${id}/permissions`,
            providesTags: ['Employee'],
        }),
        saveSpecialPermissions: build.mutation<
            Message,
            { id: number; direct_permissions: number[] }
        >({
            query: ({ id, ...body }) => ({
                url: `/manage/developers/${id}/special-permissions`,
                method: 'PUT',
                body,
            }),
            invalidatesTags: ['Employee'],
        }),

        getRoles: build.query<RoleList, { page?: number }>({
            query: (params) => ({
                url: '/manage/roles',
                params: { ...params, per_page: 20 },
            }),
            transformResponse: (
                data: Omit<RoleList, 'meta'>,
                meta: ApiMeta | undefined,
            ) => ({ ...data, meta: meta?.envelope as Paged }),
            providesTags: ['Role'],
        }),
        getRole: build.query<RoleDetail, number>({
            query: (id) => `/manage/roles/${id}`,
            providesTags: ['Role'],
        }),
        saveRole: build.mutation<
            Message,
            { id?: number; name: string; permissions: number[] }
        >({
            query: ({ id, ...body }) => ({
                url: id ? `/manage/roles/${id}` : '/manage/roles',
                method: id ? 'PUT' : 'POST',
                body,
            }),
            invalidatesTags: ['Role', 'Employee', 'Me'],
        }),
        deleteRole: build.mutation<Message, number>({
            query: (id) => ({ url: `/manage/roles/${id}`, method: 'DELETE' }),
            invalidatesTags: ['Role'],
        }),
    }),
});

export const {
    useGetEmployeesQuery,
    useGetEmployeeQuery,
    useSaveEmployeeMutation,
    useDeleteEmployeeMutation,
    useEmployeeResetLinkMutation,
    useEmployeeEmailResetLinkMutation,
    useGetEmployeePermissionsQuery,
    useSaveSpecialPermissionsMutation,
    useGetRolesQuery,
    useGetRoleQuery,
    useSaveRoleMutation,
    useDeleteRoleMutation,
} = peopleApi;
