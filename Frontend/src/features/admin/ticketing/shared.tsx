import { Check, Copy } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';

import type {
    DeliveryState,
    KeyStatus,
    TicketPriority,
    TicketStatus,
    TicketingClientStatus,
} from '@/api/ticketing-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal, ModalClose, ModalContent } from '@/components/ui/modal';

import {
    clientTone,
    deliveryTone,
    keyTone,
    label,
    priorityTone,
    statusTone,
} from './constants';

export const StatusBadge = ({ status }: { status: TicketStatus }) => (
    <Badge tone={statusTone[status]}>{label(status)}</Badge>
);

export const PriorityBadge = ({ priority }: { priority: TicketPriority }) => (
    <Badge tone={priorityTone[priority]}>{label(priority)}</Badge>
);

export const ClientStatusBadge = ({
    status,
}: {
    status: TicketingClientStatus;
}) => <Badge tone={clientTone[status]}>{label(status)}</Badge>;

export const KeyStatusBadge = ({ status }: { status: KeyStatus }) => (
    <Badge tone={keyTone[status]}>{label(status)}</Badge>
);

export const DeliveryBadge = ({ state }: { state: DeliveryState }) => (
    <Badge tone={deliveryTone[state]}>{label(state)}</Badge>
);

/** A value with a copy button, for keys and URLs. */
export function CopyValue({
    value,
    secret,
}: {
    value: string;
    secret?: boolean;
}) {
    const [copied, setCopied] = useState(false);

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error('Could not copy. Select the text and copy it by hand.');
        }
    };

    return (
        <span className="inline-flex max-w-full items-center gap-2">
            <code
                className={`min-w-0 truncate rounded bg-slate-100 px-2 py-1 text-xs text-slate-800 ${secret ? 'select-all' : ''}`}
            >
                {value}
            </code>
            <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 sm:size-8"
                aria-label="Copy"
                onClick={() => void copy()}
            >
                {copied ? (
                    <Check className="size-4" />
                ) : (
                    <Copy className="size-4" />
                )}
            </Button>
        </span>
    );
}

/**
 * Shows a key and its secret once. The platform cannot show the secret again, so this
 * is the only chance to copy it; closing the dialog drops it from memory.
 */
export function SecretDialog({
    title,
    credentials,
    note,
    onClose,
}: {
    title: string;
    credentials: { client_key: string; client_secret: string } | null;
    note?: ReactNode;
    onClose: () => void;
}) {
    return (
        <Modal
            open={credentials !== null}
            onOpenChange={(open) => !open && onClose()}
        >
            <ModalContent
                size="lg"
                title={title}
                description="Copy the secret now. It is shown once and cannot be read again."
                footer={
                    <ModalClose asChild>
                        <Button>I have saved it</Button>
                    </ModalClose>
                }
            >
                {credentials ? (
                    <div className="space-y-4 p-1">
                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                            Put these in the client&apos;s <code>.env</code> as{' '}
                            <code>TICKET_SDK_CLIENT_KEY</code> and{' '}
                            <code>TICKET_SDK_CLIENT_SECRET</code>.
                            {note ? <div className="mt-1">{note}</div> : null}
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs font-bold text-slate-700">
                                Client key
                            </p>
                            <CopyValue value={credentials.client_key} />
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs font-bold text-slate-700">
                                Client secret
                            </p>
                            <CopyValue
                                value={credentials.client_secret}
                                secret
                            />
                        </div>
                    </div>
                ) : null}
            </ModalContent>
        </Modal>
    );
}
