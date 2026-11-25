import type { ProjectStatus } from '@/api/employee-types';

type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info';

/** Badge tone per project status (status colours are fixed in the style guide). */
export const projectStatusTone: Record<ProjectStatus, Tone> = {
    'In Progress': 'brand',
    Successful: 'success',
    Cancelled: 'danger',
    Failed: 'danger',
    'Paused/Hold': 'warning',
    'In Review': 'info',
    'Payment Pending': 'warning',
};

export function statusTone(status: string): Tone {
    return projectStatusTone[status as ProjectStatus] ?? 'neutral';
}
