import { useEffect, useRef, useState } from 'react';

import { chatApi } from '@/api/endpoints/chat';
import { baseApi } from '@/api/baseApi';
import type { ChatMessage, Pin, Reaction } from '@/api/chat-types';
import type { MeData } from '@/api/types';
import { useAppDispatch } from '@/app/hooks';
import type { EchoClient } from '@/lib/echo';

import * as patch from './cache';

/**
 * One Echo connection per signed-in session. It lives in the layout so unread counts and the
 * conversation list stay live on every screen; the open conversation joins its own channels.
 */
export function useEchoConnection(
    me: MeData | undefined,
    token: string | null,
) {
    const [echo, setEcho] = useState<EchoClient | null>(null);
    const dispatch = useAppDispatch();
    const userId = me?.user.id;
    const canChat = me?.user.permissions.includes('chat.access') ?? false;
    // Primitives only: `me` is a new object after every /me refetch, and depending on it
    // would tear the socket down and reconnect in a loop (each connect refetches /me).
    const key = me?.realtime?.key;
    const host = me?.realtime?.host;
    const port = me?.realtime?.port;
    const scheme = me?.realtime?.scheme;
    const authEndpoint = me?.realtime?.auth_endpoint;

    useEffect(() => {
        if (!canChat || !key || !host || !port || !scheme || !authEndpoint) {
            return;
        }

        if (!token || !userId) {
            return;
        }

        const realtime = {
            key,
            host,
            port,
            scheme,
            auth_endpoint: authEndpoint,
        };

        let client: EchoClient | null = null;
        let cancelled = false;

        // The socket library is loaded on demand, so it stays out of the first page load.
        void import('@/lib/echo').then(({ createEcho }) => {
            if (cancelled) {
                return;
            }

            client = createEcho(realtime, token);

            if (!client) {
                return;
            }

            const connected = client;
            const refresh = () => {
                dispatch(baseApi.util.invalidateTags(['Conversation', 'Me']));
            };

            connected
                .private(`chat.user.${userId}`)
                .listen('.chat.notification', refresh)
                .listen('.app.notification', () =>
                    dispatch(
                        baseApi.util.invalidateTags(['Notification', 'Me']),
                    ),
                );
            // Missed events while offline: reload the list when the socket comes back.
            // Only after a reconnect: the first connect already has fresh data.
            let first = true;
            connected.connector.pusher.connection.bind('connected', () => {
                if (first) {
                    first = false;

                    return;
                }

                refresh();
            });
            setEcho(connected);
        });

        return () => {
            cancelled = true;
            client?.disconnect();
            setEcho(null);
        };
    }, [
        canChat,
        key,
        host,
        port,
        scheme,
        authEndpoint,
        token,
        userId,
        dispatch,
    ]);

    return echo;
}

/**
 * Joins one conversation's private and presence channels and applies each event to the cache.
 * Returns who is typing, and a `whisper` to say that you are.
 */
export function useConversationChannel(
    echo: EchoClient | null,
    conversationId: number | null,
    selfId: number | undefined,
) {
    const dispatch = useAppDispatch();
    const [typing, setTyping] = useState<Record<number, string>>({});
    const timers = useRef<Record<number, number>>({});
    const presence = useRef<ReturnType<EchoClient['join']> | null>(null);

    useEffect(() => {
        if (!echo || conversationId === null) {
            return;
        }

        const update = (
            recipe: (draft: Parameters<typeof patch.messageSent>[0]) => void,
        ) =>
            dispatch(
                chatApi.util.updateQueryData(
                    'getConversation',
                    conversationId,
                    recipe,
                ),
            );
        const refreshList = () =>
            dispatch(baseApi.util.invalidateTags(['Conversation', 'Me']));

        const channel = echo.private(`chat.conversation.${conversationId}`);

        channel
            .listen('.message.sent', (event: { message: ChatMessage }) => {
                update((draft) => patch.messageSent(draft, event.message));
                refreshList();
            })
            .listen(
                '.message.updated',
                (event: {
                    id: number;
                    body: string | null;
                    edited_at: string | null;
                }) => update((draft) => patch.messageUpdated(draft, event)),
            )
            .listen('.message.deleted', (event: { id: number }) => {
                update((draft) => patch.messageDeleted(draft, event.id));
                refreshList();
            })
            .listen(
                '.message.read',
                (event: { user_id: number; last_read_message_id: number }) =>
                    update((draft) => patch.messageRead(draft, event)),
            )
            .listen(
                '.message.reactions',
                (event: { id: number; reactions: Reaction[] }) =>
                    update((draft) =>
                        patch.reactionsUpdated(
                            draft,
                            event.id,
                            event.reactions,
                        ),
                    ),
            )
            .listen(
                '.conversation.updated',
                (event: {
                    conversation: {
                        name: string | null;
                        avatar_path?: string | null;
                    };
                }) => {
                    update((draft) =>
                        patch.conversationUpdated(draft, event.conversation),
                    );
                    refreshList();
                },
            )
            .listen('.message.pinned', (event: { pin: Pin }) =>
                update((draft) => patch.messagePinned(draft, event.pin)),
            )
            .listen('.message.unpinned', (event: { message_id: number }) =>
                update((draft) =>
                    patch.messageUnpinned(draft, event.message_id),
                ),
            );

        const room = echo.join(`chat.presence.${conversationId}`);
        presence.current = room;
        room.listenForWhisper(
            'typing',
            (event: { id: number; name: string }) => {
                if (event.id === selfId) {
                    return;
                }

                setTyping((current) => ({
                    ...current,
                    [event.id]: event.name,
                }));
                window.clearTimeout(timers.current[event.id]);
                timers.current[event.id] = window.setTimeout(() => {
                    setTyping((current) => {
                        const next = { ...current };
                        delete next[event.id];

                        return next;
                    });
                }, 3000);
            },
        );

        const pending = timers.current;

        return () => {
            Object.values(pending).forEach((timer) =>
                window.clearTimeout(timer),
            );
            setTyping({});
            presence.current = null;
            echo.leave(`chat.conversation.${conversationId}`);
            echo.leave(`chat.presence.${conversationId}`);
        };
    }, [echo, conversationId, selfId, dispatch]);

    return {
        typing: Object.values(typing),
        whisper: (self: { id: number; name: string }) => {
            presence.current?.whisper('typing', self);
        },
    };
}
