import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';

import { baseApi, TOKEN_STORAGE_KEY } from '@/api/baseApi';
import { authReducer } from '@/features/auth/authSlice';
import {
    ENABLED_KEY,
    VOICE_KEY,
    mascotReducer,
} from '@/features/mascot/mascotSlice';
import { uiReducer } from '@/features/ui/uiSlice';
import { writeStorage } from '@/lib/storage';

export function makeStore() {
    const store = configureStore({
        reducer: {
            [baseApi.reducerPath]: baseApi.reducer,
            auth: authReducer,
            ui: uiReducer,
            mascot: mascotReducer,
        },
        middleware: (getDefault) => getDefault().concat(baseApi.middleware),
    });

    // Persist the token (the one thing that must survive a reload).
    let lastToken = store.getState().auth.token;
    store.subscribe(() => {
        const token = store.getState().auth.token;

        if (token !== lastToken) {
            lastToken = token;
            writeStorage(TOKEN_STORAGE_KEY, token);
        }
    });

    // Mascot switches are per device; "on" is the default, so only "off" is stored.
    let lastMascot = store.getState().mascot;
    store.subscribe(() => {
        const mascot = store.getState().mascot;

        if (mascot.enabled !== lastMascot.enabled) {
            writeStorage(ENABLED_KEY, mascot.enabled ? null : '0');
        }

        if (mascot.voice !== lastMascot.voice) {
            writeStorage(VOICE_KEY, mascot.voice ? null : '0');
        }

        lastMascot = mascot;
    });

    // refetchOnFocus / refetchOnReconnect (used to refresh /me)
    setupListeners(store.dispatch);

    return store;
}

export const store = makeStore();

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
