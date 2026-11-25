import type {
    ChatMessage,
    ConversationDetail,
    Pin,
    Reaction,
} from '@/api/chat-types';

/**
 * Pure patches for the open conversation, applied to the RTK Query cache by realtime events.
 * Each one takes the draft detail and changes it in place (immer), so a missed or repeated
 * event is harmless: ids are checked before anything is added or removed.
 */

export function messageSent(draft: ConversationDetail, message: ChatMessage) {
    if (draft.messages.some((item) => item.id === message.id)) {
        return;
    }

    draft.messages.push(message);
}

export function messageUpdated(
    draft: ConversationDetail,
    payload: { id: number; body: string | null; edited_at: string | null },
) {
    const target = draft.messages.find((item) => item.id === payload.id);

    if (target) {
        target.body = payload.body;
        target.edited_at = payload.edited_at;
    }

    for (const item of draft.messages) {
        if (item.reply_to?.id === payload.id) {
            item.reply_to.body = payload.body?.slice(0, 140) ?? null;
        }
    }
}

export function messageDeleted(draft: ConversationDetail, id: number) {
    draft.messages = draft.messages.filter((item) => item.id !== id);
    draft.pins = draft.pins.filter((pin) => pin.message_id !== id);

    for (const item of draft.messages) {
        if (item.reply_to?.id === id) {
            item.reply_to.deleted = true;
            item.reply_to.body = null;
        }
    }
}

export function messageRead(
    draft: ConversationDetail,
    payload: { user_id: number; last_read_message_id: number },
) {
    const participant = draft.participants.find(
        (item) => item.user_id === payload.user_id,
    );

    if (participant) {
        participant.last_read_message_id = Math.max(
            participant.last_read_message_id ?? 0,
            payload.last_read_message_id,
        );
    }
}

export function reactionsUpdated(
    draft: ConversationDetail,
    id: number,
    reactions: Reaction[],
) {
    const target = draft.messages.find((item) => item.id === id);

    if (target) {
        target.reactions = reactions;
    }
}

export function conversationUpdated(
    draft: ConversationDetail,
    payload: { name: string | null; avatar_path?: string | null },
) {
    draft.conversation.name = payload.name;

    if (payload.avatar_path !== undefined) {
        draft.conversation.avatar_path = payload.avatar_path;
    }
}

export function messagePinned(draft: ConversationDetail, pin: Pin) {
    if (!draft.pins.some((item) => item.id === pin.id)) {
        draft.pins.unshift(pin);
    }
}

export function messageUnpinned(draft: ConversationDetail, messageId: number) {
    draft.pins = draft.pins.filter(
        (pin) => !(pin.message_id === messageId && pin.scope === 'everyone'),
    );
}

/** Older messages go in front. Anything already present is skipped. */
export function prependMessages(
    draft: ConversationDetail,
    older: ChatMessage[],
    hasMore: boolean,
) {
    const known = new Set(draft.messages.map((item) => item.id));

    draft.messages = [
        ...older.filter((item) => !known.has(item.id)),
        ...draft.messages,
    ];
    draft.has_more = hasMore;
}

/** Everyone who has read up to a message, besides its sender. */
export function readByOthers(
    detail: ConversationDetail,
    message: ChatMessage,
): number {
    return detail.participants.filter(
        (participant) =>
            participant.user_id !== message.sender.id &&
            !participant.left_at &&
            (participant.last_read_message_id ?? 0) >= message.id,
    ).length;
}
