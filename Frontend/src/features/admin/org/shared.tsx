import { Check, Copy } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal, ModalClose, ModalContent } from '@/components/ui/modal';

export function ActiveBadge({ status }: { status: string }) {
    return (
        <Badge
            tone={status === 'active' ? 'success' : 'neutral'}
            className="capitalize"
        >
            {status}
        </Badge>
    );
}

export function PageHeader({
    title,
    description,
    action,
}: {
    title: string;
    description?: string;
    action?: ReactNode;
}) {
    return (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
                <h1 className="text-xl font-extrabold text-slate-900 sm:text-2xl">
                    {title}
                </h1>
                {description ? (
                    <p className="mt-1 text-sm text-slate-500">{description}</p>
                ) : null}
            </div>
            {action}
        </div>
    );
}

/** Shows a one-time password setup link with a copy button. */
export function InviteLinkDialog({
    link,
    title = 'Password setup link',
    onClose,
}: {
    link: string | null;
    title?: string;
    onClose: () => void;
}) {
    const [copied, setCopied] = useState(false);

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(link ?? '');
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error('Could not copy. Select the link and copy it by hand.');
        }
    };

    return (
        <Modal open={link !== null} onOpenChange={(open) => !open && onClose()}>
            <ModalContent
                title={title}
                description="Share this link with the person. It is shown once and is not stored."
                footer={
                    <>
                        <ModalClose asChild>
                            <Button variant="secondary">Close</Button>
                        </ModalClose>
                        <Button onClick={() => void copy()}>
                            {copied ? (
                                <Check className="size-4" />
                            ) : (
                                <Copy className="size-4" />
                            )}
                            {copied ? 'Copied' : 'Copy link'}
                        </Button>
                    </>
                }
            >
                <Input
                    readOnly
                    aria-label="Password setup link"
                    value={link ?? ''}
                    onFocus={(event) => event.target.select()}
                />
            </ModalContent>
        </Modal>
    );
}
