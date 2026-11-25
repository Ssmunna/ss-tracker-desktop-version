import { baseApi } from '../baseApi';
import type { AdminProjectDetail, CredentialBody } from '../admin-detail-types';

type Message = { message: string };
type Scoped = { projectId: number };

const detailTags = (projectId: number) => [
    { type: 'Project' as const, id: projectId },
];

/** Project detail and everything an admin can do inside it (`/manage/projects/{p}/...`). */
export const adminProjectDetailApi = baseApi.injectEndpoints({
    endpoints: (build) => ({
        getAdminProject: build.query<
            AdminProjectDetail,
            { projectId: number; phase?: number | 'all' }
        >({
            query: ({ projectId, phase }) => ({
                url: `/manage/projects/${projectId}`,
                params: phase === undefined ? undefined : { phase },
            }),
            providesTags: (_r, _e, { projectId }) => detailTags(projectId),
        }),

        /** Only the links of the project (Google Drive and others). */
        saveProjectLinks: build.mutation<
            Message,
            Scoped & { links: Array<{ url: string; label: string | null }> }
        >({
            query: ({ projectId, links }) => ({
                url: `/manage/projects/${projectId}/links`,
                method: 'PUT',
                body: { links },
            }),
            invalidatesTags: (_r, _e, { projectId }) => [
                ...detailTags(projectId),
                'Project',
            ],
        }),

        // tasks
        createAdminTask: build.mutation<
            Message,
            Scoped & { body: Record<string, unknown> }
        >({
            query: ({ projectId, body }) => ({
                url: `/manage/projects/${projectId}/tasks`,
                method: 'POST',
                body,
            }),
            invalidatesTags: (_r, _e, { projectId }) => detailTags(projectId),
        }),
        updateAdminTask: build.mutation<
            Message,
            Scoped & { taskId: number; body: Record<string, unknown> }
        >({
            query: ({ projectId, taskId, body }) => ({
                url: `/manage/projects/${projectId}/tasks/${taskId}`,
                method: 'PUT',
                body,
            }),
            invalidatesTags: (_r, _e, { projectId }) => detailTags(projectId),
        }),
        deleteAdminTask: build.mutation<Message, Scoped & { taskId: number }>({
            query: ({ projectId, taskId }) => ({
                url: `/manage/projects/${projectId}/tasks/${taskId}`,
                method: 'DELETE',
            }),
            invalidatesTags: (_r, _e, { projectId }) => detailTags(projectId),
        }),
        setAdminTaskAssignee: build.mutation<
            Message,
            Scoped & { taskId: number; assigned_developer_id: number | null }
        >({
            query: ({ projectId, taskId, assigned_developer_id }) => ({
                url: `/manage/projects/${projectId}/tasks/${taskId}/assignee`,
                method: 'PATCH',
                body: { assigned_developer_id },
            }),
            invalidatesTags: (_r, _e, { projectId }) => detailTags(projectId),
        }),
        setAdminTaskStatusPriority: build.mutation<
            Message,
            Scoped & {
                taskId: number;
                status?: string;
                priority?: string | null;
                deadline?: string | null;
            }
        >({
            query: ({ projectId, taskId, ...body }) => ({
                url: `/manage/projects/${projectId}/tasks/${taskId}/status-priority`,
                method: 'PATCH',
                body,
            }),
            invalidatesTags: (_r, _e, { projectId }) => detailTags(projectId),
        }),

        // milestones
        createAdminMilestone: build.mutation<
            Message,
            Scoped & { body: Record<string, unknown> }
        >({
            query: ({ projectId, body }) => ({
                url: `/manage/projects/${projectId}/milestones`,
                method: 'POST',
                body,
            }),
            invalidatesTags: (_r, _e, { projectId }) => detailTags(projectId),
        }),
        updateAdminMilestone: build.mutation<
            Message,
            Scoped & { milestoneId: number; body: Record<string, unknown> }
        >({
            query: ({ projectId, milestoneId, body }) => ({
                url: `/manage/projects/${projectId}/milestones/${milestoneId}`,
                method: 'PUT',
                body,
            }),
            invalidatesTags: (_r, _e, { projectId }) => detailTags(projectId),
        }),
        deleteAdminMilestone: build.mutation<
            Message,
            Scoped & { milestoneId: number }
        >({
            query: ({ projectId, milestoneId }) => ({
                url: `/manage/projects/${projectId}/milestones/${milestoneId}`,
                method: 'DELETE',
            }),
            invalidatesTags: (_r, _e, { projectId }) => detailTags(projectId),
        }),

        // phases
        getPhaseAssignments: build.query<
            {
                assignments: Array<{
                    id: number;
                    developer: {
                        id: number;
                        name: string;
                        developer_code: string;
                    };
                }>;
            },
            { projectId: number; phaseId: number }
        >({
            query: ({ projectId, phaseId }) =>
                `/manage/projects/${projectId}/phases/${phaseId}`,
            providesTags: (_r, _e, { projectId }) => detailTags(projectId),
        }),
        createPhase: build.mutation<
            Message,
            Scoped & {
                body: {
                    category_id: number;
                    start_date?: string | null;
                    deadline?: string | null;
                };
            }
        >({
            query: ({ projectId, body }) => ({
                url: `/manage/projects/${projectId}/phases`,
                method: 'POST',
                body,
            }),
            invalidatesTags: (_r, _e, { projectId }) => detailTags(projectId),
        }),
        updatePhase: build.mutation<
            Message,
            Scoped & { phaseId: number; body: Record<string, unknown> }
        >({
            query: ({ projectId, phaseId, body }) => ({
                url: `/manage/projects/${projectId}/phases/${phaseId}`,
                method: 'PUT',
                body,
            }),
            invalidatesTags: (_r, _e, { projectId }) => detailTags(projectId),
        }),
        completePhase: build.mutation<
            Message,
            Scoped & { phaseId: number; client_approval_reference?: string }
        >({
            query: ({ projectId, phaseId, ...body }) => ({
                url: `/manage/projects/${projectId}/phases/${phaseId}/complete`,
                method: 'POST',
                body,
            }),
            invalidatesTags: (_r, _e, { projectId }) => [
                ...detailTags(projectId),
                'Kpi',
            ],
        }),
        reopenPhase: build.mutation<
            Message,
            Scoped & { phaseId: number; reason: string }
        >({
            query: ({ projectId, phaseId, ...body }) => ({
                url: `/manage/projects/${projectId}/phases/${phaseId}/reopen`,
                method: 'POST',
                body,
            }),
            invalidatesTags: (_r, _e, { projectId }) => [
                ...detailTags(projectId),
                'Kpi',
            ],
        }),
        setPhaseDevelopers: build.mutation<
            Message,
            Scoped & { phaseId: number; developer_ids: number[] }
        >({
            query: ({ projectId, phaseId, ...body }) => ({
                url: `/manage/projects/${projectId}/phases/${phaseId}/assignments`,
                method: 'PUT',
                body,
            }),
            invalidatesTags: (_r, _e, { projectId }) => detailTags(projectId),
        }),

        setPhaseOwner: build.mutation<
            Message,
            Scoped & { phaseId: number; owner_developer_id: number | null }
        >({
            query: ({ projectId, phaseId, ...body }) => ({
                url: `/manage/projects/${projectId}/phases/${phaseId}/owner`,
                method: 'PUT',
                body,
            }),
            invalidatesTags: () => ['Project'],
        }),

        // requests, extensions, issues
        reviewRequest: build.mutation<
            Message,
            Scoped & {
                requestId: number;
                status: 'approved' | 'rejected' | 'pending';
                reason?: string;
                approved_date?: string;
            }
        >({
            query: ({ projectId, requestId, ...body }) => ({
                url: `/manage/projects/${projectId}/requests/${requestId}`,
                method: 'PUT',
                body,
            }),
            invalidatesTags: (_r, _e, { projectId }) => [
                ...detailTags(projectId),
                'Request',
                'Me',
            ],
        }),
        deleteAdminRequest: build.mutation<
            Message,
            Scoped & { requestId: number }
        >({
            query: ({ projectId, requestId }) => ({
                url: `/manage/projects/${projectId}/requests/${requestId}`,
                method: 'DELETE',
            }),
            invalidatesTags: (_r, _e, { projectId }) => [
                ...detailTags(projectId),
                'Request',
                'Me',
            ],
        }),
        reviewExtension: build.mutation<
            Message,
            Scoped & {
                extensionId: number;
                body: {
                    status: string;
                    new_deadline?: string | null;
                    extension_type?: string | null;
                    review_note?: string | null;
                };
            }
        >({
            query: ({ projectId, extensionId, body }) => ({
                url: `/manage/projects/${projectId}/deadline-extensions/${extensionId}`,
                method: 'PUT',
                body,
            }),
            invalidatesTags: (_r, _e, { projectId }) => [
                ...detailTags(projectId),
                'Extension',
                'Me',
            ],
        }),
        deleteAdminExtension: build.mutation<
            Message,
            Scoped & { extensionId: number }
        >({
            query: ({ projectId, extensionId }) => ({
                url: `/manage/projects/${projectId}/deadline-extensions/${extensionId}`,
                method: 'DELETE',
            }),
            invalidatesTags: (_r, _e, { projectId }) => [
                ...detailTags(projectId),
                'Extension',
                'Me',
            ],
        }),
        updateAdminIssue: build.mutation<
            Message,
            Scoped & { issueId: number; status: string }
        >({
            query: ({ projectId, issueId, status }) => ({
                url: `/manage/projects/${projectId}/issues/${issueId}`,
                method: 'PATCH',
                body: { status },
            }),
            invalidatesTags: (_r, _e, { projectId }) => detailTags(projectId),
        }),

        // credentials
        createCredential: build.mutation<
            Message,
            Scoped & { body: CredentialBody }
        >({
            query: ({ projectId, body }) => ({
                url: `/manage/projects/${projectId}/credentials`,
                method: 'POST',
                body,
            }),
            invalidatesTags: (_r, _e, { projectId }) => detailTags(projectId),
        }),
        updateCredential: build.mutation<
            Message,
            Scoped & { credentialId: number; body: Partial<CredentialBody> }
        >({
            query: ({ projectId, credentialId, body }) => ({
                url: `/manage/projects/${projectId}/credentials/${credentialId}`,
                method: 'PUT',
                body,
            }),
            invalidatesTags: (_r, _e, { projectId }) => detailTags(projectId),
        }),
        deleteCredential: build.mutation<
            Message,
            Scoped & { credentialId: number }
        >({
            query: ({ projectId, credentialId }) => ({
                url: `/manage/projects/${projectId}/credentials/${credentialId}`,
                method: 'DELETE',
            }),
            invalidatesTags: (_r, _e, { projectId }) => detailTags(projectId),
        }),
        /** A mutation (not a query) so the secret is never cached. */
        revealCredential: build.mutation<
            { secret: string },
            Scoped & { credentialId: number }
        >({
            query: ({ projectId, credentialId }) => ({
                url: `/manage/projects/${projectId}/credentials/${credentialId}/reveal`,
                method: 'POST',
            }),
        }),

        // documents
        uploadAdminDocument: build.mutation<Message, Scoped & { file: File }>({
            query: ({ projectId, file }) => {
                const body = new FormData();
                body.append('document', file);

                return {
                    url: `/manage/projects/${projectId}/documents`,
                    method: 'POST',
                    body,
                };
            },
            invalidatesTags: (_r, _e, { projectId }) => detailTags(projectId),
        }),
        deleteAdminDocument: build.mutation<
            Message,
            Scoped & { fileId: string }
        >({
            query: ({ projectId, fileId }) => ({
                url: `/manage/projects/${projectId}/documents`,
                method: 'DELETE',
                body: { file_id: fileId },
            }),
            invalidatesTags: (_r, _e, { projectId }) => detailTags(projectId),
        }),
    }),
});

export const {
    useGetAdminProjectQuery,
    useCreateAdminTaskMutation,
    useSaveProjectLinksMutation,
    useUpdateAdminTaskMutation,
    useDeleteAdminTaskMutation,
    useSetAdminTaskAssigneeMutation,
    useSetAdminTaskStatusPriorityMutation,
    useCreateAdminMilestoneMutation,
    useUpdateAdminMilestoneMutation,
    useDeleteAdminMilestoneMutation,
    useGetPhaseAssignmentsQuery,
    useCreatePhaseMutation,
    useUpdatePhaseMutation,
    useCompletePhaseMutation,
    useReopenPhaseMutation,
    useSetPhaseDevelopersMutation,
    useSetPhaseOwnerMutation,
    useReviewRequestMutation,
    useDeleteAdminRequestMutation,
    useReviewExtensionMutation,
    useDeleteAdminExtensionMutation,
    useUpdateAdminIssueMutation,
    useCreateCredentialMutation,
    useUpdateCredentialMutation,
    useDeleteCredentialMutation,
    useRevealCredentialMutation,
    useUploadAdminDocumentMutation,
    useDeleteAdminDocumentMutation,
} = adminProjectDetailApi;
