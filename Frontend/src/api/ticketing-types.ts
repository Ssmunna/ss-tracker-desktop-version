/** The Ticketing module: clients, tickets and their settings, as served by /manage/ticketing. */

export type TicketStatus =
    'pending' | 'open' | 'in_progress' | 'resolved' | 'closed' | 'rejected';

export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

export type TicketingClientStatus =
    'active' | 'suspended' | 'revoked' | 'deleted';

export type KeyStatus = 'active' | 'grace' | 'expired' | 'revoked';

export type DeliveryState = 'pending' | 'success' | 'failed' | 'exhausted';

export interface TicketingMeta {
    page: number;
    per_page: number;
    total: number;
    last_page: number;
}

export interface TicketingPage<T> {
    items: T[];
    meta: TicketingMeta;
}

export interface TicketingStats {
    tickets: {
        total: number;
        by_status: Record<TicketStatus, number>;
        by_priority: Record<TicketPriority, number>;
        last_7_days: { date: string; count: number }[];
    };
    clients: {
        total: number;
        by_status: Record<TicketingClientStatus, number>;
    };
    webhooks: { failing: number; exhausted: number };
}

export interface ApiKeyRow {
    client_key: string;
    status: KeyStatus;
    expires_at: string | null;
}

export interface NotificationSettings {
    webhook_url: string | null;
    email_enabled: boolean;
    sender_email: string | null;
    sender_name: string | null;
}

export interface TicketingClient {
    id: number;
    name: string;
    domain: string;
    status: TicketingClientStatus;
    allowed_ips: string[] | null;
    rate_limit_per_min: number;
    keys?: ApiKeyRow[];
    notification_settings?: NotificationSettings | null;
    tickets_count?: number;
    suspended_at: string | null;
    created_at: string;
    deleted_at: string | null;
}

export interface ClientInput {
    name: string;
    domain: string;
    allowed_ips: string[] | null;
    rate_limit_per_min: number | null;
}

/** Shown once, right after creating a client or regenerating its keys. */
export interface Credentials {
    client_key: string;
    client_secret: string;
    notice?: string;
    previous_keys_valid_until?: string;
}

export interface CreatedClient {
    client: TicketingClient;
    credentials: Credentials;
}

export interface EmailTemplate {
    status: TicketStatus | null;
    subject: string;
    body: string;
    is_default: boolean;
}

export interface TemplatesData {
    templates: EmailTemplate[];
    default: EmailTemplate;
    placeholders: string[];
}

export interface TicketAttachment {
    name: string;
    mime: string;
    size: number;
}

export interface TimelineEntry {
    old_status: TicketStatus | null;
    new_status: TicketStatus;
    changed_by_type: 'admin' | 'system';
    changed_by_id: number | null;
    note: string | null;
    at: string;
}

export interface TicketNote {
    id: number;
    type: 'internal' | 'reply';
    body: string;
    admin_id: number | null;
    created_at: string;
}

export interface TicketingTicket {
    id: number;
    ticket_number: string;
    client_id: number;
    client?: { id: number; name: string };
    status: TicketStatus;
    priority: TicketPriority;
    customer_name: string;
    customer_email: string;
    customer_phone: string | null;
    subject: string;
    message: string;
    attachments: TicketAttachment[];
    metadata: Record<string, unknown> | null;
    status_timeline?: TimelineEntry[];
    notes?: TicketNote[];
    created_at: string;
    updated_at: string;
}

export interface WebhookDelivery {
    id: number;
    client_id: number;
    ticket_id: number;
    event: string;
    payload: Record<string, unknown>;
    state: DeliveryState;
    attempt: number;
    response_status: number | null;
    response_excerpt: string | null;
    next_retry_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface TicketingAuditLog {
    id: number;
    actor_type: 'admin' | 'client' | 'system' | 'anonymous';
    actor_id: number | null;
    client_id: number | null;
    action: string;
    ip: string | null;
    context: {
        acting_user?: { id: number; name: string };
        [key: string]: unknown;
    } | null;
    created_at: string;
}

export interface TicketFilters {
    client_id?: string;
    status?: string;
    priority?: string;
    search?: string;
    from?: string;
    to?: string;
    page?: number;
    per_page?: number;
}
