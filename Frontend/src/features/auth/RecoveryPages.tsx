import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { z } from 'zod';

import {
    useForgotPasswordMutation,
    useResetPasswordMutation,
} from '@/api/endpoints/auth';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { applyServerErrors } from '@/lib/forms';

import { AuthCard, FormMessage } from './AuthCard';

const emailSchema = z.object({
    email: z.string().min(1, 'Enter your email.').email('Enter a valid email.'),
});

export function ForgotPasswordPage() {
    const [forgot, { isLoading }] = useForgotPasswordMutation();
    const [sent, setSent] = useState<string | null>(null);
    const [formError, setFormError] = useState<string | null>(null);
    const {
        register,
        handleSubmit,
        setError,
        formState: { errors },
    } = useForm<{ email: string }>({ resolver: zodResolver(emailSchema) });

    const onSubmit = async (values: { email: string }) => {
        setFormError(null);

        try {
            const result = await forgot(values).unwrap();
            setSent(result.message);
        } catch (error) {
            setFormError(applyServerErrors(error, setError, ['email']));
        }
    };

    return (
        <AuthCard
            title="Forgot password"
            description="Enter your email and we will send you a reset link."
            status={sent}
        >
            <form
                onSubmit={handleSubmit(onSubmit)}
                noValidate
                className="space-y-4"
            >
                <FormMessage>{formError}</FormMessage>
                <Field label="Email address" error={errors.email?.message}>
                    <Input
                        type="email"
                        autoComplete="email"
                        autoFocus
                        placeholder="email@example.com"
                        {...register('email')}
                    />
                </Field>
                <Button type="submit" block size="lg" loading={isLoading}>
                    Email password reset link
                </Button>
                <p className="text-center text-xs text-slate-500">
                    Or, return to{' '}
                    <Link
                        to="/login"
                        className="font-bold text-brand-600 hover:underline"
                    >
                        log in
                    </Link>
                </p>
            </form>
        </AuthCard>
    );
}

const resetSchema = z
    .object({
        email: z.string().email(),
        password: z.string().min(8, 'Use at least 8 characters.'),
        password_confirmation: z.string().min(1, 'Confirm your password.'),
    })
    .refine((values) => values.password === values.password_confirmation, {
        path: ['password_confirmation'],
        message: 'The passwords do not match.',
    });
type ResetValues = z.infer<typeof resetSchema>;

export function ResetPasswordPage() {
    const { token = '' } = useParams();
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const [reset, { isLoading }] = useResetPasswordMutation();
    const [formError, setFormError] = useState<string | null>(null);
    const {
        register,
        handleSubmit,
        setError,
        formState: { errors },
    } = useForm<ResetValues>({
        resolver: zodResolver(resetSchema),
        defaultValues: { email: params.get('email') ?? '' },
    });

    const onSubmit = async (values: ResetValues) => {
        setFormError(null);

        try {
            const result = await reset({ ...values, token }).unwrap();
            navigate('/login', {
                replace: true,
                state: { status: result.message },
            });
        } catch (error) {
            setFormError(
                applyServerErrors(error, setError, [
                    'email',
                    'password',
                    'password_confirmation',
                ]),
            );
        }
    };

    return (
        <AuthCard
            title="Reset password"
            description="Please enter your new password below."
        >
            <form
                onSubmit={handleSubmit(onSubmit)}
                noValidate
                className="space-y-4"
            >
                <FormMessage>{formError}</FormMessage>
                <Field label="Email" error={errors.email?.message}>
                    <Input
                        type="email"
                        readOnly
                        autoComplete="email"
                        {...register('email')}
                    />
                </Field>
                <Field label="Password" error={errors.password?.message}>
                    <PasswordInput
                        autoComplete="new-password"
                        autoFocus
                        placeholder="Password"
                        {...register('password')}
                    />
                </Field>
                <Field
                    label="Confirm password"
                    error={errors.password_confirmation?.message}
                >
                    <PasswordInput
                        autoComplete="new-password"
                        placeholder="Confirm password"
                        {...register('password_confirmation')}
                    />
                </Field>
                <Button type="submit" block size="lg" loading={isLoading}>
                    Reset password
                </Button>
            </form>
        </AuthCard>
    );
}
