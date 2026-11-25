import { baseApi, type ApiMeta } from '../baseApi';
import type {
    ExtensionInbox,
    InboxQuery,
    RequestInbox,
} from '../approval-types';
import type { PageMeta } from '../admin-project-types';

type Message = { message: string };

const withMeta = <T>(data: T, meta: ApiMeta | undefined) => ({
    ...data,
    meta: meta?.envelope as PageMeta,
});

export const approvalsApi = baseApi.injectEndpoints({
    endpoints: (build) => ({
        getRequestInbox: build.query<RequestInbox, InboxQuery>({
            query: (params) => ({ url: '/manage/requests', params }),
            transformResponse: (
                data: Omit<RequestInbox, 'meta'>,
                meta: ApiMeta | undefined,
            ) => withMeta(data, meta),
            providesTags: ['Request'],
        }),
        decideRequest: build.mutation<
            Message,
            {
                id: number;
                status: 'approved' | 'rejected' | 'pending';
                reason: string;
                approved_date?: string;
            }
        >({
            query: ({ id, ...body }) => ({
                url: `/manage/requests/${id}`,
                method: 'PUT',
                body,
            }),
            invalidatesTags: ['Request', 'Project', 'Me'],
        }),
        getExtensionInbox: build.query<ExtensionInbox, InboxQuery>({
            query: (params) => ({ url: '/manage/deadline-extensions', params }),
            transformResponse: (
                data: Omit<ExtensionInbox, 'meta'>,
                meta: ApiMeta | undefined,
            ) => withMeta(data, meta),
            providesTags: ['Extension'],
        }),
        decideExtension: build.mutation<
            Message,
            {
                id: number;
                status: 'approved' | 'rejected' | 'pending';
                new_deadline?: string | null;
                extension_type?: string | null;
                review_note?: string | null;
            }
        >({
            query: ({ id, ...body }) => ({
                url: `/manage/deadline-extensions/${id}`,
                method: 'PUT',
                body,
            }),
            invalidatesTags: ['Extension', 'Project', 'Phase', 'Kpi', 'Me'],
        }),
    }),
});

export const {
    useGetRequestInboxQuery,
    useDecideRequestMutation,
    useGetExtensionInboxQuery,
    useDecideExtensionMutation,
} = approvalsApi;
