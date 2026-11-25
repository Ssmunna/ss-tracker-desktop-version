import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router';
import { z } from 'zod';

import { errorBody } from '@/api/baseApi';
import { useLoginMutation } from '@/api/endpoints/auth';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { applyServerErrors } from '@/lib/forms';

import { AuthCard, FormMessage } from './AuthCard';
import {
    challengeStarted,
    selectEndedReason,
    tokenReceived,
} from './authSlice';

const schema = z.object({
    email: z.string().min(1, 'Enter your email.').email('Enter a valid email.'),
    password: z.string().min(1, 'Enter your password.'),
});
type Values = z.infer<typeof schema>;

export interface AuthLocationState {
    from?: { pathname: string; search?: string };
    status?: string;
}

export function LoginPage() {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const location = useLocation();
    const state = (location.state ?? {}) as AuthLocationState;
    const reason = useAppSelector(selectEndedReason);
    const [login, { isLoading }] = useLoginMutation();
    const [formError, setFormError] = useState<string | null>(null);
    const {
        register,
        handleSubmit,
        setError,
        resetField,
        formState: { errors },
    } = useForm<Values>({ resolver: zodResolver(schema) });

    const onSubmit = async (values: Values) => {
        setFormError(null);

        try {
            const result = await login(values).unwrap();

            if (result.two_factor) {
                dispatch(challengeStarted(result.challenge_token));
                navigate('/two-factor', { replace: true, state });

                return;
            }

            dispatch(tokenReceived(result.token));
            navigate(
                state.from
                    ? `${state.from.pathname}${state.from.search ?? ''}`
                    : '/',
                { replace: true },
            );
        } catch (error) {
            resetField('password');

            if (errorBody(error).code === 'account_inactive') {
                navigate('/inactive', { replace: true });

                return;
            }

            setFormError(
                applyServerErrors(error, setError, ['email', 'password']),
            );
        }
    };

    return (
        <AuthCard
            title="Welcome back"
            description="Sign in to your account to continue."
            status={state.status}
        >
            <form
                onSubmit={handleSubmit(onSubmit)}
                noValidate
                className="space-y-4"
            >
                {reason === 'unauthenticated' && !formError ? (
                    <FormMessage>
                        Your session expired. Please sign in again.
                    </FormMessage>
                ) : null}
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
                <Field label="Password" error={errors.password?.message}>
                    <PasswordInput
                        autoComplete="current-password"
                        placeholder="Password"
                        {...register('password')}
                    />
                </Field>
                <div className="flex justify-end">
                    <Link
                        to="/forgot-password"
                        className="text-xs font-bold text-brand-600 hover:underline"
                    >
                        Forgot password?
                    </Link>
                </div>
                <Button type="submit" block size="lg" loading={isLoading}>
                    Log in
                </Button>
            </form>
        </AuthCard>
    );
}
