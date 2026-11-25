import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface UiState {
    /** A request was refused with 423 password_confirmation_required. */
    passwordConfirmationOpen: boolean;
    /** Persistent list filters per screen key, so Back keeps them. */
    filters: Record<string, Record<string, string>>;
}

const uiSlice = createSlice({
    name: 'ui',
    initialState: { filters: {}, passwordConfirmationOpen: false } as UiState,
    reducers: {
        filtersChanged(
            state,
            action: PayloadAction<{
                key: string;
                values: Record<string, string>;
            }>,
        ) {
            state.filters[action.payload.key] = action.payload.values;
        },
        passwordConfirmationRequested(state) {
            state.passwordConfirmationOpen = true;
        },
        passwordConfirmationClosed(state) {
            state.passwordConfirmationOpen = false;
        },
        filtersCleared(state, action: PayloadAction<string>) {
            delete state.filters[action.payload];
        },
    },
});

export const {
    filtersChanged,
    filtersCleared,
    passwordConfirmationRequested,
    passwordConfirmationClosed,
} = uiSlice.actions;
export const uiReducer = uiSlice.reducer;
