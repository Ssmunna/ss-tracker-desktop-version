import { useState, type ReactNode } from 'react';

import { NavGroupContext } from './navGroupContext';

export function NavGroupProvider({ children }: { children: ReactNode }) {
    const [activeGroupId, setActiveGroupId] = useState<number | null>(null);

    return (
        <NavGroupContext.Provider value={{ activeGroupId, setActiveGroupId }}>
            {children}
        </NavGroupContext.Provider>
    );
}
