import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router';

import { useGetNotificationsQuery } from '@/api/endpoints/chat';
import type { AppNotificationEvent } from '@/api/chat-types';
import type { MeData } from '@/api/types';
import { useAppSelector } from '@/app/hooks';
import { useEcho } from '@/features/chat/echoState';
import { mascotSpeaksNow } from '@/features/mascot/presence';
import { badgeIcon } from '@/lib/badgeIcon';
import { getDesktop } from '@/lib/desktop';
import { notificationPath } from '@/lib/notificationLink';

import { UpdateBanner } from './UpdateBanner';

interface ChatNotificationEvent {
    conversation_id: number;
    conversation_type: string;
    conversation_name: string | null;
    sender_name: string;
    preview: string | null;
    is_mention: boolean;
    muted?: boolean;
}

/** Safety net for project and task notifications the socket missed (they also arrive as `.app.notification`). */
const POLL_MS = 60_000;

/**
 * Connects the signed-in app to the desktop shell: native pop-ups for new messages and
 * notifications, the unread badge, and opening the right page when a pop-up is clicked.
 * Renders nothing, and does nothing in a browser.
 */
export function DesktopBridge({ me }: { me: MeData }) {
    const desktop = getDesktop();
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const echo = useEcho();
    // Read inside the listeners: while the mascot is announcing, the native pop-up stays quiet.
    const mascotEnabled = useAppSelector((state) => state.mascot.enabled);
    const mascotOn = useRef(mascotEnabled);
    // Read inside the socket listener, so changing page does not reconnect it.
    const openPage = useRef(pathname);
    // Notification ids already shown, so the socket and the poll never pop up one twice.
    const shown = useRef(new Set<string>());
    const userId = me.user.id;
    const home = me.home;
    const unread = me.unread_messages_count + me.unread_notifications_count;

    useEffect(() => {
        if (!desktop) {
            return;
        }

        return desktop.onNavigate((path) => navigate(path));
    }, [desktop, navigate]);

    useEffect(() => {
        openPage.current = pathname;
    }, [pathname]);

    useEffect(() => {
        mascotOn.current = mascotEnabled;
    }, [mascotEnabled]);

    useEffect(() => {
        if (desktop?.platform === 'win32' && unread > 0) {
            // Windows shows no count of its own, so the number is drawn into the taskbar icon.
            desktop.setBadge(unread, badgeIcon(unread) ?? undefined);
        } else {
            desktop?.setBadge(unread);
        }
    }, [desktop, unread]);

    // Sign out: clear the badge so it does not show a stranger's count.
    useEffect(() => () => desktop?.setBadge(0), [desktop]);

    useEffect(() => {
        if (!desktop || !echo) {
            return;
        }

        const channel = echo.private(`chat.user.${userId}`);
        const onMessage = (event: ChatNotificationEvent) => {
            // A muted chat still updates the unread count, but stays quiet.
            if (event.muted) {
                return;
            }

            if (mascotSpeaksNow(mascotOn.current)) {
                return;
            }

            // Looking at this very chat in a window that is in front: the message is already on screen.
            if (
                document.hasFocus() &&
                openPage.current === `/chat/${event.conversation_id}`
            ) {
                return;
            }

            const title =
                event.conversation_type === 'direct' || !event.conversation_name
                    ? event.sender_name
                    : `${event.sender_name} (${event.conversation_name})`;
            const text = event.preview ?? 'Sent an attachment';

            void desktop.notify({
                title,
                body: event.is_mention ? `Mentioned you: ${text}` : text,
                tag: `chat-${event.conversation_id}`,
                path: `/chat/${event.conversation_id}`,
            });
        };

        const onNotification = (event: AppNotificationEvent) => {
            if (shown.current.has(event.id)) {
                return;
            }

            shown.current.add(event.id);

            if (mascotSpeaksNow(mascotOn.current)) {
                return;
            }

            void desktop.notify({
                title: event.title,
                body: event.body,
                tag: `notification-${event.id}`,
                path: notificationPath(home, event.target),
            });
        };

        channel.listen('.chat.notification', onMessage);
        channel.listen('.app.notification', onNotification);

        return () => {
            channel.stopListening('.chat.notification', onMessage);
            channel.stopListening('.app.notification', onNotification);
        };
    }, [desktop, echo, userId, home]);

    // Project and task notifications are not broadcast, so ask for the newest unread ones.
    const { data } = useGetNotificationsQuery(
        { unread: true },
        { skip: !desktop, pollingInterval: POLL_MS },
    );
    const seen = useRef<Set<string> | null>(null);

    useEffect(() => {
        if (!desktop || !data) {
            return;
        }

        const known = seen.current;

        seen.current = new Set(data.notifications.map((item) => item.id));

        // The first answer only records what is already there; it must not replay old items.
        if (!known) {
            return;
        }

        for (const item of data.notifications) {
            // Chat has its own realtime pop-up above.
            if (
                known.has(item.id) ||
                shown.current.has(item.id) ||
                item.target?.type === 'conversation'
            ) {
                continue;
            }

            shown.current.add(item.id);

            if (mascotSpeaksNow(mascotOn.current)) {
                continue;
            }

            void desktop.notify({
                title: item.title,
                body: item.body,
                tag: `notification-${item.id}`,
                path: notificationPath(home, item.target),
            });
        }
    }, [desktop, data, home]);

    return <UpdateBanner />;
}
