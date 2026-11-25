import { baseApi } from '../baseApi';
import { patchProjectDetail } from './employeeProject';
import type {
    EmployeeDashboard,
    GeneralTasksResponse,
    MyProjectsResponse,
    TaskStatusChange,
} from '../employee-types';

export const employeeApi = baseApi.injectEndpoints({
    endpoints: (build) => ({
        getEmployeeDashboard: build.query<
            EmployeeDashboard,
            { history_date?: string } | void
        >({
            query: (params) => ({
                url: '/dashboard',
                params: params ?? undefined,
            }),
            providesTags: ['Project', 'Task'],
        }),
        getMyProjects: build.query<MyProjectsResponse, void>({
            query: () => '/projects',
            providesTags: ['Project'],
        }),
        updateProjectTeam: build.mutation<
            { message: string },
            { projectId: number; assigned_developer_ids: number[] }
        >({
            query: ({ projectId, ...body }) => ({
                url: `/projects/${projectId}/team`,
                method: 'PUT',
                body,
            }),
            invalidatesTags: ['Project'],
        }),
        getMyGeneralTasks: build.query<
            GeneralTasksResponse,
            { month?: string } | void
        >({
            query: (params) => ({
                url: '/general-tasks',
                params: params ?? undefined,
            }),
            providesTags: ['GeneralTask'],
        }),
        /** Toggle a task (project or general). Completing needs the time spent. */
        setTaskStatus: build.mutation<
            {
                message: string;
                changed: boolean;
                task: { id: number; status: string };
            },
            // `projectId` (project tasks) lets the open workspace change at once.
            { taskId: number; projectId?: number } & TaskStatusChange
        >({
            query: ({ taskId, projectId, ...body }) => {
                void projectId;

                return {
                    url: `/dashboard/tasks/${taskId}`,
                    method: 'PATCH',
                    body,
                };
            },
            async onQueryStarted(
                { taskId, projectId, status },
                { dispatch, getState, queryFulfilled },
            ) {
                if (projectId === undefined) {
                    return;
                }

                const patch = patchProjectDetail(
                    dispatch,
                    getState,
                    projectId,
                    (draft) => {
                        const task = draft.project.tasks.find(
                            (item) => item.id === taskId,
                        );

                        if (task) {
                            task.status = status;
                        }
                    },
                );

                try {
                    await queryFulfilled;
                } catch {
                    patch.undo();
                }
            },
            invalidatesTags: ['GeneralTask', 'OngoingTask', 'Task', 'Project'],
        }),
        submitManualReport: build.mutation<
            { message: string },
            { report_text: string }
        >({
            query: (body) => ({
                url: '/dashboard/manual-report',
                method: 'POST',
                body,
            }),
            invalidatesTags: ['Me'],
        }),
    }),
});

export const {
    useGetEmployeeDashboardQuery,
    useGetMyProjectsQuery,
    useUpdateProjectTeamMutation,
    useGetMyGeneralTasksQuery,
    useSetTaskStatusMutation,
    useSubmitManualReportMutation,
} = employeeApi;
