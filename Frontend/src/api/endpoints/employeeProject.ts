import type { ThunkDispatch, UnknownAction } from '@reduxjs/toolkit';

import { baseApi } from '../baseApi';
import type { Priority } from '../employee-types';
import type {
    DeadlineExtensionItem,
    ProjectDetail,
    ProjectRequestItem,
    TaskAttachment,
} from '../project-types';

type Message = { message: string };
type Scoped = { projectId: number };

/**
 * Applies `recipe` to every cached workspace of this project (one per phase filter),
 * so an edit shows at once; `undo()` rolls it back if the server refuses.
 */
export function patchProjectDetail(
    dispatch: ThunkDispatch<unknown, unknown, UnknownAction>,
    getState: () => unknown,
    projectId: number,
    recipe: (draft: ProjectDetail) => void,
) {
    const cached = employeeProjectApi.util.selectCachedArgsForQuery(
        getState() as never,
        'getProjectDetail',
    );
    // The thunk is typed against the API's own root state; the store's dispatch accepts it.
    const send = dispatch as unknown as (action: unknown) => {
        undo: () => void;
    };
    const patches = cached
        .filter((args) => args.projectId === projectId)
        .map((args) =>
            send(
                employeeProjectApi.util.updateQueryData(
                    'getProjectDetail',
                    args,
                    recipe,
                ),
            ),
        );

    return { undo: () => patches.forEach((patch) => patch.undo()) };
}

export interface MilestoneBody {
    name: string;
    weight: number;
    estimated_hours: number;
    deadline?: string | null;
    project_phase_id?: number | null;
}

export interface RequestBody {
    title: string;
    description?: string | null;
    links?: string[];
    priority?: Priority;
    project_phase_id?: number | null;
}

export interface ExtensionBody {
    reason: string;
    requested_deadline?: string | null;
    project_phase_id?: number | null;
}

/** Everything the employee project workspace reads and writes. */
export const employeeProjectApi = baseApi.injectEndpoints({
    endpoints: (build) => ({
        getProjectDetail: build.query<
            ProjectDetail,
            { projectId: number; phase?: number | 'all' }
        >({
            query: ({ projectId, phase }) => ({
                url: `/projects/${projectId}`,
                params: phase === undefined ? undefined : { phase },
            }),
            providesTags: (_result, _error, { projectId }) => [
                { type: 'Project', id: projectId },
            ],
        }),

        // tasks
        createTask: build.mutation<
            Message,
            Scoped & { body: Record<string, unknown> }
        >({
            query: ({ projectId, body }) => ({
                url: `/projects/${projectId}/tasks`,
                method: 'POST',
                body,
            }),
            invalidatesTags: (_r, _e, { projectId }) => [
                { type: 'Project', id: projectId },
                'Project',
            ],
        }),
        updateTask: build.mutation<
            Message,
            Scoped & { taskId: number; body: Record<string, unknown> }
        >({
            query: ({ projectId, taskId, body }) => ({
                url: `/projects/${projectId}/tasks/${taskId}`,
                method: 'PUT',
                body,
            }),
            invalidatesTags: (_r, _e, { projectId }) => [
                { type: 'Project', id: projectId },
            ],
        }),
        deleteTask: build.mutation<Message, Scoped & { taskId: number }>({
            query: ({ projectId, taskId }) => ({
                url: `/projects/${projectId}/tasks/${taskId}`,
                method: 'DELETE',
            }),
            invalidatesTags: (_r, _e, { projectId }) => [
                { type: 'Project', id: projectId },
                'Project',
            ],
        }),
        setTaskPriority: build.mutation<
            Message,
            Scoped & { taskId: number; priority: Priority | null }
        >({
            query: ({ projectId, taskId, priority }) => ({
                url: `/projects/${projectId}/tasks/${taskId}/priority`,
                method: 'PATCH',
                body: { priority },
            }),
            async onQueryStarted(
                { projectId, taskId, priority },
                { dispatch, getState, queryFulfilled },
            ) {
                const patch = patchProjectDetail(
                    dispatch,
                    getState,
                    projectId,
                    (draft) => {
                        const task = draft.project.tasks.find(
                            (item) => item.id === taskId,
                        );

                        if (task) {
                            task.priority = priority;
                        }
                    },
                );

                try {
                    await queryFulfilled;
                } catch {
                    patch.undo();
                }
            },
        }),
        setTaskAssignee: build.mutation<
            Message,
            Scoped & { taskId: number; assigned_developer_id: number | null }
        >({
            query: ({ projectId, taskId, assigned_developer_id }) => ({
                url: `/projects/${projectId}/tasks/${taskId}/assignee`,
                method: 'PATCH',
                body: { assigned_developer_id },
            }),
            async onQueryStarted(
                { projectId, taskId, assigned_developer_id },
                { dispatch, getState, queryFulfilled },
            ) {
                const patch = patchProjectDetail(
                    dispatch,
                    getState,
                    projectId,
                    (draft) => {
                        const task = draft.project.tasks.find(
                            (item) => item.id === taskId,
                        );
                        const person = draft.project.team_developers.find(
                            (item) => item.id === assigned_developer_id,
                        );

                        if (task) {
                            task.assigned_developer_id = assigned_developer_id;
                            task.assigned_developer = person
                                ? {
                                      id: person.id,
                                      name: person.name,
                                      developer_code: person.developer_code,
                                  }
                                : null;
                        }
                    },
                );

                try {
                    await queryFulfilled;
                } catch {
                    patch.undo();
                }
            },
            invalidatesTags: (_r, _e, { projectId }) => [
                { type: 'Project', id: projectId },
            ],
        }),
        reorderTasks: build.mutation<
            Message,
            Scoped & { ordered_ids: number[] }
        >({
            query: ({ projectId, ordered_ids }) => ({
                url: `/projects/${projectId}/tasks/reorder`,
                method: 'PATCH',
                body: { ordered_ids },
            }),
            async onQueryStarted(
                { projectId, ordered_ids },
                { dispatch, getState, queryFulfilled },
            ) {
                const patch = patchProjectDetail(
                    dispatch,
                    getState,
                    projectId,
                    (draft) => {
                        const position = new Map(
                            ordered_ids.map((id, index) => [id, index]),
                        );
                        draft.project.tasks.sort(
                            (a, b) =>
                                (position.get(a.id) ?? 9999) -
                                (position.get(b.id) ?? 9999),
                        );
                    },
                );

                try {
                    await queryFulfilled;
                } catch {
                    patch.undo();
                }
            },
        }),
        uploadTaskAttachments: build.mutation<
            {
                message: string;
                task: { id: number; attachments: TaskAttachment[] };
            },
            Scoped & { taskId: number; files: File[] }
        >({
            query: ({ projectId, taskId, files }) => {
                const body = new FormData();
                files.forEach((file) => body.append('files[]', file));

                return {
                    url: `/projects/${projectId}/tasks/${taskId}/attachments`,
                    method: 'POST',
                    body,
                };
            },
            invalidatesTags: (_r, _e, { projectId }) => [
                { type: 'Project', id: projectId },
            ],
        }),

        // milestones
        createMilestone: build.mutation<
            Message,
            Scoped & { body: MilestoneBody }
        >({
            query: ({ projectId, body }) => ({
                url: `/projects/${projectId}/milestones`,
                method: 'POST',
                body,
            }),
            invalidatesTags: (_r, _e, { projectId }) => [
                { type: 'Project', id: projectId },
            ],
        }),
        updateMilestone: build.mutation<
            Message,
            Scoped & { milestoneId: number; body: MilestoneBody }
        >({
            query: ({ projectId, milestoneId, body }) => ({
                url: `/projects/${projectId}/milestones/${milestoneId}`,
                method: 'PUT',
                body,
            }),
            invalidatesTags: (_r, _e, { projectId }) => [
                { type: 'Project', id: projectId },
            ],
        }),
        deleteMilestone: build.mutation<
            Message,
            Scoped & { milestoneId: number }
        >({
            query: ({ projectId, milestoneId }) => ({
                url: `/projects/${projectId}/milestones/${milestoneId}`,
                method: 'DELETE',
            }),
            invalidatesTags: (_r, _e, { projectId }) => [
                { type: 'Project', id: projectId },
            ],
        }),

        // change requests
        createRequest: build.mutation<
            { message: string; request: ProjectRequestItem },
            Scoped & { body: RequestBody }
        >({
            query: ({ projectId, body }) => ({
                url: `/projects/${projectId}/requests`,
                method: 'POST',
                body,
            }),
            invalidatesTags: (_r, _e, { projectId }) => [
                { type: 'Project', id: projectId },
            ],
        }),
        updateRequest: build.mutation<
            Message,
            Scoped & { requestId: number; body: RequestBody }
        >({
            query: ({ projectId, requestId, body }) => ({
                url: `/projects/${projectId}/requests/${requestId}`,
                method: 'PUT',
                body,
            }),
            invalidatesTags: (_r, _e, { projectId }) => [
                { type: 'Project', id: projectId },
            ],
        }),
        deleteRequest: build.mutation<Message, Scoped & { requestId: number }>({
            query: ({ projectId, requestId }) => ({
                url: `/projects/${projectId}/requests/${requestId}`,
                method: 'DELETE',
            }),
            invalidatesTags: (_r, _e, { projectId }) => [
                { type: 'Project', id: projectId },
            ],
        }),

        // deadline extensions
        createExtension: build.mutation<
            { message: string; extension: DeadlineExtensionItem },
            Scoped & { body: ExtensionBody }
        >({
            query: ({ projectId, body }) => ({
                url: `/projects/${projectId}/deadline-extensions`,
                method: 'POST',
                body,
            }),
            invalidatesTags: (_r, _e, { projectId }) => [
                { type: 'Project', id: projectId },
            ],
        }),
        updateExtension: build.mutation<
            Message,
            Scoped & { extensionId: number; body: ExtensionBody }
        >({
            query: ({ projectId, extensionId, body }) => ({
                url: `/projects/${projectId}/deadline-extensions/${extensionId}`,
                method: 'PUT',
                body,
            }),
            invalidatesTags: (_r, _e, { projectId }) => [
                { type: 'Project', id: projectId },
            ],
        }),
        deleteExtension: build.mutation<
            Message,
            Scoped & { extensionId: number }
        >({
            query: ({ projectId, extensionId }) => ({
                url: `/projects/${projectId}/deadline-extensions/${extensionId}`,
                method: 'DELETE',
            }),
            invalidatesTags: (_r, _e, { projectId }) => [
                { type: 'Project', id: projectId },
            ],
        }),

        // client feedback
        updateIssueStatus: build.mutation<
            Message,
            Scoped & {
                issueId: number;
                status: 'open' | 'in_progress' | 'resolved';
            }
        >({
            query: ({ projectId, issueId, status }) => ({
                url: `/projects/${projectId}/issues/${issueId}`,
                method: 'PUT',
                body: { status },
            }),
            invalidatesTags: (_r, _e, { projectId }) => [
                { type: 'Project', id: projectId },
            ],
        }),

        // work hours, team, documents
        saveWorkHours: build.mutation<
            Message,
            Scoped & { hours: number; work_date?: string }
        >({
            query: ({ projectId, ...body }) => ({
                url: `/projects/${projectId}/work-hours`,
                method: 'POST',
                body,
            }),
            invalidatesTags: (_r, _e, { projectId }) => [
                { type: 'Project', id: projectId },
            ],
        }),
        saveProjectTeam: build.mutation<
            Message,
            Scoped & {
                assigned_developer_ids: number[];
                project_phase_id?: number | null;
            }
        >({
            query: ({ projectId, ...body }) => ({
                url: `/projects/${projectId}/team`,
                method: 'PUT',
                body,
            }),
            invalidatesTags: (_r, _e, { projectId }) => [
                { type: 'Project', id: projectId },
                'Project',
            ],
        }),
        uploadDocument: build.mutation<Message, Scoped & { file: File }>({
            query: ({ projectId, file }) => {
                const body = new FormData();
                body.append('document', file);

                return {
                    url: `/projects/${projectId}/documents`,
                    method: 'POST',
                    body,
                };
            },
            invalidatesTags: (_r, _e, { projectId }) => [
                { type: 'Project', id: projectId },
            ],
        }),
        deleteDocument: build.mutation<Message, Scoped & { fileId: string }>({
            query: ({ projectId, fileId }) => ({
                url: `/projects/${projectId}/documents`,
                method: 'DELETE',
                body: { file_id: fileId },
            }),
            invalidatesTags: (_r, _e, { projectId }) => [
                { type: 'Project', id: projectId },
            ],
        }),

        // bulk upload
        startBulkUpload: build.mutation<
            Message,
            Scoped & { file: File; admin?: boolean }
        >({
            query: ({ projectId, file, admin }) => {
                const body = new FormData();
                body.append('file', file);

                return {
                    url: `${admin ? '/manage' : ''}/projects/${projectId}/tasks/bulk-upload`,
                    method: 'POST',
                    body,
                };
            },
        }),
        getBulkUploadStatus: build.query<
            {
                status: string | null;
                message: string | null;
                error: string | null;
                processed: number | null;
                total: number | null;
            },
            { projectId: number; admin?: boolean }
        >({
            query: ({ projectId, admin }) =>
                `${admin ? '/manage' : ''}/projects/${projectId}/tasks/bulk-upload/status`,
        }),
    }),
});

export const {
    useGetProjectDetailQuery,
    useCreateTaskMutation,
    useUpdateTaskMutation,
    useDeleteTaskMutation,
    useSetTaskPriorityMutation,
    useSetTaskAssigneeMutation,
    useReorderTasksMutation,
    useUploadTaskAttachmentsMutation,
    useCreateMilestoneMutation,
    useUpdateMilestoneMutation,
    useDeleteMilestoneMutation,
    useCreateRequestMutation,
    useUpdateRequestMutation,
    useDeleteRequestMutation,
    useCreateExtensionMutation,
    useUpdateExtensionMutation,
    useDeleteExtensionMutation,
    useUpdateIssueStatusMutation,
    useSaveWorkHoursMutation,
    useSaveProjectTeamMutation,
    useUploadDocumentMutation,
    useDeleteDocumentMutation,
    useStartBulkUploadMutation,
    useGetBulkUploadStatusQuery,
} = employeeProjectApi;
