import { createContext, useContext } from 'react';

import type { EchoClient } from '@/lib/echo';

export const EchoContext = createContext<EchoClient | null>(null);

export const useEcho = () => useContext(EchoContext);
