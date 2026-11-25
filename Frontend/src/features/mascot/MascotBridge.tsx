import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router';
import { toast } from 'sonner';

import { useGetNotificationsQuery } from '@/api/endpoints/chat';
import type { AppNotificationEvent } from '@/api/chat-types';
import type { MeData } from '@/api/types';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { useEcho } from '@/features/chat/echoState';
import { notificationPath } from '@/lib/notificationLink';

import { kindOf } from './kinds';
import { enqueue, type NewMascotItem } from './mascotSlice';
import { mascotSpeaksNow, prefersReducedMotion } from './presence';

interface ChatNotificationEvent {
    conversation_id: number;
    sender_name: string;
    muted?: boolean;
}

/** Safety net for missed socket events (and for people without chat access, who have no socket). */
const POLL_MS = 60_000;

/**
 * Feeds the mascot: chat messages (`.chat.notification`) and project/task notifications
 * (`.app.notification`: new task, stale task reminder, deadline extension, meeting reminder, ...)
 * arrive over the socket at once; a 60 s poll catches anything the socket missed.
 * Renders nothing.
 */
export function MascotBridge({ me }: { me: MeData }) {
    const dispatch = useAppDispatch();
    const echo = useEcho();
    const { pathname } = useLocation();
    const enabled = useAppSelector((state) => state.mascot.enabled);
    const openPage = useRef(pathname);
    // Notification ids already announced, so the socket and the poll never say one twice.
    const announced = useRef(new Set<string>());
    const userId = me.user.id;
    const home = me.home;

    useEffect(() => {
        openPage.current = pathname;
    }, [pathname]);

    const say = useRef((item: NewMascotItem, fallback: string) => {
        if (prefersReducedMotion()) {
            toast(fallback);
        } else {
            dispatch(enqueue(item));
        }
    });

    useEffect(() => {
        if (!enabled || !echo) {
            return;
        }

        const channel = echo.private(`chat.user.${userId}`);
        const onMessage = (event: ChatNotificationEvent) => {
            if (event.muted || !mascotSpeaksNow(true)) {
                return;
            }

            // Already reading this chat: the message is on screen.
            if (
                document.hasFocus() &&
                openPage.current === `/chat/${event.conversation_id}`
            ) {
                return;
            }

            say.current(
                {
                    type: 'message',
                    name: event.sender_name,
                    path: `/chat/${event.conversation_id}`,
                },
                `${event.sender_name} sent you a message.`,
            );
        };

        const onNotification = (event: AppNotificationEvent) => {
            if (announced.current.has(event.id)) {
                return;
            }

            announced.current.add(event.id);

            if (!mascotSpeaksNow(true)) {
                return;
            }

            say.current(
                {
                    type: 'notification',
                    kind: kindOf(event),
                    detail: event.title,
                    path: notificationPath(home, event.target),
                },
                event.title,
            );
        };

        channel.listen('.chat.notification', onMessage);
        channel.listen('.app.notification', onNotification);

        return () => {
            channel.stopListening('.chat.notification', onMessage);
            channel.stopListening('.app.notification', onNotification);
        };
    }, [enabled, echo, userId, home]);

    const { data } = useGetNotificationsQuery(
        { unread: true },
        { skip: !enabled, pollingInterval: POLL_MS },
    );
    const seen = useRef<Set<string> | null>(null);

    useEffect(() => {
        if (!enabled || !data) {
            return;
        }

        const known = seen.current;

        seen.current = new Set(data.notifications.map((item) => item.id));

        // The first answer only records what is already there; it must not replay old items.
        if (!known) {
            return;
        }

        for (const item of data.notifications) {
            // Chat has its own realtime path above.
            if (
                known.has(item.id) ||
                announced.current.has(item.id) ||
                item.target?.type === 'conversation'
            ) {
                continue;
            }

            announced.current.add(item.id);

            if (!mascotSpeaksNow(true)) {
                continue;
            }

            say.current(
                {
                    type: 'notification',
                    kind: kindOf(item),
                    detail: item.title,
                    path: notificationPath(home, item.target),
                },
                item.title,
            );
        }
    }, [enabled, data, home]);

    return null;
}
