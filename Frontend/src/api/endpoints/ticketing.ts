import { baseApi, type ApiMeta } from '../baseApi';
import type {
    ClientInput,
    CreatedClient,
    Credentials,
    DeliveryState,
    EmailTemplate,
    NotificationSettings,
    TemplatesData,
    TicketFilters,
    TicketingAuditLog,
    TicketingClient,
    TicketingMeta,
    TicketingPage,
    TicketingStats,
    TicketingTicket,
    TicketNote,
    TicketStatus,
    WebhookDelivery,
} from '../ticketing-types';

/** The list endpoints answer `{ data: items, meta }`; keep both together. */
const page = <T>(items: T[], meta: ApiMeta | undefined): TicketingPage<T> => ({
    items,
    meta: meta?.envelope as TicketingMeta,
});

const clean = <T extends object>(params: T) =>
    Object.fromEntries(
        Object.entries(params).filter(
            ([, value]) => value !== undefined && value !== '',
        ),
    );

const BASE = '/manage/ticketing';

export const ticketingApi = baseApi.injectEndpoints({
    endpoints: (build) => ({
        getTicketingOverview: build.query<TicketingStats, void>({
            query: () => `${BASE}/overview`,
            providesTags: ['TicketingStats'],
        }),

        // Clients
        getTicketingClients: build.query<
            TicketingPage<TicketingClient>,
            {
                status?: string;
                search?: string;
                page?: number;
                per_page?: number;
            }
        >({
            query: (params) => ({
                url: `${BASE}/clients`,
                params: clean({ per_page: 20, ...params }),
            }),
            transformResponse: (items: TicketingClient[], meta) =>
                page(items, meta),
            providesTags: ['TicketingClient'],
        }),
        getTicketingClient: build.query<TicketingClient, number>({
            query: (id) => `${BASE}/clients/${id}`,
            providesTags: ['TicketingClient'],
        }),
        createTicketingClient: build.mutation<CreatedClient, ClientInput>({
            query: (body) => ({ url: `${BASE}/clients`, method: 'POST', body }),
            invalidatesTags: [
                'TicketingClient',
                'TicketingStats',
                'TicketingAudit',
            ],
        }),
        updateTicketingClient: build.mutation<
            TicketingClient,
            { id: number } & Partial<ClientInput>
        >({
            query: ({ id, ...body }) => ({
                url: `${BASE}/clients/${id}`,
                method: 'PUT',
                body,
            }),
            invalidatesTags: ['TicketingClient', 'TicketingAudit'],
        }),
        deleteTicketingClient: build.mutation<unknown, number>({
            query: (id) => ({ url: `${BASE}/clients/${id}`, method: 'DELETE' }),
            invalidatesTags: [
                'TicketingClient',
                'TicketingStats',
                'TicketingAudit',
            ],
        }),
        suspendTicketingClient: build.mutation<TicketingClient, number>({
            query: (id) => ({
                url: `${BASE}/clients/${id}/suspend`,
                method: 'POST',
            }),
            invalidatesTags: [
                'TicketingClient',
                'TicketingStats',
                'TicketingAudit',
            ],
        }),
        unsuspendTicketingClient: build.mutation<TicketingClient, number>({
            query: (id) => ({
                url: `${BASE}/clients/${id}/unsuspend`,
                method: 'POST',
            }),
            invalidatesTags: [
                'TicketingClient',
                'TicketingStats',
                'TicketingAudit',
            ],
        }),
        regenerateTicketingKeys: build.mutation<Credentials, number>({
            query: (id) => ({
                url: `${BASE}/clients/${id}/keys/regenerate`,
                method: 'POST',
            }),
            invalidatesTags: ['TicketingClient', 'TicketingAudit'],
        }),
        revokeTicketingKeys: build.mutation<{ keys_revoked: number }, number>({
            query: (id) => ({
                url: `${BASE}/clients/${id}/keys/revoke`,
                method: 'POST',
            }),
            invalidatesTags: [
                'TicketingClient',
                'TicketingStats',
                'TicketingAudit',
            ],
        }),

        // Per-client settings and email templates
        getTicketingSettings: build.query<NotificationSettings, number>({
            query: (id) => `${BASE}/clients/${id}/settings`,
            providesTags: ['TicketingClient'],
        }),
        updateTicketingSettings: build.mutation<
            NotificationSettings,
            { id: number } & Partial<NotificationSettings>
        >({
            query: ({ id, ...body }) => ({
                url: `${BASE}/clients/${id}/settings`,
                method: 'PUT',
                body,
            }),
            invalidatesTags: ['TicketingClient', 'TicketingAudit'],
        }),
        getTicketingTemplates: build.query<TemplatesData, number>({
            query: (id) => `${BASE}/clients/${id}/email-templates`,
            providesTags: ['TicketingClient'],
        }),
        saveTicketingTemplate: build.mutation<
            EmailTemplate,
            {
                id: number;
                status: TicketStatus | null;
                subject: string;
                body: string;
            }
        >({
            query: ({ id, ...body }) => ({
                url: `${BASE}/clients/${id}/email-templates`,
                method: 'PUT',
                body,
            }),
            invalidatesTags: ['TicketingClient', 'TicketingAudit'],
        }),
        deleteTicketingTemplate: build.mutation<
            unknown,
            { id: number; status: TicketStatus | 'default' }
        >({
            query: ({ id, status }) => ({
                url: `${BASE}/clients/${id}/email-templates/${status}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['TicketingClient', 'TicketingAudit'],
        }),

        // Webhook deliveries
        getTicketingWebhooks: build.query<
            TicketingPage<WebhookDelivery>,
            { clientId: number; state?: DeliveryState | ''; page?: number }
        >({
            query: ({ clientId, ...params }) => ({
                url: `${BASE}/clients/${clientId}/webhook-deliveries`,
                params: clean({ per_page: 15, ...params }),
            }),
            transformResponse: (items: WebhookDelivery[], meta) =>
                page(items, meta),
            providesTags: ['TicketingWebhook'],
        }),
        retryTicketingWebhook: build.mutation<WebhookDelivery, number>({
            query: (id) => ({
                url: `${BASE}/webhook-deliveries/${id}/retry`,
                method: 'POST',
            }),
            invalidatesTags: ['TicketingWebhook', 'TicketingStats'],
        }),

        // Tickets
        getTicketingTickets: build.query<
            TicketingPage<TicketingTicket>,
            TicketFilters
        >({
            query: (params) => ({
                url: `${BASE}/tickets`,
                params: clean({ per_page: 20, ...params }),
            }),
            transformResponse: (items: TicketingTicket[], meta) =>
                page(items, meta),
            providesTags: ['TicketingTicket'],
        }),
        getTicketingTicket: build.query<TicketingTicket, number>({
            query: (id) => `${BASE}/tickets/${id}`,
            providesTags: ['TicketingTicket'],
        }),
        changeTicketingStatus: build.mutation<
            TicketingTicket,
            { id: number; status: TicketStatus; note?: string }
        >({
            query: ({ id, ...body }) => ({
                url: `${BASE}/tickets/${id}/status`,
                method: 'PATCH',
                body,
            }),
            invalidatesTags: [
                'TicketingTicket',
                'TicketingStats',
                'TicketingWebhook',
                'TicketingAudit',
            ],
        }),
        addTicketingNote: build.mutation<
            TicketNote,
            { id: number; body: string }
        >({
            query: ({ id, ...body }) => ({
                url: `${BASE}/tickets/${id}/notes`,
                method: 'POST',
                body,
            }),
            invalidatesTags: ['TicketingTicket', 'TicketingAudit'],
        }),
        sendTicketingReply: build.mutation<
            TicketNote,
            { id: number; body: string }
        >({
            query: ({ id, ...body }) => ({
                url: `${BASE}/tickets/${id}/replies`,
                method: 'POST',
                body,
            }),
            invalidatesTags: ['TicketingTicket', 'TicketingAudit'],
        }),

        getTicketingAuditLogs: build.query<
            TicketingPage<TicketingAuditLog>,
            {
                client_id?: string;
                action?: string;
                from?: string;
                to?: string;
                page?: number;
            }
        >({
            query: (params) => ({
                url: `${BASE}/audit-logs`,
                params: clean({ per_page: 25, ...params }),
            }),
            transformResponse: (items: TicketingAuditLog[], meta) =>
                page(items, meta),
            providesTags: ['TicketingAudit'],
        }),
    }),
});

export const {
    useGetTicketingOverviewQuery,
    useGetTicketingClientsQuery,
    useGetTicketingClientQuery,
    useCreateTicketingClientMutation,
    useUpdateTicketingClientMutation,
    useDeleteTicketingClientMutation,
    useSuspendTicketingClientMutation,
    useUnsuspendTicketingClientMutation,
    useRegenerateTicketingKeysMutation,
    useRevokeTicketingKeysMutation,
    useGetTicketingSettingsQuery,
    useUpdateTicketingSettingsMutation,
    useGetTicketingTemplatesQuery,
    useSaveTicketingTemplateMutation,
    useDeleteTicketingTemplateMutation,
    useGetTicketingWebhooksQuery,
    useRetryTicketingWebhookMutation,
    useGetTicketingTicketsQuery,
    useGetTicketingTicketQuery,
    useChangeTicketingStatusMutation,
    useAddTicketingNoteMutation,
    useSendTicketingReplyMutation,
    useGetTicketingAuditLogsQuery,
} = ticketingApi;
