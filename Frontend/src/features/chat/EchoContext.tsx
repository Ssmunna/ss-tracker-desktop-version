import { type ReactNode } from 'react';

import type { MeData } from '@/api/types';
import { useAppSelector } from '@/app/hooks';

import { EchoContext } from './echoState';
import { useEchoConnection } from './useChatRealtime';

/** Opens the realtime connection for the signed-in session and shares it with the chat screens. */
export function EchoProvider({
    me,
    children,
}: {
    me: MeData;
    children: ReactNode;
}) {
    const token = useAppSelector((state) => state.auth.token);
    const echo = useEchoConnection(me, token);

    return <EchoContext.Provider value={echo}>{children}</EchoContext.Provider>;
}
