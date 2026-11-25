import type { SelectOption } from '@/components/ui/select';

import type {
    DeliveryState,
    KeyStatus,
    TicketPriority,
    TicketStatus,
    TicketingClientStatus,
} from '@/api/ticketing-types';

export type Tone =
    'neutral' | 'brand' | 'success' | 'green' | 'warning' | 'danger' | 'info';

export const TICKET_STATUSES: TicketStatus[] = [
    'pending',
    'open',
    'in_progress',
    'resolved',
    'closed',
    'rejected',
];

export const PRIORITIES: TicketPriority[] = ['low', 'medium', 'high', 'urgent'];

export const label = (value: string) =>
    value.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());

export const statusOptions: SelectOption[] = TICKET_STATUSES.map((value) => ({
    value,
    label: label(value),
}));

export const priorityOptions: SelectOption[] = PRIORITIES.map((value) => ({
    value,
    label: label(value),
}));

export const clientStatusOptions: SelectOption[] = (
    ['active', 'suspended', 'revoked', 'deleted'] as TicketingClientStatus[]
).map((value) => ({ value, label: label(value) }));

/** Mirrors the platform's state machine; the platform enforces it, this only hides impossible choices. */
export const NEXT_STATUSES: Record<TicketStatus, TicketStatus[]> = {
    pending: ['open', 'rejected'],
    open: ['in_progress', 'rejected'],
    in_progress: ['resolved'],
    resolved: ['closed'],
    closed: [],
    rejected: [],
};

export const statusTone: Record<TicketStatus, Tone> = {
    pending: 'warning',
    open: 'info',
    in_progress: 'brand',
    resolved: 'success',
    closed: 'neutral',
    rejected: 'danger',
};

export const priorityTone: Record<TicketPriority, Tone> = {
    low: 'neutral',
    medium: 'info',
    high: 'warning',
    urgent: 'danger',
};

export const clientTone: Record<TicketingClientStatus, Tone> = {
    active: 'success',
    suspended: 'warning',
    revoked: 'danger',
    deleted: 'neutral',
};

export const keyTone: Record<KeyStatus, Tone> = {
    active: 'success',
    grace: 'warning',
    expired: 'neutral',
    revoked: 'danger',
};

export const deliveryTone: Record<DeliveryState, Tone> = {
    pending: 'info',
    success: 'success',
    failed: 'warning',
    exhausted: 'danger',
};

/** Actions written to the platform's audit log, for the filter. */
export const AUDIT_ACTIONS = [
    'auth.failed',
    'admin.login',
    'admin.login_failed',
    'client.created',
    'client.updated',
    'client.suspended',
    'client.unsuspended',
    'client.deleted',
    'keys.generated',
    'keys.regenerated',
    'keys.revoked',
    'keys.expired',
    'ticket.status_changed',
    'ticket.replied',
    'ticket.noted',
    'settings.changed',
];

export function formatBytes(bytes: number): string {
    if (bytes < 1024) {
        return `${bytes} B`;
    }

    return bytes < 1048576
        ? `${(bytes / 1024).toFixed(1)} KB`
        : `${(bytes / 1048576).toFixed(1)} MB`;
}
