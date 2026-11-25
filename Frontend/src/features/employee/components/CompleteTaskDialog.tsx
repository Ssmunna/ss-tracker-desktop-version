import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Modal, ModalClose, ModalContent } from '@/components/ui/modal';
import { toTimeEntry } from '@/lib/time';

/**
 * Asks how long a task took before completing it. Same rules as the Vue page:
 * minutes 0 to 59, and some time is required.
 */
export function CompleteTaskDialog({
    taskTitle,
    estimatedHours = null,
    onClose,
    onSubmit,
    loading = false,
}: {
    taskTitle: string | null;
    /** Pre-fills the time when the task already has an estimate. */
    estimatedHours?: number | null;
    onClose: () => void;
    onSubmit: (timeEntry: string) => void;
    loading?: boolean;
}) {
    return (
        <Modal
            open={taskTitle !== null}
            onOpenChange={(open) => !open && onClose()}
        >
            {taskTitle !== null ? (
                <CompleteTaskForm
                    taskTitle={taskTitle}
                    estimatedHours={estimatedHours}
                    onSubmit={onSubmit}
                    loading={loading}
                />
            ) : null}
        </Modal>
    );
}

function CompleteTaskForm({
    taskTitle,
    estimatedHours,
    onSubmit,
    loading,
}: {
    taskTitle: string;
    estimatedHours: number | null;
    onSubmit: (timeEntry: string) => void;
    loading: boolean;
}) {
    // The estimate wins; otherwise the usual 0.30 (H.MM, like the Vue page).
    const [value, setValue] = useState(() => {
        const total =
            estimatedHours !== null && estimatedHours > 0
                ? Math.round(estimatedHours * 60)
                : 30;

        return toTimeEntry(Math.floor(total / 60), total % 60);
    });
    const [error, setError] = useState('');

    const submit = () => {
        const [hPart = '', mPart = ''] = value.trim().split('.');
        const h = Math.floor(Number(hPart || 0));
        const m = mPart === '' ? 0 : Number(mPart.padEnd(2, '0').slice(0, 2));

        if (
            !/^\d*\.?\d*$/.test(value.trim()) ||
            Number.isNaN(h) ||
            Number.isNaN(m)
        ) {
            setError('Enter the time as H.MM, for example 1.30.');

            return;
        }

        if (m > 59) {
            setError('Minutes must be between 0 and 59.');

            return;
        }

        if (h === 0 && m === 0) {
            setError('Enter the time you spent on this task.');

            return;
        }

        setError('');
        onSubmit(toTimeEntry(h, m));
    };

    return (
        <ModalContent
            title="Complete task"
            description={taskTitle}
            footer={
                <>
                    <ModalClose asChild>
                        <Button variant="secondary">Cancel</Button>
                    </ModalClose>
                    <Button loading={loading} onClick={submit}>
                        Mark as done
                    </Button>
                </>
            }
        >
            <Field label="Time (H.MM)" hint="0.30 = 30 minutes, 1.45 = 1h 45m">
                <Input
                    inputMode="decimal"
                    placeholder="0.30"
                    value={value}
                    onChange={(event) => setValue(event.target.value)}
                />
            </Field>
            {error ? (
                <p
                    role="alert"
                    className="mt-2 text-xs font-medium text-red-600"
                >
                    {error}
                </p>
            ) : null}
        </ModalContent>
    );
}
