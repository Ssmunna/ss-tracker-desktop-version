import { useCallback } from 'react';

import { useAppSelector } from '@/app/hooks';
import { selectMe } from '@/features/auth/authSlice';
import { phaseWords } from '@/lib/phaseWords';

/** Port of composables/usePhaseLabel.ts: admins can rename "Phase" in settings. */
export function usePhaseLabel() {
    const label = useAppSelector(selectMe)?.phase_label;
    const t = useCallback((text: string) => phaseWords(label, text), [label]);

    return {
        phaseLabel: label?.singular ?? 'Phase',
        phaseLabelPlural: label?.plural ?? 'Phases',
        /** A sentence written with "phase", in the workspace's own word. */
        t,
    };
}
