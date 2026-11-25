import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { baseApi } from '@/api/baseApi';
import { useConfirmPasswordMutation } from '@/api/endpoints/auth';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Modal, ModalClose, ModalContent } from '@/components/ui/modal';
import { PasswordInput } from '@/components/ui/password-input';
import { applyServerErrors } from '@/lib/forms';
import { passwordConfirmationClosed } from '@/features/ui/uiSlice';

import { FormMessage } from './AuthCard';

const schema = z.object({
    password: z.string().min(1, 'Enter your password.'),
});

/**
 * Re-enter the password (needed before two-factor changes). `onConfirmed` runs
 * after the server accepts it; the global host below calls the original action
 * again by asking the user to retry.
 */
export function ConfirmPasswordModal({
    open,
    onOpenChange,
    onConfirmed,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirmed: () => void;
}) {
    const [confirm, { isLoading }] = useConfirmPasswordMutation();
    const {
        register,
        handleSubmit,
        setError,
        reset,
        formState: { errors },
    } = useForm<{ password: string }>({ resolver: zodResolver(schema) });
    const [formError, setFormError] = useState<string | null>(null);

    const onSubmit = async (values: { password: string }) => {
        setFormError(null);

        try {
            await confirm(values).unwrap();
            reset();
            onConfirmed();
        } catch (error) {
            setFormError(applyServerErrors(error, setError, ['password']));
        }
    };

    return (
        <Modal
            open={open}
            onOpenChange={(next) => {
                if (!next) {
                    reset();
                }

                onOpenChange(next);
            }}
        >
            <ModalContent
                title="Confirm password"
                description="This is a secure area. Please confirm your password before continuing."
                footer={
                    <>
                        <ModalClose asChild>
                            <Button variant="secondary">Cancel</Button>
                        </ModalClose>
                        <Button
                            type="submit"
                            form="confirm-password-form"
                            loading={isLoading}
                        >
                            Confirm password
                        </Button>
                    </>
                }
            >
                <form
                    id="confirm-password-form"
                    onSubmit={handleSubmit(onSubmit)}
                    noValidate
                    className="space-y-4 pt-1"
                >
                    <FormMessage>{formError}</FormMessage>
                    <Field label="Password" error={errors.password?.message}>
                        <PasswordInput
                            autoFocus
                            autoComplete="current-password"
                            {...register('password')}
                        />
                    </Field>
                </form>
            </ModalContent>
        </Modal>
    );
}

/**
 * Mounted once in the app layout. Opens when any request is refused with
 * `password_confirmation_required`; after confirming, the user repeats the action.
 */
export function ConfirmPasswordHost() {
    const dispatch = useAppDispatch();
    const open = useAppSelector((state) => state.ui.passwordConfirmationOpen);

    return (
        <ConfirmPasswordModal
            open={open}
            onOpenChange={(next) => {
                if (!next) {
                    dispatch(passwordConfirmationClosed());
                }
            }}
            onConfirmed={() => {
                dispatch(passwordConfirmationClosed());
                // Screens that were refused (two-factor) load again now.
                dispatch(baseApi.util.invalidateTags(['TwoFactor']));
                toast.success(
                    'Password confirmed. You can repeat your action now.',
                );
            }}
        />
    );
}
