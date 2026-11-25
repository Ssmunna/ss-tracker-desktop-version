import { lazy, Suspense, useEffect, useRef, type RefObject } from 'react';
import { createPortal } from 'react-dom';

import { useAppSelector } from '@/app/hooks';

import type { MascotItem } from './mascotSlice';
import { voice } from './voice';
import './mascot.css';

// three.js and the scene are code-split: nothing loads until the first notification.
const MascotCanvas = lazy(() => import('./MascotCanvas'));

const BASE = `${import.meta.env.BASE_URL}mascot/`;

interface MascotOverlayProps {
    /** The header house the mascot comes out of. */
    anchorRef: RefObject<HTMLElement | null>;
    onOpenItem: (item: MascotItem) => void;
}

/**
 * Mount once in the signed-in layout. It renders into <body>: the header's backdrop blur would
 * otherwise become the containing block of the fixed canvas and bubble.
 */
export function MascotOverlay({ anchorRef, onOpenItem }: MascotOverlayProps) {
    const active = useAppSelector((state) => state.mascot.active);
    const queue = useAppSelector((state) => state.mascot.queue);
    const voiceOn = useAppSelector((state) => state.mascot.voice);
    const bubbleRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        void voice.init(`${BASE}voice/`);
    }, []);

    useEffect(() => {
        voice.enabled = voiceOn;

        if (!voiceOn) {
            voice.stop();
        }
    }, [voiceOn]);

    // Fetch the clips while the house opens.
    useEffect(() => {
        for (const item of queue) {
            voice.prefetch(item);
        }
    }, [queue]);

    useEffect(() => {
        if (!active) {
            bubbleRef.current?.classList.remove('show');
        }
    }, [active]);

    return createPortal(
        <>
            {active ? (
                <Suspense fallback={null}>
                    <MascotCanvas
                        anchorRef={anchorRef}
                        bubbleRef={bubbleRef}
                        shirtFront={`${BASE}shirt-front.jpg`}
                        onOpenItem={onOpenItem}
                    />
                </Suspense>
            ) : null}
            <div ref={bubbleRef} className="mascot-bubble" aria-live="polite" />
        </>,
        document.body,
    );
}
