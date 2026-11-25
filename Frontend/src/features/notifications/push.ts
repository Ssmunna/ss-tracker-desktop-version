import { useCallback, useEffect, useState } from 'react';

import {
    usePushKeyMutation,
    useSubscribePushMutation,
    useUnsubscribePushMutation,
} from '@/api/endpoints/chat';

export type PushState =
    | 'unsupported'
    | 'unavailable'
    | 'default'
    | 'denied'
    | 'subscribed'
    | 'granted';

const supported = () =>
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window;

function keyBytes(base64: string): Uint8Array<ArrayBuffer> {
    const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4))
        .replace(/-/g, '+')
        .replace(/_/g, '/');
    const raw = window.atob(padded);

    return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

/**
 * Browser push for this device: ask permission, subscribe with the server's VAPID key and
 * register the subscription with the API. The service worker opens `/open/:type/:id` on click.
 */
export function usePush() {
    const [getKey] = usePushKeyMutation();
    const [subscribeApi] = useSubscribePushMutation();
    const [unsubscribeApi] = useUnsubscribePushMutation();
    const [state, setState] = useState<PushState>(
        supported() ? 'default' : 'unsupported',
    );
    const [busy, setBusy] = useState(false);

    const refresh = useCallback(async () => {
        if (!supported()) {
            return;
        }

        const registration = await navigator.serviceWorker.getRegistration();
        const subscription = await registration?.pushManager.getSubscription();

        setState(
            Notification.permission === 'denied'
                ? 'denied'
                : subscription
                  ? 'subscribed'
                  : Notification.permission === 'granted'
                    ? 'granted'
                    : 'default',
        );
    }, []);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void refresh();
    }, [refresh]);

    const enable = async () => {
        if (!supported() || busy) {
            return;
        }

        setBusy(true);

        try {
            const { public_key: publicKey } = await getKey().unwrap();

            if (!publicKey) {
                setState('unavailable');

                return;
            }

            const permission = await Notification.requestPermission();

            if (permission !== 'granted') {
                setState(permission === 'denied' ? 'denied' : 'default');

                return;
            }

            const registration =
                await navigator.serviceWorker.register('/service-worker.js');
            await navigator.serviceWorker.ready;
            const subscription =
                (await registration.pushManager.getSubscription()) ??
                (await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: keyBytes(publicKey),
                }));
            const json = subscription.toJSON();

            await subscribeApi({
                endpoint: json.endpoint!,
                keys: json.keys as Record<string, string>,
            }).unwrap();
            setState('subscribed');
        } finally {
            setBusy(false);
        }
    };

    const disable = async () => {
        setBusy(true);

        try {
            const registration =
                await navigator.serviceWorker.getRegistration();
            const subscription =
                await registration?.pushManager.getSubscription();

            if (subscription) {
                await unsubscribeApi({
                    endpoint: subscription.endpoint,
                }).unwrap();
                await subscription.unsubscribe();
            }

            setState('granted');
        } finally {
            setBusy(false);
        }
    };

    return { state, busy, enable, disable };
}
