import type { Paged } from './org-types';

export type ConversationType =
    'direct' | 'group' | 'project' | 'client' | 'saved';

export interface ChatUser {
    id: number;
    name: string;
    avatar_path: string | null;
    client_id: number | null;
    developer_code?: string | null;
}

export interface ConversationItem {
    id: number;
    type: ConversationType;
    name: string | null;
    avatar_path: string | null;
    project_id: number | null;
    project_code: string | null;
    last_message_at: string | null;
    unread_count: number;
    has_unread_mention: boolean;
    last_message_read_by_others: boolean;
    /** The member's own settings for this chat. */
    pinned_at: string | null;
    is_archived: boolean;
    muted_until: string | null;
    marked_unread: boolean;
    other_participant_name?: string | null;
    other_participant_avatar_path?: string | null;
    latest_message: {
        id: number;
        body: string | null;
        type: string;
        user_id: number;
        created_at: string | null;
        sender: { id: number; name: string } | null;
        attachments: {
            id: number;
            original_name: string;
            mime_type: string | null;
        }[];
    } | null;
    participants: { user_id: number; user: ChatUser | null }[];
}

export interface Reaction {
    emoji: string;
    count: number;
    user_ids: number[];
    users?: { id: number; name: string }[];
}

export interface ChatAttachment {
    id: number;
    original_name: string;
    mime_type: string | null;
    size: number;
    download_route?: string;
}

export interface ChatMessage {
    id: number;
    conversation_id: number;
    body: string | null;
    type: 'text' | 'file' | 'system';
    created_at: string | null;
    edited_at: string | null;
    sender: { id: number; name: string; is_client: boolean };
    attachments: ChatAttachment[];
    mentions: { user_id: number; name: string }[];
    reply_to: {
        id: number;
        deleted: boolean;
        sender_name: string;
        body: string | null;
        has_attachment: boolean;
    } | null;
    reactions: Reaction[];
}

export interface Participant {
    id: number;
    conversation_id: number;
    user_id: number;
    role: 'admin' | 'member';
    last_read_message_id: number | null;
    left_at: string | null;
    label: 'client' | 'ceo_squad' | 'team';
    user: ChatUser | null;
}

export interface Pin {
    id: number;
    message_id: number;
    scope: 'everyone' | 'me';
    pinned_at: string | null;
    pinned_by: { id: number; name: string };
    message: {
        id: number;
        type: string;
        body: string | null;
        has_attachment: boolean;
        attachment_name: string | null;
        created_at: string | null;
        sender: { id: number; name: string; is_client: boolean };
    };
}

/** A personal folder. Its unread count is the sum of its conversations' `unread_count`. */
export interface ChatFolder {
    id: number;
    name: string;
    conversation_ids: number[];
}

export interface ConversationList {
    conversations: ConversationItem[];
    users: { id: number; name: string; developer_code: string }[];
    projects: { id: number; name: string; project_code: string }[];
}

export interface ConversationDetail {
    conversation: {
        id: number;
        type: ConversationType;
        name: string | null;
        avatar_path: string | null;
        project_id: number | null;
        project_code: string | null;
    };
    /** Oldest first. The API sends newest first; the endpoint reverses it. */
    messages: ChatMessage[];
    has_more: boolean;
    participants: Participant[];
    is_admin: boolean;
    pins: Pin[];
}

export interface MessagePage {
    messages: ChatMessage[];
    has_more: boolean;
}

export interface SearchPage extends MessagePage {
    q: string;
}

export interface Readers {
    readers: { id: number; name: string }[];
    total: number;
}

export interface PresignedUpload {
    key: string;
    url: string;
    headers: Record<string, string>;
}

export interface OutgoingAttachment {
    key: string;
    original_name: string;
    mime_type: string;
    size: number;
}

export interface SendInput {
    conversationId: number;
    body: string | null;
    reply_to_id?: number | null;
    mentions?: number[];
    attachments?: OutgoingAttachment[];
}

export interface AppNotification {
    id: string;
    type: string | null;
    title: string;
    body: string;
    target: { type: string; id: number | string } | null;
    read_at: string | null;
    created_at: string | null;
}

/** Pushed on `chat.user.{id}` as `.app.notification` the moment a project/task notification is stored. */
export type AppNotificationEvent = Pick<
    AppNotification,
    'id' | 'type' | 'title' | 'body' | 'target'
>;

export interface NotificationPage {
    notifications: AppNotification[];
    unread_count: number;
    meta: Paged;
}

export interface NotificationPreference {
    type: string;
    label: string;
    in_app: boolean;
    push: boolean;
}
