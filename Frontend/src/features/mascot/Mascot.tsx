import { useRef } from 'react';
import { useNavigate } from 'react-router';

import { useAppSelector } from '@/app/hooks';

import { MascotHomeButton } from './MascotHomeButton';
import { MascotOverlay } from './MascotOverlay';

/** Topbar house plus the overlay it comes alive in. Renders nothing when the mascot is off. */
export function Mascot() {
    const navigate = useNavigate();
    const enabled = useAppSelector((state) => state.mascot.enabled);
    const active = useAppSelector((state) => state.mascot.active);
    const anchor = useRef<HTMLButtonElement>(null);

    if (!enabled) {
        return null;
    }

    return (
        <>
            <MascotHomeButton
                ref={anchor}
                away={active}
                onClick={() => navigate('/notifications')}
            />
            <MascotOverlay
                anchorRef={anchor}
                onOpenItem={(item) => item.path && navigate(item.path)}
            />
        </>
    );
}
