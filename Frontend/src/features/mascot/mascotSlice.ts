import { createSlice, nanoid, type PayloadAction } from '@reduxjs/toolkit';

import { readStorage } from '@/lib/storage';

import type { MascotKind } from './kinds';

export type MascotItem = {
    id: string;
    /** Page to open when the speech bubble is clicked. */
    path?: string;
} & (
    | { type: 'message'; name: string }
    | {
          type: 'notification';
          kind: MascotKind;
          /** The notification's own title, shown under the spoken line. */
          detail?: string;
      }
);

export type NewMascotItem =
    | Omit<Extract<MascotItem, { type: 'message' }>, 'id'>
    | Omit<Extract<MascotItem, { type: 'notification' }>, 'id'>;

interface MascotState {
    /** Waiting to be spoken (max 5, oldest dropped). */
    queue: MascotItem[];
    /** Being spoken right now. */
    current: MascotItem | null;
    /** The 3D canvas is mounted only while true, so an idle mascot costs no GPU. */
    active: boolean;
    enabled: boolean;
    voice: boolean;
}

const MAX_QUEUE = 5;
export const ENABLED_KEY = 'mascot.enabled';
export const VOICE_KEY = 'mascot.voice';

// A function, so every store (and every test) reads the saved switches afresh.
const initialState = (): MascotState => ({
    queue: [],
    current: null,
    active: false,
    enabled: readStorage(ENABLED_KEY) !== '0',
    voice: readStorage(VOICE_KEY) !== '0',
});

const mascotSlice = createSlice({
    name: 'mascot',
    initialState,
    reducers: {
        enqueue: {
            reducer(state, action: PayloadAction<MascotItem>) {
                if (state.queue.length >= MAX_QUEUE) {
                    state.queue.shift();
                }

                state.queue.push(action.payload);
                state.active = true;
            },
            prepare: (item: NewMascotItem) => ({
                payload: { id: nanoid(8), ...item } as MascotItem,
            }),
        },
        takeNext(state) {
            state.current = state.queue.shift() ?? null;
        },
        clearQueue(state) {
            state.queue = [];
        },
        /** The mascot is home and the door is shut. */
        finish(state) {
            state.current = null;
            // Something arrived during the walk home: stay mounted.
            state.active = state.queue.length > 0;
        },
        setEnabled(state, action: PayloadAction<boolean>) {
            state.enabled = action.payload;

            if (!action.payload) {
                state.queue = [];
                state.active = false;
                state.current = null;
            }
        },
        setVoice(state, action: PayloadAction<boolean>) {
            state.voice = action.payload;
        },
    },
});

export const { enqueue, takeNext, clearQueue, finish, setEnabled, setVoice } =
    mascotSlice.actions;
export const mascotReducer = mascotSlice.reducer;
