// Web push for the React app. A click opens /open/:type/:id, which the app resolves to the right page.
self.addEventListener('push', (event) => {
    if (!event.data) {
        return;
    }

    const payload = event.data.json();
    const options = {
        body: payload.body,
        icon: payload.icon || '/favicon.svg',
        badge: payload.badge,
        tag: payload.tag,
        data: payload.data || {},
    };

    event.waitUntil(
        self.clients
            .matchAll({ type: 'window', includeUncontrolled: true })
            .then((clients) => {
                // A focused window already shows the update.
                if (clients.some((client) => client.focused)) {
                    return;
                }

                return self.registration.showNotification(
                    payload.title || 'New notification',
                    options,
                );
            }),
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const target = event.notification.data?.target;
    const path = target ? `/open/${encodeURIComponent(target.type)}/${encodeURIComponent(target.id)}` : '/';
    const url = new URL(path, self.location.origin).href;

    event.waitUntil(
        self.clients
            .matchAll({ type: 'window', includeUncontrolled: true })
            .then((clients) => {
                for (const client of clients) {
                    if ('focus' in client) {
                        client.navigate(url);

                        return client.focus();
                    }
                }

                return self.clients.openWindow(url);
            }),
    );
});
