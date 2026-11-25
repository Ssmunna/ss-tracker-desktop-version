import { baseApi, type ApiMeta } from '../baseApi';
import type {
    AppNotification,
    ChatFolder,
    ChatMessage,
    ConversationDetail,
    ConversationList,
    MessagePage,
    NotificationPage,
    NotificationPreference,
    Pin,
    PresignedUpload,
    Readers,
    Reaction,
    SendInput,
} from '../chat-types';
import type { Paged } from '../org-types';

type Ok = { status: string };

/** The API lists newest first; the screen wants oldest first. */
const chronological = (messages: ChatMessage[]) => [...messages].reverse();

export const chatApi = baseApi.injectEndpoints({
    endpoints: (build) => ({
        getConversations: build.query<ConversationList, void>({
            query: () => '/chat/conversations',
            providesTags: ['Conversation'],
        }),
        updateChatPreferences: build.mutation<
            Ok,
            {
                id: number;
                pinned?: boolean;
                archived?: boolean;
                unread?: boolean;
                muted?: 'off' | '1h' | '8h' | '2d' | 'forever';
            }
        >({
            query: ({ id, ...body }) => ({
                url: `/chat/conversations/${id}/preferences`,
                method: 'PATCH',
                body,
            }),
            invalidatesTags: ['Conversation'],
        }),
        clearHistory: build.mutation<Ok, number>({
            query: (id) => ({
                url: `/chat/conversations/${id}/clear`,
                method: 'POST',
            }),
            invalidatesTags: ['Conversation'],
            async onQueryStarted(id, { dispatch, queryFulfilled }) {
                await queryFulfilled;
                // The open thread keeps its own cache; empty it as the server now does.
                dispatch(
                    chatApi.util.updateQueryData(
                        'getConversation',
                        id,
                        (draft) => {
                            draft.messages = [];
                            draft.has_more = false;
                        },
                    ),
                );
            },
        }),
        getFolders: build.query<ChatFolder[], void>({
            query: () => '/chat/folders',
            transformResponse: (data: { folders: ChatFolder[] }) =>
                data.folders,
            providesTags: ['ChatFolder'],
        }),
        createFolder: build.mutation<
            { folder: ChatFolder },
            { name: string; conversation_ids?: number[] }
        >({
            query: (body) => ({
                url: '/chat/folders',
                method: 'POST',
                body,
            }),
            invalidatesTags: ['ChatFolder'],
        }),
        renameFolder: build.mutation<
            { folder: ChatFolder },
            { id: number; name: string }
        >({
            query: ({ id, name }) => ({
                url: `/chat/folders/${id}`,
                method: 'PATCH',
                body: { name },
            }),
            invalidatesTags: ['ChatFolder'],
        }),
        deleteFolder: build.mutation<Ok, number>({
            query: (id) => ({
                url: `/chat/folders/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['ChatFolder'],
        }),
        setFolderMember: build.mutation<
            { folder: ChatFolder },
            { id: number; conversationId: number; member: boolean }
        >({
            query: ({ id, conversationId, member }) => ({
                url: `/chat/folders/${id}/conversations/${conversationId}`,
                method: member ? 'PUT' : 'DELETE',
            }),
            invalidatesTags: ['ChatFolder'],
        }),
        getConversation: build.query<ConversationDetail, number>({
            query: (id) => `/chat/conversations/${id}`,
            transformResponse: (data: ConversationDetail) => ({
                ...data,
                messages: chronological(data.messages),
            }),
            // Realtime events patch this cache, so it is never invalidated by tags.
        }),
        getOlderMessages: build.query<
            MessagePage,
            { id: number; before: number }
        >({
            query: ({ id, before }) => ({
                url: `/chat/conversations/${id}/messages`,
                params: { before },
            }),
            transformResponse: (data: MessagePage) => ({
                ...data,
                messages: chronological(data.messages),
            }),
        }),
        getMessagesFrom: build.query<
            MessagePage & { reached_latest: boolean },
            { id: number; from: number }
        >({
            query: ({ id, from }) => ({
                url: `/chat/conversations/${id}/messages`,
                params: { from },
            }),
            transformResponse: (
                data: MessagePage & { reached_latest: boolean },
            ) => ({ ...data, messages: chronological(data.messages) }),
        }),
        searchMessages: build.query<
            MessagePage,
            {
                id: number;
                q?: string;
                before?: number;
                type?: 'messages' | 'files' | 'links';
            }
        >({
            query: ({ id, ...params }) => ({
                url: `/chat/conversations/${id}/messages/search`,
                params,
            }),
        }),
        getReaders: build.query<Readers, number>({
            query: (id) => `/chat/messages/${id}/readers`,
        }),

        sendMessage: build.mutation<{ message: ChatMessage }, SendInput>({
            query: ({ conversationId, ...body }) => ({
                url: `/chat/conversations/${conversationId}/messages`,
                method: 'POST',
                body,
            }),
        }),
        editMessage: build.mutation<
            { message: ChatMessage },
            { id: number; body: string }
        >({
            query: ({ id, body }) => ({
                url: `/chat/messages/${id}`,
                method: 'PATCH',
                body: { body },
            }),
        }),
        deleteMessage: build.mutation<Ok, number>({
            query: (id) => ({ url: `/chat/messages/${id}`, method: 'DELETE' }),
        }),
        toggleReaction: build.mutation<
            { reactions: Reaction[] },
            { id: number; emoji: string }
        >({
            query: ({ id, emoji }) => ({
                url: `/chat/messages/${id}/reactions`,
                method: 'POST',
                body: { emoji },
            }),
        }),
        markRead: build.mutation<Ok, number>({
            query: (id) => ({
                url: `/chat/conversations/${id}/read`,
                method: 'POST',
            }),
            // The list is refetched after the read is saved, or it keeps showing the old unread count.
            invalidatesTags: ['Me', 'Conversation'],
        }),
        createConversation: build.mutation<
            { conversation: { id: number } },
            {
                type: 'direct' | 'group' | 'project';
                user_id?: number;
                name?: string;
                user_ids?: number[];
                project_id?: number;
            }
        >({
            query: (body) => ({
                url: '/chat/conversations',
                method: 'POST',
                body,
            }),
            invalidatesTags: ['Conversation'],
        }),
        renameConversation: build.mutation<
            unknown,
            { id: number; name: string }
        >({
            query: ({ id, name }) => ({
                url: `/chat/conversations/${id}`,
                method: 'PATCH',
                body: { name },
            }),
            invalidatesTags: ['Conversation'],
        }),
        /** Any member may do this. Multipart cannot ride a PATCH in PHP, so it is spoofed on a POST. */
        changeConversationAvatar: build.mutation<
            unknown,
            { id: number; name: string; avatar: File }
        >({
            query: ({ id, name, avatar }) => {
                const form = new FormData();
                form.append('name', name);
                form.append('avatar', avatar);
                form.append('_method', 'PATCH');

                return {
                    url: `/chat/conversations/${id}`,
                    method: 'POST',
                    body: form,
                };
            },
            invalidatesTags: ['Conversation'],
        }),
        leaveConversation: build.mutation<Ok, number>({
            query: (id) => ({
                url: `/chat/conversations/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Conversation', 'Me'],
        }),
        addParticipant: build.mutation<
            unknown,
            { id: number; user_id: number }
        >({
            query: ({ id, user_id }) => ({
                url: `/chat/conversations/${id}/participants`,
                method: 'POST',
                body: { user_id },
            }),
            invalidatesTags: ['Conversation'],
        }),
        removeParticipant: build.mutation<Ok, { id: number; user_id: number }>({
            query: ({ id, user_id }) => ({
                url: `/chat/conversations/${id}/participants/${user_id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Conversation'],
        }),
        pinMessage: build.mutation<
            { pin: Pin },
            { id: number; scope: 'everyone' | 'me' }
        >({
            query: ({ id, scope }) => ({
                url: `/chat/messages/${id}/pin`,
                method: 'POST',
                body: { scope },
            }),
        }),
        unpinMessage: build.mutation<
            Ok,
            { id: number; scope: 'everyone' | 'me' }
        >({
            query: ({ id, scope }) => ({
                url: `/chat/messages/${id}/pin`,
                method: 'DELETE',
                body: { scope },
            }),
        }),
        presignAttachment: build.mutation<
            PresignedUpload,
            {
                conversationId: number;
                original_name: string;
                size: number;
                mime_type: string;
            }
        >({
            query: ({ conversationId, ...body }) => ({
                url: `/chat/conversations/${conversationId}/attachments/presign`,
                method: 'POST',
                body,
            }),
        }),
        attachmentUrl: build.query<
            { url: string; original_name: string; mime_type: string },
            { id: number; download?: boolean }
        >({
            query: ({ id, download }) => ({
                url: `/chat/attachments/${id}/download`,
                params: download ? { download: 1 } : undefined,
            }),
        }),

        getNotifications: build.query<
            NotificationPage,
            { unread?: boolean; page?: number }
        >({
            query: (params) => ({
                url: '/notifications',
                params: { ...params, per_page: 20 },
            }),
            transformResponse: (
                data: Omit<NotificationPage, 'meta'>,
                meta: ApiMeta | undefined,
            ) => ({ ...data, meta: meta?.envelope as Paged }),
            providesTags: ['Notification'],
        }),
        markNotificationsRead: build.mutation<
            { unread_count: number },
            { ids?: string[] } | void
        >({
            query: (body) => ({
                url: '/notifications/read',
                method: 'POST',
                body: body ?? {},
            }),
            invalidatesTags: ['Notification', 'Me'],
        }),
        pushKey: build.mutation<{ public_key: string | null }, void>({
            query: () => '/web-push/key',
        }),
        subscribePush: build.mutation<
            Ok,
            { endpoint: string; keys: Record<string, string> }
        >({
            query: (body) => ({
                url: '/web-push/subscriptions',
                method: 'POST',
                body,
            }),
        }),
        unsubscribePush: build.mutation<Ok, { endpoint: string }>({
            query: (body) => ({
                url: '/web-push/subscriptions',
                method: 'DELETE',
                body,
            }),
        }),
        getNotificationPreferences: build.query<
            { preferences: NotificationPreference[] },
            void
        >({
            query: () => '/notification-preferences',
        }),
        saveNotificationPreferences: build.mutation<
            { preferences: NotificationPreference[] },
            { type: string; in_app?: boolean; push?: boolean }[]
        >({
            query: (preferences) => ({
                url: '/notification-preferences',
                method: 'PUT',
                body: { preferences },
            }),
        }),
    }),
});

export type { AppNotification };
export const {
    useGetConversationsQuery,
    useGetFoldersQuery,
    useUpdateChatPreferencesMutation,
    useClearHistoryMutation,
    useCreateFolderMutation,
    useRenameFolderMutation,
    useDeleteFolderMutation,
    useSetFolderMemberMutation,
    useGetConversationQuery,
    useLazyGetOlderMessagesQuery,
    useLazyGetMessagesFromQuery,
    useLazySearchMessagesQuery,
    useGetReadersQuery,
    useSendMessageMutation,
    useEditMessageMutation,
    useDeleteMessageMutation,
    useToggleReactionMutation,
    useMarkReadMutation,
    useCreateConversationMutation,
    useChangeConversationAvatarMutation,
    useRenameConversationMutation,
    useLeaveConversationMutation,
    useAddParticipantMutation,
    useRemoveParticipantMutation,
    usePinMessageMutation,
    useUnpinMessageMutation,
    usePresignAttachmentMutation,
    useLazyAttachmentUrlQuery,
    useAttachmentUrlQuery,
    useGetNotificationsQuery,
    useMarkNotificationsReadMutation,
    usePushKeyMutation,
    useSubscribePushMutation,
    useUnsubscribePushMutation,
    useGetNotificationPreferencesQuery,
    useSaveNotificationPreferencesMutation,
} = chatApi;
