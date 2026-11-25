import {
    createSelector,
    createSlice,
    type PayloadAction,
    type ThunkAction,
    type UnknownAction,
} from '@reduxjs/toolkit';

import { authApi } from '@/api/endpoints/auth';
import { baseApi, TOKEN_STORAGE_KEY } from '@/api/baseApi';
import type { Home, MeData } from '@/api/types';
import { readStorage } from '@/lib/storage';

import { sessionEnded, type SessionEndReason } from './sessionActions';

interface AuthState {
    token: string | null;
    me: MeData | null;
    /** Why the last session ended; the login or inactive page explains it. */
    endedReason: SessionEndReason | null;
    /** Pending 2FA sign-in (kept in memory only). */
    challengeToken: string | null;
}

export function initialAuthState(): AuthState {
    return {
        token: readStorage(TOKEN_STORAGE_KEY),
        me: null,
        endedReason: null,
        challengeToken: null,
    };
}

const authSlice = createSlice({
    name: 'auth',
    initialState: initialAuthState,
    reducers: {
        tokenReceived(state, action: PayloadAction<string>) {
            state.token = action.payload;
            state.me = null;
            state.endedReason = null;
            state.challengeToken = null;
        },
        challengeStarted(state, action: PayloadAction<string>) {
            state.challengeToken = action.payload;
        },
        challengeCleared(state) {
            state.challengeToken = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(sessionEnded, (state, action) => {
                state.token = null;
                state.me = null;
                state.challengeToken = null;
                state.endedReason = action.payload;
            })
            .addMatcher(
                authApi.endpoints.getMe.matchFulfilled,
                (state, action) => {
                    state.me = action.payload;
                },
            );
    },
});

export const { tokenReceived, challengeStarted, challengeCleared } =
    authSlice.actions;
export const authReducer = authSlice.reducer;

type RootLike = { auth: AuthState };

export const selectToken = (state: RootLike) => state.auth.token;
export const selectMe = (state: RootLike) => state.auth.me;
export const selectEndedReason = (state: RootLike) => state.auth.endedReason;
export const selectChallengeToken = (state: RootLike) =>
    state.auth.challengeToken;

const NO_PERMISSIONS: readonly string[] = [];

export const selectPermissions = createSelector(
    selectMe,
    (me): readonly string[] => me?.user.permissions ?? NO_PERMISSIONS,
);

export const selectHome = (state: RootLike): Home | null =>
    state.auth.me?.home ?? null;

/** Revoke the token on the server (best effort), then wipe the session and the API cache. */
export const logout =
    (): ThunkAction<Promise<void>, RootLike, unknown, UnknownAction> =>
    async (dispatch) => {
        try {
            await dispatch(authApi.endpoints.logout.initiate()).unwrap();
        } catch {
            // the token may already be gone; sign out locally regardless
        }

        dispatch(sessionEnded('logout'));
        dispatch(baseApi.util.resetApiState());
    };
