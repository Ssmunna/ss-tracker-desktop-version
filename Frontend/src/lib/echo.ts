import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import type { ChannelAuthorizationData } from 'pusher-js/types/src/core/auth/options';

import type { RealtimeConfig } from '@/api/types';

declare global {
    interface Window {
        Pusher: typeof Pusher;
    }
}

export type EchoClient = Echo<'reverb'>;

/**
 * Connects to Reverb with the bearer token. The channel authorizer posts to the API's
 * broadcasting endpoint with the same `Authorization` header every other call uses.
 * Returns null when the server has no realtime key.
 */
export function createEcho(
    config: RealtimeConfig,
    token: string,
): EchoClient | null {
    if (!config.key || !config.host) {
        return null;
    }

    window.Pusher = Pusher;

    return new Echo({
        broadcaster: 'reverb',
        key: config.key,
        wsHost: config.host,
        wsPort: config.port,
        wssPort: config.port,
        forceTLS: config.scheme === 'https',
        enabledTransports: ['ws', 'wss'],
        authorizer: (channel: { name: string }) => ({
            authorize: (
                socketId: string,
                callback: (
                    error: Error | null,
                    data: ChannelAuthorizationData | null,
                ) => void,
            ) => {
                fetch(config.auth_endpoint, {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${token}`,
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        socket_id: socketId,
                        channel_name: channel.name,
                    }),
                })
                    .then((response) => {
                        if (!response.ok) {
                            throw new Error(
                                `Channel auth failed (${response.status})`,
                            );
                        }

                        return response.json();
                    })
                    .then((data: ChannelAuthorizationData) =>
                        callback(null, data),
                    )
                    .catch((error: Error) => callback(error, null));
            },
        }),
    });
}
