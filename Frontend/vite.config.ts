import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    plugins: [react(), tailwindcss()],
    // 5173 is taken by the Laravel (Web/) Vite server, so this app uses 3000.
    server: { port: 3000, strictPort: true },
    build: {
        rollupOptions: {
            output: {
                // Heavy libraries get their own long-lived chunks, so an app change does not
                // make the browser download them again.
                manualChunks(id: string) {
                    if (!id.includes('node_modules')) {
                        return undefined;
                    }

                    if (/chart\.js|react-chartjs-2/.test(id)) {
                        return 'charts';
                    }

                    if (/laravel-echo|pusher-js/.test(id)) {
                        return 'realtime';
                    }

                    if (
                        /@radix-ui|@floating-ui|aria-hidden|react-remove-scroll/.test(
                            id,
                        )
                    ) {
                        return 'radix';
                    }

                    if (
                        /react-router|@reduxjs|redux|immer|reselect|react-redux|react-dom|\/react\//.test(
                            id,
                        )
                    ) {
                        return 'framework';
                    }

                    return undefined;
                },
            },
        },
    },
    resolve: {
        alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./tests/setup.ts'],
        css: false,
        exclude: ['e2e/**', 'node_modules/**'],
        env: { VITE_API_URL: 'http://api.test/api/v1' },
    },
});
