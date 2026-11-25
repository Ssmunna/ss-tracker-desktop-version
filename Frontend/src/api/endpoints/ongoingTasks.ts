import { baseApi } from '../baseApi';
import type {
    OngoingList,
    OngoingProject,
    OngoingSettings,
    OngoingTask,
    OngoingTaskInput,
    ProjectOngoingTasks,
} from '../ongoing-types';

export const ongoingTasksApi = baseApi.injectEndpoints({
    endpoints: (build) => ({
        /** All ongoing tasks of a month across projects, with who created each. */
        getOngoingList: build.query<
            OngoingList,
            {
                month?: string;
                project_id?: string;
                developer_id?: string;
                created_by?: string;
                status?: string;
            }
        >({
            query: (params) => ({ url: '/manage/ongoing-tasks', params }),
            providesTags: ['OngoingTask'],
        }),
        /** Manager and permitted-employee view of one project's ongoing tasks. */
        getOngoingProject: build.query<
            OngoingProject,
            { projectId: number; month?: string }
        >({
            query: ({ projectId, month }) => ({
                url: `/manage/projects/${projectId}/ongoing`,
                params: month ? { month } : undefined,
            }),
            providesTags: ['OngoingTask'],
        }),
        updateOngoing: build.mutation<
            OngoingSettings,
            { projectId: number; enabled?: boolean; weight?: number | null }
        >({
            query: ({ projectId, ...body }) => ({
                url: `/manage/projects/${projectId}/ongoing`,
                method: 'PATCH',
                body,
            }),
            invalidatesTags: ['OngoingTask', 'Kpi'],
        }),
        setOngoingMembers: build.mutation<
            OngoingSettings,
            { projectId: number; developer_ids: number[] }
        >({
            query: ({ projectId, ...body }) => ({
                url: `/manage/projects/${projectId}/ongoing/members`,
                method: 'PUT',
                body,
            }),
            invalidatesTags: ['OngoingTask'],
        }),
        saveOngoingTask: build.mutation<
            OngoingTask,
            { projectId: number; id?: number } & OngoingTaskInput
        >({
            query: ({ projectId, id, ...body }) => ({
                url: id
                    ? `/manage/ongoing-tasks/${id}`
                    : `/manage/projects/${projectId}/ongoing/tasks`,
                method: id ? 'PATCH' : 'POST',
                body,
            }),
            invalidatesTags: ['OngoingTask'],
        }),
        deleteOngoingTask: build.mutation<{ message: string }, number>({
            query: (id) => ({
                url: `/manage/ongoing-tasks/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['OngoingTask'],
        }),
        carryOverOngoingTask: build.mutation<OngoingTask, number>({
            query: (id) => ({
                url: `/manage/ongoing-tasks/${id}/carry-over`,
                method: 'POST',
            }),
            invalidatesTags: ['OngoingTask'],
        }),
        carryOverOngoingMonth: build.mutation<
            { carried_over: number },
            { projectId: number; month: string; developer_id?: number }
        >({
            query: ({ projectId, ...body }) => ({
                url: `/manage/projects/${projectId}/ongoing/carry-over`,
                method: 'POST',
                body,
            }),
            invalidatesTags: ['OngoingTask'],
        }),
        setOngoingDefaultWeight: build.mutation<
            { default_weight: number },
            { default_weight: number }
        >({
            query: (body) => ({
                url: '/manage/ongoing-tasks/default-weight',
                method: 'PATCH',
                body,
            }),
            invalidatesTags: ['OngoingTask'],
        }),

        /** The employee's own ongoing tasks of a project they belong to. */
        getProjectOngoingTasks: build.query<
            ProjectOngoingTasks,
            { projectId: number; month?: string }
        >({
            query: ({ projectId, month }) => ({
                url: `/projects/${projectId}/ongoing-tasks`,
                params: month ? { month } : undefined,
            }),
            providesTags: ['OngoingTask'],
        }),
        /** A team member adds, edits or deletes an ongoing task (their own, once created). */
        saveMyOngoingTask: build.mutation<
            OngoingTask,
            { projectId: number; id?: number } & OngoingTaskInput
        >({
            query: ({ projectId, id, ...body }) => ({
                url: id
                    ? `/ongoing-tasks/${id}`
                    : `/projects/${projectId}/ongoing-tasks`,
                method: id ? 'PATCH' : 'POST',
                body,
            }),
            invalidatesTags: ['OngoingTask'],
        }),
        deleteMyOngoingTask: build.mutation<{ message: string }, number>({
            query: (id) => ({
                url: `/ongoing-tasks/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['OngoingTask'],
        }),
        /** For a permitted employee: the switch of a project they belong to. */
        toggleOngoingFeature: build.mutation<
            { enabled: boolean; is_member: boolean; has_open_work: boolean },
            { projectId: number; enabled: boolean }
        >({
            query: ({ projectId, enabled }) => ({
                url: `/projects/${projectId}/ongoing`,
                method: 'PATCH',
                body: { enabled },
            }),
            invalidatesTags: ['OngoingTask', 'Project'],
        }),
    }),
});

export const {
    useGetOngoingListQuery,
    useGetOngoingProjectQuery,
    useUpdateOngoingMutation,
    useSetOngoingMembersMutation,
    useSaveOngoingTaskMutation,
    useDeleteOngoingTaskMutation,
    useCarryOverOngoingTaskMutation,
    useCarryOverOngoingMonthMutation,
    useSetOngoingDefaultWeightMutation,
    useGetProjectOngoingTasksQuery,
    useSaveMyOngoingTaskMutation,
    useDeleteMyOngoingTaskMutation,
    useToggleOngoingFeatureMutation,
} = ongoingTasksApi;
