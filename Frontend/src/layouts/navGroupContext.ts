import { createContext, useContext, useEffect } from 'react';

export interface NavGroupState {
    /** The project group whose project is open, so the sidebar keeps that group highlighted. */
    activeGroupId: number | null;
    setActiveGroupId: (id: number | null) => void;
}

export const NavGroupContext = createContext<NavGroupState>({
    activeGroupId: null,
    setActiveGroupId: () => {},
});

export const useActiveNavGroup = () =>
    useContext(NavGroupContext).activeGroupId;

/** Pages inside a group's project call this with that project's group while mounted. */
export function useSetActiveNavGroup(groupId: number | null | undefined) {
    const { setActiveGroupId } = useContext(NavGroupContext);

    useEffect(() => {
        setActiveGroupId(groupId ?? null);

        return () => setActiveGroupId(null);
    }, [groupId, setActiveGroupId]);
}
