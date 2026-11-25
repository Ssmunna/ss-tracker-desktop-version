import { useState } from 'react';
import { toast } from 'sonner';

import { errorMessage, fieldErrors } from '@/api/baseApi';
import {
    useCreateFolderMutation,
    useRenameFolderMutation,
} from '@/api/endpoints/chat';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Modal, ModalClose, ModalContent } from '@/components/ui/modal';

/** What the dialog is for: a new folder (optionally starting with a chat) or renaming one. */
export type FolderDialogTarget =
    | { mode: 'create'; conversationId?: number }
    | { mode: 'rename'; id: number; name: string };

export function FolderNameDialog({
    target,
    onClose,
    onCreated,
}: {
    target: FolderDialogTarget | null;
    onClose: () => void;
    onCreated?: (id: number) => void;
}) {
    return (
        <Modal
            open={target !== null}
            onOpenChange={(open) => !open && onClose()}
        >
            {target ? (
                <Form target={target} onClose={onClose} onCreated={onCreated} />
            ) : null}
        </Modal>
    );
}

function Form({
    target,
    onClose,
    onCreated,
}: {
    target: FolderDialogTarget;
    onClose: () => void;
    onCreated?: (id: number) => void;
}) {
    const [create, creating] = useCreateFolderMutation();
    const [rename, renaming] = useRenameFolderMutation();
    const [name, setName] = useState(
        target.mode === 'rename' ? target.name : '',
    );
    const [error, setError] = useState<string | undefined>();

    const submit = async () => {
        try {
            if (target.mode === 'rename') {
                await rename({ id: target.id, name: name.trim() }).unwrap();
            } else {
                const result = await create({
                    name: name.trim(),
                    conversation_ids: target.conversationId
                        ? [target.conversationId]
                        : undefined,
                }).unwrap();
                onCreated?.(result.folder.id);
            }

            onClose();
        } catch (failure) {
            const fields = fieldErrors(failure);

            if (fields.name) {
                setError(fields.name);
            } else {
                toast.error(errorMessage(failure));
            }
        }
    };

    return (
        <ModalContent
            title={target.mode === 'rename' ? 'Rename folder' : 'New folder'}
            footer={
                <>
                    <ModalClose asChild>
                        <Button variant="secondary">Cancel</Button>
                    </ModalClose>
                    <Button
                        loading={creating.isLoading || renaming.isLoading}
                        disabled={!name.trim()}
                        onClick={() => void submit()}
                    >
                        {target.mode === 'rename' ? 'Save' : 'Create'}
                    </Button>
                </>
            }
        >
            <Field label="Folder name" error={error}>
                <Input
                    autoFocus
                    value={name}
                    maxLength={40}
                    onChange={(event) => {
                        setName(event.target.value);
                        setError(undefined);
                    }}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter' && name.trim()) {
                            void submit();
                        }
                    }}
                />
            </Field>
        </ModalContent>
    );
}
