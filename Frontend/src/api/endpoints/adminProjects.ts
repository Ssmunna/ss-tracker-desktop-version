import { baseApi, type ApiMeta } from '../baseApi';
import type {
    AdminProjectQuery,
    AdminProjectRow,
    AdminProjectsResponse,
    PageMeta,
} from '../admin-project-types';

type Message = { message: string };

/** Sends JSON, or multipart when a file is attached (PHP cannot read a multipart PUT, so it is spoofed). */
function body(
    values: Record<string, unknown>,
    file?: File | null,
    spoof?: 'PUT',
) {
    if (!file) {
        return { body: values, method: spoof ?? 'POST' } as const;
    }

    const form = new FormData();

    for (const [key, value] of Object.entries(values)) {
        if (key === 'links' && Array.isArray(value)) {
            // Nested fields: links[0][url]. An empty list is sent as an empty value, which clears them.
            if (value.length === 0) {
                form.append('links', '');
            }

            (value as Array<{ url: string; label: string | null }>).forEach(
                (link, index) => {
                    form.append(`links[${index}][url]`, link.url);
                    form.append(`links[${index}][label]`, link.label ?? '');
                },
            );
        } else if (Array.isArray(value)) {
            value.forEach((item) => form.append(`${key}[]`, String(item)));
        } else if (value !== null && value !== undefined) {
            form.append(key, String(value));
        }
    }

    form.append('prd_file', file);

    if (spoof) {
        form.append('_method', spoof);
    }

    return { body: form, method: 'POST' } as const;
}

export const adminProjectsApi = baseApi.injectEndpoints({
    endpoints: (build) => ({
        getAdminProjects: build.query<
            AdminProjectsResponse & { meta: PageMeta },
            AdminProjectQuery
        >({
            query: (params) => ({ url: '/manage/projects', params }),
            transformResponse: (
                data: AdminProjectsResponse,
                meta: ApiMeta | undefined,
            ) => ({
                ...data,
                meta: meta?.envelope as PageMeta,
            }),
            providesTags: ['Project'],
        }),
        checkProjectCode: build.query<
            { available: boolean; suggestion: string | null },
            { code: string; ignore_id?: number }
        >({
            query: (params) => ({ url: '/manage/projects/check-code', params }),
        }),
        createAdminProject: build.mutation<
            { message: string; prd_queued: boolean; project: AdminProjectRow },
            { values: Record<string, unknown>; prd?: File | null }
        >({
            query: ({ values, prd }) => ({
                url: '/manage/projects',
                ...body(values, prd),
            }),
            invalidatesTags: ['Project'],
        }),
        updateAdminProject: build.mutation<
            { message: string; prd_queued: boolean; project: AdminProjectRow },
            { id: number; values: Record<string, unknown>; prd?: File | null }
        >({
            query: ({ id, values, prd }) => ({
                url: `/manage/projects/${id}`,
                ...body(values, prd, 'PUT'),
            }),
            invalidatesTags: ['Project'],
        }),
        deleteAdminProject: build.mutation<Message, { id: number }>({
            query: ({ id }) => ({
                url: `/manage/projects/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Project', 'Restore'],
        }),
        setProjectOwner: build.mutation<
            Message,
            { id: number; owner_developer_id: number | null }
        >({
            query: ({ id, ...payload }) => ({
                url: `/manage/projects/${id}/assignments`,
                method: 'PUT',
                body: payload,
            }),
            invalidatesTags: ['Project'],
        }),
        uploadProjectPrd: build.mutation<
            Message,
            { id: number; file: File; phase_id?: number | null }
        >({
            query: ({ id, file, phase_id }) => {
                const form = new FormData();
                form.append('prd_file', file);

                if (phase_id) {
                    form.append('phase_id', String(phase_id));
                }

                return {
                    url: `/manage/projects/${id}/prd-upload`,
                    method: 'POST',
                    body: form,
                };
            },
            invalidatesTags: ['Project'],
        }),
        createDriveFolder: build.mutation<Message, { id: number }>({
            query: ({ id }) => ({
                url: `/manage/projects/${id}/drive-folder`,
                method: 'POST',
            }),
            invalidatesTags: ['Project'],
        }),
    }),
});

export const {
    useGetAdminProjectsQuery,
    useLazyCheckProjectCodeQuery,
    useCreateAdminProjectMutation,
    useUpdateAdminProjectMutation,
    useDeleteAdminProjectMutation,
    useSetProjectOwnerMutation,
    useUploadProjectPrdMutation,
    useCreateDriveFolderMutation,
} = adminProjectsApi;
