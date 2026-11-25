import { createAction } from '@reduxjs/toolkit';

export type SessionEndReason = 'unauthenticated' | 'inactive' | 'logout';

/** Kept apart from the slice so the API layer can dispatch it without an import cycle. */
export const sessionEnded = createAction<SessionEndReason>('auth/sessionEnded');
