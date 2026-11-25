import { Button } from './button';
import { Modal, ModalClose, ModalContent } from './modal';

interface ConfirmDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: string;
    confirmLabel?: string;
    cancelLabel?: string;
    /** Destructive actions use the red button (guide s5). */
    destructive?: boolean;
    loading?: boolean;
    onConfirm: () => void;
}

export function ConfirmDialog({
    open,
    onOpenChange,
    title,
    description,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    destructive = false,
    loading = false,
    onConfirm,
}: ConfirmDialogProps) {
    return (
        <Modal open={open} onOpenChange={onOpenChange}>
            <ModalContent
                title={title}
                description={description}
                footer={
                    <>
                        <ModalClose asChild>
                            <Button variant="secondary">{cancelLabel}</Button>
                        </ModalClose>
                        <Button
                            variant={destructive ? 'destructive' : 'primary'}
                            loading={loading}
                            onClick={onConfirm}
                            className="sm:min-w-24"
                        >
                            {confirmLabel}
                        </Button>
                    </>
                }
            >
                <p className="text-sm text-slate-600">{description}</p>
            </ModalContent>
        </Modal>
    );
}
